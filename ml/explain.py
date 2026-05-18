"""
SHAP Explanation Engine
"""
import pandas as pd
import numpy as np
import shap
import joblib
import json
from sqlalchemy import create_engine
import os
from pathlib import Path
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

SHAP_CFG = CONFIG.get('shap', {})
TOP_N = SHAP_CFG.get('top_n_features', 3)
MIN_SHAP = SHAP_CFG.get('min_shap_absolute_value', 0.01)
MODELS_DIR = CONFIG.get('ml', {}).get('models_dir', 'models')

FEATURE_DISPLAY_NAMES = {
    'days_since_last_visit':  'Days since last visit',
    'pos_revenue_7d':         'POS revenue (last 7 days)',
    'pos_revenue_30d':        'POS revenue (last 30 days)',
    'pos_revenue_90d':        'POS revenue (last 90 days)',
    'pos_revenue_mom_growth': 'Revenue growth month-over-month',
    'txn_count_30d':          'Transactions (last 30 days)',
    'tilt_stock':             'Tilt 250 EC stock level',
    'tilt_depletion_rate':    'Tilt 250 EC weekly depletion',
    'days_to_stockout':       'Days until Tilt 250 EC stockout',
    'stockout_flag':          'Near stockout alert',
    'total_stock':            'Total inventory stock',
    'avg_depletion':          'Average weekly depletion',
    'sku_count':              'Number of SKUs stocked',
    'visit_count_30d':        'Visits in last 30 days',
    'visit_count_90d':        'Visits in last 90 days',
    'state_encoded':          'State',
    'district_encoded':       'District',
    'tehsil_encoded':         'Tehsil',
}


def get_display_name(feature):
    return FEATURE_DISPLAY_NAMES.get(feature, feature.replace('_', ' ').title())


def generate_shap_explanation(retailer_row, top_n=None):
    if top_n is None:
        top_n = TOP_N
    
    model = joblib.load(os.path.join(MODELS_DIR, 'xgboost_opportunity_scorer.pkl'))
    f_cols = joblib.load(os.path.join(MODELS_DIR, 'feature_cols.pkl'))

    X = retailer_row[f_cols].fillna(0).values.reshape(1, -1)
    explainer = shap.TreeExplainer(model)
    shap_vals = explainer.shap_values(X)[0]

    shap_dict = dict(zip(f_cols, shap_vals))
    filtered = {k: v for k, v in shap_dict.items() if abs(v) >= MIN_SHAP}
    sorted_feats = sorted(filtered.items(), key=lambda x: abs(x[1]), reverse=True)

    explanations = []
    for feat, sv in sorted_feats[:top_n]:
        direction = 'increases' if sv > 0 else 'decreases'
        display = get_display_name(feat)
        raw_val = retailer_row.get(feat, 0)
        explanations.append({
            'feature': feat,
            'display_name': display,
            'shap_value': round(float(sv), 4),
            'direction': direction,
            'raw_value': round(float(raw_val), 2),
            'text': f'{display}: {round(float(raw_val), 1)} ({direction} score)',
        })
    return explanations


def batch_shap_explanations(features_df):
    model = joblib.load(os.path.join(MODELS_DIR, 'xgboost_opportunity_scorer.pkl'))
    f_cols = joblib.load(os.path.join(MODELS_DIR, 'feature_cols.pkl'))

    X = features_df[f_cols].fillna(0)
    explainer = shap.TreeExplainer(model)
    shap_matrix = explainer.shap_values(X)

    print(f'Computing SHAP for {len(features_df):,} retailers...')

    records = []
    for i, (_, row) in enumerate(features_df.iterrows()):
        sv_row = shap_matrix[i]
        sv_dict = dict(zip(f_cols, sv_row))
        filtered = {k: v for k, v in sv_dict.items() if abs(v) >= MIN_SHAP}
        top3 = sorted(filtered.items(), key=lambda x: abs(x[1]), reverse=True)[:TOP_N]

        reasons = [
            {
                'feature': f,
                'display': get_display_name(f),
                'shap': round(float(sv), 4),
                'value': round(float(row.get(f, 0)), 2),
                'text': f"{get_display_name(f)}: {round(float(row.get(f, 0)), 1)}",
            }
            for f, sv in top3
        ]

        records.append({
            'retailer_id': row['retailer_id'],
            'shap_reasons': json.dumps(reasons),
            'top_reason_text': reasons[0]['text'] if reasons else '',
        })

    return pd.DataFrame(records)


if __name__ == '__main__':
    print('Loading feature matrix...')
    features = pd.read_sql('SELECT * FROM feature_matrix', engine)

    print('Generating batch SHAP explanations...')
    shap_df = batch_shap_explanations(features)

    print('\nSample SHAP explanations:')
    for _, row in shap_df.head(5).iterrows():
        reasons = json.loads(row['shap_reasons'])
        print(f'\nRetailer {row["retailer_id"]}:')
        for r in reasons:
            print(f"  -> {r['text']} (SHAP: {r['shap']:+.3f})")

    shap_df.to_sql('shap_explanations', engine, if_exists='replace', index=False)
    print(f'\nSaved {len(shap_df):,} SHAP explanations to database.')
    print('SHAP explanations generated successfully.')