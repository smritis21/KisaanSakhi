from sqlalchemy import create_engine, text
engine = create_engine('postgresql://agripulse:agripulse123@localhost:5432/agripulse')
with engine.connect() as conn:
    rows = conn.execute(text("""
        SELECT rep_id, COUNT(*) as cnt, 
               ROUND(AVG(opportunity_score)::numeric, 3) as avg_score,
               SUM(CASE WHEN anomaly_flag=1 THEN 1 ELSE 0 END) as anomalies,
               SUM(CASE WHEN stockout_flag=1 THEN 1 ELSE 0 END) as stockouts
        FROM daily_scores 
        WHERE score_date = '2026-05-18'
        GROUP BY rep_id 
        ORDER BY cnt DESC, anomalies DESC
        LIMIT 10
    """)).fetchall()
    print('Rep ID        | Retailers | Avg Score | Anomalies | Stockouts')
    print('-' * 60)
    for r in rows:
        print(f"  {r[0]}  |    {r[1]}     |   {r[2]}   |     {r[3]}     |     {r[4]}")
