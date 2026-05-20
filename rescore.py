"""
Rescore pipeline - finds recently visited retailers, resets their
days_since_last_visit, and re-runs SHAP + inference against Railway DB.
"""
import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from datetime import datetime, timedelta

load_dotenv()

DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://agripulse:agripulse123@localhost:5432/agripulse')
engine = create_engine(DATABASE_URL)

# Find retailers visited with VISIT_COMPLETE in the last 24 hours
with engine.connect() as conn:
    rows = conn.execute(text("""
        SELECT DISTINCT retailer_id, rep_id, visit_tehsil
        FROM retailer_visit_log
        WHERE visit_date >= :since
          AND outcome_code = 'VISIT_COMPLETE'
          AND retailer_id IS NOT NULL
    """), {'since': (datetime.now() - timedelta(hours=24)).date()}).fetchall()

visited = [(r[0], r[1], r[2]) for r in rows]

if not visited:
    print("No completed visits logged in the last 24 hours.")
else:
    print(f"Found {len(visited)} completed visits: {[v[0] for v in visited]}")
    with engine.connect() as conn:
        for retailer_id, rep_id, tehsil in visited:
            result = conn.execute(text("""
                UPDATE feature_matrix
                SET days_since_last_visit = 0
                WHERE retailer_id = :retailer_id
            """), {'retailer_id': retailer_id})
            print(f"  Reset {retailer_id} days_since_last_visit=0")
        conn.commit()

# Re-run explain and inference — pass DATABASE_URL explicitly
import subprocess

env = {**os.environ, 'DATABASE_URL': DATABASE_URL}

print("\n>>> Running ml/explain.py...")
result = subprocess.run([sys.executable, 'ml/explain.py'], env=env)
if result.returncode != 0:
    print("ERROR in ml/explain.py")
    sys.exit(1)

print("\n>>> Running ml/inference_pipeline.py...")
result = subprocess.run([sys.executable, 'ml/inference_pipeline.py'], env=env)
if result.returncode != 0:
    print("ERROR in ml/inference_pipeline.py")
    sys.exit(1)

# Clear anomaly flag AFTER inference so it doesn't get overwritten
# Also apply a visit penalty to the score — model can't do this well
# because days_since_last_visit has only 5% feature importance
if visited:
    with engine.connect() as conn:
        for retailer_id, rep_id, tehsil in visited:
            conn.execute(text("""
                UPDATE daily_scores
                SET anomaly_flag = 0,
                    anomaly_score = 0,
                    opportunity_score = GREATEST(opportunity_score * 0.55, 0.05),
                    action_code = CASE
                        WHEN opportunity_score * 0.55 > 0.6 THEN 'STANDARD_VISIT'
                        ELSE 'LOW_PRIORITY'
                    END,
                    action_label = CASE
                        WHEN opportunity_score * 0.55 > 0.6 THEN 'Standard Visit: Good opportunity this week'
                        ELSE 'Low Priority: Recently visited — monitor'
                    END,
                    priority = CASE
                        WHEN opportunity_score * 0.55 > 0.6 THEN 3
                        ELSE 4
                    END
                WHERE retailer_id = :retailer_id
            """), {'retailer_id': retailer_id})
            print(f"  Post-inference: penalised score + cleared anomaly for {retailer_id}")
        conn.commit()

print("\nDone. Pull to refresh in the app to see updated scores.")
