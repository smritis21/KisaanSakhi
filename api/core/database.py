from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv(override=False)

DATABASE_URL = os.environ.get('DATABASE_URL') or os.getenv('DATABASE_URL', 'postgresql://agripulse:agripulse123@localhost:5432/agripulse')

if 'railway.internal' in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.split('?')[0] + '?sslmode=disable'

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
