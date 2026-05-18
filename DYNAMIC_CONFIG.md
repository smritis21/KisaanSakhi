# AgriPulse AI - Dynamic Configuration Guide

## Overview

All hardcoded values have been moved to `config/config.yaml` for dynamic, AI-driven behavior. The system now supports:

- **Environment variable overrides** - `${VAR_NAME:default}` syntax
- **Runtime configuration updates** via API endpoints
- **Dynamic thresholds** for action rules
- **Configurable feature windows** for ML pipeline

## Configuration File Structure

```
config/
├── config.yaml          # Main configuration file
└── __init__.py          # Config loader module
```

## Key Configuration Sections

### 1. Action Rules (Dynamic Thresholds)

```yaml
action_rules:
  stockout:
    enabled: true
    threshold_days: 14      # Days until stockout to trigger alert
    min_score: 0.7          # Minimum opportunity score
    priority: 1
  overdue_high:
    enabled: true
    threshold_days: 21      # Days without visit for high-priority
    min_score: 0.7
    priority: 1
  overdue_visit:
    enabled: true
    threshold_days: 14      # Days without visit for regular
    min_score: 0.6
    priority: 2
```

**To change thresholds at runtime:**
```bash
# Via API
curl -X POST http://localhost:8000/api/v1/config \
  -H "Content-Type: application/json" \
  -d '{"key": "action_rules.overdue_visit.threshold_days", "value": 10}'

# Or edit config.yaml directly
```

### 2. Feature Engineering Windows

```yaml
features:
  pos_windows_days: [7, 30, 90]      # POS revenue lookback periods
  visit_windows_days: [30, 90]       # Visit frequency windows
  inventory_lookback_weeks: 12       # Inventory history
  whatsapp_lookback_days: 30         # Campaign engagement window
  revenue_growth_clip: 5.0           # Cap MoM growth at ±500%
```

### 3. SHAP Explanation Settings

```yaml
shap:
  top_n_features: 3                  # Number of reasons to show
  min_shap_absolute_value: 0.01      # Filter low-impact features
```

### 4. Mobile App Configuration

```yaml
mobile:
  default_rep_id: "REP_0001"         # Can be changed per device
  sync_interval_minutes: 5
  max_offline_records: 1000
  cache_ttl_hours: 24
```

## Environment Variable Overrides

All config values support environment variable overrides using `${VAR_NAME:default}` syntax:

```bash
# Example: Override database settings
export DB_HOST=production-db.example.com
export DB_PORT=5432
export DB_NAME=agripulse_prod
export API_AUTH_TOKEN=your-secure-token

# Override mobile default rep
export DEFAULT_REP_ID=REP_9999

# Change logging level
export LOG_LEVEL=DEBUG
```

## API Endpoints for Configuration

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/config` | GET | Get full configuration |
| `/api/v1/config/{key}` | GET | Get specific value (dot notation) |
| `/api/v1/config` | POST | Update configuration at runtime |
| `/api/v1/config/thresholds` | GET | Get action thresholds |
| `/api/v1/config/features` | GET | Get feature engineering config |

### Example API Usage

```bash
# Get current thresholds
curl http://localhost:8000/api/v1/config/thresholds

# Response:
{
  "stockout_days": 14,
  "overdue_high_days": 21,
  "overdue_visit_days": 14,
  "high_score_threshold": 0.7,
  "standard_score_threshold": 0.6
}

# Update threshold
curl -X POST http://localhost:8000/api/v1/config \
  -H "Content-Type: application/json" \
  -d '{"key": "action_rules.overdue_visit.threshold_days", "value": 10}'

# Response:
{
  "key": "action_rules.overdue_visit.threshold_days",
  "value": 10,
  "success": true,
  "message": "Updated action_rules.overdue_visit.threshold_days to 10"
}
```

## Python Configuration Usage

```python
from config import get, get_action_rules, get_feature_config, get_shap_config

# Get a specific value
db_host = get('database.host')

# Get action rules
rules = get_action_rules()
print(f"Stockout threshold: {rules['stockout']['threshold_days']} days")

# Get feature config
features = get_feature_config()
print(f"POS windows: {features['pos_windows_days']}")

# Get SHAP config
shap = get_shap_config()
print(f"Top N features: {shap['top_n_features']}")
```

## Mobile App Configuration

The mobile app uses `configService.js` for dynamic settings:

```javascript
import { getConfig, getCurrentRepId, getThresholds } from './services/configService';

// Get full config
const config = await getConfig();

// Get current rep ID (can be changed)
const repId = await getCurrentRepId();

// Get threshold values
const thresholds = await getThresholds();
console.log(`High priority: ${thresholds.highPriorityScore}`);
```

## Benefits of Dynamic Configuration

1. **No code changes needed** to adjust thresholds
2. **Environment-specific settings** via env vars
3. **Runtime updates** without restart (via API)
4. **A/B testing** of different thresholds
5. **Regional customization** possible

## Common Customization Scenarios

### Scenario 1: More Frequent Stockout Alerts
```yaml
action_rules:
  stockout:
    threshold_days: 7  # Alert 1 week before stockout
```

### Scenario 2: Longer Visit Cycles
```yaml
action_rules:
  overdue_visit:
    threshold_days: 21  # Allow 3 weeks between visits
```

### Scenario 3: Higher Priority Threshold
```yaml
action_rules:
  standard_visit:
    min_score: 0.8  # Only show high-opportunity retailers
```

### Scenario 4: More SHAP Reasons
```yaml
shap:
  top_n_features: 5  # Show 5 reasons instead of 3
```

## Files Modified

| File | Change |
|------|--------|
| `config/config.yaml` | New - central configuration |
| `config/__init__.py` | New - config loader with env var support |
| `ml/next_best_action.py` | Uses dynamic action rules |
| `ml/inference_pipeline.py` | Uses dynamic model paths |
| `ml/explain.py` | Uses dynamic SHAP config |
| `pipeline/feature_engineering.py` | Uses dynamic feature windows |
| `api/routers/config.py` | New - config API endpoints |
| `api/main.py` | Added config router |
| `mobile/src/services/configService.js` | New - mobile config service |
| `mobile/src/screens/DashboardScreen.js` | Uses dynamic config |
| `mobile/src/services/syncService.js` | Uses dynamic API config |