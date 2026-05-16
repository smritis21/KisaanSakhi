import pandas as pd
from sqlalchemy import create_engine, text
from pathlib import Path
import logging
import os
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://agripulse:agripulse123@localhost:5432/agripulse')
engine = create_engine(DATABASE_URL)

DATASETS = {
    'retailer_pos':              'Dataset/retailer_pos.csv',
    'retailer_visit_log':        'Dataset/retailer_visit_log.csv',
    'retailer_inventory_weekly': 'Dataset/retailer_inventory_weekly.csv',
    'retailers':                 'Dataset/retailers.csv',
    'reps_territory':            'Dataset/reps_territory.csv',
    'growers':                   'Dataset/growers.csv',
    'whatsapp_campaign':         'Dataset/whatsapp_campaign.csv',
    'digital_funnel_weekly':     'Dataset/digital_funnel_weekly.csv',
}

DATE_COLS = {
    'retailer_pos':              ['transaction_date'],
    'retailer_visit_log':        ['visit_date'],
    'retailer_inventory_weekly': ['week_end_date'],
    'whatsapp_campaign':         ['message_sent_date'],
    'digital_funnel_weekly':     ['week_start_date'],
}

def ingest_all(data_dir: str = 'Dataset'):
    for table_name, rel_path in DATASETS.items():
        path = Path(rel_path)
        if not path.exists():
            logger.warning(f'Dataset not found: {path}')
            continue

        df = pd.read_csv(path, low_memory=False)
        logger.info(f'Read {len(df)} rows from {path.name}')

        for col in DATE_COLS.get(table_name, []):
            if col in df.columns:
                df[col] = pd.to_datetime(df[col], errors='coerce')

        # Drop rows with null primary key where applicable
        if 'retailer_id' in df.columns:
            before = len(df)
            df = df.dropna(subset=['retailer_id'])
            dropped = before - len(df)
            if dropped > 0:
                logger.warning(f'{table_name}: dropped {dropped} rows with null retailer_id')

        # Use chunks to avoid memory issues
        df.to_sql(table_name, engine, if_exists='replace', index=False, chunksize=10000)
        logger.info(f'Loaded {len(df)} rows into table: {table_name}')

    logger.info('All datasets ingested successfully.')

def verify():
    with engine.connect() as conn:
        # Rollback any failed transaction
        conn.execute(text('ROLLBACK'))
        conn.commit()
        
        for table in DATASETS.keys():
            try:
                result = conn.execute(text(f'SELECT COUNT(*) FROM {table}')).scalar()
                logger.info(f'{table}: {result} rows')
            except Exception as e:
                logger.error(f'{table}: {e}')

if __name__ == '__main__':
    ingest_all()
    verify()