import pandas as pd
import numpy as np
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv
import logging

load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://agripulse:agripulse123@localhost:5432/agripulse')
engine = create_engine(DATABASE_URL)


def engineer_conversion_labels(attribution_window_days: int = 5) -> pd.DataFrame:
    """
    Label = 1 if a retailer is a high-opportunity visit target.
    Criteria (ALL must be true):
      - days_since_last_visit >= 14 (needs a visit)
      - post-visit POS revenue in next 5 days > median (worth visiting)
    This ensures days_since_last_visit is a strong signal in the model.
    """
    logger.info('Loading data...')

    visits = pd.read_sql(
        'SELECT rep_id, territory_id, visit_date, visit_tehsil, visit_type, product_recommended FROM retailer_visit_log',
        engine
    )
    retailers = pd.read_sql(
        'SELECT retailer_id, territory_id, tehsil FROM retailers',
        engine
    )
    pos = pd.read_sql(
        'SELECT retailer_id, transaction_date, sku_qty, sku_price FROM retailer_pos',
        engine
    )

    visits['visit_date']       = pd.to_datetime(visits['visit_date'])
    pos['transaction_date']    = pd.to_datetime(pos['transaction_date'])
    pos['revenue']             = pos['sku_qty'] * pos['sku_price']

    logger.info(f'Visits: {len(visits):,} | Retailers: {len(retailers):,} | POS: {len(pos):,}')

    # Join visits to retailers via territory_id + tehsil match
    visits_with_retailer = visits.merge(
        retailers,
        left_on=['territory_id', 'visit_tehsil'],
        right_on=['territory_id', 'tehsil'],
        how='left'
    )

    matched = visits_with_retailer['retailer_id'].notna().sum()
    logger.info(f'Visits matched to a retailer: {matched:,} / {len(visits_with_retailer):,}')

    # Compute days since previous visit per retailer at each visit date
    visits_sorted = visits_with_retailer.dropna(subset=['retailer_id']).sort_values(['retailer_id', 'visit_date'])
    visits_sorted['prev_visit_date'] = visits_sorted.groupby('retailer_id')['visit_date'].shift(1)
    visits_sorted['days_since_prev'] = (visits_sorted['visit_date'] - visits_sorted['prev_visit_date']).dt.days.fillna(999)

    # Aggregate POS per retailer per day
    daily_pos = (
        pos.groupby(['retailer_id', 'transaction_date'])
           .agg(daily_revenue=('revenue', 'sum'), daily_txns=('revenue', 'count'))
           .reset_index()
    )
    retailer_pos_map = {rid: grp for rid, grp in daily_pos.groupby('retailer_id')}
    window = pd.Timedelta(days=attribution_window_days)

    # Compute median post-visit revenue to use as threshold
    all_post_revs = []
    for _, visit in visits_sorted.iterrows():
        rid = visit['retailer_id']
        vdate = visit['visit_date']
        rid_pos = retailer_pos_map.get(rid, pd.DataFrame())
        if not rid_pos.empty:
            mask = (rid_pos['transaction_date'] > vdate) & (rid_pos['transaction_date'] <= vdate + window)
            all_post_revs.append(rid_pos[mask]['daily_revenue'].sum())
        else:
            all_post_revs.append(0.0)
    median_rev = np.median(all_post_revs) if all_post_revs else 0
    logger.info(f'Median post-visit revenue (window={attribution_window_days}d): {median_rev:.2f}')

    results = []
    for i, (_, visit) in enumerate(visits_sorted.iterrows()):
        rid   = visit['retailer_id']
        vdate = visit['visit_date']
        days_since = visit['days_since_prev']

        rid_pos = retailer_pos_map.get(rid, pd.DataFrame())
        if not rid_pos.empty:
            mask = (rid_pos['transaction_date'] > vdate) & (rid_pos['transaction_date'] <= vdate + window)
            matched_pos = rid_pos[mask]
        else:
            matched_pos = pd.DataFrame()

        post_rev  = float(matched_pos['daily_revenue'].sum()) if not matched_pos.empty else 0.0
        post_txns = int(matched_pos['daily_txns'].sum())      if not matched_pos.empty else 0

        # Label=1 only if: overdue (>=14 days gap) AND high revenue potential
        converted = int(days_since >= 14 and post_rev > median_rev)

        results.append({
            'rep_id':              visit['rep_id'],
            'retailer_id':         rid,
            'territory_id':        visit['territory_id'],
            'visit_date':          vdate,
            'visit_tehsil':        visit['visit_tehsil'],
            'visit_type':          visit['visit_type'],
            'product_recommended': visit['product_recommended'],
            'converted':           converted,
            'post_visit_revenue':  post_rev,
            'pos_transactions':    post_txns,
            'days_since_prev_visit': days_since,
            'attribution_window':  attribution_window_days,
        })

    # Also add unvisited retailers as label=0 (recently visited = no opportunity)
    all_visited = set(visits_sorted['retailer_id'].dropna())
    all_retailers = set(retailers['retailer_id'])
    never_visited = all_retailers - all_visited
    for rid in never_visited:
        results.append({
            'rep_id': None, 'retailer_id': rid, 'territory_id': None,
            'visit_date': None, 'visit_tehsil': None, 'visit_type': None,
            'product_recommended': None, 'converted': 1,
            'post_visit_revenue': 0.0, 'pos_transactions': 0,
            'days_since_prev_visit': 999, 'attribution_window': attribution_window_days,
        })

    labels_df = pd.DataFrame(results)
    return labels_df


