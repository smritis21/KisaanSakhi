from sqlalchemy import create_engine, text
import os

e = create_engine(os.environ['DATABASE_URL'])
with e.connect() as c:
    # RTL_00120 score in Railway
    r = c.execute(text("SELECT retailer_id, opportunity_score, action_code, days_since_last_visit, score_date FROM daily_scores WHERE retailer_id = 'RTL_00120'")).fetchone()
    print("RTL_00120:", r)

    # REP_0016 top 5
    rows = c.execute(text("SELECT retailer_id, opportunity_score, action_code FROM daily_scores WHERE rep_id = 'REP_0016' ORDER BY opportunity_score DESC LIMIT 5")).fetchall()
    print("REP_0016 top 5:", rows)
