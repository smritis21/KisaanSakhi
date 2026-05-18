# AgriPulse AI

By **Team KisaanSakhi** - Built for the **Syngenta × IIT Madras Hackathon 2026**

Syngenta field reps manage 80-100 agri-retailers across multiple tehsils. Every morning they decide who to visit, in what order, and what to talk about - entirely by gut feel. They don't know which retailer is 9 days from a stockout, which one just had a demand spike, or which high-value account hasn't been touched in 3 weeks.

AgriPulse AI fixes that. It scores every retailer in a rep's territory daily and delivers a ranked, explainable action list to their phone - one that works offline in rural areas with no signal.

---

## What's Inside

```
KisaanSakhi/
├── api/                        # FastAPI backend
├── config/config.yaml          # All thresholds - no hardcoded values
├── ml/
│   ├── train_xgboost.py        # Opportunity scorer
│   ├── anomaly_detection.py    # Isolation Forest for demand spikes
│   ├── explain.py              # SHAP explanations per retailer
│   ├── next_best_action.py     # Rule engine → action labels
│   ├── route_optimizer.py      # Tehsil-clustered routing
│   └── inference_pipeline.py  # Daily scoring orchestrator
├── pipeline/
│   ├── ingest.py
│   ├── feature_engineering.py
│   └── label_engineering.py
├── mobile/                     # React Native (Expo) - offline-first
├── models/                     # Trained .pkl artifacts
├── notebooks/                  # EDA, label validation, SHAP analysis
├── tests/
└── docker/docker-compose.yml
```

---

## The Dataset

8 CSV files, Rabi season Oct 2025 – Apr 2026:

| File | Rows |
|---|---|
| retailers.csv | 4,000 |
| reps_territory.csv | 500 |
| retailer_visit_log.csv | 30,000 |
| retailer_inventory_weekly.csv | 310,544 |
| retailer_pos.csv | 235,042 |
| growers.csv | 6,000 |
| whatsapp_campaign.csv | 4,479 |
| digital_funnel_weekly.csv | 104 |

---

## How the ML Works

**Features built per retailer** (as of scoring date):
- POS revenue over 7d / 30d / 90d windows + month-over-month growth
- Days since last visit, visit count over 30d / 90d
- Tilt 250 EC stock level, weekly depletion rate, days to stockout, stockout flag
- Geography label-encoded (state, district, tehsil)

**XGBoost Opportunity Scorer**
- 500 estimators, max_depth=4, lr=0.05
- 70/15/15 stratified split, early stopping on val AUC (30 rounds)
- Class imbalance handled via `scale_pos_weight`
- Target: AUC ≥ 0.72

**Isolation Forest Anomaly Detector**
- 200 estimators, contamination=0.05
- Flags ~5% of retailers with unusual POS/inventory patterns
- Catches sudden demand spikes the XGBoost model won't see

**SHAP Explanations**
- `shap.TreeExplainer` runs on every retailer
- Top 3 features by absolute SHAP value → plain English reason shown in the app

**Next Best Action Engine**

| Priority | Condition | Action |
|---|---|---|
| 1 | stockout_flag=1 AND score > 0.7 | URGENT_RESTOCK |
| 1 | days_since_last_visit > 21 AND score > 0.7 | OVERDUE_HIGH |
| 2 | anomaly_flag=1 AND mom_growth > 0.3 | INVESTIGATE_SPIKE |
| 2 | days_since_last_visit > 14 AND score > 0.6 | OVERDUE_VISIT |
| 3 | score > 0.6 | STANDARD_VISIT |
| 4 | fallback | LOW_PRIORITY |

**Route Optimizer**
Groups priority 1–2 retailers by tehsil, ranks tehsils by:
```
cluster_score = 0.4 × (retailer_count / max_count) + 0.6 × avg_opportunity_score
```

---

## API

FastAPI at `http://localhost:8000` - docs at `/docs`. All endpoints need `Authorization: Bearer <token>`.

