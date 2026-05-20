from sqlalchemy import create_engine, text
import os

e = create_engine(os.environ['DATABASE_URL'])
with e.connect() as c:
    # Add missing columns
    try:
        c.execute(text("ALTER TABLE retailer_visit_log ADD COLUMN retailer_id VARCHAR(20)"))
        print("Added retailer_id")
    except Exception as ex:
        print(f"retailer_id: {ex}")
    try:
        c.execute(text("ALTER TABLE retailer_visit_log ADD COLUMN visit_timestamp TIMESTAMP"))
        print("Added visit_timestamp")
    except Exception as ex:
        print(f"visit_timestamp: {ex}")
    try:
        c.execute(text("ALTER TABLE retailer_visit_log ADD COLUMN outcome_code VARCHAR(30)"))
        print("Added outcome_code")
    except Exception as ex:
        print(f"outcome_code: {ex}")
    c.commit()
    print("Done")
