from sqlalchemy import create_engine, text
engine = create_engine('postgresql://agripulse:agripulse123@localhost:5432/agripulse')
with engine.connect() as conn:
    # Get top retailer for REP_0016
    top = conn.execute(text("""
        SELECT retailer_id, opportunity_score 
        FROM daily_scores 
        WHERE rep_id = 'REP_0016' AND score_date = '2026-05-18' 
        ORDER BY opportunity_score DESC LIMIT 1
    """)).fetchone()
    print(f'Top retailer before: {top[0]} score={top[1]:.3f}')
    
    # Drop its score to simulate post-visit
    conn.execute(text("""
        UPDATE daily_scores 
        SET opportunity_score = 0.41, 
            action_code = 'LOW_PRIORITY', 
            action_label = 'Low Priority: Recently visited — monitor next cycle',
            priority = 4
        WHERE retailer_id = :rid AND score_date = '2026-05-18'
    """), {'rid': top[0]})
    conn.commit()
    print(f'Updated {top[0]} score to 0.41 — pull to refresh in app')
