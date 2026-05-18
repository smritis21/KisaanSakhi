"""
Next Best Action Engine - Dynamic Configuration
Uses config.yaml for all thresholds and rules
"""
import pandas as pd
import sys
from pathlib import Path

# Add config to path
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import get_action_rules, get


def build_action_rules() -> list:
    """
    Build action rules from dynamic configuration.
    Returns list of tuples: (condition_fn, action_code, action_label, priority)
    """
    rules_config = get_action_rules()
    rules = []
    
    # Stockout rule
    if rules_config.get('stockout', {}).get('enabled', True):
        stockout = rules_config['stockout']
        rules.append((
            lambda r: r.get('stockout_flag', 0) == 1 and r.get('opportunity_score', 0) > stockout.get('min_score', 0.7),
            'URGENT_RESTOCK',
            f"Urgent: Restock Tilt 250 EC — stockout in {stockout.get('threshold_days', 14)} days or less",
            stockout.get('priority', 1)
        ))
    
    # Anomaly spike rule
    if rules_config.get('anomaly_spike', {}).get('enabled', True):
        anomaly = rules_config['anomaly_spike']
        rules.append((
            lambda r: r.get('anomaly_flag', 0) == 1 and r.get('pos_revenue_mom_growth', 0) > anomaly.get('min_revenue_growth', 0.3),
            'INVESTIGATE_SPIKE',
            'Investigate: Unusual POS demand spike detected',
            anomaly.get('priority', 2)
        ))
    
    # Overdue high priority rule
    if rules_config.get('overdue_high', {}).get('enabled', True):
        overdue = rules_config['overdue_high']
        rules.append((
            lambda r: r.get('days_since_last_visit', 0) > overdue.get('threshold_days', 21) and r.get('opportunity_score', 0) > overdue.get('min_score', 0.7),
            'OVERDUE_HIGH',
            f"Overdue Visit: High-opportunity retailer not visited in {overdue.get('threshold_days', 21)}+ days",
            overdue.get('priority', 1)
        ))
    
    # Overdue visit rule
    if rules_config.get('overdue_visit', {}).get('enabled', True):
        overdue = rules_config['overdue_visit']
        rules.append((
            lambda r: r.get('days_since_last_visit', 0) > overdue.get('threshold_days', 14) and r.get('opportunity_score', 0) > overdue.get('min_score', 0.6),
            'OVERDUE_VISIT',
            f"Overdue Visit: Retailer due for follow-up (>{overdue.get('threshold_days', 14)} days)",
            overdue.get('priority', 2)
        ))
    
    # General anomaly alert
    if rules_config.get('anomaly_spike', {}).get('enabled', True):
        rules.append((
            lambda r: r.get('anomaly_flag', 0) == 1,
            'ANOMALY_ALERT',
            'Anomaly Detected: Unusual pattern — investigate on visit',
            2
        ))
    
    # Standard visit rule
    if rules_config.get('standard_visit', {}).get('enabled', True):
        standard = rules_config['standard_visit']
        rules.append((
            lambda r: r.get('opportunity_score', 0) > standard.get('min_score', 0.6),
            'STANDARD_VISIT',
            'Standard Visit: Good opportunity this week',
            standard.get('priority', 3)
        ))
    
    # Low priority fallback
    if rules_config.get('low_priority', {}).get('enabled', True):
        rules.append((
            lambda r: True,
            'LOW_PRIORITY',
            'Low Priority: Monitor — no immediate action needed',
            4
        ))
    
    # Sort by priority
    rules.sort(key=lambda x: x[3])
    return rules


# Build rules once at module load
ACTION_RULES = build_action_rules()


def assign_action(retailer_row: dict) -> dict:
    """Assign next best action based on dynamic rules"""
    for condition, code, label, priority in ACTION_RULES:
        if condition(retailer_row):
            return {
                'action_code': code, 
                'action_label': label, 
                'priority': priority
            }
    # Fallback
    return {
        'action_code': 'LOW_PRIORITY',
        'action_label': 'Low Priority: Monitor — no immediate action needed',
        'priority': 4
    }


def assign_actions_batch(df: pd.DataFrame) -> pd.DataFrame:
    """Assign actions to entire DataFrame"""
    actions = df.apply(lambda row: pd.Series(assign_action(row.to_dict())), axis=1)
    return pd.concat([df, actions], axis=1)


def get_action_thresholds() -> dict:
    """Get current threshold values for display/debugging"""
    rules_config = get_action_rules()
    return {
        'stockout_days': rules_config.get('stockout', {}).get('threshold_days', 14),
        'overdue_high_days': rules_config.get('overdue_high', {}).get('threshold_days', 21),
        'overdue_visit_days': rules_config.get('overdue_visit', {}).get('threshold_days', 14),
        'high_score_threshold': rules_config.get('overdue_high', {}).get('min_score', 0.7),
        'standard_score_threshold': rules_config.get('standard_visit', {}).get('min_score', 0.6),
    }


if __name__ == '__main__':
    print("Action Rules Configuration:")
    thresholds = get_action_thresholds()
    for key, value in thresholds.items():
        print(f"  {key}: {value}")
    
    print(f"\nTotal rules defined: {len(ACTION_RULES)}")
    for i, (_, code, label, priority) in enumerate(ACTION_RULES, 1):
        print(f"  {i}. [{priority}] {code}: {label[:50]}...")