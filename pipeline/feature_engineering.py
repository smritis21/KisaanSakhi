"""
Feature Engineering Pipeline
"""
import pandas as pd
import numpy as np
from sqlalchemy import create_engine
import os
from pathlib import Path
from sklearn.preprocessing import LabelEncoder
import joblib
import yaml
import re

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://agripulse:agripulse123@localhost:5432/agripulse')
engine = create_engine(DATABASE_URL)

# Load config with recursive env var resolution
CONFIG_PATH = Path(__file__).parent.parent / "config" / "config.yaml"

def resolve_env(value):
    if isinstance(value, str):
        pattern = r'\$\{([^}:]+)(?::([^}]*))?\}'
        return re.sub(pattern, lambda m: os.getenv(m.group(1), m.group(2) or ''), value)
    elif isinstance(value, dict):
        return {k: resolve_env(v) for k, v in value.items()}
    elif isinstance(value, list):
        return [resolve_env(item) for item in value]
    return value

with open(CONFIG_PATH, 'r') as f:
    CONFIG = resolve_env(yaml.safe_load(f))

FEAT_CFG = CONFIG.get('features', {})
POS_WINDOWS = FEAT_CFG.get('pos_windows_days', [7, 30, 90])
VISIT_WINDOWS = FEAT_CFG.get('visit_windows_days', [30, 90])
INV_WEEKS = FEAT_CFG.get('inventory_lookback_weeks', 12)
WA_DAYS = FEAT_CFG.get('whatsapp_lookback_days', 30)
CLIP = FEAT_CFG.get('revenue_growth_clip', 5.0)


def compute_pos_features(pos, as_of_date):
    pos = pos[pos['transaction_date'] <= as_of_date].copy()
    pos['revenue'] = pos['sku_qty'] * pos['sku_price']

    def rolling_revenue(days, col_name):
        cutoff = as_of_date - pd.Timedelta(days=days)
        result = pos[pos['transaction_date'] >= cutoff].groupby('retailer_id')['revenue'].sum()
        result.name = col_name
        return result

    features = {}
    for days in POS_WINDOWS:
        features[f'pos_revenue_{days}d'] = rolling_revenue(days, f'pos_revenue_{days}d')
    
    features['pos_revenue_prev_30d'] = rolling_revenue(60, 'pos_revenue_prev_30d')
    
    feats = pd.concat(features.values(), axis=1).reset_index().fillna(0)
    
    feats['pos_revenue_mom_growth'] = (
        (feats['pos_revenue_30d'] - feats['pos_revenue_prev_30d'])
        / feats['pos_revenue_prev_30d'].replace(0, np.nan)
    ).fillna(0).clip(-CLIP, CLIP)
    feats = feats.drop(columns=['pos_revenue_prev_30d'])

    txn_30d = pos[pos['transaction_date'] >= as_of_date - pd.Timedelta(days=30)].groupby('retailer_id').size().rename('txn_count_30d')
    feats = feats.merge(txn_30d.reset_index(), on='retailer_id', how='left').fillna(0)
    return feats


def compute_visit_features(visits, as_of_date):
    visits = visits[visits['visit_date'] <= as_of_date].copy()
    last_visit = visits.groupby('retailer_id')['visit_date'].max().rename('last_visit_date')
    
    features = {'last_visit_date': last_visit}
    for days in VISIT_WINDOWS:
        result = visits[visits['visit_date'] >= as_of_date - pd.Timedelta(days=days)].groupby('retailer_id').size()
        result.name = f'visit_count_{days}d'
        features[f'visit_count_{days}d'] = result
    
    feats = pd.concat(features.values(), axis=1).reset_index()
    feats['days_since_last_visit'] = (as_of_date - feats['last_visit_date']).dt.days.fillna(999)
    feats = feats.drop(columns=['last_visit_date']).fillna(0)
    return feats


def compute_inventory_features(inv, as_of_date):
    cutoff = as_of_date - pd.Timedelta(weeks=INV_WEEKS)
    inv = inv[(inv['week_end_date'] <= as_of_date) & (inv['week_end_date'] >= cutoff)].copy()
    inv_sorted = inv.sort_values(['retailer_id', 'sku_name', 'week_end_date'])
    inv_sorted['prev_qty'] = inv_sorted.groupby(['retailer_id', 'sku_name'])['sku_qty'].shift(1)
    inv_sorted['weekly_depletion'] = inv_sorted['prev_qty'] - inv_sorted['sku_qty']
    latest = inv_sorted.groupby(['retailer_id', 'sku_name']).last().reset_index()

    tilt = latest[latest['sku_name'].str.contains('Tilt', case=False, na=False)]
    tilt_feats = tilt.groupby('retailer_id').agg(tilt_stock=('sku_qty', 'sum'), tilt_depletion_rate=('weekly_depletion', 'mean')).reset_index()
    tilt_feats['days_to_stockout'] = (tilt_feats['tilt_stock'] / tilt_feats['tilt_depletion_rate'].replace(0, np.nan) * 7).clip(0, 90).fillna(90)
    tilt_feats['stockout_flag'] = (tilt_feats['days_to_stockout'] < 14).astype(int)

    overall = latest.groupby('retailer_id').agg(total_stock=('sku_qty', 'sum'), avg_depletion=('weekly_depletion', 'mean'), sku_count=('sku_name', 'nunique')).reset_index()
    feats = overall.merge(tilt_feats, on='retailer_id', how='left').fillna(0)
    return feats


