import pandas as pd
import numpy as np
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv
import logging

load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://agripulse:agripulse123@localhost:5432/agripulse')
engine = create_engine(DATABASE_URL)


def compute_pos_features(pos: pd.DataFrame, as_of_date: pd.Timestamp) -> pd.DataFrame:
    pos = pos[pos['transaction_date'] <= as_of_date].copy()
    pos['revenue'] = pos['sku_qty'] * pos['sku_price']

    def rolling_revenue(days):
        cutoff = as_of_date - pd.Timedelta(days=days)
        return (
            pos[pos['transaction_date'] >= cutoff]
            .groupby('retailer_id')['revenue'].sum()
        )

    r7  = rolling_revenue(7).rename('pos_revenue_7d')
    r30 = rolling_revenue(30).rename('pos_revenue_30d')
    r90 = rolling_revenue(90).rename('pos_revenue_90d')

    # Month-over-month growth
    r30_prev = rolling_revenue(60).rename('pos_revenue_prev_30d')
    feats = pd.concat([r7, r30, r90, r30_prev], axis=1).reset_index().fillna(0)
    feats['pos_revenue_mom_growth'] = (
        (feats['pos_revenue_30d'] - feats['pos_revenue_prev_30d'])
        / feats['pos_revenue_prev_30d'].replace(0, np.nan)
    ).fillna(0).clip(-5, 5)
    feats = feats.drop(columns=['pos_revenue_prev_30d'])

    # Transaction count features
    txn_30d = (
        pos[pos['transaction_date'] >= as_of_date - pd.Timedelta(days=30)]
        .groupby('retailer_id').size().rename('txn_count_30d')
    )
    feats = feats.merge(txn_30d.reset_index(), on='retailer_id', how='left').fillna(0)
    return feats


def compute_visit_features(visits: pd.DataFrame, as_of_date: pd.Timestamp) -> pd.DataFrame:
    visits = visits[visits['visit_date'] <= as_of_date].copy()

    last_visit = visits.groupby('retailer_id')['visit_date'].max().rename('last_visit_date')
    count_30d  = (
        visits[visits['visit_date'] >= as_of_date - pd.Timedelta(days=30)]
        .groupby('retailer_id').size().rename('visit_count_30d')
    )
    count_90d  = (
        visits[visits['visit_date'] >= as_of_date - pd.Timedelta(days=90)]
        .groupby('retailer_id').size().rename('visit_count_90d')
    )

    feats = pd.concat([last_visit, count_30d, count_90d], axis=1).reset_index()
    feats['days_since_last_visit'] = (
        (as_of_date - feats['last_visit_date']).dt.days.fillna(999)
    )
    feats = feats.drop(columns=['last_visit_date']).fillna(0)
    return feats


def compute_inventory_features(inv: pd.DataFrame, as_of_date: pd.Timestamp) -> pd.DataFrame:
    inv = inv[inv['week_end_date'] <= as_of_date].copy()
    inv_sorted = inv.sort_values(['retailer_id', 'sku_name', 'week_end_date'])

    inv_sorted['prev_qty'] = inv_sorted.groupby(['retailer_id', 'sku_name'])['sku_qty'].shift(1)
    inv_sorted['weekly_depletion'] = inv_sorted['prev_qty'] - inv_sorted['sku_qty']

    latest = inv_sorted.groupby(['retailer_id', 'sku_name']).last().reset_index()

    # Tilt 250 EC specific features
    tilt = latest[latest['sku_name'].str.contains('Tilt', case=False, na=False)]
    tilt_feats = tilt.groupby('retailer_id').agg(
        tilt_stock=('sku_qty', 'sum'),
        tilt_depletion_rate=('weekly_depletion', 'mean'),
    ).reset_index()
    tilt_feats['days_to_stockout'] = (
        (tilt_feats['tilt_stock'] / tilt_feats['tilt_depletion_rate'].replace(0, np.nan)) * 7
    ).clip(0, 90).fillna(90)
    tilt_feats['stockout_flag'] = (tilt_feats['days_to_stockout'] < 14).astype(int)

    # Overall inventory
    overall = latest.groupby('retailer_id').agg(
        total_stock=('sku_qty', 'sum'),
        avg_depletion=('weekly_depletion', 'mean'),
        sku_count=('sku_name', 'nunique'),
    ).reset_index()

    feats = overall.merge(tilt_feats, on='retailer_id', how='left').fillna(0)
    return feats


