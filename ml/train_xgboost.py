import pandas as pd
import numpy as np
import xgboost as xgb
import joblib
import pathlib
from sqlalchemy import create_engine
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, classification_report, confusion_matrix
from sklearn.preprocessing import LabelEncoder
import os
from dotenv import load_dotenv
import logging

load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://agripulse:agripulse123@localhost:5432/agripulse')
engine = create_engine(DATABASE_URL)

pathlib.Path('models').mkdir(exist_ok=True)

FEATURE_COLS = [
    'days_since_last_visit', 'visit_count_30d', 'visit_count_90d',
    'pos_revenue_7d', 'pos_revenue_30d', 'pos_revenue_90d',
    'pos_revenue_mom_growth', 'txn_count_30d',
    'tilt_stock', 'tilt_depletion_rate', 'days_to_stockout', 'stockout_flag',
    'total_stock', 'avg_depletion', 'sku_count',
    'state_encoded', 'district_encoded', 'tehsil_encoded',
]


def train():
    logger.info('Loading feature matrix and labels...')

    features = pd.read_sql('SELECT * FROM feature_matrix', engine)
    labels   = pd.read_sql(
        'SELECT retailer_id, converted FROM visit_labels WHERE retailer_id IS NOT NULL',
        engine
    )

    # Aggregate labels per retailer — majority vote
    retailer_labels = (
        labels.groupby('retailer_id')['converted']
        .agg(lambda x: int(x.mean() >= 0.5))
        .reset_index()
    )

    df = features.merge(retailer_labels, on='retailer_id', how='inner')
    logger.info(f'Training set size: {len(df):,} retailers')

    available = [c for c in FEATURE_COLS if c in df.columns]
    missing   = [c for c in FEATURE_COLS if c not in df.columns]
    if missing:
        logger.warning(f'Missing features (will skip): {missing}')

    X = df[available].fillna(0)
    y = df['converted']

    logger.info(f'Class distribution: {y.value_counts().to_dict()}')

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    scale_pos_weight = (y_train == 0).sum() / max((y_train == 1).sum(), 1)
    logger.info(f'scale_pos_weight: {scale_pos_weight:.2f}')

    model = xgb.XGBClassifier(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=scale_pos_weight,
        eval_metric='auc',
        random_state=42,
        verbosity=0,
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=50,
    )

    y_pred_proba = model.predict_proba(X_test)[:, 1]
    y_pred       = (y_pred_proba >= 0.5).astype(int)
    auc          = roc_auc_score(y_test, y_pred_proba)

    logger.info('=' * 50)
    logger.info(f'TEST AUC: {auc:.4f}')
    logger.info('=' * 50)
    logger.info('\n' + classification_report(y_test, y_pred))

    if auc >= 0.72:
        logger.info('✅ AUC target met (>= 0.72)')
    else:
        logger.warning(f'⚠️  AUC {auc:.4f} below target 0.72')

    # Save model and metadata
    joblib.dump(model, 'models/xgboost_opportunity_scorer.pkl')
    joblib.dump(available, 'models/feature_cols.pkl')
    logger.info('Model saved to models/xgboost_opportunity_scorer.pkl')

    # Feature importance
    importance = pd.Series(model.feature_importances_, index=available)
    importance = importance.sort_values(ascending=False)
    logger.info('\nTop 10 feature importances:')
    logger.info('\n' + importance.head(10).to_string())

    return model, available, auc


if __name__ == '__main__':
    train()
