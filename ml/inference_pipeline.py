import pandas as pd
import joblib
import json
from sqlalchemy import create_engine
from datetime import date
import os
from dotenv import load_dotenv
import logging

load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://agripulse:agripulse123@localhost:5432/agripulse')
engine = create_engine(DATABASE_URL)


def run_daily_scoring(score_date: str = None):
    if score_date is None:
        score_date = str(date.today())

    logger.info(f'Running daily scoring for {score_date}')

    # Load models
    model      = joblib.load('models/xgboost_opportunity_scorer.pkl')
    f_cols     = joblib.load('models/feature_cols.pkl')
    iso        = joblib.load('models/isolation_forest.pkl')
    scaler     = joblib.load('models/anomaly_scaler.pkl')
    avail      = joblib.load('models/anomaly_features.pkl')

    # Load feature matrix
    features   = pd.read_sql('SELECT * FROM feature_matrix', engine)
    retailers  = pd.read_sql('SELECT retailer_id, territory_id, tehsil, district, state FROM retailers', engine)
    reps       = pd.read_sql('SELECT rep_id, territory_id FROM reps_territory', engine)
    shap_df    = pd.read_sql('SELECT retailer_id, shap_reasons, top_reason_text FROM shap_explanations', engine)

    # XGBoost scoring
    X = features[f_cols].fillna(0)
    features['opportunity_score'] = model.predict_proba(X)[:, 1]
    logger.info(f'Scored {len(features):,} retailers')

    # Anomaly scoring
    X_anom     = features[avail].fillna(0)
    X_scaled   = scaler.transform(X_anom)
    raw_scores = iso.decision_function(X_scaled)
    preds      = iso.predict(X_scaled)
    normalised = 1 - (raw_scores - raw_scores.min()) / (raw_scores.max() - raw_scores.min() + 1e-9)
    features['anomaly_score'] = normalised.round(4)
    features['anomaly_flag']  = (preds == -1).astype(int)

    # NBA
    import sys, os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from ml.next_best_action import assign_actions_batch
    features = assign_actions_batch(features)

    # feature_matrix already has territory_id, tehsil, district, state
    # Merge SHAP
    features = features.merge(shap_df, on='retailer_id', how='left')

    # Assign rep_id via territory_id
    features = features.merge(reps, on='territory_id', how='left')

    # Build daily_scores table
    output_cols = [
        'retailer_id', 'rep_id', 'territory_id', 'tehsil', 'district', 'state',
        'opportunity_score', 'anomaly_score', 'anomaly_flag',
        'action_code', 'action_label', 'priority',
        'top_reason_text', 'shap_reasons',
        'days_since_last_visit', 'stockout_flag', 'pos_revenue_30d',
        'tilt_stock', 'days_to_stockout',
    ]
    available_cols = [c for c in output_cols if c in features.columns]
    output = features[available_cols].copy()
    output['score_date'] = score_date

    output.to_sql('daily_scores', engine, if_exists='replace', index=False)
    logger.info(f'Wrote {len(output):,} score records for {score_date}')
    return output


if __name__ == '__main__':
    result = run_daily_scoring()
    logger.info(f'\nTop 5 priority retailers:')
    top5 = result.sort_values('opportunity_score', ascending=False).head(5)
    for _, r in top5.iterrows():
        logger.info(f"  {r['retailer_id']} | {r.get('district','?')} | score={r['opportunity_score']:.3f} | {r.get('action_label','?')[:40]}")
