<div align="center">

# AgriPulse

**By Team KisaanSakhi - Built for the Syngenta × IIT Madras Hackathon 2026**

*AI-powered field sales intelligence for the agriculture sector.*

*Every sales rep gets a ranked, explainable, real-time list of who to visit today — and exactly why.*

<br/>

[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React Native](https://img.shields.io/badge/React_Native-Mobile-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](CONTRIBUTING.md)

</div>

---

## 🚀 Live Demo

| | URL |
|---|---|
| **Web App** | https://kisaansakhi-web.onrender.com |
| **API** | https://kisaansakhi-api.onrender.com |
| **API Docs** | https://kisaansakhi-api.onrender.com/docs |

**Demo credentials:**
- Rep ID: `REP_0016` (Sirsa territory, Haryana)
- Auth token: `agripulse-hackathon-secret-key-2026`

**Try the API:**
```bash
curl "https://kisaansakhi-api.onrender.com/api/v1/reps/REP_0016/priority-list?limit=5&score_date=2026-05-19" \
  -H "Authorization: Bearer agripulse-hackathon-secret-key-2026"
```

---

## 📸 Screenshots

| Dashboard | Priority List |
|---|---|
| ![Dashboard](screenshots/dashboard.png) | ![Priority List](screenshots/priority_list.png) |

| Retailer Details | Log Visit |
|---|---|
| ![Retailer Details](screenshots/dashboard_retailer_details.png) | ![Log Visit](screenshots/log_visit.png) |

| Visit History | Route |
|---|---|
| ![Visit History](screenshots/visit_history.png) | ![Route](screenshots/Routes.png) |

---

## Table of Contents

- [What Is AgriPulse?](#what-is-agripulse)
- [The Problem](#the-problem)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Usage Guide](#usage-guide)
- [API Documentation](#api-documentation)
- [Machine Learning Pipeline](#machine-learning-pipeline)
- [Mobile App](#mobile-app)
- [Configuration](#configuration)
- [Performance & Scalability](#performance--scalability)
- [Security](#security)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Testing](#testing)
- [Deployment](#deployment)
- [Recommended Hosting](#recommended-hosting)
- [License](#license)
- [Acknowledgements](#acknowledgements)

---

## What Is AgriPulse?

> **Built for Syngenta × IIT Madras Hackathon 2026 - Track 2: AI-Guided Field Force Intelligence**

Syngenta field reps manage 80-100 agri-retailers across multiple tehsils. Every morning they decide who to visit, in what order, and what to talk about - entirely by gut feel. They don't know which retailer is 9 days from a stockout, which one just had a demand spike, or which high-value account hasn't been touched in 3 weeks.

AgriPulse fixes that. It scores every retailer in a rep's territory daily and delivers a ranked, explainable action list to their phone - one that works offline in rural areas with no signal.

The system ingests point-of-sale data, visit history, inventory levels, and WhatsApp campaign engagement. It runs them through an ML scoring pipeline, surfaces the top reasons behind every decision using SHAP explainability, and delivers a ranked, actionable visit list to the rep's phone — even offline.

---

## The Problem

Agriculture input companies (seeds, fertilizers, pesticides) sell through a network of thousands of rural retailers. Their field sales teams visit these retailers regularly to push products, check stock, and build relationships.

Without data, every visit decision is a guess.

A rep with 80 retailers in their territory and 5 working days in a week physically cannot visit everyone. The typical approach is gut instinct: "I haven't been to this shop in a while" or "that guy usually orders a lot." This creates four real problems:

**Stockouts happen silently.** A retailer runs out of a product and nobody knew it was coming. A farmer shows up to buy seeds during the planting window and goes home empty-handed. That's not just lost revenue — it's a failed harvest.

**High-value retailers get ignored.** Reps naturally gravitate toward familiar shops or easy conversations, not necessarily the ones with the highest revenue potential.

**Manager visibility is zero.** Sales managers have no reliable way to know which retailers were visited, what was discussed, or which areas are being under-served.

**Rep performance is uneven.** Without a shared prioritization framework, two reps covering the same territory may follow completely different visit patterns with wildly different results.

AgriPulse replaces intuition with evidence — while still being simple enough for a field rep to use while driving between villages.

---

## Features

### ML-Based Retailer Opportunity Scoring

Every retailer in the system receives a continuous opportunity score between 0.0 and 1.0. This is not a rule-based calculation — it is a trained ML model that weighs purchase history, visit recency, inventory risk, campaign engagement, and revenue trend together.

The score answers: *"If I visit this retailer today, how likely is this to result in a meaningful outcome?"*

### Next Best Action Engine

A score alone is not actionable. The Next Best Action engine translates scores into four clear categories:

| Action | Trigger Condition |
|--------|------------------|
| Stockout Alert | Less than 14 days of stock remaining |
| Overdue Visit — High Priority | 21+ days without a visit, score ≥ 0.7 |
| Overdue Visit — Standard | 14+ days without a visit, score ≥ 0.6 |
| High Opportunity | Score above threshold, recent engagement |

Reps see a clean ranked list ordered by urgency and opportunity — not alphabetically, not randomly.

### SHAP Explainability

The system surfaces the top 3 reasons behind every score using SHAP (SHapley Additive exPlanations). A rep doesn't just see "priority: HIGH" — they see:

> *"Last purchase was 45 days ago. Stock is critically low. Retailer opened 3 WhatsApp messages this week."*

This matters for trust. Reps are more likely to follow the system's recommendations when they understand why a retailer is flagged.

### Offline-First Mobile App

The React Native mobile app is designed for patchy rural connectivity. Retailer lists, scores, and visit notes are cached on-device. When the rep gets a signal, the app syncs automatically. No action is lost to a bad network.

### Dynamic Configuration Without Redeployment

Every threshold — stockout alert days, visit overdue windows, score cutoffs, feature engineering windows — lives in a single YAML file and can be updated at runtime via API call. No code change, no deployment, no downtime.

### Feature Engineering Pipeline

POS data is not used raw. The pipeline computes rolling windows (7, 30, 90 days), calculates stockout risk from inventory trends, extracts WhatsApp engagement signals, and caps revenue growth at ±500% to handle data anomalies. This ensures the model is working from rich, clean signals.

---

## Architecture

### System Overview

```mermaid
graph TB
    subgraph Data Sources
        A[POS Transactions] --> E
        B[Visit Logs] --> E
        C[Inventory Data] --> E
        D[WhatsApp Campaigns] --> E
    end

    subgraph Backend
        E[Feature Engineering Pipeline] --> F[ML Scoring Model]
        F --> G[SHAP Explainer]
        G --> H[Next Best Action Engine]
        H --> I[FastAPI Server]
    end

    subgraph Config
        J[config.yaml] --> H
        K[ENV Variables] --> I
    end

    subgraph Clients
        I --> L[Mobile App - React Native]
        I --> M[Web Dashboard]
        I --> N[Admin / Manager View]
    end
```

### ML Data Flow

```mermaid
flowchart LR
    A[Raw Data] --> B[Feature Engineering]
    B --> C{ML Model}
    C --> D[Opportunity Score 0–1]
    D --> E[SHAP Explainer]
    E --> F[Top 3 Reasons]
    D --> G[Action Rule Engine]
    G --> H[Ranked Visit List]
    F --> H
    H --> I[API Response]
```

### User Workflow

```mermaid
sequenceDiagram
    participant Rep as Sales Rep
    participant App as Mobile App
    participant API as FastAPI Backend
    participant ML as ML Pipeline

    Rep->>App: Opens app in the morning
    App->>API: GET /api/v1/retailers
    API->>ML: Run inference pipeline
    ML-->>API: Scored + ranked retailer list
    API-->>App: Returns prioritized list with actions
    App-->>Rep: Shows "Visit Sharma Agro first — stockout risk"
    Rep->>App: Logs visit after meeting
    App->>API: POST /api/v1/sync (when online)
```

---

## Tech Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| ML / AI | Python, XGBoost, SHAP, Pandas, NumPy | Scoring model, feature engineering, explainability |
| Notebooks | Jupyter | EDA, model experiments, validation |
| Backend API | FastAPI, Python 3.9+ | REST API, config management, sync |
| Mobile App | React Native, TypeScript | Field rep interface, offline support |
| Config | YAML, python-dotenv | Dynamic configuration, env var management |
| Infrastructure | Docker, docker-compose | Containerized local + production setup |
| Data Storage | PostgreSQL (configurable) | Retailer data, visit logs, scores |
| Testing | pytest, pytest-cov | Unit + integration tests |

---

## Project Structure

```
KisaanSakhi/
│
├── api/                        # FastAPI application
│   ├── main.py                 # App entry point, router registration
│   ├── routers/
│   │   ├── reps.py             # Rep priority lists and routes
│   │   ├── retailers.py        # Retailer scoring + action endpoints
│   │   ├── sync.py             # Mobile sync endpoints
│   │   ├── health.py           # Health check endpoints
│   │   └── config.py           # Runtime config management endpoints
│   └── core/
│       └── models.py           # Model loading and management
│
├── config/                     # Configuration layer
│   └── config.yaml             # Central configuration file
│
├── ml/                         # Machine learning core
│   ├── train_xgboost.py        # Opportunity scorer training
│   ├── anomaly_detection.py    # Isolation Forest for demand spikes
│   ├── explain.py              # SHAP explanation generation
│   ├── next_best_action.py     # Action rule engine
│   ├── route_optimizer.py      # Tehsil-clustered routing
│   └── inference_pipeline.py   # Daily scoring orchestrator
│
├── pipeline/                   # Data processing
│   ├── ingest.py               # Data ingestion from CSV
│   ├── feature_engineering.py  # Feature computation pipeline
│   └── label_engineering.py    # Label generation for training
│
├── mobile/                     # React Native mobile app
│   └── src/
│       ├── screens/
│       │   ├── DashboardScreen.js
│       │   ├── RetailerCardScreen.js
│       │   └── RouteViewScreen.js
│       └── services/
│           ├── configService.js    # Dynamic config from API
│           └── syncService.js      # Offline sync logic
│
├── models/                     # Saved ML model artifacts (.pkl)
├── notebooks/                  # Jupyter notebooks for EDA and experiments
├── screenshots/                # App screenshots for documentation
├── tests/                      # Test suite
├── docker/                     # Docker configuration
│   └── docker-compose.yml
│
├── .env.example                # Environment variable template
├── requirements.txt            # Python dependencies
└── README.md
```

---

## Installation

### Prerequisites

Before you begin, make sure you have:

- **Python 3.9+** — [Download](https://python.org/downloads)
- **Node.js 18+** — [Download](https://nodejs.org) (for the mobile app)
- **Docker** — [Download](https://docker.com/get-started) (optional but recommended)
- **Git**

---

### Option A — Docker (Recommended)

The fastest way to get everything running.

```bash
# 1. Clone the repo
git clone https://github.com/smritis21/KisaanSakhi.git
cd KisaanSakhi
git checkout smriti

# 2. Copy and configure environment variables
cp .env.example .env
# Edit .env with your values

# 3. Start all services
cd docker
docker-compose up --build
```

The API will be available at `http://localhost:8000`.
Swagger docs at `http://localhost:8000/docs`.

---

### Option B — Local Python Setup

```bash
# 1. Clone the repo
git clone https://github.com/smritis21/KisaanSakhi.git
cd KisaanSakhi
git checkout smriti

# 2. Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate         # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment variables
cp .env.example .env
# Edit .env with your values

# 5. Run data pipeline
python pipeline/ingest.py
python pipeline/feature_engineering.py
python pipeline/label_engineering.py

# 6. Train models
python ml/train_xgboost.py
python ml/anomaly_detection.py
python ml/explain.py

# 7. Score retailers
python ml/inference_pipeline.py

# 8. Start the API server
uvicorn api.main:app --reload --port 8000
```

---

### Troubleshooting

| Issue | Fix |
|-------|-----|
| `ModuleNotFoundError` | Make sure your virtual environment is activated |
| Port 8000 already in use | Change port with `--port 8001` |
| Docker build fails | Run `docker-compose down -v` then rebuild |
| Database connection error | Double-check `DATABASE_URL` in `.env` |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/agripulse

# API
API_AUTH_TOKEN=agripulse-hackathon-secret-key-2026
API_HOST=0.0.0.0
API_PORT=8000

# Mobile
DEFAULT_REP_ID=REP_0016

# ML
MODEL_PATH=models/

# Logging
LOG_LEVEL=INFO
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `API_AUTH_TOKEN` | Yes | Bearer token for API authentication |
| `DEFAULT_REP_ID` | No | Default rep ID for the mobile app |
| `MODEL_PATH` | No | Path to trained model artifacts |
| `LOG_LEVEL` | No | `DEBUG`, `INFO`, `WARNING`, or `ERROR` |

> Never commit your `.env` file. It is already in `.gitignore`.

---

## Usage Guide

### 1. Start the Backend

```bash
uvicorn api.main:app --reload --port 8000
```

### 2. Get Rep's Priority List

```bash
curl -H "Authorization: Bearer agripulse-hackathon-secret-key-2026" \
  "http://localhost:8000/api/v1/reps/REP_0016/priority-list?limit=5"
```

### 3. Get Route Suggestion

```bash
curl -X POST -H "Authorization: Bearer agripulse-hackathon-secret-key-2026" \
  "http://localhost:8000/api/v1/reps/REP_0016/route-suggestion"
```

### 4. Start the Mobile App

```bash
cd mobile
npm install
npx expo start
```

### 5. Run the ML Scoring Pipeline Manually

```bash
python ml/inference_pipeline.py
```

This regenerates scores and refreshes the API's data.

### 6. Explore the Notebooks

```bash
jupyter notebook notebooks/
```

---

## API Documentation

Full interactive docs are available at `http://localhost:8000/docs` (Swagger UI) and `http://localhost:8000/redoc` (ReDoc).

### Core Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/reps/{rep_id}/priority-list` | GET | Bearer | Ranked list of retailers with scores and actions |
| `/api/v1/reps/{rep_id}/route-suggestion` | POST | Bearer | Tehsil-clustered route optimization |
| `/api/v1/retailers/{id}/opportunity` | GET | Bearer | Single retailer score + SHAP explanation |
| `/api/v1/sync/visit` | POST | Bearer | Sync visit logs from mobile app |
| `/api/v1/health` | GET | None | Health check |
| `/api/v1/config` | GET | Bearer | View current runtime configuration |

### Example: Get Priority List

**Request**
```bash
GET /api/v1/reps/REP_0016/priority-list?limit=5&score_date=2026-05-19
Authorization: Bearer agripulse-hackathon-secret-key-2026
```

**Response**
```json
{
  "rep_id": "REP_0016",
  "score_date": "2026-05-19",
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

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request — check your payload |
| 401 | Unauthorized — invalid or missing token |
| 404 | Rep or retailer not found |
| 500 | Server error — check logs |

---

## Machine Learning Pipeline

### How It Works

The ML system solves a ranking problem: given all the retailers a sales rep is responsible for, which ones should they visit *today*, ordered by impact?

### Data Sources

| Source | What It Contains |
|--------|-----------------|
| POS Transactions | What was sold, when, how much |
| Visit Logs | When each retailer was last visited, by whom |
| Inventory Records | Current stock levels, historical trends |
| WhatsApp Campaigns | Message open/engagement data |

### XGBoost Opportunity Scorer

- 500 estimators, max_depth=4, lr=0.05
- 70/15/15 stratified split, early stopping on val AUC (30 rounds)
- Class imbalance handled via `scale_pos_weight`
- Target: AUC ≥ 0.72

### Isolation Forest Anomaly Detector

- 200 estimators, contamination=0.05
- Flags ~5% of retailers with unusual POS/inventory patterns
- Catches sudden demand spikes the XGBoost model won't see

### SHAP Explanations

- `shap.TreeExplainer` runs on every retailer
- Top 3 features by absolute SHAP value → plain English reason shown in the app

### Next Best Action Engine

| Priority | Condition | Action |
|---|---|---|
| 1 | stockout_flag=1 AND score > 0.7 | URGENT_RESTOCK |
| 1 | days_since_last_visit > 21 AND score > 0.7 | OVERDUE_HIGH |
| 2 | anomaly_flag=1 AND mom_growth > 0.3 | INVESTIGATE_SPIKE |
| 2 | days_since_last_visit > 14 AND score > 0.6 | OVERDUE_VISIT |
| 3 | score > 0.6 | STANDARD_VISIT |
| 4 | fallback | LOW_PRIORITY |

---

## Mobile App

The mobile app is built in React Native + TypeScript for cross-platform deployment (iOS and Android from a single codebase).

### Key Screens

- **Dashboard** — Prioritized retailer list for today's visits, sorted by score
- **Retailer Detail** — Score, action type, SHAP reasons, contact info, last visit date
- **Visit Logger** — Log a visit with notes, outcome, and next follow-up date
- **Route View** — Tehsil-clustered route ordered by cluster score
- **Visit History** — All visits today including offline-queued ones

### Offline Support

The app uses SQLite for local storage. Reps in areas with no connectivity can still see their prioritized list and log visits. Everything syncs automatically the next time a connection is available.

### Running the App

```bash
cd mobile
npm install
npx expo start
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

## Performance & Scalability

**Inference on demand vs. scheduled batch.** The current architecture runs the ML pipeline as a batch job and serves cached scores via the API. This makes the API response instant even with thousands of retailers.

**Feature caching.** Feature engineering is the most compute-intensive step. Features are computed once per batch cycle and stored. The scoring model reads from this cache, keeping inference fast.

**Async API.** FastAPI is built on Starlette's async foundation, meaning it handles concurrent mobile app syncs without blocking.

**Offline-first mobile.** By caching the prioritized list on-device, the mobile app generates zero API traffic during a normal working day in the field.

---

## Security

**Authentication.** All API endpoints require a Bearer token. Tokens are configured via the `API_AUTH_TOKEN` environment variable.

**Secret management.** No secrets are hardcoded anywhere in the codebase. All sensitive values are injected via environment variables.

**Input validation.** FastAPI uses Pydantic models for all request payloads. Invalid inputs are rejected at the serialization layer.

**HTTPS.** For production deployment, always terminate HTTPS at the load balancer or reverse proxy layer.

---

## Roadmap

**Completed**

- [x] ML scoring pipeline with XGBoost and Isolation Forest
- [x] SHAP-based explainability
- [x] Next Best Action engine with dynamic rules
- [x] FastAPI backend with full REST API
- [x] Offline-first React Native mobile app
- [x] Dynamic YAML configuration with runtime API
- [x] Route optimization with tehsil clustering
- [x] Docker containerization

**Planned**

- [ ] Manager dashboard with territory-level analytics
- [ ] Real-time scoring (trigger inference on demand per rep)
- [ ] Multi-language support (Hindi, Marathi, Telugu, Kannada)
- [ ] Voice input for visit logging
- [ ] Photo capture during visits

---

## Contributing

Contributions are welcome. The goal is to keep AgriPulse useful for real teams in the field.

### Getting Started

```bash
# Fork the repo, then clone your fork
git clone https://github.com/your-username/KisaanSakhi.git
cd KisaanSakhi
git checkout smriti

# Create a feature branch
git checkout -b feature/your-feature-name
```

### Pull Request Process

1. Make sure all existing tests pass: `pytest tests/`
2. Add tests for any new behavior
3. Update documentation if you changed any API contract
4. Keep PRs focused — one feature or fix per PR

---

## Testing

```bash
# Run the full test suite
pytest tests/

# Run with coverage report
pytest tests/ --cov=. --cov-report=html

# Run a specific test file
pytest tests/test_model_reload.py
```

---

## Deployment

### Docker (Production)

```bash
cd docker
docker-compose up --build -d
```

### Manual Production Deployment

```bash
# Install production dependencies
pip install -r requirements.txt

# Start with a production ASGI server
gunicorn api.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

---

## Recommended Hosting

| Component | Recommended Platform | Why |
|-----------|---------------------|-----|
| Backend API | [Railway](https://railway.app) | Simple FastAPI deployment, PostgreSQL add-on |
| Database | [Railway PostgreSQL](https://railway.app) | Managed PostgreSQL with the API |
| Mobile App | [Expo Application Services](https://expo.dev/eas) | Build + distribute React Native apps |
| Object Storage | [Cloudflare R2](https://cloudflare.com/developer-platform/r2) | Store model artifacts cheaply |

---

## License

This project is licensed under the **MIT License**.  
See the [LICENSE](LICENSE) file for details.

---

## Acknowledgements

Built for the **Syngenta × IIT Madras Hackathon 2026** - Track 2: AI-Guided Field Force Intelligence.

The SHAP library by [Lundberg & Lee (2017)](https://arxiv.org/abs/1705.07874) is central to the explainability layer. Their work on making model decisions interpretable has real-world impact beyond just AI research.

---

<div align="center">

**AgriPulse** &nbsp;·&nbsp; MIT License &nbsp;·&nbsp; Built for Indian Agriculture

*If this project was useful to you, consider leaving a star — it helps others find it.*

[![Star on GitHub](https://img.shields.io/github/stars/smritis21/KisaanSakhi?style=social)](https://github.com/smritis21/KisaanSakhi)

</div>