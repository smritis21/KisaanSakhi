"""
Daily Scoring Pipeline - Dynamic Configuration
Uses config.yaml for all paths and settings
"""
import pandas as pd
import joblib
import json
from sqlalchemy import create_engine
from datetime import date, datetime
import os
import sys
from pathlib import Path

# Add config to path
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import get, get_database_url, load_config

# Load configuration
load_config()
DATABASE_URL = get_database_url()
engine = create_engine(DATABASE_URL)

# Dynamic model paths from config
MODELS_DIR = get('ml.models_dir', 'models')


def get_model_path(model_name: str) -> str:
    """Get full path to model file"""
    return os.path.join(MODELS_DIR, model_name)


def run_daily_scoring(score_date: str = None):
    """
    Run daily scoring for all retailers.
    Uses dynamic configuration for all parameters.
    """
    if score_date is None:
        score_date = str(date.today())
    
    score_date_ts = pd.Timestamp(score_date)
    print(f'Running daily scoring for {score_date}')
    
    # Load models dynamically
    model_path = get_model_path(get('ml.xgboost_model', 'xgboost_opportunity_scorer.pkl'))
    f_cols_path = get_model_path(get('ml.feature_cols', 'feature_cols.pkl'))
    iso_path = get_model_path(get('ml.isolation_forest', 'isolation_forest.pkl'))
    scaler_path = get_model_path(get('ml.anomaly_scaler', 'anomaly_scaler.pkl'))
    avail_path = get_model_path(get('ml.anomaly_features', 'anomaly_features.pkl'))
    
    model = joblib.load(model_path)
    f_cols = joblib.load(f_cols_path)
    iso = joblib.load(iso_path)
    scaler = joblib.load(scaler_path)
    avail = joblib.load(avail_path)
    
    # Load feature matrix
    features = pd.read_sql('SELECT * FROM feature_matrix', engine)
    retailers = pd.read_sql('SELECT retailer_id, territory_id, tehsil, district, state FROM retailers', engine)
    reps = pd.read_sql('SELECT rep_id, territory_id FROM reps_territory', engine)
    shap_df = pd.read_sql('SELECT retailer_id, shap_reasons, top_reason_text FROM shap_explanations', engine)
    
    # XGBoost scoring
    X = features[f_cols].fillna(0)
    features['opportunity_score'] = model.predict_proba(X)[:, 1]
    print(f'Scored {len(features):,} retailers')
    
    # Anomaly scoring with dynamic contamination
    X_anom = features[avail].fillna(0)
    X_scaled = scaler.transform(X_anom)
    raw_scores = iso.decision_function(X_scaled)
    preds = iso.predict(X_scaled)
    normalised = 1 - (raw_scores - raw_scores.min()) / (raw_scores.max() - raw_scores.min() + 1e-9)
    features['anomaly_score'] = normalised.round(4)
    features['anomaly_flag'] = (preds == -1).astype(int)
    
    # Next Best Action with dynamic rules
    from ml.next_best_action import assign_actions_batch
    features = assign_actions_batch(features)
    
    # Merge SHAP explanations
    features = features.merge(shap_df, on='retailer_id', how='left')
    
    # Assign rep_id via territory_id
    features = features.merge(reps, on='territory_id', how='left')
    
    # Build daily_scores table with dynamic output columns
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
    print(f'Wrote {len(output):,} score records for {score_date}')
    
    # Log scoring summary
    print(f"\nScoring Summary:")
    print(f"  High priority (score > 0.7): {(output['opportunity_score'] > 0.7).sum()}")
    print(f"  Medium priority (0.5-0.7): {((output['opportunity_score'] >= 0.5) & (output['opportunity_score'] <= 0.7)).sum()}")
    print(f"  Low priority (< 0.5): {(output['opportunity_score'] < 0.5).sum()}")
    print(f"  Anomalies detected: {output['anomaly_flag'].sum()}")
    
    return output


def run_scoring_for_rep(rep_id: str, score_date: str = None) -> pd.DataFrame:
    """Run scoring for a specific rep's territory"""
    if score_date is None:
        score_date = str(date.today())
    
    # First run full scoring
    output = run_daily_scoring(score_date)
    
    # Filter for rep
    rep_scores = output[output['rep_id'] == rep_id]
    print(f"\nFiltered {len(rep_scores)} retailers for rep {rep_id}")
    
    return rep_scores


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Daily Scoring Pipeline')
    parser.add_argument('--date', type=str, help='Score date (YYYY-MM-DD)')
    parser.add_argument('--rep', type=str, help='Filter by rep_id')
    args = parser.parse_args()
    
    if args.rep:
        result = run_scoring_for_rep(args.rep, args.date)
    else:
        result = run_daily_scoring(args.date)
    
    print(f'\nTop 5 priority retailers:')
    top5 = result.sort_values('opportunity_score', ascending=False).head(5)
    for _, r in top5.iterrows():
        print(f"  {r['retailer_id']} | {r.get('district', '?')} | score={r['opportunity_score']:.3f} | {r.get('action_label', '?')[:40]}")