def validate_labels(labels_df: pd.DataFrame):
    total     = len(labels_df)
    converted = labels_df['converted'].sum()
    rate      = converted / total

    logger.info('=' * 55)
    logger.info('LABEL ENGINEERING RESULTS')
    logger.info('=' * 55)
    logger.info(f'Total visits labeled   : {total:,}')
    logger.info(f'Converted  (label=1)   : {converted:,}')
    logger.info(f'Not converted (label=0): {total - converted:,}')
    logger.info(f'Conversion rate        : {rate:.2%}')
    logger.info(f'Class balance (0:1)    : {(total - converted) / max(converted, 1):.2f}:1')
    logger.info('=' * 55)

    if 0.15 <= rate <= 0.55:
        logger.info('✅ Conversion rate is in healthy range (15-55%)')
    else:
        logger.warning(f'⚠️  Conversion rate {rate:.2%} outside expected range')

    logger.info('\nBy visit type:')
    by_type = (
        labels_df.groupby('visit_type')['converted']
        .agg(['count', 'sum', 'mean'])
        .rename(columns={'count': 'total', 'sum': 'converted', 'mean': 'conv_rate'})
    )
    by_type['conv_rate'] = by_type['conv_rate'].map('{:.2%}'.format)
    logger.info('\n' + by_type.to_string())

    logger.info('\nTop 10 tehsils by conversion rate (min 5 visits):')
    tehsil_stats = (
        labels_df.groupby('visit_tehsil')['converted']
        .agg(['count', 'mean'])
        .rename(columns={'count': 'visits', 'mean': 'conv_rate'})
        .query('visits >= 5')
        .sort_values('conv_rate', ascending=False)
        .head(10)
    )
    tehsil_stats['conv_rate'] = tehsil_stats['conv_rate'].map('{:.2%}'.format)
    logger.info('\n' + tehsil_stats.to_string())

    return rate


def run_multi_window_validation():
    logger.info('\nRunning label engineering at 3, 5, 7 day windows...')
    for window in [3, 5, 7]:
        labels = engineer_conversion_labels(attribution_window_days=window)
        rate   = labels['converted'].mean()
        logger.info(f'  Window {window}d → conversion rate: {rate:.2%}  ({labels["converted"].sum():,} / {len(labels):,})')
    logger.info('Multi-window validation complete.')


def save_labels(labels_df: pd.DataFrame):
    labels_df.to_sql('visit_labels', engine, if_exists='replace', index=False)
    logger.info(f'Saved {len(labels_df):,} labeled visits to visit_labels table.')


if __name__ == '__main__':
    labels = engineer_conversion_labels(attribution_window_days=5)
    validate_labels(labels)
    save_labels(labels)
    run_multi_window_validation()
