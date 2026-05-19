from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv(override=False)

DATABASE_URL = os.environ.get('DATABASE_URL') or 'postgresql://agripulse:agripulse123@localhost:5432/agripulse'

# Strip sslmode from URL and pass via connect_args instead
if '?' in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.split('?')[0]

is_railway = 'rlwy.net' in DATABASE_URL or 'railway.internal' in DATABASE_URL
connect_args = {'sslmode': 'disable'} if is_railway else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