```bash
# Rep's priority list for today
GET /api/v1/reps/REP_0001/priority-list?limit=10

# Route suggestion (tehsil clusters)
POST /api/v1/reps/REP_0001/route-suggestion

# Single retailer score + SHAP
GET /api/v1/retailers/RET_0042/opportunity

# Log a visit (from mobile)
POST /api/v1/sync/visit

# Health check
GET /api/v1/health
```

Sample response from `/priority-list`:
```json
{
  "rep_id": "REP_0001",
  "score_date": "2026-03-15",
  "retailers": [
    {
      "retailer_id": "RET_0042",
      "tehsil": "Karnal",
      "opportunity_score": 0.847,
      "action_code": "URGENT_RESTOCK",
      "action_label": "Urgent: Restock Tilt 250 EC - stockout in 14 days or less",
      "top_reason_text": "Tilt 250 EC stock level: 8.0 (decreases score)",
      "days_to_stockout": 9.3,
      "priority": 1
    }
  ]
}
```

---

## Mobile App

React Native (Expo) - Android + iOS.

- **Dashboard** - daily summary: total retailers, high-priority count, pending syncs
- **Priority List** - ranked cards with score, action label, SHAP reason. Tap to log a visit.
- **Route** - tehsil-grouped route ordered by cluster score
- **Visit History** - all visits today including offline-queued ones

Offline flow:
```
Rep logs visit → SQLite (synced=0)
Back online → auto-sync → POST /api/v1/sync/visit → synced=1
```

---

## Running It

**Requirements:** Python 3.10+, Node.js 18+, Docker

```bash
# 1. Database
cd docker && docker-compose up -d

# 2. Python setup
pip install -r requirements.txt
cp .env.example .env

# 3. Data pipeline
python pipeline/ingest.py
python pipeline/feature_engineering.py
python pipeline/label_engineering.py

# 4. Train
python ml/train_xgboost.py
python ml/anomaly_detection.py
python ml/explain.py

# 5. Score
python ml/inference_pipeline.py

# 6. API
uvicorn api.main:app --reload --port 8000

# 7. Mobile
cd mobile && npm install && npx expo start
```

---

## Configuration

Everything lives in `config/config.yaml`. Change thresholds without touching code:

```yaml
action_rules:
  stockout:
    threshold_days: 14
    min_score: 0.7
  overdue_high:
    threshold_days: 21
    min_score: 0.7

shap:
  top_n_features: 3
```

Or update live via API:
```bash
curl -X POST http://localhost:8000/api/v1/config \
  -H "Content-Type: application/json" \
  -d '{"key": "action_rules.stockout.threshold_days", "value": 7}'
```

---

## Tests

```bash
python -m pytest tests/
```

- `test_model_reload.py` - all 5 model artifacts load correctly
- `test_scoring_output.py` - scores are in [0,1], required columns present

---

## Stack

| | |
|---|---|
| ML | XGBoost 3.2, scikit-learn 1.8, SHAP 0.51 |
| Backend | FastAPI, SQLAlchemy 2.0, PostgreSQL 15 |
| Mobile | React Native (Expo), SQLite |
| Infra | Docker, uvicorn |

---

## Why These Choices

**XGBoost over a neural net** - 4,000 retailers is not enough data for a neural network. XGBoost handles missing values natively, trains in under a minute, and SHAP works directly on tree models. No extra work needed for explainability.

**Isolation Forest for anomalies** - we have no labelled anomaly examples, so supervised detection isn't an option. Isolation Forest learns what normal looks like and flags deviations. The 5% contamination rate (~200 retailers flagged per run) is a number a rep can actually act on.

**Rule engine for Next Best Action** - a second ML model here would be a black box on top of a black box. The rule engine is readable by anyone, auditable by managers, and adjustable without a data scientist. That matters for real-world adoption.

**Offline-first mobile** - rural India has intermittent 4G at best. If visit logging requires internet, data gets lost and the model degrades over time since visit logs feed back into next-day scoring.
