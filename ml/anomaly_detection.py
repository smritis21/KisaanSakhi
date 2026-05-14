import pandas as pd
import numpy as np
import joblib
import pathlib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv
import logging

load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://agripulse:agripulse123@localhost:5432/agripulse')
engine = create_engine(DATABASE_URL)

pathlib.Path('models').mkdir(exist_ok=True)

ANOMALY_FEATURES = [
    'days_since_last_visit',
    'pos_revenue_7d',
    'pos_revenue_30d',
    'pos_revenue_mom_growth',
    'tilt_stock',
    'tilt_depletion_rate',
    'total_stock',
    'avg_depletion',
    'txn_count_30d',
]


def train_anomaly_detector(features_df: pd.DataFrame):
    available = [c for c in ANOMALY_FEATURES if c in features_df.columns]
    X = features_df[available].fillna(0)

    scaler   = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    iso = IsolationForest(
        n_estimators=200,
        contamination=0.05,
        random_state=42,
        n_jobs=-1,
    )
    iso.fit(X_scaled)

    joblib.dump(iso,     'models/isolation_forest.pkl')
    joblib.dump(scaler,  'models/anomaly_scaler.pkl')
    joblib.dump(available, 'models/anomaly_features.pkl')
    logger.info(f'Anomaly detector trained on {len(features_df):,} retailers.')
    logger.info(f'Features used: {available}')
    return iso, scaler


def score_anomalies(features_df: pd.DataFrame) -> pd.DataFrame:
    iso      = joblib.load('models/isolation_forest.pkl')
    scaler   = joblib.load('models/anomaly_scaler.pkl')
    avail    = joblib.load('models/anomaly_features.pkl')

    X        = features_df[avail].fillna(0)
    X_scaled = scaler.transform(X)

    raw_scores  = iso.decision_function(X_scaled)
    predictions = iso.predict(X_scaled)  # -1 = anomaly, 1 = normal

    # Normalise to [0,1] where 1 = most anomalous
    normalised = 1 - (raw_scores - raw_scores.min()) / (raw_scores.max() - raw_scores.min() + 1e-9)

    result = features_df[['retailer_id']].copy()
    result['anomaly_score'] = normalised.round(4)
    result['anomaly_flag']  = (predictions == -1).astype(int)

    flagged = result['anomaly_flag'].sum()
    logger.info(f'Anomalies flagged: {flagged} / {len(result)} ({flagged/len(result):.1%})')
    return result


if __name__ == '__main__':
    logger.info('Loading feature matrix...')
    features = pd.read_sql('SELECT * FROM feature_matrix', engine)

    iso, scaler = train_anomaly_detector(features)

    anomalies = score_anomalies(features)
    logger.info('\nAnomaly score distribution:')
    logger.info(anomalies['anomaly_score'].describe().to_string())

    logger.info('\nSample anomalous retailers:')
    logger.info(anomalies[anomalies['anomaly_flag'] == 1].head(10).to_string())

    anomalies.to_sql('anomaly_scores', engine, if_exists='replace', index=False)
    logger.info('Anomaly scores saved to database.')
