import pandas as pd
import numpy as np
import shap
import joblib
import json
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv
import logging

load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://agripulse:agripulse123@localhost:5432/agripulse')
engine = create_engine(DATABASE_URL)

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


def generate_shap_explanation(retailer_row: pd.Series, top_n: int = 3) -> list:
    model  = joblib.load('models/xgboost_opportunity_scorer.pkl')
    f_cols = joblib.load('models/feature_cols.pkl')

    X          = retailer_row[f_cols].fillna(0).values.reshape(1, -1)
    explainer  = shap.TreeExplainer(model)
    shap_vals  = explainer.shap_values(X)[0]

    shap_dict    = dict(zip(f_cols, shap_vals))
    sorted_feats = sorted(shap_dict.items(), key=lambda x: abs(x[1]), reverse=True)

    explanations = []
    for feat, sv in sorted_feats[:top_n]:
        direction = 'increases' if sv > 0 else 'decreases'
        display   = FEATURE_DISPLAY_NAMES.get(feat, feat.replace('_', ' ').title())
        raw_val   = retailer_row.get(feat, 0)
        explanations.append({
            'feature':      feat,
            'display_name': display,
            'shap_value':   round(float(sv), 4),
            'direction':    direction,
            'raw_value':    round(float(raw_val), 2),
            'text':         f'{display}: {round(float(raw_val), 1)} ({direction} score)',
        })
    return explanations


def batch_shap_explanations(features_df: pd.DataFrame) -> pd.DataFrame:
    model  = joblib.load('models/xgboost_opportunity_scorer.pkl')
    f_cols = joblib.load('models/feature_cols.pkl')

    X           = features_df[f_cols].fillna(0)
    explainer   = shap.TreeExplainer(model)
    shap_matrix = explainer.shap_values(X)

    logger.info(f'Computing SHAP for {len(features_df):,} retailers...')

    records = []
    for i, (_, row) in enumerate(features_df.iterrows()):
        sv_row  = shap_matrix[i]
        sv_dict = dict(zip(f_cols, sv_row))
        top3    = sorted(sv_dict.items(), key=lambda x: abs(x[1]), reverse=True)[:3]

        reasons = [
            {
                'feature': f,
                'display': FEATURE_DISPLAY_NAMES.get(f, f),
                'shap':    round(float(sv), 4),
                'value':   round(float(row.get(f, 0)), 2),
                'text':    f"{FEATURE_DISPLAY_NAMES.get(f, f)}: {round(float(row.get(f,0)),1)}",
            }
            for f, sv in top3
        ]

        records.append({
            'retailer_id':     row['retailer_id'],
            'shap_reasons':    json.dumps(reasons),
            'top_reason_text': reasons[0]['text'] if reasons else '',
        })

    return pd.DataFrame(records)


if __name__ == '__main__':
    logger.info('Loading feature matrix...')
    features = pd.read_sql('SELECT * FROM feature_matrix', engine)

    logger.info('Generating batch SHAP explanations...')
    shap_df = batch_shap_explanations(features)

    logger.info('\nSample SHAP explanations:')
    for _, row in shap_df.head(5).iterrows():
        reasons = json.loads(row['shap_reasons'])
        logger.info(f"\nRetailer {row['retailer_id']}:")
        for r in reasons:
            logger.info(f"  → {r['text']} (SHAP: {r['shap']:+.3f})")

    shap_df.to_sql('shap_explanations', engine, if_exists='replace', index=False)
    logger.info(f'\nSaved {len(shap_df):,} SHAP explanations to database.')
    logger.info('✅ SHAP explanations generated successfully.')
