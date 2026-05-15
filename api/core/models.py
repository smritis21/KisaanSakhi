import joblib
import os
import logging

logger = logging.getLogger(__name__)

_models = {}

def load_models():
    global _models
    try:
        _models['xgboost']          = joblib.load('models/xgboost_opportunity_scorer.pkl')
        _models['feature_cols']     = joblib.load('models/feature_cols.pkl')
        _models['isolation_forest'] = joblib.load('models/isolation_forest.pkl')
        _models['anomaly_scaler']   = joblib.load('models/anomaly_scaler.pkl')
        _models['anomaly_features'] = joblib.load('models/anomaly_features.pkl')
        logger.info('All ML models loaded successfully.')
    except Exception as e:
        logger.error(f'Failed to load models: {e}')

def get_model(name):
    return _models.get(name)
