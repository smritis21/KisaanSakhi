from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv(override=False)

# Try DATABASE_URL first, fall back to individual PG* vars
DATABASE_URL = os.environ.get('DATABASE_URL')

if not DATABASE_URL:
    pg_host = os.environ.get('PGHOST', 'localhost')
    pg_port = os.environ.get('PGPORT', '5432')
    pg_user = os.environ.get('PGUSER', 'agripulse')
    pg_pass = os.environ.get('PGPASSWORD', 'agripulse123')
    pg_db = os.environ.get('PGDATABASE', 'agripulse')
    DATABASE_URL = f'postgresql://{pg_user}:{pg_pass}@{pg_host}:{pg_port}/{pg_db}'

import logging
base_url = DATABASE_URL.split('?')[0]
is_railway = 'rlwy.net' in base_url or 'railway.internal' in base_url
logging.warning(f'DB connecting to: {base_url.split("@")[-1]} ssl_disabled={is_railway}')

if is_railway:
    engine = create_engine(base_url, connect_args={'sslmode': 'disable', 'gssencmode': 'disable'})
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
