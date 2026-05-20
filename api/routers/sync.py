from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import List, Optional
from api.core.database import get_db
from api.core.auth import verify_token
from datetime import datetime, date, timezone
import json

router = APIRouter()


class VisitRecord(BaseModel):
    queue_id:        str
    retailer_id:     str
    rep_id:          str
    visit_timestamp: str
    outcome_code:    Optional[str] = None
    notes:           Optional[str] = None
    product_recommended: Optional[str] = None


class SyncPayload(BaseModel):
    visits: List[VisitRecord]


@router.post('/visits')
def sync_visits(
    payload: SyncPayload,
    db: Session = Depends(get_db),
    token: str = Depends(verify_token),
):
    inserted = 0
    for visit in payload.visits:
        try:
            db.execute(text("""
                INSERT INTO retailer_visit_log
                    (rep_id, visit_date, visit_timestamp, retailer_id, outcome_code,
                     territory_id, visit_tehsil, visit_type, product_recommended)
                SELECT
                    :rep_id, :visit_date, :visit_timestamp, :retailer_id, :outcome_code,
                    r.territory_id, r.tehsil, :visit_type, :product
                FROM retailers r
                WHERE r.retailer_id = :retailer_id
                LIMIT 1
            """), {
                'rep_id':           visit.rep_id,
                'visit_date':       visit.visit_timestamp[:10],
                'visit_timestamp':  visit.visit_timestamp,
                'retailer_id':      visit.retailer_id,
                'outcome_code':     visit.outcome_code or 'VISIT_COMPLETE',
                'visit_type':       visit.outcome_code or 'retailer meeting',
                'product':          visit.product_recommended or '',
            })
            inserted += 1
        except Exception as e:
            db.rollback()
            raise
    db.commit()
    return {
        'synced':    inserted,
        'timestamp': datetime.now(timezone.utc).isoformat(),
    }


@router.get('/visits/{rep_id}')
def get_visit_history(
    rep_id: str,
    db: Session = Depends(get_db),
    token: str = Depends(verify_token),
):
    rows = db.execute(text("""
        SELECT 
            COALESCE(retailer_id, visit_tehsil) as retailer_id,
            rep_id, visit_timestamp, visit_date,
            COALESCE(outcome_code, visit_type) as outcome_code,
            product_recommended
        FROM retailer_visit_log
        WHERE rep_id = :rep_id
        ORDER BY visit_timestamp DESC
        LIMIT 200
    """), {'rep_id': rep_id}).fetchall()
    return {'visits': [dict(r._mapping) for r in rows]}


def get_delta(
    rep_id: str,
    since: str = None,
    db: Session = Depends(get_db),
    token: str = Depends(verify_token),
):
    if since is None:
        since = str(date.today())

    rows = db.execute(text("""
        SELECT
            retailer_id, territory_id, tehsil, district, state,
            opportunity_score, anomaly_flag, anomaly_score,
            action_code, action_label, priority,
            top_reason_text, shap_reasons,
            days_since_last_visit, stockout_flag,
            pos_revenue_30d, tilt_stock, days_to_stockout,
            score_date, rep_id
        FROM daily_scores
        WHERE rep_id = :rep_id
          AND score_date >= :since
        ORDER BY priority ASC, opportunity_score DESC
    """), {'rep_id': rep_id, 'since': since}).fetchall()

    records = []
    for r in rows:
        row = dict(r._mapping)
        if row.get('shap_reasons') and isinstance(row['shap_reasons'], str):
            try:
                row['shap_reasons'] = json.loads(row['shap_reasons'])
            except Exception:
                pass
        records.append(row)

    return {
        'rep_id':         rep_id,
        'sync_timestamp': datetime.now(timezone.utc).isoformat(),
        'count':          len(records),
        'records':        records,
    }
