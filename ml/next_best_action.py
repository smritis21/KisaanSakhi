import pandas as pd

ACTION_RULES = [
    (lambda r: r.get('stockout_flag', 0) == 1 and r.get('opportunity_score', 0) > 0.7,
     'URGENT_RESTOCK', 'Urgent: Restock Tilt 250 EC — stockout imminent', 1),

    (lambda r: r.get('anomaly_flag', 0) == 1 and r.get('pos_revenue_mom_growth', 0) > 0.3,
     'INVESTIGATE_SPIKE', 'Investigate: Unusual POS demand spike detected', 2),

    (lambda r: r.get('days_since_last_visit', 0) > 21 and r.get('opportunity_score', 0) > 0.7,
     'OVERDUE_HIGH', 'Overdue Visit: High-opportunity retailer not visited in 21+ days', 1),

    (lambda r: r.get('days_since_last_visit', 0) > 14 and r.get('opportunity_score', 0) > 0.6,
     'OVERDUE_VISIT', 'Overdue Visit: Retailer due for follow-up', 2),

    (lambda r: r.get('anomaly_flag', 0) == 1,
     'ANOMALY_ALERT', 'Anomaly Detected: Unusual pattern — investigate on visit', 2),

    (lambda r: r.get('opportunity_score', 0) > 0.6,
     'STANDARD_VISIT', 'Standard Visit: Good opportunity this week', 3),

    (lambda r: True,
     'LOW_PRIORITY', 'Low Priority: Monitor — no immediate action needed', 4),
]


def assign_action(retailer_row: dict) -> dict:
    for condition, code, label, priority in ACTION_RULES:
        if condition(retailer_row):
            return {'action_code': code, 'action_label': label, 'priority': priority}


def assign_actions_batch(df: pd.DataFrame) -> pd.DataFrame:
    actions = df.apply(lambda row: pd.Series(assign_action(row.to_dict())), axis=1)
    return pd.concat([df, actions], axis=1)
