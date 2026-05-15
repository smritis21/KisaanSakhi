from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from api.core.database import get_db
from api.core.auth import verify_token
from datetime import date
import json

router = APIRouter()


@router.get('/{rep_id}/priority-list')
def get_priority_list(
    rep_id: str,
    score_date: str = Query(default=None),
    limit: int = Query(default=20, le=50),
    db: Session = Depends(get_db),
    token: str = Depends(verify_token),
):
    if score_date is None:
        score_date = str(date.today())

    rows = db.execute(text("""
        SELECT
            retailer_id, territory_id, tehsil, district, state,
            opportunity_score, anomaly_flag, anomaly_score,
            action_code, action_label, priority,
            top_reason_text, shap_reasons,
            days_since_last_visit, stockout_flag,
            pos_revenue_30d, tilt_stock, days_to_stockout,
            score_date
        FROM daily_scores
        WHERE rep_id = :rep_id
          AND score_date = :score_date
        ORDER BY priority ASC, opportunity_score DESC
        LIMIT :limit
    """), {'rep_id': rep_id, 'score_date': score_date, 'limit': limit}).fetchall()

    retailers = []
    for r in rows:
        row = dict(r._mapping)
        if row.get('shap_reasons') and isinstance(row['shap_reasons'], str):
            try:
                row['shap_reasons'] = json.loads(row['shap_reasons'])
            except Exception:
                pass
        retailers.append(row)

    return {
        'rep_id':     rep_id,
        'score_date': score_date,
        'count':      len(retailers),
        'retailers':  retailers,
    }


@router.post('/{rep_id}/route-suggestion')
def get_route_suggestion(
    rep_id: str,
    score_date: str = Query(default=None),
    db: Session = Depends(get_db),
    token: str = Depends(verify_token),
):
    if score_date is None:
        score_date = str(date.today())

    rows = db.execute(text("""
        SELECT tehsil, COUNT(*) as retailer_count,
               AVG(opportunity_score) as avg_score,
               SUM(CASE WHEN stockout_flag = 1 THEN 1 ELSE 0 END) as stockout_count
        FROM daily_scores
        WHERE rep_id = :rep_id
          AND score_date = :score_date
          AND priority <= 2
        GROUP BY tehsil
        ORDER BY retailer_count DESC, avg_score DESC
    """), {'rep_id': rep_id, 'score_date': score_date}).fetchall()

    return {
        'rep_id':       rep_id,
        'score_date':   score_date,
        'tehsil_route': [dict(r._mapping) for r in rows],
    }
