from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv(override=False)

DATABASE_URL = os.environ.get('DATABASE_URL') or 'postgresql://agripulse:agripulse123@localhost:5432/agripulse'

import logging
logging.info(f'DATABASE_URL host: {DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else "local"}')

base_url = DATABASE_URL.split('?')[0]
is_railway = 'rlwy.net' in base_url or 'railway.internal' in base_url

if is_railway:
    engine = create_engine(base_url, connect_args={'sslmode': 'require', 'sslrootcert': 'disable'})
else:
    engine = create_engine(base_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
