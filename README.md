<div align="center">

# AgriPulse

**By Team KisaanSakhi - Built for the Syngenta × IIT Madras Hackathon 2026**

*Smart field sales for agriculture - because gut feelings don't scale!*

*Every sales rep gets a simple list: who to visit today and why.*

<br/>

[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React Native](https://img.shields.io/badge/React_Native-Mobile-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](LICENSE)

</div>

---

## Try It Live!

| What | Where |
|---|---|
| **Web App** | https://kisaansakhi-web.onrender.com |
| **API** | https://kisaansakhi-api.onrender.com |
| **API Playground** | https://kisaansakhi-api.onrender.com/docs |

**Want to test it?**
- Rep ID: `REP_0016` (covers Sirsa, Haryana)
- Secret key: `agripulse-hackathon-secret-key-2026`

**Quick API test:**
```bash
curl "https://kisaansakhi-api.onrender.com/api/v1/reps/REP_0016/priority-list?limit=5" \
  -H "Authorization: Bearer agripulse-hackathon-secret-key-2026"
```

---

## Screenshots

| Dashboard | Priority List |
|---|---|
| ![Dashboard](screenshots/dashboard.png) | ![Priority List](screenshots/priority_list.png) |

| Retailer Details | Log Visit |
|---|---|
| ![Retailer Details](screenshots/dashboard_retailer_details.png) | ![Log Visit](screenshots/log_visit.png) |

| Visit History | Route Planning |
|---|---|
| ![Visit History](screenshots/visit_history.png) | ![Route](screenshots/Routes.png) |

---

## What's AgriPulse?

> **Built for Syngenta × IIT Madras Hackathon 2026 - Track 2: Field Force Intelligence**

Picture this: You're a Syngenta field rep. You have 80+ retailers to visit across multiple villages. Every morning you ask yourself: "Who should I visit today?"

Right now, it's pure guesswork. Maybe you haven't been to Sharma Uncle's shop in a while. Maybe Priya's store usually orders a lot. But you don't actually *know* who needs you most.

**AgriPulse changes that.**

It looks at all your retailers, checks their sales, stock levels, and recent activity, then gives you a simple ranked list: "Visit these 5 shops today, in this order, for these reasons."

No complex dashboards. No confusing charts. Just a clear answer to "where should I go first?"

---

## The Real Problem

Let's be honest about field sales in agriculture:

**Too many shops, too little time**  
80 retailers × 5 days a week = you can't visit everyone. So who gets priority?

**Silent stockouts**  
A retailer runs out of seeds right during planting season. A farmer comes to buy, goes home empty-handed. Nobody saw it coming.

**Playing favorites**  
Reps naturally visit familiar shops or easy conversations. The high-value but shy retailer gets ignored.

**Managers in the dark**  
"Did you visit the Karnal territory this week?" "Umm... yes?" Nobody really knows what's happening in the field.

**Inconsistent results**  
Two reps, same territory, completely different visit patterns. One makes ₹2L/month, the other makes ₹50K. Why?

AgriPulse replaces guesswork with data — but keeps it simple enough to use while riding a motorcycle between villages.

---

## What It Actually Does

### Smart Retailer Scoring
Every retailer gets a score from 0 to 1. Think of it like a "hotness" meter:
- 0.9 = "Visit TODAY, something big is happening"
- 0.5 = "Visit this week when you have time"  
- 0.2 = "Skip for now, focus elsewhere"

### Clear Action Categories
No confusing numbers. Just simple actions:

| What You See | What It Means |
|---|---|
| **Stockout Alert** | They'll run out of stock in 2 weeks |
| **Overdue - High Priority** | Haven't visited in 3+ weeks, high potential |
| **Overdue - Standard** | Haven't visited in 2+ weeks |
| **High Opportunity** | Something interesting is happening here |

### Why This Retailer?
You don't just get "visit Sharma Agro." You get:
> *"Sharma Agro: Last purchase 45 days ago. Stock critically low. Opened 3 WhatsApp messages this week."*

Now you know exactly what to talk about when you walk in.

### Works Offline
Rural connectivity is patchy. The mobile app downloads your list in the morning and works all day without internet. When you get signal, it syncs everything automatically.

### Live Updates After Visits
Here's the cool part: When you log a visit in the mobile app, the system automatically recalculates all scores. Visit a high-priority retailer? Their score drops. Miss someone for too long? Their score goes up. The list stays fresh.

---

## How The Smart Scoring Works

We don't just guess. The system looks at:

**Sales History**  
What they bought, when, how much. Rolling 7-day, 30-day, 90-day windows.

**Visit Patterns**  
When did you last visit? How often do you usually go?

**Stock Levels**  
Current inventory, how fast they're selling, projected stockout date.

**WhatsApp Engagement**  
Did they open your campaign messages? Click links? Show interest?

**Revenue Trends**  
Growing fast? Declining? Seasonal patterns?

**Anomaly Detection**  
Sudden demand spike? Unusual buying pattern? Something worth investigating?

All this gets crunched into one simple score and a clear reason why.

---

## The Complete Workflow

### Morning Routine
1. **Rep opens mobile app** → Gets today's prioritized list
2. **Sees clear actions** → "Visit Sharma Agro first - stockout risk"
3. **Plans route** → App suggests efficient village-wise clustering

### During Visits
4. **Visits retailer** → Discusses the specific issues flagged by the system
5. **Logs visit** → Records what happened, what was sold, next steps
6. **System updates** → Scores automatically recalculate based on new data

### Behind The Scenes
7. **Rescoring pipeline** → When you run `rescore.py`, it updates the database
8. **Fresh recommendations** → Next day's list reflects yesterday's visits
9. **Manager visibility** → All visit data flows to dashboards

This creates a feedback loop: better data → better recommendations → better results → better data.

---

## Tech Stack (The Simple Version)

**Smart Scoring:** Python + XGBoost (learns from patterns)  
**Mobile App:** React Native (works on Android & iOS)  
**API:** FastAPI (connects everything)  
**Database:** PostgreSQL (stores all the data)  
**Notebooks:** Jupyter (for experimenting and analysis)  
**Deployment:** Docker (easy setup anywhere)

---

## Quick Start

### Option 1: Docker (Easiest)
```bash
git clone https://github.com/smritis21/KisaanSakhi.git
cd KisaanSakhi
git checkout smriti

cp .env.example .env
# Edit .env with your database details

cd docker
docker-compose up --build
```

Visit `http://localhost:8000/docs` to see the API in action!

### Option 2: Manual Setup
```bash
git clone https://github.com/smritis21/KisaanSakhi.git
cd KisaanSakhi
git checkout smriti

python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

pip install -r requirements.txt
cp .env.example .env

# Run the data pipeline
python pipeline/feature_engineering.py
python ml/inference_pipeline.py

# Start the API
uvicorn api.main:app --reload --port 8000
```

### Mobile App
```bash
cd mobile
npm install
npx expo start
```

---

## API Examples

### Get Today's Priority List
```bash
curl -H "Authorization: Bearer agripulse-hackathon-secret-key-2026" \
  "http://localhost:8000/api/v1/reps/REP_0016/priority-list?limit=5"
```

### Log a Visit
```bash
curl -X POST -H "Authorization: Bearer agripulse-hackathon-secret-key-2026" \
  -H "Content-Type: application/json" \
  "http://localhost:8000/api/v1/sync/visit" \
  -d '{"retailer_id": "RET_0042", "notes": "Restocked seeds, discussed new campaign"}'
```

### Update Scores After Visits
```bash
python rescore.py
```
This recalculates all opportunity scores based on new visit data and updates the database.

---

## The Rescoring Pipeline

Here's how the system stays fresh:

1. **Rep logs visit** → Mobile app records visit details
2. **Data syncs** → Visit info goes to database  
3. **Manual rescore** → Run `rescore.py` to update all scores
4. **Fresh recommendations** → Next API call returns updated priority list

**Why manual for now?** We wanted to keep it simple for the hackathon. In production, this would run automatically after each visit or on a schedule.

---

## Current Limitations & Future Plans

### What Works Now
- ✅ Single rep view (REP_0016)
- ✅ Basic visit logging
- ✅ Manual rescoring pipeline
- ✅ Offline mobile app
- ✅ Live API and web dashboard

### Coming Soon
- **Role-Based Access Control (RBAC)** - Different views for reps, managers, admins
- **Multi-rep support** - Handle hundreds of reps across territories  
- **Automatic rescoring** - Real-time updates after each visit
- **Manager dashboard** - Territory-wide analytics and performance tracking
- **Multi-language** - Hindi, Marathi, Telugu, Kannada support
- **Voice logging** - "Hey AgriPulse, log visit to Sharma Agro"
- **Photo capture** - Snap shelf photos, POS materials during visits
- **WhatsApp integration** - Send messages directly from the app

---

## Project Structure

```
KisaanSakhi/
├── api/                    # FastAPI backend
├── mobile/                 # React Native app  
├── ml/                     # Smart scoring models
├── pipeline/               # Data processing
├── notebooks/              # Analysis & experiments
├── screenshots/            # App screenshots
├── config/                 # Settings & thresholds
├── rescore.py             # Manual rescoring script
└── README.md              # You are here!
```

---

## Contributing

Want to make AgriPulse better? Here's how:

1. **Fork the repo** on GitHub
2. **Create a branch** for your feature
3. **Make your changes** (keep it simple!)
4. **Test everything** with `pytest tests/`
5. **Submit a pull request**

We especially welcome:
- Multi-language support
- Mobile app improvements  
- Better scoring algorithms
- UI/UX enhancements

---

## License & Credits

**MIT License** - Use it, modify it, build on it!

Built for the **Syngenta × IIT Madras Hackathon 2026** by Team KisaanSakhi.

Special thanks to the SHAP library for making our recommendations explainable, and to all the field reps who inspired this solution.

---

<div align="center">

**AgriPulse** - Making field sales smarter, one visit at a time.

*Built with love for Indian agriculture*

[![Star on GitHub](https://img.shields.io/github/stars/smritis21/KisaanSakhi?style=social)](https://github.com/smritis21/KisaanSakhi)

</div>