def compute_whatsapp_features(wa, as_of_date):
    wa = wa.copy()
    wa['message_sent_date'] = pd.to_datetime(wa['message_sent_date'])
    wa_recent = wa[wa['message_sent_date'] >= as_of_date - pd.Timedelta(days=WA_DAYS)]
    feats = wa_recent.groupby('grower_id').agg(wa_messages=('opened_status', 'count'), wa_opened=('opened_status', 'sum'), wa_clicked=('clicked_status', 'sum')).reset_index()
    feats['wa_open_rate'] = feats['wa_opened'] / feats['wa_messages'].replace(0, 1)
    feats['wa_click_rate'] = feats['wa_clicked'] / feats['wa_messages'].replace(0, 1)
    feats['wa_engaged'] = (feats['wa_clicked'] > 0).astype(int)
    return feats


def build_feature_matrix(as_of_date=None):
    if as_of_date is None:
        as_of_date = pd.Timestamp.today().normalize()
    else:
        as_of_date = pd.Timestamp(as_of_date)

    # For POS/inventory features, use last available data date
    # For visit features, use today so new visits are reflected
    pos_as_of = min(as_of_date, pd.Timestamp('2026-03-31'))
    inv_as_of = min(as_of_date, pd.Timestamp('2026-03-31'))

    print(f'Building feature matrix as of {as_of_date.date()}')

    pos = pd.read_sql('SELECT retailer_id, transaction_date, sku_qty, sku_price FROM retailer_pos', engine)
    inv = pd.read_sql('SELECT retailer_id, sku_name, sku_qty, week_end_date FROM retailer_inventory_weekly', engine)
    visits_raw = pd.read_sql('SELECT rep_id, territory_id, visit_date, visit_tehsil FROM retailer_visit_log', engine)
    retailers = pd.read_sql('SELECT retailer_id, territory_id, tehsil, district, state FROM retailers', engine)
    wa = pd.read_sql('SELECT grower_id, message_sent_date, opened_status, clicked_status FROM whatsapp_campaign', engine)

    pos['transaction_date'] = pd.to_datetime(pos['transaction_date'])
    inv['week_end_date'] = pd.to_datetime(inv['week_end_date'])
    visits_raw['visit_date'] = pd.to_datetime(visits_raw['visit_date'])

    visits = visits_raw.merge(retailers[['retailer_id', 'territory_id', 'tehsil']], left_on=['territory_id', 'visit_tehsil'], right_on=['territory_id', 'tehsil'], how='left').dropna(subset=['retailer_id'])

    print('Computing POS features...')
    pos_feats = compute_pos_features(pos, pos_as_of)

    print('Computing visit features...')
    vis_feats = compute_visit_features(visits, as_of_date)

    print('Computing inventory features...')
    inv_feats = compute_inventory_features(inv, inv_as_of)

    print('Computing WhatsApp features...')
    wa_feats = compute_whatsapp_features(wa, as_of_date)

    matrix = retailers[['retailer_id', 'territory_id', 'tehsil', 'district', 'state']].copy()
    for feats in [pos_feats, vis_feats, inv_feats]:
        matrix = matrix.merge(feats, on='retailer_id', how='left')
    matrix = matrix.fillna(0)

    models_dir = CONFIG.get('ml', {}).get('models_dir', 'models')
    Path(models_dir).mkdir(exist_ok=True)

    for col in ['state', 'district', 'tehsil']:
        le = LabelEncoder()
        matrix[f'{col}_encoded'] = le.fit_transform(matrix[col].fillna('Unknown'))
        joblib.dump(le, f'{models_dir}/le_{col}.pkl')

    print(f'Feature matrix shape: {matrix.shape}')
    print(f'Columns: {list(matrix.columns)}')
    return matrix


if __name__ == '__main__':
    import pathlib
    matrix = build_feature_matrix()
    matrix.to_sql('feature_matrix', engine, if_exists='replace', index=False)
    print('Feature matrix saved to database.')
    print(matrix.describe().T.to_string())