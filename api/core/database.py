from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import logging
from dotenv import load_dotenv

load_dotenv(override=False)

DATABASE_URL = os.environ.get('DATABASE_URL')

if not DATABASE_URL:
    pg_host = os.environ.get('PGHOST', 'localhost')
    pg_port = os.environ.get('PGPORT', '5432')
    pg_user = os.environ.get('PGUSER', 'agripulse')
    pg_pass = os.environ.get('PGPASSWORD', 'agripulse123')
    pg_db = os.environ.get('PGDATABASE', 'agripulse')
    DATABASE_URL = f'postgresql://{pg_user}:{pg_pass}@{pg_host}:{pg_port}/{pg_db}'

ssl_mode = os.getenv('DATABASE_SSL_MODE', 'require')
connect_args = {'sslmode': ssl_mode}

logging.warning(f'DB connecting to: {DATABASE_URL.split("@")[-1].split("?")[0]} sslmode={ssl_mode}')

engine = create_engine(DATABASE_URL.split('?')[0], connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
