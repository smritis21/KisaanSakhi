from sqlalchemy import create_engine, text
import os

e = create_engine(os.environ['DATABASE_URL'])
with e.connect() as c:
    # Bulk update all null timestamps at once with random times between 15:00-20:00
    c.execute(text("""
        UPDATE retailer_visit_log 
        SET visit_timestamp = visit_date + 
            (floor(random() * 5 + 15) || ' hours')::interval +
            (floor(random() * 60) || ' minutes')::interval +
            (floor(random() * 60) || ' seconds')::interval
        WHERE visit_timestamp IS NULL
    """))
    c.commit()
    print("Done")
