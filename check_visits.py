from sqlalchemy import create_engine, text
import os
e = create_engine(os.environ['DATABASE_URL'])
with e.connect() as c:
    rows = c.execute(text("SELECT visit_date, visit_tehsil, rep_id FROM retailer_visit_log ORDER BY visit_date DESC LIMIT 10")).fetchall()
    print(f"Last {len(rows)} visits in Railway DB:")
    for r in rows:
        print(r)
