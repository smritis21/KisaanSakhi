from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from api.core.database import get_db
from api.core.auth import verify_token
from datetime import date
import json

router = APIRouter()


@router.get('/{retailer_id}/opportunity')
def get_opportunity(
    retailer_id: str,
    score_date: str = Query(default=None),
    db: Session = Depends(get_db),
    token: str = Depends(verify_token),
):
    if score_date is None:
        score_date = str(date.today())

    row = db.execute(text("""
        SELECT * FROM daily_scores
        WHERE retailer_id = :rid AND score_date = :score_date
    """), {'rid': retailer_id, 'score_date': score_date}).fetchone()

    if not row:
        return {'error': f'No score found for {retailer_id} on {score_date}'}

    result = dict(row._mapping)
    if result.get('shap_reasons') and isinstance(result['shap_reasons'], str):
        try:
            result['shap_reasons'] = json.loads(result['shap_reasons'])
        except Exception:
            pass
    return result


@router.get('/{retailer_id}/anomalies')
def get_anomalies(
    retailer_id: str,
    db: Session = Depends(get_db),
    token: str = Depends(verify_token),
):
    row = db.execute(text("""
        SELECT retailer_id, anomaly_score, anomaly_flag
        FROM anomaly_scores
        WHERE retailer_id = :rid
    """), {'rid': retailer_id}).fetchone()

    if not row:
        return {'error': f'No anomaly data for {retailer_id}'}
    return dict(row._mapping)