def compute_whatsapp_features(wa: pd.DataFrame, as_of_date: pd.Timestamp) -> pd.DataFrame:
    # whatsapp is grower-level; aggregate engagement to tehsil level
    wa = wa.copy()
    wa['message_sent_date'] = pd.to_datetime(wa['message_sent_date'])
    wa_recent = wa[wa['message_sent_date'] >= as_of_date - pd.Timedelta(days=30)]

    # growers table needed to get tehsil — use grower_id groupby on campaign signals
    feats = wa_recent.groupby('grower_id').agg(
        wa_messages=('opened_status', 'count'),
        wa_opened=('opened_status', 'sum'),
        wa_clicked=('clicked_status', 'sum'),
    ).reset_index()
    feats['wa_open_rate']  = feats['wa_opened']  / feats['wa_messages'].replace(0, 1)
    feats['wa_click_rate'] = feats['wa_clicked'] / feats['wa_messages'].replace(0, 1)
    feats['wa_engaged']    = (feats['wa_clicked'] > 0).astype(int)
    return feats


def build_feature_matrix(as_of_date: str = None) -> pd.DataFrame:
    if as_of_date is None:
        as_of_date = pd.Timestamp('2026-03-31')
    else:
        as_of_date = pd.Timestamp(as_of_date)

    logger.info(f'Building feature matrix as of {as_of_date.date()}')

    pos      = pd.read_sql('SELECT retailer_id, transaction_date, sku_qty, sku_price FROM retailer_pos', engine)
    inv      = pd.read_sql('SELECT retailer_id, sku_name, sku_qty, week_end_date FROM retailer_inventory_weekly', engine)
    visits_raw = pd.read_sql('SELECT rep_id, territory_id, visit_date, visit_tehsil FROM retailer_visit_log', engine)
    retailers  = pd.read_sql('SELECT retailer_id, territory_id, tehsil, district, state FROM retailers', engine)
    wa         = pd.read_sql('SELECT grower_id, message_sent_date, opened_status, clicked_status FROM whatsapp_campaign', engine)

    pos['transaction_date']  = pd.to_datetime(pos['transaction_date'])
    inv['week_end_date']     = pd.to_datetime(inv['week_end_date'])
    visits_raw['visit_date'] = pd.to_datetime(visits_raw['visit_date'])

    # Map visits to retailers
    visits = visits_raw.merge(
        retailers[['retailer_id', 'territory_id', 'tehsil']],
        left_on=['territory_id', 'visit_tehsil'],
        right_on=['territory_id', 'tehsil'],
        how='left'
    ).dropna(subset=['retailer_id'])

    logger.info('Computing POS features...')
    pos_feats  = compute_pos_features(pos, as_of_date)

    logger.info('Computing visit features...')
    vis_feats  = compute_visit_features(visits, as_of_date)

    logger.info('Computing inventory features...')
    inv_feats  = compute_inventory_features(inv, as_of_date)

    logger.info('Computing WhatsApp features...')
    wa_feats   = compute_whatsapp_features(wa, as_of_date)

    # Start with all retailers as base
    matrix = retailers[['retailer_id', 'territory_id', 'tehsil', 'district', 'state']].copy()

    for feats in [pos_feats, vis_feats, inv_feats]:
        matrix = matrix.merge(feats, on='retailer_id', how='left')

    matrix = matrix.fillna(0)

    # Encode geo columns
    from sklearn.preprocessing import LabelEncoder
    import joblib
    import pathlib
    pathlib.Path('models').mkdir(exist_ok=True)

    for col in ['state', 'district', 'tehsil']:
        le = LabelEncoder()
        matrix[f'{col}_encoded'] = le.fit_transform(matrix[col].fillna('Unknown'))
        joblib.dump(le, f'models/le_{col}.pkl')

    logger.info(f'Feature matrix shape: {matrix.shape}')
    logger.info(f'Columns: {list(matrix.columns)}')
    return matrix


if __name__ == '__main__':
    matrix = build_feature_matrix()
    matrix.to_sql('feature_matrix', engine, if_exists='replace', index=False)
    logger.info('Feature matrix saved to database.')
    print(matrix.describe().T.to_string())
