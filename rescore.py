"""
Rescore pipeline - finds recently visited retailers, resets their
days_since_last_visit, and re-runs SHAP + inference against Railway DB.
"""
import os
import sys
from sqlalchemy import create_engine, text
from datetime import datetime, timedelta

DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://agripulse:agripulse123@localhost:5432/agripulse')
engine = create_engine(DATABASE_URL)

# Find tehsils visited in the last 24 hours
with engine.connect() as conn:
    rows = conn.execute(text("""
        SELECT DISTINCT v.rep_id, v.visit_tehsil
        FROM retailer_visit_log v
        WHERE v.visit_date >= :since
    """), {'since': (datetime.now() - timedelta(hours=24)).date()}).fetchall()

visited = [(r[0], r[1]) for r in rows]

if not visited:
    print("No visits logged in the last 24 hours.")
else:
    print(f"Found visits in tehsils: {[v[1] for v in visited]}")
    with engine.connect() as conn:
        for rep_id, tehsil in visited:
            result = conn.execute(text("""
                UPDATE feature_matrix SET days_since_last_visit = 0
                WHERE retailer_id IN (
                    SELECT retailer_id FROM retailers WHERE tehsil = :tehsil
                )
            """), {'tehsil': tehsil})
            print(f"  Reset {result.rowcount} retailers in {tehsil}")
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

print("\n✅ Done. Pull to refresh in the app to see updated scores.")
