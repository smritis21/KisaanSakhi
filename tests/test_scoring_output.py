import pandas as pd
import joblib
import json
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv('DATABASE_URL', 'postgresql://agripulse:agripulse123@localhost:5432/agripulse'))

# Load model
model  = joblib.load('models/xgboost_opportunity_scorer.pkl')
f_cols = joblib.load('models/feature_cols.pkl')

# Load features
features  = pd.read_sql('SELECT * FROM feature_matrix', engine)
retailers = pd.read_sql('SELECT retailer_id, district, state FROM retailers', engine)
anomalies = pd.read_sql('SELECT retailer_id, anomaly_flag, anomaly_score FROM anomaly_scores', engine)
shap_df   = pd.read_sql('SELECT retailer_id, top_reason_text FROM shap_explanations', engine)

# Score all retailers
X = features[f_cols].fillna(0)
features['opportunity_score'] = model.predict_proba(X)[:, 1]

# Merge everything
result = (
    features[['retailer_id', 'opportunity_score', 'days_since_last_visit', 'stockout_flag', 'pos_revenue_30d']]
    .merge(retailers, on='retailer_id')
    .merge(anomalies, on='retailer_id')
    .merge(shap_df, on='retailer_id')
    .sort_values('opportunity_score', ascending=False)
)

print('\n' + '='*80)
print('TOP 15 PRIORITY RETAILERS — AgriPulse AI')
print('='*80)
print(f'{"Rank":<5} {"Retailer":<12} {"District":<15} {"State":<15} {"Score":<7} {"Days No Visit":<15} {"Stockout":<10} {"Anomaly":<9} {"Top Reason"}')
print('-'*80)
for i, row in result.head(15).iterrows():
    rank = result.index.get_loc(i) + 1
    print(f'{rank:<5} {row.retailer_id:<12} {row.district:<15} {row.state:<15} {row.opportunity_score:.3f}  {int(row.days_since_last_visit):<15} {"YES" if row.stockout_flag else "no":<10} {"YES" if row.anomaly_flag else "no":<9} {row.top_reason_text[:40]}')

print('\n' + '='*80)
print(f'Total retailers scored: {len(result):,}')
print(f'High priority (score > 0.8): {(result.opportunity_score > 0.8).sum():,}')
print(f'Stockout risk: {result.stockout_flag.sum():,}')
print(f'Anomalies flagged: {result.anomaly_flag.sum():,}')
print('='*80)
