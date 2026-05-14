const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak, LevelFormat,
  TableOfContents
} = require('docx');
const fs = require('fs');

// ── helpers ────────────────────────────────────────────────────────────────────
const BORDER = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
const HEADER_SHADING = { fill: "1E4D78", type: ShadingType.CLEAR };
const ALT_SHADING    = { fill: "EBF3FB", type: ShadingType.CLEAR };
const GREEN_SHADING  = { fill: "D6EAD6", type: ShadingType.CLEAR };
const ORANGE_SHADING = { fill: "FFF3CD", type: ShadingType.CLEAR };
const CELL_MARGIN    = { top: 100, bottom: 100, left: 140, right: 140 };
const CONTENT_WIDTH  = 9360; // US Letter, 1-inch margins

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)], spacing: { before: 360, after: 180 } });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)], spacing: { before: 280, after: 140 } });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(text)], spacing: { before: 200, after: 100 } });
}
function p(text, opts = {}) {
  return new Paragraph({ children: [new TextRun({ text, ...opts })], spacing: { before: 80, after: 80 } });
}
function bold(text) { return new TextRun({ text, bold: true }); }
function mono(text) { return new TextRun({ text, font: "Courier New", size: 18 }); }
function pb() { return new Paragraph({ children: [new PageBreak()] }); }
function spacer() { return new Paragraph({ children: [new TextRun("")], spacing: { before: 80, after: 80 } }); }

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    children: [new TextRun(text)],
    spacing: { before: 40, after: 40 }
  });
}
function numbered(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "numbers", level },
    children: [new TextRun(text)],
    spacing: { before: 40, after: 40 }
  });
}

function codeBlock(lines) {
  const children = [];
  lines.forEach((line, i) => {
    children.push(new Paragraph({
      children: [new TextRun({ text: line, font: "Courier New", size: 18, color: "D4E8FF" })],
      spacing: { before: 0, after: 0 },
      shading: { fill: "1A1A2E", type: ShadingType.CLEAR },
      indent: { left: 200, right: 200 },
    }));
  });
  return children;
}

function headerCell(text, width) {
  return new TableCell({
    borders: BORDERS,
    width: { size: width, type: WidthType.DXA },
    shading: HEADER_SHADING,
    margins: CELL_MARGIN,
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 20 })], alignment: AlignmentType.CENTER })]
  });
}
function dataCell(text, width, shading = null) {
  return new TableCell({
    borders: BORDERS,
    width: { size: width, type: WidthType.DXA },
    shading: shading || { fill: "FFFFFF", type: ShadingType.CLEAR },
    margins: CELL_MARGIN,
    children: [new Paragraph({ children: [new TextRun({ text, size: 20 })] })]
  });
}
function dataCellBold(text, width, shading = null) {
  return new TableCell({
    borders: BORDERS,
    width: { size: width, type: WidthType.DXA },
    shading: shading || { fill: "FFFFFF", type: ShadingType.CLEAR },
    margins: CELL_MARGIN,
    children: [new Paragraph({ children: [new TextRun({ text, size: 20, bold: true })] })]
  });
}

function twoColTable(rows, widths = [3500, 5860]) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({ children: rows[0].map((t, i) => headerCell(t, widths[i])) }),
      ...rows.slice(1).map((row, ri) =>
        new TableRow({ children: row.map((t, i) => dataCell(t, widths[i], ri % 2 === 0 ? ALT_SHADING : null)) })
      )
    ]
  });
}

function schemaTable(cols, rows) {
  const n = cols.length;
  const w = Math.floor(CONTENT_WIDTH / n);
  const ws = cols.map((_, i) => i === n-1 ? CONTENT_WIDTH - w*(n-1) : w);
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: ws,
    rows: [
      new TableRow({ children: cols.map((c, i) => headerCell(c, ws[i])) }),
      ...rows.map((row, ri) =>
        new TableRow({ children: row.map((t, i) => dataCell(t, ws[i], ri % 2 === 0 ? ALT_SHADING : null)) })
      )
    ]
  });
}

// ── DOCUMENT CONTENT ───────────────────────────────────────────────────────────
const children = [];

// ── COVER PAGE ──
children.push(
  new Paragraph({ children: [new TextRun({ text: "AgriPulse AI", size: 72, bold: true, color: "1E4D78", font: "Arial" })], alignment: AlignmentType.CENTER, spacing: { before: 1440, after: 240 } }),
  new Paragraph({ children: [new TextRun({ text: "AI-Guided Field Force Intelligence", size: 40, color: "2E7D32", font: "Arial" })], alignment: AlignmentType.CENTER, spacing: { before: 0, after: 240 } }),
  new Paragraph({ children: [new TextRun({ text: "Syngenta × IITM BS Hackathon 2026 — Track 2", size: 28, color: "555555", font: "Arial" })], alignment: AlignmentType.CENTER, spacing: { before: 0, after: 720 } }),
  new Paragraph({ children: [new TextRun({ text: "Complete Engineering Implementation Manual", size: 32, bold: true, color: "333333" })], alignment: AlignmentType.CENTER, spacing: { before: 0, after: 240 } }),
  new Paragraph({ children: [new TextRun({ text: "ML Systems Architecture · Backend Engineering · Offline-First Mobile · Data Pipeline", size: 22, color: "666666" })], alignment: AlignmentType.CENTER, spacing: { before: 0, after: 1440 } }),
  new Paragraph({ children: [new TextRun({ text: "Version 2.0 — Production MVP Blueprint", size: 22, color: "999999", italics: true })], alignment: AlignmentType.CENTER }),
  pb()
);

// ── TABLE OF CONTENTS ──
children.push(
  new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" }),
  pb()
);

// ══════════════════════════════════════════════════════════════
// SECTION 1: EXECUTIVE SUMMARY
// ══════════════════════════════════════════════════════════════
children.push(h1("1. Executive Summary"));
children.push(p("AgriPulse AI is an offline-first, AI-powered copilot for Syngenta field representatives operating across Punjab, Haryana, Uttar Pradesh, Rajasthan, and Maharashtra during the Rabi season. It transforms raw field data — retailer visit logs, point-of-sale transactions, inventory movements, and WhatsApp campaign signals — into actionable daily guidance for each field rep."));
children.push(spacer());
children.push(p("The core system solves a specific, measurable problem: field representatives currently allocate visit time based on intuition and familiarity rather than data-driven opportunity signals. This results in high-opportunity retailers being under-visited while low-opportunity retailers receive excessive attention, directly impacting crop protection product penetration during critical disease windows."));
children.push(spacer());
children.push(h3("What the System Does"));
children.push(bullet("Ranks all ~4,000 retailers daily by opportunity score using an XGBoost model trained on engineered features from real hackathon datasets"));
children.push(bullet("Detects anomalies in visit patterns, inventory levels, and POS trends using Isolation Forest"));
children.push(bullet("Recommends a prioritized daily visit list per field rep with SHAP-driven plain-language explanations"));
children.push(bullet("Operates fully offline via SQLite on the mobile device, syncing when connectivity is restored"));
children.push(bullet("Engineers conversion labels by joining visit logs with downstream POS transactions within a configurable attribution window — the core technical innovation"));
children.push(bullet("Integrates WhatsApp campaign engagement signals as predictive features"));
children.push(spacer());
children.push(h3("Primary Demo Scenario"));
children.push(p("Yellow Rust risk in wheat belt, Ludhiana district, Punjab. Weather deviation triggers elevated disease risk. Tilt 250 EC inventory falls at key retailers. POS demand spikes. A retailer not visited in 18 days gets an opportunity score jump from 0.42 to 0.87. The system surfaces this retailer to the rep with the explanation: 'Wheat rust risk elevated. Tilt 250 EC stock critical. 18 days since last visit.' The rep visits, a POS transaction follows within 4 days, and the model records a conversion signal to improve future predictions."));
children.push(spacer());

// SECTION 2: PROBLEM STATEMENT
children.push(pb());
children.push(h1("2. Problem Statement"));
children.push(h2("2.1 Field Force Efficiency Gap"));
children.push(p("Syngenta deploys approximately 500 field representatives across five major states during the Rabi season. Each rep manages 40–80 retailers within their territory. With fixed working hours and significant travel time in rural geographies, each rep can realistically complete 4–6 productive retailer visits per day."));
children.push(spacer());
children.push(p("The fundamental challenge is prioritization under constraints. Without a data-driven system, reps default to visiting familiar, accessible retailers — those on main roads, those they personally know, or those with recently visible sales activity. This behavioral bias creates systematic blind spots:"));
children.push(bullet("Retailers in early inventory depletion phases are missed before the critical buy window closes"));
children.push(bullet("Retailers with WhatsApp campaign engagement but no recent visit convert to competitor products"));
children.push(bullet("Pest and disease outbreak windows are time-critical; a 5-day visit delay can mean a missed season"));
children.push(bullet("High-performing retailers plateau because reps visit them even when no restocking action is needed"));
children.push(spacer());
children.push(h2("2.2 The Rabi Season Context"));
children.push(schemaTable(
  ["Factor", "Details"],
  [
    ["Season", "Rabi (Oct–March). Main sowing window Oct–Nov. Disease risk peaks Jan–Feb."],
    ["Primary crops", "Wheat, Mustard, Chickpea, Potato"],
    ["Key disease risk", "Yellow Rust in Wheat (Puccinia striiformis). Highly weather-dependent."],
    ["Critical product", "Tilt 250 EC (Propiconazole) — fungicide for wheat rust"],
    ["Risk trigger", "Temperature 7–15°C + high humidity + vulnerable crop stage"],
    ["Geography", "Punjab, Haryana, UP (Wheat Belt), Rajasthan, Maharashtra"],
    ["Retailer count", "~4,000 across all territories"],
    ["Field rep count", "~500 across all territories"]
  ]
));
children.push(spacer());
children.push(h2("2.3 What the Data Does NOT Contain (and Why This Matters)"));
children.push(p("The hackathon dataset does not contain direct conversion labels. There is no column stating 'this visit resulted in a sale.' This is a realistic, honest representation of how field CRM data exists in practice. The core technical challenge — and the strongest implementation decision in this project — is engineering conversion labels by joining visit logs with downstream POS transactions."));
children.push(spacer());

// SECTION 3: ACTUAL DATASET UNDERSTANDING
children.push(pb());
children.push(h1("3. Actual Dataset Understanding"));
children.push(h2("3.1 Dataset Overview"));
children.push(schemaTable(
  ["File", "Description", "Approx. Rows", "Key Use"],
  [
    ["retailer_pos.csv", "Point-of-sale transaction records per retailer", "~50,000–200,000", "Revenue signals, demand spikes, label engineering"],
    ["retailer_visit_log.csv", "Field rep visit records with timestamps", "~20,000–60,000", "Visit frequency, recency, label join anchor"],
    ["retailer_inventory_weekly.csv", "Weekly inventory levels per product per retailer", "~80,000–300,000", "Stock depletion rate, stockout risk"],
    ["growers.csv", "Grower profiles linked to retailers", "~10,000–50,000", "Downstream demand signal, crop mix"],
    ["whatsapp_campaign.csv", "Campaign sends, opens, clicks per retailer", "~15,000–80,000", "Engagement signal, demand intent"],
    ["digital_funnel_weekly.csv", "Digital touchpoint funnel per retailer", "~20,000–100,000", "Awareness-to-consideration signal"]
  ]
));
children.push(spacer());
children.push(h2("3.2 Geographic Distribution"));
children.push(schemaTable(
  ["State", "Key Districts", "Primary Crops", "Key Products"],
  [
    ["Punjab", "Ludhiana, Amritsar, Patiala, Jalandhar", "Wheat, Potato", "Tilt 250 EC, Ridomil"],
    ["Haryana", "Karnal, Hisar, Ambala, Rohtak", "Wheat, Mustard", "Tilt 250 EC, Topas"],
    ["Uttar Pradesh", "Agra, Lucknow, Meerut, Varanasi", "Wheat, Chickpea, Potato", "Multiple fungicides"],
    ["Rajasthan", "Jaipur, Jodhpur, Kota, Bikaner", "Mustard, Chickpea", "Insecticides, fungicides"],
    ["Maharashtra", "Pune, Nashik, Aurangabad, Nagpur", "Chickpea, Wheat (limited)", "Broad crop protection"]
  ]
));
children.push(spacer());

// SECTION 4: DATASET SCHEMA BREAKDOWN
children.push(pb());
children.push(h1("4. Dataset Schema Breakdown"));
children.push(h2("4.1 retailer_pos.csv"));
children.push(p("This is the most important dataset for label engineering. Each row represents a product-level POS transaction at a specific retailer on a specific date."));
children.push(schemaTable(
  ["Column", "Type", "Description", "Engineering Role"],
  [
    ["retailer_id", "STRING", "Unique retailer identifier", "Join key"],
    ["transaction_date", "DATE", "Date of POS transaction", "Attribution window anchor"],
    ["sku_id", "STRING", "Unique SKU identifier", "Product-level join key"],
    ["sku_name", "STRING", "Product SKU name (e.g., Tilt 250 EC)", "Product-level signals"],
    ["sku_qty", "FLOAT", "Units sold in transaction", "Demand volume feature"],
    ["sku_price", "FLOAT", "Unit price per SKU in INR", "Revenue feature; engineer revenue = sku_qty x sku_price"]
  ]
));
children.push(spacer());
children.push(h2("4.2 retailer_visit_log.csv"));
children.push(p("The join anchor for label engineering. Each row is a field rep visit to a retailer."));
children.push(schemaTable(
  ["Column", "Type", "Description", "Engineering Role"],
  [
    ["rep_id", "STRING", "Field rep who visited", "Route optimization"],
    ["visit_date", "DATE", "Date of visit", "Recency feature, label window start"],
    ["territory_id", "STRING", "Territory the visit was recorded under", "Territory filter"],
    ["visit_tehsil", "STRING", "Tehsil where visit took place", "Route planning proxy"],
    ["visit_type", "STRING", "retailer_meeting / grower_meeting / campaign_conducted", "Visit classification signal"],
    ["product_recommended", "STRING", "Product discussed during visit", "Product intent signal"]
  ]
));
children.push(spacer());
children.push(h2("4.3 retailer_inventory_weekly.csv"));
children.push(schemaTable(
  ["Column", "Type", "Description", "Engineering Role"],
  [
    ["retailer_id", "STRING", "Retailer identifier", "Join key"],
    ["sku_id", "STRING", "Unique SKU identifier", "Product-level join key"],
    ["sku_name", "STRING", "Product SKU name", "Product-level filter"],
    ["sku_qty", "FLOAT", "Units on hand at week end (0 = out of stock)", "Stock level feature"],
    ["week_end_date", "DATE", "Sunday date closing the weekly snapshot", "Temporal join"]
  ]
));
children.push(spacer());
children.push(h2("4.4 whatsapp_campaign.csv"));
children.push(schemaTable(
  ["Column", "Type", "Description", "Engineering Role"],
  [
    ["retailer_id", "STRING", "Retailer identifier", "Join key"],
    ["grower_id", "STRING", "Foreign key to growers.csv (GROWER-level, not retailer-level)", "Join via tehsil to aggregate to retailer level"],
    ["campaign_product", "STRING", "Product the campaign promotes (e.g., Tilt 250 EC)", "Product-level intent signal"],
    ["campaign_crop", "STRING", "Crop the campaign targets (e.g., wheat)", "Crop-level demand signal"],
    ["message_sent_date", "DATE", "Date message was sent to grower", "Recency signal"],
    ["delivered_status", "BOOL", "Whether message reached the handset", "Delivery confirmation"],
    ["opened_status", "BOOL", "Whether grower opened the message", "Engagement binary"],
    ["clicked_status", "BOOL", "Whether grower clicked a tracked link", "High-intent signal"]
  ]
));
children.push(spacer());

// SECTION 5: DATA ENGINEERING PIPELINE
children.push(pb());
children.push(h1("5. Data Engineering Pipeline"));
children.push(h2("5.1 Pipeline Overview"));
children.push(p("The data engineering pipeline runs as a nightly Celery task. It ingests raw CSVs (or database tables populated from CSVs), applies cleaning and validation, engineers features and labels, and outputs a daily retailer scoring table consumed by the FastAPI backend."));
children.push(spacer());
children.push(p("Pipeline stages:"));
children.push(numbered("Raw ingestion: CSV → PostgreSQL staging tables via pandas + SQLAlchemy"));
children.push(numbered("Data validation: nulls, date ranges, referential integrity checks"));
children.push(numbered("Label engineering: visit log × POS join with attribution window"));
children.push(numbered("Feature engineering: rolling windows, depletion rates, engagement scores"));
children.push(numbered("Model inference: XGBoost opportunity scoring + Isolation Forest anomaly detection"));
children.push(numbered("SHAP explanation generation: per-retailer top-3 feature attributions"));
children.push(numbered("Daily output table: retailer_daily_scores → served by FastAPI"));
children.push(spacer());
children.push(h2("5.2 Raw Ingestion Code"));
children.push(...codeBlock([
  "# pipeline/ingest.py",
  "import pandas as pd",
  "from sqlalchemy import create_engine",
  "from pathlib import Path",
  "import logging",
  "",
  "logger = logging.getLogger(__name__)",
  "",
  "DATABASE_URL = 'postgresql://agripulse:password@localhost:5432/agripulse'",
  "engine = create_engine(DATABASE_URL)",
  "",
  "DATASETS = {",
  "    'retailer_pos':              'data/retailer_pos.csv',",
  "    'retailer_visit_log':        'data/retailer_visit_log.csv',",
  "    'retailer_inventory_weekly': 'data/retailer_inventory_weekly.csv',",
  "    'growers':                   'data/growers.csv',",
  "    'whatsapp_campaign':         'data/whatsapp_campaign.csv',",
  "    'digital_funnel_weekly':     'data/digital_funnel_weekly.csv',",
  "}",
  "",
  "DATE_COLS = {",
  "    'retailer_pos':              ['transaction_date'],",
  "    'retailer_visit_log':        ['visit_date'],",
  "    'retailer_inventory_weekly': ['week_end_date'],",
  "    'whatsapp_campaign':         ['message_sent_date'],",
  "    'digital_funnel_weekly':     ['week_start_date'],",
  "}",
  "",
  "def ingest_all(data_dir: str = 'data'):",
  "    for table_name, rel_path in DATASETS.items():",
  "        path = Path(data_dir) / Path(rel_path).name",
  "        if not path.exists():",
  "            logger.warning(f'Dataset not found: {path}')",
  "            continue",
  "",
  "        df = pd.read_csv(path, low_memory=False)",
  "",
  "        # Parse date columns",
  "        for col in DATE_COLS.get(table_name, []):",
  "            if col in df.columns:",
  "                df[col] = pd.to_datetime(df[col], errors='coerce')",
  "",
  "        # Drop rows with null primary keys",
  "        if 'retailer_id' in df.columns:",
  "            before = len(df)",
  "            df = df.dropna(subset=['retailer_id'])",
  "            dropped = before - len(df)",
  "            if dropped > 0:",
  "                logger.warning(f'{table_name}: dropped {dropped} rows with null retailer_id')",
  "",
  "        df.to_sql(table_name, engine, if_exists='replace', index=False)",
  "        logger.info(f'Ingested {len(df)} rows into {table_name}')",
  "",
  "if __name__ == '__main__':",
  "    ingest_all()",
]));
children.push(spacer());

// SECTION 6: LABEL ENGINEERING STRATEGY
children.push(pb());
children.push(h1("6. Label Engineering Strategy"));
children.push(h2("6.1 The Core Problem: No Direct Conversion Labels"));
children.push(p("The hackathon dataset does not contain a direct 'converted: yes/no' column for field visits. This is realistic — most field CRM systems record visit activities but do not automatically track which visits caused downstream purchases. The challenge is to infer visit conversion from observable downstream signals."));
children.push(spacer());
children.push(p("The solution: visit conversion labels are engineered by joining the visit log with downstream POS transactions occurring within a configurable attribution window of 3 to 7 days after the visit date. If a retailer records any POS transaction for a Syngenta product within the attribution window following a rep visit, that visit is labeled a conversion (label = 1). Visits without subsequent POS activity within the window are labeled non-conversions (label = 0)."));
children.push(spacer());
children.push(h2("6.2 Attribution Window Logic"));
children.push(schemaTable(
  ["Window", "Logic", "Trade-off"],
  [
    ["3 days", "Tight attribution: high precision, lower recall", "Misses slow-acting conversions"],
    ["5 days (default)", "Balanced attribution: reasonable precision and recall", "Good for most retailer types"],
    ["7 days", "Liberal attribution: higher recall, lower precision", "May attribute non-causal transactions"]
  ]
));
children.push(spacer());
children.push(h2("6.3 Label Engineering Code"));
children.push(...codeBlock([
  "# pipeline/label_engineering.py",
  "import pandas as pd",
  "from sqlalchemy import create_engine",
  "",
  "engine = create_engine('postgresql://agripulse:password@localhost:5432/agripulse')",
  "",
  "def engineer_conversion_labels(attribution_window_days: int = 5) -> pd.DataFrame:",
  "    \"\"\"",
  "    Join visit log with POS transactions within attribution window.",
  "    Returns a DataFrame with visit_id, retailer_id, visit_date, converted (0/1),",
  "    and post_visit_revenue (sum of sku_qty * sku_price within window).",
  "    \"\"\"",
  "    visits = pd.read_sql('SELECT * FROM retailer_visit_log', engine)",
  "    pos    = pd.read_sql('SELECT retailer_id, transaction_date, sku_qty, sku_price FROM retailer_pos', engine)",
  "    pos['revenue'] = pos['sku_qty'] * pos['sku_price']",
  "",
  "    visits['visit_date']        = pd.to_datetime(visits['visit_date'])",
  "    pos['transaction_date']     = pd.to_datetime(pos['transaction_date'])",
  "",
  "    results = []",
  "",
  "    for _, visit in visits.iterrows():",
  "        rid   = visit['retailer_id']",
  "        vdate = visit['visit_date']",
  "        window_end = vdate + pd.Timedelta(days=attribution_window_days)",
  "",
  "        # Find POS transactions for this retailer within the attribution window",
  "        mask = (",
  "            (pos['retailer_id'] == rid) &",
  "            (pos['transaction_date'] > vdate) &",
  "            (pos['transaction_date'] <= window_end)",
  "        )",
  "        matching_pos = pos[mask]",
  "",
  "        results.append({",
  "            'visit_id':          visit['visit_id'],",
  "            'retailer_id':       rid,",
  "            'rep_id':            visit.get('rep_id'),",
  "            'visit_date':        vdate,",
  "            'converted':         int(len(matching_pos) > 0),",
  "            'post_visit_revenue': matching_pos['revenue'].sum(),  # revenue = sku_qty * sku_price",
  "            'pos_transactions':   len(matching_pos),",
  "        })",
  "",
  "    labels_df = pd.DataFrame(results)",
  "    conversion_rate = labels_df['converted'].mean()",
  "    print(f'[Label Engineering] Attribution window: {attribution_window_days} days')",
  "    print(f'[Label Engineering] Total visits labeled: {len(labels_df)}')",
  "    print(f'[Label Engineering] Conversion rate: {conversion_rate:.2%}')",
  "",
  "    return labels_df",
  "",
  "# Optimised version using merge_asof for large datasets",
  "def engineer_labels_fast(attribution_window_days: int = 5) -> pd.DataFrame:",
  "    visits = pd.read_sql('SELECT * FROM retailer_visit_log', engine)",
  "    pos    = pd.read_sql(",
  "        'SELECT retailer_id, transaction_date, sku_qty, sku_price FROM retailer_pos',",
  "        engine",
  "    )",
  "",
  "    visits = visits.sort_values(['retailer_id', 'visit_date'])",
  "    pos    = pos.sort_values(['retailer_id', 'transaction_date'])",
  "",
  "    # Aggregate POS per retailer per day",
  "    daily_pos = (",
  "        pos.groupby(['retailer_id', 'transaction_date'])",
  "           .agg(daily_revenue=('revenue', 'sum'), daily_txns=('sku_qty', 'count'))",
  "           .reset_index()",
  "    )",
  "",
  "    # For each visit, sum POS in window using groupby + rolling logic",
  "    # (vectorised approach for production scale)",
  "    window = pd.Timedelta(days=attribution_window_days)",
  "",
  "    def post_visit_pos(group):",
  "        rid = group['retailer_id'].iloc[0]",
  "        rid_pos = daily_pos[daily_pos['retailer_id'] == rid].copy()",
  "",
  "        for idx, row in group.iterrows():",
  "            start = row['visit_date']",
  "            end   = start + window",
  "            mask  = (rid_pos['transaction_date'] > start) & (rid_pos['transaction_date'] <= end)",
  "            grp_pos = rid_pos[mask]",
  "            group.at[idx, 'post_visit_revenue'] = grp_pos['daily_revenue'].sum()",
  "            group.at[idx, 'pos_transactions']   = grp_pos['daily_txns'].sum()",
  "        return group",
  "",
  "    visits['post_visit_revenue'] = 0.0",
  "    visits['pos_transactions']   = 0",
  "    labeled = visits.groupby('retailer_id', group_keys=False).apply(post_visit_pos)",
  "    labeled['converted'] = (labeled['pos_transactions'] > 0).astype(int)",
  "    return labeled",
]));
children.push(spacer());
children.push(h2("6.4 Label Quality Considerations"));
children.push(bullet("Class imbalance: expect 20–40% conversion rate. Use class_weight='balanced' in XGBoost or oversample minority class."));
children.push(bullet("Attribution bias: a retailer may have purchased due to independent demand, not the rep visit. The model learns to weight visit-induced vs. background POS activity over time."));
children.push(bullet("Cold start: new retailers or new reps with minimal visit history require fallback scoring based on similar retailers by tehsil, product mix, and inventory profile."));
children.push(bullet("Window sensitivity: run label engineering at multiple windows (3, 5, 7 days) and compare feature correlations to validate robustness."));
children.push(spacer());

// SECTION 7: FEATURE ENGINEERING
children.push(pb());
children.push(h1("7. Feature Engineering Pipeline"));
children.push(h2("7.1 Feature Categories"));
children.push(schemaTable(
  ["Category", "Features", "Source Tables"],
  [
    ["Visit Recency", "days_since_last_visit, visit_count_30d, visit_count_90d, avg_visit_gap", "retailer_visit_log"],
    ["POS Trend", "pos_revenue_7d, pos_revenue_30d, pos_revenue_90d, pos_revenue_mom_growth, pos_revenue_yoy_growth", "retailer_pos"],
    ["Inventory", "current_stock_level, stock_depletion_rate_7d, days_to_stockout, stockout_flag", "retailer_inventory_weekly"],
    ["WhatsApp Engagement", "wa_open_rate_30d, wa_click_rate_30d, wa_reply_flag, days_since_last_wa_open", "whatsapp_campaign"],
    ["Digital Funnel", "funnel_awareness_score, funnel_consideration_score, funnel_conversion_score", "digital_funnel_weekly"],
    ["Grower Network", "grower_count, grower_active_ratio, grower_crop_mix_entropy", "growers"],
    ["Geographic", "state_encoded, district_encoded, tehsil_encoded", "All tables"],
    ["Temporal", "day_of_week, week_of_season, days_to_peak_disease_window", "Derived"]
  ]
));
children.push(spacer());
children.push(h2("7.2 Feature Engineering Code"));
children.push(...codeBlock([
  "# pipeline/feature_engineering.py",
  "import pandas as pd",
  "import numpy as np",
  "from sqlalchemy import create_engine",
  "",
  "engine = create_engine('postgresql://agripulse:password@localhost:5432/agripulse')",
  "",
  "def compute_rolling_pos_features(pos: pd.DataFrame, as_of_date: pd.Timestamp) -> pd.DataFrame:",
  "    \"\"\"Compute rolling POS revenue features per retailer as of a given date.\"\"\"",
  "    pos = pos[pos['transaction_date'] <= as_of_date].copy()",
  "",
  "    def rolling_sum(df, days):",
  "        cutoff = as_of_date - pd.Timedelta(days=days)",
  "        df2 = df[df['transaction_date'] >= cutoff].copy()",
  "        df2['revenue'] = df2['sku_qty'] * df2['sku_price']",
  "        return df2.groupby('retailer_id')['revenue'].sum()",
  "",
  "    r7  = rolling_sum(pos, 7).rename('pos_revenue_7d')",
  "    r30 = rolling_sum(pos, 30).rename('pos_revenue_30d')",
  "    r90 = rolling_sum(pos, 90).rename('pos_revenue_90d')",
  "",
  "    # Month-over-month growth",
  "    r30_prev = rolling_sum(pos[pos['transaction_date'] < as_of_date - pd.Timedelta(days=30)], 30)",
  "    mom_growth = ((r30 - r30_prev) / r30_prev.replace(0, np.nan)).fillna(0).rename('pos_revenue_mom_growth')",
  "",
  "    return pd.concat([r7, r30, r90, mom_growth], axis=1).reset_index().fillna(0)",
  "",
  "",
  "def compute_visit_features(visits: pd.DataFrame, as_of_date: pd.Timestamp) -> pd.DataFrame:",
  "    \"\"\"Compute visit recency and frequency features per retailer.\"\"\"",
  "    visits = visits[visits['visit_date'] <= as_of_date].copy()",
  "",
  "    latest_visit = visits.groupby('retailer_id')['visit_date'].max().rename('last_visit_date')",
  "    count_30d    = visits[visits['visit_date'] >= as_of_date - pd.Timedelta(days=30)]\\",
  "                        .groupby('retailer_id').size().rename('visit_count_30d')",
  "    count_90d    = visits[visits['visit_date'] >= as_of_date - pd.Timedelta(days=90)]\\",
  "                        .groupby('retailer_id').size().rename('visit_count_90d')",
  "",
  "    feats = pd.concat([latest_visit, count_30d, count_90d], axis=1).reset_index()",
  "    feats['days_since_last_visit'] = (as_of_date - feats['last_visit_date']).dt.days.fillna(999)",
  "    feats = feats.drop(columns=['last_visit_date'])",
  "    feats = feats.fillna(0)",
  "    return feats",
  "",
  "",
  "def compute_inventory_features(inv: pd.DataFrame, as_of_date: pd.Timestamp) -> pd.DataFrame:",
  "    \"\"\"Compute inventory depletion rate and stockout risk per retailer.\"\"\"",
  "    # Get most recent 2 inventory records per retailer per product",
  "    inv = inv[inv['week_end_date'] <= as_of_date].copy()",
  "    inv_sorted = inv.sort_values(['retailer_id', 'sku_name', 'week_end_date'])",
  "",
  "    # Calculate week-over-week depletion",
  "    inv_sorted['prev_stock'] = inv_sorted.groupby(['retailer_id','sku_name'])['sku_qty'].shift(1)",
  "    inv_sorted['weekly_depletion'] = inv_sorted['prev_stock'] - inv_sorted['sku_qty']",
  "",
  "    # Latest record per retailer per product",
  "    latest = inv_sorted.groupby(['retailer_id', 'sku_name']).last().reset_index()",
  "",
  "    # Aggregate across products: focus on Tilt 250 EC and overall",
  "    tilt_mask = latest['sku_name'].str.contains('Tilt', case=False, na=False)",
  "    tilt_inv  = latest[tilt_mask].groupby('retailer_id').agg(",
  "        tilt_stock_level=('sku_qty', 'sum'),",
  "        tilt_depletion_rate=('weekly_depletion', 'mean'),",
  "    ).reset_index()",
  "",
  "    overall_inv = latest.groupby('retailer_id').agg(",
  "        total_stock=('sku_qty', 'sum'),",
  "        avg_depletion_rate=('weekly_depletion', 'mean'),",
  "    ).reset_index()",
  "",
  "    # Days to stockout: stock / weekly_depletion * 7",
  "    tilt_inv['days_to_stockout'] = (",
  "        (tilt_inv['tilt_stock_level'] / tilt_inv['tilt_depletion_rate'].replace(0, np.nan)) * 7",
  "    ).clip(0, 90).fillna(90)",
  "    tilt_inv['stockout_flag'] = (tilt_inv['days_to_stockout'] < 14).astype(int)",
  "",
  "    return tilt_inv.merge(overall_inv, on='retailer_id', how='outer').fillna(0)",
  "",
  "",
  "def compute_whatsapp_features(wa: pd.DataFrame, as_of_date: pd.Timestamp) -> pd.DataFrame:",
  "    \"\"\"Compute WhatsApp engagement features per retailer.\"\"\"",
  "    # Note: whatsapp_campaign is grower-level; aggregate to tehsil then join retailers",
  "    wa_recent = wa[wa['message_sent_date'] >= as_of_date - pd.Timedelta(days=30)].copy()",
  "",
  "    feats = wa_recent.groupby('retailer_id').agg(",
  "        wa_messages_sent=('opened_status', 'count'),",
  "        wa_opened=('opened_status', 'sum'),",
  "        wa_clicked=('clicked_status', 'sum'),",
  "        wa_replied=('clicked_status', 'sum'),  # no replied col; use clicked as proxy",
  "    ).reset_index()",
  "",
  "    feats['wa_open_rate_30d']  = feats['wa_opened']  / feats['wa_messages_sent'].replace(0, 1)",
  "    feats['wa_click_rate_30d'] = feats['wa_clicked'] / feats['wa_messages_sent'].replace(0, 1)",
  "    feats['wa_reply_flag']     = (feats['wa_replied'] > 0).astype(int)",
  "",
  "    # Days since last WhatsApp open",
  "    last_open = wa[wa['opened_status'] == True].groupby('grower_id')['message_sent_date'].max()",
  "    feats = feats.merge(last_open.rename('last_wa_open'), on='retailer_id', how='left')",
  "    feats['days_since_last_wa_open'] = (as_of_date - feats['last_wa_open']).dt.days.fillna(999)",
  "    feats = feats.drop(columns=['last_wa_open', 'wa_opened', 'wa_clicked', 'wa_replied'])",
  "    return feats.fillna(0)",
  "",
  "",
  "def build_feature_matrix(as_of_date: str = None) -> pd.DataFrame:",
  "    \"\"\"Build the complete feature matrix for all retailers as of a given date.\"\"\"",
  "    if as_of_date is None:",
  "        as_of_date = pd.Timestamp.today().normalize()",
  "    else:",
  "        as_of_date = pd.Timestamp(as_of_date)",
  "",
  "    pos     = pd.read_sql('SELECT * FROM retailer_pos', engine)",
  "    visits  = pd.read_sql('SELECT * FROM retailer_visit_log', engine)",
  "    inv     = pd.read_sql('SELECT * FROM retailer_inventory_weekly', engine)",
  "    wa      = pd.read_sql('SELECT * FROM whatsapp_campaign', engine)",
  "    retailers = pd.read_sql(",
  "        'SELECT DISTINCT retailer_id, visit_tehsil AS tehsil FROM retailer_visit_log', engine",
  "    )",
  "",
  "    # Parse dates",
  "    pos['transaction_date']  = pd.to_datetime(pos['transaction_date'])",
  "    visits['visit_date']     = pd.to_datetime(visits['visit_date'])",
  "    inv['week_end_date']     = pd.to_datetime(inv['week_end_date'])",
  "    wa['message_sent_date']  = pd.to_datetime(wa['message_sent_date'])",
  "",
  "    pos_feats  = compute_rolling_pos_features(pos, as_of_date)",
  "    vis_feats  = compute_visit_features(visits, as_of_date)",
  "    inv_feats  = compute_inventory_features(inv, as_of_date)",
  "    wa_feats   = compute_whatsapp_features(wa, as_of_date)",
  "",
  "    feature_matrix = retailers",
  "    for feats in [pos_feats, vis_feats, inv_feats, wa_feats]:",
  "        feature_matrix = feature_matrix.merge(feats, on='retailer_id', how='left')",
  "",
  "    feature_matrix = feature_matrix.fillna(0)",
  "    print(f'[Feature Matrix] Shape: {feature_matrix.shape}')",
  "    return feature_matrix",
]));
children.push(spacer());

// SECTION 8: ML ARCHITECTURE
children.push(pb());
children.push(h1("8. ML Architecture"));
children.push(h2("8.1 System Architecture Diagram"));
children.push(...codeBlock([
  "                    RAW DATA LAYER",
  "  ┌─────────────────────────────────────────────────────────┐",
  "  │  retailer_pos.csv  retailer_visit_log.csv  inventory   │",
  "  │  growers.csv       whatsapp_campaign.csv   digital     │",
  "  └────────────────────────────┬────────────────────────────┘",
  "                               │ nightly ingest (Celery)",
  "                    DATA ENGINEERING LAYER",
  "  ┌────────────────────────────▼────────────────────────────┐",
  "  │  Label Engineering (attribution window join)            │",
  "  │  Feature Engineering (rolling windows, depletion rates) │",
  "  │  Feature Matrix (retailer × feature table)              │",
  "  └────────────────────────────┬────────────────────────────┘",
  "                               │",
  "                      ML LAYER",
  "  ┌────────────────────────────▼────────────────────────────┐",
  "  │  XGBoost Opportunity Scorer  → opportunity_score [0,1]  │",
  "  │  Isolation Forest Detector   → anomaly_flag + score     │",
  "  │  SHAP Explainer              → top-3 feature reasons    │",
  "  └────────────────────────────┬────────────────────────────┘",
  "                               │",
  "                  BACKEND API LAYER (FastAPI)",
  "  ┌────────────────────────────▼────────────────────────────┐",
  "  │  /api/v1/reps/{rep_id}/priority-list                    │",
  "  │  /api/v1/retailers/{id}/opportunity                     │",
  "  │  /api/v1/retailers/{id}/anomalies                       │",
  "  │  /api/v1/sync  (offline delta sync)                     │",
  "  └────────────────────────────┬────────────────────────────┘",
  "                               │",
  "             MOBILE APP (React Native / Expo)",
  "  ┌────────────────────────────▼────────────────────────────┐",
  "  │  SQLite offline cache  → visit queue → sync upload      │",
  "  │  Daily priority list   → rep dashboard                  │",
  "  │  SHAP explanation      → plain language card            │",
  "  │  Route suggestion      → tehsil-cluster map             │",
  "  └─────────────────────────────────────────────────────────┘",
]));
children.push(spacer());
children.push(h2("8.2 Two-Model Strategy"));
children.push(schemaTable(
  ["Model", "Algorithm", "Target", "Output", "Trigger"],
  [
    ["Opportunity Scorer", "XGBoost Classifier", "converted (0/1) — engineered label", "opportunity_score [0.0–1.0]", "Nightly batch for all retailers"],
    ["Anomaly Detector", "Isolation Forest", "Unsupervised — no labels needed", "anomaly_score + anomaly_flag", "Nightly batch for all retailers"],
    ["SHAP Explainer", "TreeExplainer (post-hoc)", "XGBoost model", "Top-3 SHAP feature values", "Per-retailer at scoring time"]
  ]
));
children.push(spacer());

// SECTION 9: XGBOOST
children.push(pb());
children.push(h1("9. XGBoost Opportunity Scoring"));
children.push(h2("9.1 Training Pipeline"));
children.push(...codeBlock([
  "# ml/train_xgboost.py",
  "import pandas as pd",
  "import numpy as np",
  "import xgboost as xgb",
  "import joblib",
  "from sklearn.model_selection import train_test_split",
  "from sklearn.metrics import roc_auc_score, classification_report",
  "from sklearn.preprocessing import LabelEncoder",
  "",
  "from pipeline.label_engineering import engineer_conversion_labels",
  "from pipeline.feature_engineering import build_feature_matrix",
  "",
  "FEATURE_COLS = [",
  "    'days_since_last_visit', 'visit_count_30d', 'visit_count_90d',",
  "    'pos_revenue_7d', 'pos_revenue_30d', 'pos_revenue_90d', 'pos_revenue_mom_growth',",
  "    'tilt_stock_level', 'tilt_depletion_rate', 'days_to_stockout', 'stockout_flag',",
  "    'wa_open_rate_30d', 'wa_click_rate_30d', 'wa_reply_flag', 'days_since_last_wa_open',",
  "    'state_encoded', 'district_encoded',",
  "]",
  "",
  "def encode_geo(df: pd.DataFrame) -> pd.DataFrame:",
  "    for col in ['state', 'district', 'tehsil']:",
  "        if col in df.columns:",
  "            le = LabelEncoder()",
  "            df[f'{col}_encoded'] = le.fit_transform(df[col].fillna('Unknown'))",
  "            joblib.dump(le, f'models/le_{col}.pkl')",
  "    return df",
  "",
  "",
  "def train():",
  "    # Load labeled data",
  "    labels = engineer_conversion_labels(attribution_window_days=5)",
  "",
  "    # Build feature matrix as of each visit date (simplified: use global as-of latest date)",
  "    as_of_date = labels['visit_date'].max()",
  "    features   = build_feature_matrix(as_of_date=str(as_of_date.date()))",
  "    features   = encode_geo(features)",
  "",
  "    # Merge labels with features",
  "    df = labels.merge(features, on='retailer_id', how='inner')",
  "",
  "    available_features = [c for c in FEATURE_COLS if c in df.columns]",
  "    X = df[available_features].fillna(0)",
  "    y = df['converted']",
  "",
  "    X_train, X_test, y_train, y_test = train_test_split(",
  "        X, y, test_size=0.2, random_state=42, stratify=y",
  "    )",
  "",
  "    # Handle class imbalance",
  "    scale_pos_weight = (y_train == 0).sum() / (y_train == 1).sum()",
  "    print(f'[XGBoost] scale_pos_weight: {scale_pos_weight:.2f}')",
  "",
  "    model = xgb.XGBClassifier(",
  "        n_estimators=300,",
  "        max_depth=5,",
  "        learning_rate=0.05,",
  "        subsample=0.8,",
  "        colsample_bytree=0.8,",
  "        scale_pos_weight=scale_pos_weight,",
  "        eval_metric='auc',",
  "        use_label_encoder=False,",
  "        random_state=42,",
  "    )",
  "",
  "    model.fit(",
  "        X_train, y_train,",
  "        eval_set=[(X_test, y_test)],",
  "        verbose=50,",
  "    )",
  "",
  "    y_pred_proba = model.predict_proba(X_test)[:, 1]",
  "    auc = roc_auc_score(y_test, y_pred_proba)",
  "    print(f'[XGBoost] Test AUC: {auc:.4f}')",
  "    print(classification_report(y_test, (y_pred_proba > 0.5).astype(int)))",
  "",
  "    # Save model and feature list",
  "    joblib.dump(model, 'models/xgboost_opportunity_scorer.pkl')",
  "    joblib.dump(available_features, 'models/feature_cols.pkl')",
  "    print('[XGBoost] Model saved to models/xgboost_opportunity_scorer.pkl')",
  "",
  "if __name__ == '__main__':",
  "    train()",
]));
children.push(spacer());

// SECTION 10: ISOLATION FOREST
children.push(pb());
children.push(h1("10. Isolation Forest Anomaly Detection"));
children.push(h2("10.1 What We Are Detecting"));
children.push(bullet("Visit pattern anomalies: a retailer typically visited every 10 days suddenly not visited for 35 days"));
children.push(bullet("POS spikes: revenue 3× above rolling baseline (potential stockpiling, competitor activity, disease outbreak demand)"));
children.push(bullet("Inventory anomalies: stock level drops 80% in one week with no corresponding POS transaction (grey market leakage)"));
children.push(bullet("Engagement drop: retailer who consistently engaged with WhatsApp campaigns suddenly goes silent"));
children.push(spacer());
children.push(h2("10.2 Anomaly Detection Code"));
children.push(...codeBlock([
  "# ml/anomaly_detection.py",
  "import pandas as pd",
  "import numpy as np",
  "import joblib",
  "from sklearn.ensemble import IsolationForest",
  "from sklearn.preprocessing import StandardScaler",
  "",
  "ANOMALY_FEATURES = [",
  "    'days_since_last_visit',",
  "    'pos_revenue_7d',",
  "    'pos_revenue_30d',",
  "    'pos_revenue_mom_growth',",
  "    'tilt_stock_level',",
  "    'tilt_depletion_rate',",
  "    'wa_open_rate_30d',",
  "]",
  "",
  "def train_anomaly_detector(features_df: pd.DataFrame):",
  "    available = [c for c in ANOMALY_FEATURES if c in features_df.columns]",
  "    X = features_df[available].fillna(0)",
  "",
  "    scaler = StandardScaler()",
  "    X_scaled = scaler.fit_transform(X)",
  "",
  "    # contamination=0.05: expect ~5% of retailers to be anomalous",
  "    iso = IsolationForest(",
  "        n_estimators=200,",
  "        contamination=0.05,",
  "        random_state=42,",
  "        n_jobs=-1,",
  "    )",
  "    iso.fit(X_scaled)",
  "",
  "    joblib.dump(iso, 'models/isolation_forest.pkl')",
  "    joblib.dump(scaler, 'models/anomaly_scaler.pkl')",
  "    joblib.dump(available, 'models/anomaly_features.pkl')",
  "    print('[IsoForest] Anomaly detector trained and saved.')",
  "    return iso, scaler",
  "",
  "",
  "def score_anomalies(features_df: pd.DataFrame) -> pd.DataFrame:",
  "    iso     = joblib.load('models/isolation_forest.pkl')",
  "    scaler  = joblib.load('models/anomaly_scaler.pkl')",
  "    avail   = joblib.load('models/anomaly_features.pkl')",
  "",
  "    X = features_df[avail].fillna(0)",
  "    X_scaled = scaler.transform(X)",
  "",
  "    # decision_function returns negative scores: lower = more anomalous",
  "    raw_scores = iso.decision_function(X_scaled)",
  "    predictions = iso.predict(X_scaled)  # -1 = anomaly, 1 = normal",
  "",
  "    # Normalise to [0, 1] where 1 = most anomalous",
  "    normalised = 1 - (raw_scores - raw_scores.min()) / (raw_scores.max() - raw_scores.min() + 1e-9)",
  "",
  "    result = features_df[['retailer_id']].copy()",
  "    result['anomaly_score'] = normalised",
  "    result['anomaly_flag']  = (predictions == -1).astype(int)",
  "",
  "    print(f'[IsoForest] Anomalies flagged: {result[\"anomaly_flag\"].sum()}')",
  "    return result",
]));
children.push(spacer());

// SECTION 11: SHAP EXPLAINABILITY
children.push(pb());
children.push(h1("11. SHAP Explainability"));
children.push(h2("11.1 Why SHAP Matters in this Context"));
children.push(p("Field representatives are not data scientists. A score of 0.87 is meaningless without context. SHAP (SHapley Additive exPlanations) decomposes each prediction into per-feature contributions, enabling the system to generate plain-language explanations like 'Score driven by: Tilt 250 EC stock running low (+0.22), not visited in 18 days (+0.19), strong WhatsApp engagement last week (+0.11).'"));
children.push(spacer());
children.push(h2("11.2 SHAP Implementation"));
children.push(...codeBlock([
  "# ml/explain.py",
  "import shap",
  "import pandas as pd",
  "import numpy as np",
  "import joblib",
  "",
  "FEATURE_DISPLAY_NAMES = {",
  "    'days_since_last_visit':     'Days since last visit',",
  "    'pos_revenue_7d':             'POS revenue (last 7 days)',",
  "    'pos_revenue_30d':            'POS revenue (last 30 days)',",
  "    'pos_revenue_mom_growth':     'Revenue growth month-over-month',",
  "    'tilt_stock_level':           'Tilt 250 EC stock level',",
  "    'tilt_depletion_rate':        'Tilt 250 EC depletion rate',",
  "    'days_to_stockout':           'Days until Tilt 250 EC stockout',",
  "    'stockout_flag':              'Near stockout alert',",
  "    'wa_open_rate_30d':           'WhatsApp open rate (30 days)',",
  "    'wa_click_rate_30d':          'WhatsApp click rate (30 days)',",
  "    'wa_reply_flag':              'WhatsApp reply received',",
  "    'days_since_last_wa_open':    'Days since last WhatsApp open',",
  "}",
  "",
  "def generate_shap_explanation(retailer_features: pd.Series, top_n: int = 3) -> list:",
  "    \"\"\"",
  "    Returns a list of dicts with feature, shap_value, direction, explanation_text",
  "    for the top_n most influential features for a single retailer.",
  "    \"\"\"",
  "    model   = joblib.load('models/xgboost_opportunity_scorer.pkl')",
  "    f_cols  = joblib.load('models/feature_cols.pkl')",
  "",
  "    explainer = shap.TreeExplainer(model)",
  "    X = retailer_features[f_cols].fillna(0).values.reshape(1, -1)",
  "    shap_values = explainer.shap_values(X)[0]",
  "",
  "    shap_dict = dict(zip(f_cols, shap_values))",
  "    sorted_feats = sorted(shap_dict.items(), key=lambda x: abs(x[1]), reverse=True)",
  "",
  "    explanations = []",
  "    for feat, sv in sorted_feats[:top_n]:",
  "        direction = 'increases' if sv > 0 else 'decreases'",
  "        display   = FEATURE_DISPLAY_NAMES.get(feat, feat.replace('_', ' '))",
  "        raw_value = retailer_features.get(feat, 'N/A')",
  "        explanations.append({",
  "            'feature':      feat,",
  "            'display_name': display,",
  "            'shap_value':   round(float(sv), 4),",
  "            'direction':    direction,",
  "            'raw_value':    raw_value,",
  "            'explanation':  f'{display} ({raw_value:.1f}) {direction} recommendation score',",
  "        })",
  "    return explanations",
  "",
  "",
  "def batch_shap_explanations(features_df: pd.DataFrame) -> pd.DataFrame:",
  "    \"\"\"Generate top-3 SHAP explanations for all retailers and store as JSON.\"\"\"",
  "    import json",
  "    model  = joblib.load('models/xgboost_opportunity_scorer.pkl')",
  "    f_cols = joblib.load('models/feature_cols.pkl')",
  "",
  "    X = features_df[f_cols].fillna(0)",
  "    explainer   = shap.TreeExplainer(model)",
  "    shap_matrix = explainer.shap_values(X)",
  "",
  "    records = []",
  "    for i, row in features_df.iterrows():",
  "        sv_row   = shap_matrix[i]",
  "        sv_dict  = dict(zip(f_cols, sv_row))",
  "        top3     = sorted(sv_dict.items(), key=lambda x: abs(x[1]), reverse=True)[:3]",
  "        reasons  = [",
  "            {",
  "                'feature': f,",
  "                'display': FEATURE_DISPLAY_NAMES.get(f, f),",
  "                'shap':    round(sv, 4),",
  "                'value':   round(float(row.get(f, 0)), 2),",
  "            }",
  "            for f, sv in top3",
  "        ]",
  "        records.append({",
  "            'retailer_id':    row['retailer_id'],",
  "            'shap_reasons':   json.dumps(reasons),",
  "            'top_reason_text': reasons[0]['display'] if reasons else '',",
  "        })",
  "    return pd.DataFrame(records)",
]));
children.push(spacer());

// SECTION 12: NEXT BEST ACTION ENGINE
children.push(pb());
children.push(h1("12. Next Best Action Engine"));
children.push(h2("12.1 Logic Overview"));
children.push(p("The Next Best Action (NBA) engine sits on top of the opportunity scorer and anomaly detector. It maps a combination of scores and flags into a specific recommended action and supporting message that the rep sees on the mobile app."));
children.push(spacer());
children.push(...codeBlock([
  "# ml/next_best_action.py",
  "import pandas as pd",
  "",
  "ACTION_RULES = [",
  "    # (condition, action_code, action_label, priority)",
  "    (lambda r: r['stockout_flag'] == 1 and r['opportunity_score'] > 0.7,",
  "     'URGENT_RESTOCK', 'Urgent: Restock Tilt 250 EC', 1),",
  "",
  "    (lambda r: r['anomaly_flag'] == 1 and r['pos_revenue_mom_growth'] > 0.5,",
  "     'INVESTIGATE_SPIKE', 'Investigate: Unusual POS spike detected', 2),",
  "",
  "    (lambda r: r['wa_reply_flag'] == 1 and r['days_since_last_visit'] > 14,",
  "     'HOT_LEAD', 'Hot Lead: WhatsApp reply + long gap since visit', 1),",
  "",
  "    (lambda r: r['days_since_last_visit'] > 21 and r['opportunity_score'] > 0.6,",
  "     'OVERDUE_VISIT', 'Overdue Visit: High-opportunity retailer neglected', 2),",
  "",
  "    (lambda r: r['opportunity_score'] > 0.5,",
  "     'STANDARD_VISIT', 'Visit: Standard opportunity', 3),",
  "",
  "    (lambda r: True,  # fallback",
  "     'LOW_PRIORITY', 'Low priority: monitor only', 4),",
  "]",
  "",
  "",
  "def assign_next_best_action(retailer_row: dict) -> dict:",
  "    for condition, code, label, priority in ACTION_RULES:",
  "        if condition(retailer_row):",
  "            return {",
  "                'action_code':  code,",
  "                'action_label': label,",
  "                'priority':     priority,",
  "            }",
  "",
  "",
  "def assign_actions_batch(scores_df: pd.DataFrame) -> pd.DataFrame:",
  "    actions = scores_df.apply(",
  "        lambda row: pd.Series(assign_next_best_action(row.to_dict())),",
  "        axis=1",
  "    )",
  "    return pd.concat([scores_df, actions], axis=1)",
]));
children.push(spacer());

// SECTION 13: OFFLINE-FIRST ARCHITECTURE
children.push(pb());
children.push(h1("13. Offline-First Architecture"));
children.push(h2("13.1 Why Offline-First is Non-Negotiable"));
children.push(p("Field representatives in Punjab wheat belts, Rajasthan rural areas, and Maharashtra interiors operate in zones with unreliable 4G connectivity. A system that requires constant internet connectivity is operationally useless for field use. The entire UX must be designed around offline-first principles: the app must be fully functional with zero connectivity, and sync must happen opportunistically when connectivity is available."));
children.push(spacer());
children.push(h2("13.2 Offline Data Flow"));
children.push(...codeBlock([
  "ONLINE SYNC (morning, on WiFi / 4G):",
  "  Backend API → delta payload → SQLite write → App ready for the day",
  "",
  "OFFLINE OPERATION (field hours):",
  "  App reads from SQLite",
  "  Rep records visit outcome → write to sync_queue table in SQLite",
  "  Rep views recommendations → served from SQLite cache",
  "  No network calls during this phase",
  "",
  "SYNC ON RECONNECT (evening):",
  "  App detects connectivity restored",
  "  Reads pending items from sync_queue",
  "  POSTs each to /api/v1/sync/visits",
  "  On success: marks sync_queue items as synced",
  "  Backend processes uploaded visits → triggers label update",
]));
children.push(spacer());
children.push(h2("13.3 SQLite Schema (Mobile)"));
children.push(...codeBlock([
  "-- mobile/db/schema.sql",
  "",
  "CREATE TABLE IF NOT EXISTS retailers (",
  "    retailer_id       TEXT PRIMARY KEY,",
  "    name              TEXT,",
  "    district          TEXT,",
  "    tehsil            TEXT,",
  "    state             TEXT,",
  "    lat               REAL,",
  "    lng               REAL,",
  "    last_synced       TEXT",
  ");",
  "",
  "CREATE TABLE IF NOT EXISTS daily_scores (",
  "    retailer_id       TEXT,",
  "    score_date        TEXT,",
  "    opportunity_score REAL,",
  "    anomaly_flag      INTEGER,",
  "    anomaly_score     REAL,",
  "    action_code       TEXT,",
  "    action_label      TEXT,",
  "    shap_reasons      TEXT,  -- JSON string",
  "    top_reason_text   TEXT,",
  "    priority          INTEGER,",
  "    rep_id            TEXT,",
  "    PRIMARY KEY (retailer_id, score_date)",
  ");",
  "",
  "CREATE TABLE IF NOT EXISTS visit_queue (",
  "    queue_id          TEXT PRIMARY KEY,",
  "    retailer_id       TEXT NOT NULL,",
  "    rep_id            TEXT NOT NULL,",
  "    visit_timestamp   TEXT NOT NULL,",
  "    outcome_code      TEXT,",
  "    notes             TEXT,",
  "    synced            INTEGER DEFAULT 0,",
  "    created_at        TEXT DEFAULT CURRENT_TIMESTAMP",
  ");",
  "",
  "CREATE TABLE IF NOT EXISTS stale_alert (",
  "    retailer_id       TEXT PRIMARY KEY,",
  "    last_score_date   TEXT,",
  "    stale_flag        INTEGER DEFAULT 0",
  ");",
  "",
  "CREATE INDEX IF NOT EXISTS idx_daily_scores_rep",
  "    ON daily_scores(rep_id, score_date, priority);",
  "",
  "CREATE INDEX IF NOT EXISTS idx_visit_queue_unsynced",
  "    ON visit_queue(synced) WHERE synced = 0;",
]));
children.push(spacer());
children.push(h2("13.4 Stale Data Detection"));
children.push(p("If the device has not synced within 48 hours, the app displays a banner: 'Scores may be outdated — last synced X hours ago. Connect to internet to refresh.' This prevents reps from acting on severely stale recommendations during an active disease outbreak window."));
children.push(spacer());

// SECTION 14: BACKEND ARCHITECTURE
children.push(pb());
children.push(h1("14. Backend Architecture"));
children.push(h2("14.1 Component Overview"));
children.push(schemaTable(
  ["Component", "Technology", "Role"],
  [
    ["API Server", "FastAPI (Python 3.11)", "Serves scoring, sync, and rep management endpoints"],
    ["Primary Database", "PostgreSQL 15", "Raw data, scored tables, visit logs"],
    ["Task Queue", "Celery 5 + Redis", "Nightly scoring pipeline, async inference"],
    ["Cache", "Redis", "Hot data caching, priority list TTL"],
    ["ML Models", "XGBoost + scikit-learn", "Serialized .pkl files, loaded at startup"],
    ["Container", "Docker + Docker Compose", "Reproducible deployment"],
    ["Object Storage", "Local filesystem (MVP) / S3 (prod)", "Model artifact storage"]
  ]
));
children.push(spacer());
children.push(h2("14.2 FastAPI Application Structure"));
children.push(...codeBlock([
  "# api/main.py",
  "from fastapi import FastAPI",
  "from api.routers import reps, retailers, sync, health",
  "from api.core.database import engine, Base",
  "from api.core.models import load_models",
  "",
  "app = FastAPI(title='AgriPulse AI', version='1.0.0')",
  "",
  "@app.on_event('startup')",
  "async def startup_event():",
  "    Base.metadata.create_all(bind=engine)",
  "    load_models()  # Load XGBoost + IsoForest into memory",
  "",
  "app.include_router(reps.router,       prefix='/api/v1/reps',      tags=['Reps'])",
  "app.include_router(retailers.router,  prefix='/api/v1/retailers', tags=['Retailers'])",
  "app.include_router(sync.router,       prefix='/api/v1/sync',      tags=['Sync'])",
  "app.include_router(health.router,     prefix='/api/v1/health',    tags=['Health'])",
]));
children.push(spacer());

// SECTION 15: API DESIGN
children.push(pb());
children.push(h1("15. API Design"));
children.push(h2("15.1 Key Endpoints"));
children.push(schemaTable(
  ["Method", "Endpoint", "Description", "Auth"],
  [
    ["GET", "/api/v1/reps/{rep_id}/priority-list", "Daily prioritized retailer list for rep", "JWT Bearer"],
    ["GET", "/api/v1/retailers/{retailer_id}/opportunity", "Full opportunity card for one retailer", "JWT Bearer"],
    ["GET", "/api/v1/retailers/{retailer_id}/anomalies", "Anomaly flags and details", "JWT Bearer"],
    ["POST", "/api/v1/sync/visits", "Upload offline visit records from mobile", "JWT Bearer"],
    ["GET", "/api/v1/sync/delta/{rep_id}", "Get delta update payload for mobile sync", "JWT Bearer"],
    ["GET", "/api/v1/health", "Service health check", "None"],
    ["POST", "/api/v1/reps/{rep_id}/route-suggestion", "Tehsil-clustered route suggestion", "JWT Bearer"]
  ]
));
children.push(spacer());
children.push(h2("15.2 Priority List Endpoint"));
children.push(...codeBlock([
  "# api/routers/reps.py",
  "from fastapi import APIRouter, Depends, Query",
  "from sqlalchemy.orm import Session",
  "from api.core.database import get_db",
  "from api.schemas.retailer import PriorityListResponse",
  "import pandas as pd",
  "from datetime import date",
  "",
  "router = APIRouter()",
  "",
  "@router.get('/{rep_id}/priority-list', response_model=PriorityListResponse)",
  "def get_priority_list(",
  "    rep_id: str,",
  "    score_date: str = Query(default=None),",
  "    limit: int = Query(default=20, le=50),",
  "    db: Session = Depends(get_db),",
  "):",
  "    if score_date is None:",
  "        score_date = str(date.today())",
  "",
  "    query = \"\"\"",
  "        SELECT",
  "            ds.retailer_id,",
  "            r.name AS retailer_name,",
  "            r.district,",
  "            r.tehsil,",
  "            r.state,",
  "            ds.opportunity_score,",
  "            ds.anomaly_flag,",
  "            ds.action_code,",
  "            ds.action_label,",
  "            ds.top_reason_text,",
  "            ds.shap_reasons,",
  "            ds.priority",
  "        FROM daily_scores ds",
  "        JOIN retailers r ON ds.retailer_id = r.retailer_id",
  "        WHERE ds.rep_id = :rep_id",
  "          AND ds.score_date = :score_date",
  "        ORDER BY ds.priority ASC, ds.opportunity_score DESC",
  "        LIMIT :limit",
  "    \"\"\"",
  "    rows = db.execute(query, {'rep_id': rep_id, 'score_date': score_date, 'limit': limit})",
  "    return {'rep_id': rep_id, 'score_date': score_date, 'retailers': [dict(r) for r in rows]}",
  "",
  "",
  "@router.post('/{rep_id}/route-suggestion')",
  "def get_route_suggestion(",
  "    rep_id: str,",
  "    score_date: str = Query(default=None),",
  "    db: Session = Depends(get_db),",
  "):",
  "    \"\"\"",
  "    Returns priority retailers grouped by tehsil, sorted by cluster size.",
  "    Reps should visit all retailers in one tehsil before moving to the next.",
  "    No GPS required: tehsil centroids are used for spatial approximation.",
  "    \"\"\"",
  "    if score_date is None:",
  "        score_date = str(date.today())",
  "",
  "    query = \"\"\"",
  "        SELECT r.tehsil, COUNT(*) AS retailer_count,",
  "               AVG(ds.opportunity_score) AS avg_score",
  "        FROM daily_scores ds",
  "        JOIN retailers r ON ds.retailer_id = r.retailer_id",
  "        WHERE ds.rep_id = :rep_id AND ds.score_date = :score_date",
  "          AND ds.priority <= 2",
  "        GROUP BY r.tehsil",
  "        ORDER BY retailer_count DESC, avg_score DESC",
  "    \"\"\"",
  "    tehsil_groups = db.execute(query, {'rep_id': rep_id, 'score_date': score_date}).fetchall()",
  "    return {'tehsil_route': [dict(t) for t in tehsil_groups]}",
]));
children.push(spacer());
children.push(h2("15.3 Offline Sync Endpoint"));
children.push(...codeBlock([
  "# api/routers/sync.py",
  "from fastapi import APIRouter, Depends",
  "from sqlalchemy.orm import Session",
  "from pydantic import BaseModel",
  "from typing import List",
  "from api.core.database import get_db",
  "import uuid",
  "from datetime import datetime",
  "",
  "router = APIRouter()",
  "",
  "class VisitRecord(BaseModel):",
  "    queue_id: str",
  "    retailer_id: str",
  "    rep_id: str",
  "    visit_timestamp: str",
  "    outcome_code: str = None",
  "    notes: str = None",
  "",
  "class SyncPayload(BaseModel):",
  "    visits: List[VisitRecord]",
  "",
  "@router.post('/visits')",
  "def sync_visits(payload: SyncPayload, db: Session = Depends(get_db)):",
  "    inserted = 0",
  "    for visit in payload.visits:",
  "        db.execute(",
  "            \"\"\"",
  "            INSERT INTO retailer_visit_log",
  "                (visit_id, retailer_id, rep_id, visit_date, outcome_code, notes, source)",
  "            VALUES (:vid, :rid, :rep, :vdate, :outcome, :notes, 'mobile_sync')",
  "            ON CONFLICT (visit_id) DO NOTHING",
  "            \"\"\",",
  "            {",
  "                'vid': visit.queue_id,",
  "                'rid': visit.retailer_id,",
  "                'rep': visit.rep_id,",
  "                'vdate': visit.visit_timestamp[:10],",
  "                'outcome': visit.outcome_code,",
  "                'notes': visit.notes,",
  "            }",
  "        )",
  "        inserted += 1",
  "    db.commit()",
  "    return {'synced': inserted, 'timestamp': datetime.utcnow().isoformat()}",
  "",
  "",
  "@router.get('/delta/{rep_id}')",
  "def get_delta(rep_id: str, since: str = None, db: Session = Depends(get_db)):",
  "    \"\"\"",
  "    Returns the minimum payload needed to update the mobile SQLite cache.",
  "    Only sends records changed since the last sync timestamp.",
  "    \"\"\"",
  "    if since is None:",
  "        since = '2024-01-01'  # Full refresh if no timestamp",
  "",
  "    scores_query = \"\"\"",
  "        SELECT ds.*, r.name, r.district, r.tehsil",
  "        FROM daily_scores ds",
  "        JOIN retailers r ON ds.retailer_id = r.retailer_id",
  "        WHERE ds.rep_id = :rep_id AND ds.score_date >= :since",
  "        ORDER BY ds.priority ASC, ds.opportunity_score DESC",
  "    \"\"\"",
  "    rows = db.execute(scores_query, {'rep_id': rep_id, 'since': since}).fetchall()",
  "    return {",
  "        'rep_id': rep_id,",
  "        'sync_timestamp': datetime.utcnow().isoformat(),",
  "        'records': [dict(r) for r in rows],",
  "        'count': len(rows),",
  "    }",
]));
children.push(spacer());

// SECTION 16: MOBILE APP ARCHITECTURE
children.push(pb());
children.push(h1("16. Mobile App Architecture (React Native / Expo)"));
children.push(h2("16.1 Screen Architecture"));
children.push(schemaTable(
  ["Screen", "Purpose", "Offline?"],
  [
    ["Login", "Rep authentication via JWT", "No"],
    ["Dashboard", "Today's summary: pending visits, alerts, sync status", "Yes (cached)"],
    ["Priority List", "Ranked retailer list with scores and actions", "Yes (SQLite)"],
    ["Retailer Card", "Full opportunity card with SHAP explanation", "Yes (SQLite)"],
    ["Visit Logger", "Record visit outcome, add notes, queue for sync", "Yes (sync queue)"],
    ["Route View", "Tehsil-clustered route suggestion", "Yes (SQLite)"],
    ["Sync Status", "Last sync time, pending items count, force sync", "Yes"]
  ]
));
children.push(spacer());
children.push(h2("16.2 React Native Sync Logic"));
children.push(...codeBlock([
  "// mobile/src/services/syncService.js",
  "import * as SQLite from 'expo-sqlite';",
  "import NetInfo from '@react-native-community/netinfo';",
  "",
  "const db = SQLite.openDatabase('agripulse.db');",
  "const API_BASE = 'https://api.agripulse.syngenta.internal';",
  "",
  "export async function syncIfOnline(repId, authToken) {",
  "    const state = await NetInfo.fetch();",
  "    if (!state.isConnected) {",
  "        console.log('[Sync] No connection — skipping sync');",
  "        return { success: false, reason: 'offline' };",
  "    }",
  "",
  "    // 1. Upload pending visits",
  "    const pending = await getPendingVisits();",
  "    if (pending.length > 0) {",
  "        await uploadVisits(pending, authToken);",
  "    }",
  "",
  "    // 2. Download fresh scores",
  "    const lastSync = await getLastSyncTimestamp();",
  "    const delta = await fetchDelta(repId, lastSync, authToken);",
  "    await storeDelta(delta);",
  "",
  "    // 3. Update last sync time",
  "    await setLastSyncTimestamp(new Date().toISOString());",
  "    return { success: true, downloaded: delta.count };",
  "}",
  "",
  "function getPendingVisits() {",
  "    return new Promise((resolve, reject) => {",
  "        db.transaction(tx => {",
  "            tx.executeSql(",
  "                'SELECT * FROM visit_queue WHERE synced = 0',",
  "                [],",
  "                (_, result) => resolve(result.rows._array),",
  "                (_, error) => reject(error)",
  "            );",
  "        });",
  "    });",
  "}",
  "",
  "async function uploadVisits(visits, authToken) {",
  "    const response = await fetch(`${API_BASE}/api/v1/sync/visits`, {",
  "        method: 'POST',",
  "        headers: {",
  "            'Content-Type': 'application/json',",
  "            'Authorization': `Bearer ${authToken}`",
  "        },",
  "        body: JSON.stringify({ visits })",
  "    });",
  "",
  "    if (response.ok) {",
  "        const ids = visits.map(v => v.queue_id);",
  "        await markVisitsSynced(ids);",
  "    }",
  "}",
  "",
  "async function fetchDelta(repId, since, authToken) {",
  "    const url = `${API_BASE}/api/v1/sync/delta/${repId}?since=${since || ''}`;",
  "    const res = await fetch(url, {",
  "        headers: { 'Authorization': `Bearer ${authToken}` }",
  "    });",
  "    return res.json();",
  "}",
  "",
  "async function storeDelta(delta) {",
  "    return new Promise((resolve, reject) => {",
  "        db.transaction(tx => {",
  "            for (const record of delta.records) {",
  "                tx.executeSql(",
  "                    `INSERT OR REPLACE INTO daily_scores",
  "                     (retailer_id, score_date, opportunity_score, anomaly_flag,",
  "                      action_code, action_label, top_reason_text, shap_reasons,",
  "                      priority, rep_id)",
  "                     VALUES (?,?,?,?,?,?,?,?,?,?)`,",
  "                    [",
  "                        record.retailer_id, record.score_date,",
  "                        record.opportunity_score, record.anomaly_flag,",
  "                        record.action_code, record.action_label,",
  "                        record.top_reason_text, record.shap_reasons,",
  "                        record.priority, record.rep_id,",
  "                    ]",
  "                );",
  "            }",
  "        }, reject, resolve);",
  "    });",
  "}",
]));
children.push(spacer());

// SECTION 17: DATABASE DESIGN
children.push(pb());
children.push(h1("17. Database Design (PostgreSQL)"));
children.push(h2("17.1 Core Tables"));
children.push(...codeBlock([
  "-- PostgreSQL schema: agripulse",
  "",
  "CREATE TABLE retailers (",
  "    retailer_id     TEXT PRIMARY KEY,",
  "    name            TEXT,",
  "    state           TEXT,",
  "    district        TEXT,",
  "    tehsil          TEXT,",
  "    lat             DOUBLE PRECISION,",
  "    lng             DOUBLE PRECISION,",
  "    created_at      TIMESTAMPTZ DEFAULT NOW()",
  ");",
  "",
  "CREATE TABLE retailer_pos (",
  "    id              BIGSERIAL PRIMARY KEY,",
  "    retailer_id     TEXT REFERENCES retailers(retailer_id),",
  "    transaction_date DATE,",
  "    product_name    TEXT,",
  "    quantity_sold   NUMERIC(12,2),",
  "    revenue         NUMERIC(12,2),",
  "    state           TEXT,",
  "    district        TEXT",
  ");",
  "CREATE INDEX idx_pos_retailer_date ON retailer_pos(retailer_id, transaction_date);",
  "",
  "CREATE TABLE retailer_visit_log (",
  "    visit_id        TEXT PRIMARY KEY,",
  "    retailer_id     TEXT REFERENCES retailers(retailer_id),",
  "    rep_id          TEXT,",
  "    visit_date      DATE,",
  "    outcome_code    TEXT,",
  "    notes           TEXT,",
  "    source          TEXT DEFAULT 'crm',  -- 'crm' or 'mobile_sync'",
  "    created_at      TIMESTAMPTZ DEFAULT NOW()",
  ");",
  "CREATE INDEX idx_visit_retailer ON retailer_visit_log(retailer_id, visit_date);",
  "CREATE INDEX idx_visit_rep      ON retailer_visit_log(rep_id, visit_date);",
  "",
  "CREATE TABLE daily_scores (",
  "    retailer_id       TEXT,",
  "    score_date        DATE,",
  "    rep_id            TEXT,",
  "    opportunity_score NUMERIC(5,4),",
  "    anomaly_score     NUMERIC(5,4),",
  "    anomaly_flag      SMALLINT DEFAULT 0,",
  "    action_code       TEXT,",
  "    action_label      TEXT,",
  "    top_reason_text   TEXT,",
  "    shap_reasons      JSONB,",
  "    priority          SMALLINT,",
  "    created_at        TIMESTAMPTZ DEFAULT NOW(),",
  "    PRIMARY KEY (retailer_id, score_date)",
  ");",
  "CREATE INDEX idx_scores_rep_date ON daily_scores(rep_id, score_date, priority);",
  "",
  "CREATE TABLE visit_labels (",
  "    visit_id              TEXT PRIMARY KEY REFERENCES retailer_visit_log(visit_id),",
  "    retailer_id           TEXT,",
  "    visit_date            DATE,",
  "    converted             SMALLINT,",
  "    post_visit_revenue    NUMERIC(12,2),",
  "    pos_transactions      INTEGER,",
  "    attribution_window    INTEGER,",
  "    labeled_at            TIMESTAMPTZ DEFAULT NOW()",
  ");",
]));
children.push(spacer());

// SECTION 18: ROUTE OPTIMIZATION
children.push(pb());
children.push(h1("18. Route Optimization"));
children.push(h2("18.1 Tehsil-Centroid Approach"));
children.push(p("The hackathon dataset does not provide exact GPS coordinates for all retailers. However, it contains tehsil-level geographic fields. Route optimization uses tehsil-cluster grouping: the system groups high-priority retailers by tehsil, ranks tehsils by cluster density and average opportunity score, and recommends that the rep visit all retailers within one tehsil before moving to the adjacent tehsil."));
children.push(spacer());
children.push(p("Tehsil centroids are approximated using a static lookup table mapping each tehsil name to a lat/lng centroid derived from publicly available administrative boundary data. This provides sufficient spatial guidance for within-district route planning without requiring per-retailer GPS data."));
children.push(spacer());
children.push(...codeBlock([
  "# ml/route_optimizer.py",
  "import pandas as pd",
  "import numpy as np",
  "",
  "# Static tehsil centroid lookup (subset — expand from admin boundary data)",
  "TEHSIL_CENTROIDS = {",
  "    'Ludhiana':   (30.9010, 75.8573),",
  "    'Jalandhar':  (31.3260, 75.5762),",
  "    'Amritsar':   (31.6340, 74.8723),",
  "    'Karnal':     (29.6857, 76.9905),",
  "    'Hisar':      (29.1492, 75.7217),",
  "    'Agra':       (27.1767, 78.0081),",
  "    'Meerut':     (28.9845, 77.7064),",
  "    'Jaipur':     (26.9124, 75.7873),",
  "    'Jodhpur':    (26.2389, 73.0243),",
  "    'Nashik':     (19.9975, 73.7898),",
  "    # ... full table loaded from tehsil_centroids.csv at runtime",
  "}",
  "",
  "def suggest_route(priority_retailers: pd.DataFrame) -> list:",
  "    \"\"\"",
  "    Groups priority retailers by tehsil, scores each tehsil cluster,",
  "    and returns an ordered list of tehsils to visit.",
  "",
  "    priority_retailers: DataFrame with retailer_id, tehsil, opportunity_score, priority",
  "    Returns: list of dicts [{tehsil, lat, lng, retailers, avg_score}]",
  "    \"\"\"",
  "    # Only top-priority retailers",
  "    top = priority_retailers[priority_retailers['priority'] <= 2].copy()",
  "",
  "    tehsil_summary = (",
  "        top.groupby('tehsil')",
  "           .agg(",
  "               retailer_count=('retailer_id', 'count'),",
  "               avg_score=('opportunity_score', 'mean'),",
  "               max_score=('opportunity_score', 'max'),",
  "           )",
  "           .reset_index()",
  "    )",
  "",
  "    # Score each tehsil: composite of count + avg_score",
  "    tehsil_summary['cluster_score'] = (",
  "        0.4 * tehsil_summary['retailer_count'] / tehsil_summary['retailer_count'].max() +",
  "        0.6 * tehsil_summary['avg_score']",
  "    )",
  "    tehsil_summary = tehsil_summary.sort_values('cluster_score', ascending=False)",
  "",
  "    route = []",
  "    for _, row in tehsil_summary.iterrows():",
  "        tehsil = row['tehsil']",
  "        lat, lng = TEHSIL_CENTROIDS.get(tehsil, (None, None))",
  "        tehsil_retailers = top[top['tehsil'] == tehsil][",
  "            ['retailer_id', 'opportunity_score', 'action_label']",
  "        ].to_dict('records')",
  "",
  "        route.append({",
  "            'tehsil':           tehsil,",
  "            'lat':              lat,",
  "            'lng':              lng,",
  "            'retailer_count':   int(row['retailer_count']),",
  "            'avg_score':        round(float(row['avg_score']), 3),",
  "            'cluster_score':    round(float(row['cluster_score']), 3),",
  "            'retailers':        tehsil_retailers,",
  "        })",
  "",
  "    return route",
]));
children.push(spacer());

// SECTION 19: WHATSAPP SIGNAL INTEGRATION
children.push(pb());
children.push(h1("19. WhatsApp Signal Integration"));
children.push(p("The whatsapp_campaign.csv dataset provides engagement signals that are strong leading indicators of purchase intent. A retailer who opened a disease-alert WhatsApp message about Yellow Rust and clicked the product information link is demonstrably more likely to purchase Tilt 250 EC in the next 5–7 days than one who did not engage."));
children.push(spacer());
children.push(h2("19.1 Signal Hierarchy"));
children.push(schemaTable(
  ["Signal", "Strength", "Feature", "Rationale"],
  [
    ["Retailer replied to WhatsApp", "Highest", "wa_reply_flag", "Active intent signal — retailer initiated response"],
    ["Link clicked in WhatsApp", "High", "wa_click_rate_30d", "Product-specific interest demonstrated"],
    ["Message opened", "Medium", "wa_open_rate_30d", "Passive awareness confirmed"],
    ["Message sent but not opened", "Neutral / negative", "days_since_last_wa_open", "Disengagement signal if persistent"]
  ]
));
children.push(spacer());
children.push(h2("19.2 Campaign Context Matching"));
children.push(p("Note: campaign_type does not exist in whatsapp_campaign.csv. Campaign product context is captured via the campaign_product column (e.g., Tilt 250 EC) and campaign_crop. The feature engineering pipeline filters for campaign_product = Tilt 250 EC records to create a disease-campaign engagement binary feature, weighted separately from general product campaigns."));
children.push(spacer());

// SECTION 20: DAILY WORKFLOW
children.push(pb());
children.push(h1("20. Daily Workflow of Field Representative"));
children.push(h2("20.1 Day-in-the-Life Flow"));
children.push(...codeBlock([
  "06:30 AM — REP STARTS DAY",
  "  App opens → auto-sync if WiFi available",
  "  Downloads fresh scores and route suggestion for today",
  "  Sees: '8 priority visits today — 3 in Ludhiana tehsil, 5 in Samrala tehsil'",
  "",
  "08:00 AM — FIRST CLUSTER (Ludhiana Tehsil)",
  "  Opens Priority List → sorted by opportunity score",
  "  Taps retailer 'Singh Agro Store' → sees card:",
  "    Score: 0.87 | Action: URGENT_RESTOCK",
  "    Reason: 'Tilt 250 EC near stockout (3 days). Not visited in 18 days.",
  "    WhatsApp click last week.'",
  "  Visits retailer → logs outcome: 'Order placed — 50 units Tilt 250 EC'",
  "  Outcome queued in SQLite visit_queue (offline-safe)",
  "",
  "12:00 PM — TRANSIT TO SECOND CLUSTER",
  "  App shows route: 'Next cluster — Samrala Tehsil (5 retailers)'",
  "  5 retailers grouped, ranked by opportunity score",
  "",
  "04:30 PM — END OF FIELD DAY",
  "  Rep returns to area with 4G coverage",
  "  App detects connectivity → auto-sync triggers",
  "  6 visit records uploaded to backend",
  "  Fresh scores downloaded for tomorrow",
  "",
  "11:00 PM — NIGHTLY PIPELINE (server-side, automated)",
  "  Celery task: ingest new visit uploads",
  "  Re-run label engineering with new visits",
  "  Re-score all retailers: XGBoost + IsoForest",
  "  Generate SHAP explanations",
  "  Write daily_scores table",
  "  Tomorrow's priority lists ready for morning sync",
]));
children.push(spacer());

// SECTION 21: END-TO-END DATA FLOW
children.push(pb());
children.push(h1("21. End-to-End Data Flow"));
children.push(...codeBlock([
  "DATA FLOW DIAGRAM",
  "",
  "SOURCE DATA",
  "  [retailer_pos.csv]────────────────────────────────────────────────┐",
  "  [retailer_visit_log.csv]──────────────────────────────────────┐   │",
  "  [retailer_inventory_weekly.csv]───────────────────────────┐   │   │",
  "  [growers.csv]──────────────────────────────────────────┐  │   │   │",
  "  [whatsapp_campaign.csv]────────────────────────────┐   │  │   │   │",
  "  [digital_funnel_weekly.csv]────────────────────┐   │   │  │   │   │",
  "                                                  ▼   ▼   ▼  ▼   ▼   ▼",
  "INGESTION LAYER",
  "  pandas.read_csv() → validate() → PostgreSQL staging tables",
  "                                                          │",
  "LABEL ENGINEERING                                         │",
  "  visit_log × pos_transactions (3–7 day window) → converted label",
  "                                                          │",
  "FEATURE ENGINEERING                                       │",
  "  rolling POS trends | depletion rates | visit recency   │",
  "  WA engagement | funnel scores | geo encoding           │",
  "  → feature_matrix table                                 │",
  "                                                          │",
  "ML SCORING                                                │",
  "  XGBoost → opportunity_score [0,1]                      │",
  "  IsoForest → anomaly_score + anomaly_flag               │",
  "  SHAP → top-3 reasons JSON                              │",
  "  NBA engine → action_code + action_label                │",
  "  → daily_scores table                                   │",
  "                                                          │",
  "API LAYER                                                 │",
  "  FastAPI /sync/delta → delta payload JSON               │",
  "                                                          │",
  "MOBILE (React Native)                                     │",
  "  SQLite ← delta sync ─────────────────────────────────────",
  "  Priority list screen ← SQLite query",
  "  Rep logs visit → visit_queue SQLite",
  "  Sync → POST /api/v1/sync/visits → PostgreSQL",
  "  Cycle repeats nightly",
]));
children.push(spacer());

// SECTION 22: FOLDER STRUCTURE
children.push(pb());
children.push(h1("22. Detailed Folder Structure"));
children.push(...codeBlock([
  "agripulse-ai/",
  "├── data/                          # Raw CSV datasets (gitignored in production)",
  "│   ├── retailer_pos.csv",
  "│   ├── retailer_visit_log.csv",
  "│   ├── retailer_inventory_weekly.csv",
  "│   ├── growers.csv",
  "│   ├── whatsapp_campaign.csv",
  "│   └── digital_funnel_weekly.csv",
  "│",
  "├── pipeline/                      # Data engineering",
  "│   ├── __init__.py",
  "│   ├── ingest.py                  # CSV → PostgreSQL",
  "│   ├── label_engineering.py       # Attribution window join",
  "│   ├── feature_engineering.py     # Rolling features",
  "│   └── run_pipeline.py            # Master pipeline runner",
  "│",
  "├── ml/                            # ML models",
  "│   ├── __init__.py",
  "│   ├── train_xgboost.py",
  "│   ├── anomaly_detection.py",
  "│   ├── explain.py                 # SHAP",
  "│   ├── next_best_action.py",
  "│   ├── route_optimizer.py",
  "│   └── inference_pipeline.py      # Full scoring run",
  "│",
  "├── models/                        # Saved model artifacts",
  "│   ├── xgboost_opportunity_scorer.pkl",
  "│   ├── isolation_forest.pkl",
  "│   ├── anomaly_scaler.pkl",
  "│   ├── feature_cols.pkl",
  "│   ├── anomaly_features.pkl",
  "│   └── le_state.pkl / le_district.pkl",
  "│",
  "├── api/                           # FastAPI backend",
  "│   ├── main.py",
  "│   ├── core/",
  "│   │   ├── database.py            # SQLAlchemy engine",
  "│   │   ├── models.py              # ORM models",
  "│   │   └── auth.py                # JWT auth",
  "│   ├── routers/",
  "│   │   ├── reps.py",
  "│   │   ├── retailers.py",
  "│   │   └── sync.py",
  "│   ├── schemas/",
  "│   │   └── retailer.py            # Pydantic schemas",
  "│   └── tasks/",
  "│       └── celery_app.py          # Celery task definitions",
  "│",
  "├── mobile/                        # React Native (Expo)",
  "│   ├── App.js",
  "│   ├── src/",
  "│   │   ├── screens/",
  "│   │   │   ├── DashboardScreen.js",
  "│   │   │   ├── PriorityListScreen.js",
  "│   │   │   ├── RetailerCardScreen.js",
  "│   │   │   ├── VisitLoggerScreen.js",
  "│   │   │   └── RouteViewScreen.js",
  "│   │   ├── services/",
  "│   │   │   ├── syncService.js",
  "│   │   │   ├── dbService.js       # SQLite operations",
  "│   │   │   └── authService.js",
  "│   │   └── components/",
  "│   │       ├── SHAPCard.js",
  "│   │       ├── OpportunityBadge.js",
  "│   │       └── SyncStatusBar.js",
  "│   └── package.json",
  "│",
  "├── notebooks/                     # Exploratory analysis",
  "│   ├── 01_data_exploration.ipynb",
  "│   ├── 02_label_engineering_validation.ipynb",
  "│   ├── 03_feature_importance.ipynb",
  "│   └── 04_shap_analysis.ipynb",
  "│",
  "├── docker/",
  "│   ├── Dockerfile.api",
  "│   ├── Dockerfile.worker",
  "│   └── docker-compose.yml",
  "│",
  "├── tests/",
  "│   ├── test_label_engineering.py",
  "│   ├── test_feature_engineering.py",
  "│   ├── test_api.py",
  "│   └── test_inference.py",
  "│",
  "├── requirements.txt",
  "├── README.md",
  "└── .env.example",
]));
children.push(spacer());

// SECTION 23: STEP-BY-STEP IMPLEMENTATION GUIDE
children.push(pb());
children.push(h1("23. Step-by-Step Implementation Guide"));
children.push(h2("23.1 Environment Setup"));
children.push(...codeBlock([
  "# Step 1: Clone and set up Python environment",
  "git clone https://github.com/your-team/agripulse-ai.git",
  "cd agripulse-ai",
  "python -m venv venv",
  "source venv/bin/activate  # Windows: venv\\Scripts\\activate",
  "",
  "# Step 2: Install dependencies",
  "pip install fastapi uvicorn sqlalchemy psycopg2-binary pandas numpy",
  "pip install xgboost scikit-learn shap joblib celery redis",
  "pip install python-jose[cryptography] passlib[bcrypt] python-dotenv",
  "",
  "# Step 3: Start infrastructure with Docker",
  "docker-compose up -d postgres redis",
  "",
  "# Verify PostgreSQL is running",
  "docker exec -it agripulse_postgres psql -U agripulse -c '\\l'",
]));
children.push(spacer());
children.push(h2("23.2 Docker Compose Configuration"));
children.push(...codeBlock([
  "# docker/docker-compose.yml",
  "version: '3.8'",
  "",
  "services:",
  "  postgres:",
  "    image: postgres:15-alpine",
  "    container_name: agripulse_postgres",
  "    environment:",
  "      POSTGRES_USER: agripulse",
  "      POSTGRES_PASSWORD: password",
  "      POSTGRES_DB: agripulse",
  "    ports:",
  "      - '5432:5432'",
  "    volumes:",
  "      - postgres_data:/var/lib/postgresql/data",
  "",
  "  redis:",
  "    image: redis:7-alpine",
  "    container_name: agripulse_redis",
  "    ports:",
  "      - '6379:6379'",
  "",
  "  api:",
  "    build:",
  "      context: ..",
  "      dockerfile: docker/Dockerfile.api",
  "    container_name: agripulse_api",
  "    ports:",
  "      - '8000:8000'",
  "    environment:",
  "      DATABASE_URL: postgresql://agripulse:password@postgres:5432/agripulse",
  "      REDIS_URL: redis://redis:6379/0",
  "      SECRET_KEY: your-secret-key-change-in-production",
  "    depends_on:",
  "      - postgres",
  "      - redis",
  "    volumes:",
  "      - ../models:/app/models",
  "",
  "  celery_worker:",
  "    build:",
  "      context: ..",
  "      dockerfile: docker/Dockerfile.worker",
  "    container_name: agripulse_worker",
  "    command: celery -A api.tasks.celery_app worker --loglevel=info",
  "    environment:",
  "      DATABASE_URL: postgresql://agripulse:password@postgres:5432/agripulse",
  "      REDIS_URL: redis://redis:6379/0",
  "    depends_on:",
  "      - postgres",
  "      - redis",
  "",
  "volumes:",
  "  postgres_data:",
]));
children.push(spacer());
children.push(h2("23.3 Data Ingestion Steps"));
children.push(...codeBlock([
  "# Step 4: Place datasets in data/ directory",
  "cp /path/to/hackathon/datasets/*.csv data/",
  "ls data/  # should show all 6 CSV files",
  "",
  "# Step 5: Run ingestion pipeline",
  "python pipeline/ingest.py",
  "# Expected output:",
  "# Ingested 198423 rows into retailer_pos",
  "# Ingested 47291 rows into retailer_visit_log",
  "# Ingested 284103 rows into retailer_inventory_weekly",
  "# Ingested 38204 rows into growers",
  "# Ingested 62817 rows into whatsapp_campaign",
  "# Ingested 94015 rows into digital_funnel_weekly",
]));
children.push(spacer());
children.push(h2("23.4 Label Engineering and Model Training"));
children.push(...codeBlock([
  "# Step 6: Validate label engineering",
  "python -c \"",
  "from pipeline.label_engineering import engineer_conversion_labels",
  "labels = engineer_conversion_labels(attribution_window_days=5)",
  "print(labels.head())",
  "print('Conversion rate:', labels['converted'].mean())",
  "\"",
  "",
  "# Step 7: Build feature matrix",
  "python -c \"",
  "from pipeline.feature_engineering import build_feature_matrix",
  "import pandas as pd",
  "feats = build_feature_matrix()",
  "print(feats.shape)",
  "print(feats.dtypes)",
  "\"",
  "",
  "# Step 8: Train XGBoost model",
  "python ml/train_xgboost.py",
  "# Expected output:",
  "# [Label Engineering] Attribution window: 5 days",
  "# [Label Engineering] Total visits labeled: 47291",
  "# [Label Engineering] Conversion rate: 28.4%",
  "# [XGBoost] scale_pos_weight: 2.52",
  "# [100]  validation_0-auc: 0.74",
  "# [200]  validation_0-auc: 0.77",
  "# [300]  validation_0-auc: 0.78",
  "# [XGBoost] Test AUC: 0.7841",
  "",
  "# Step 9: Train anomaly detector",
  "python -c \"",
  "from pipeline.feature_engineering import build_feature_matrix",
  "from ml.anomaly_detection import train_anomaly_detector",
  "feats = build_feature_matrix()",
  "train_anomaly_detector(feats)",
  "\"",
  "",
  "# Step 10: Run full inference pipeline (generates daily_scores)",
  "python ml/inference_pipeline.py",
  "# Scores all ~4,000 retailers and writes daily_scores table",
]));
children.push(spacer());
children.push(h2("23.5 Start the API Server"));
children.push(...codeBlock([
  "# Step 11: Start FastAPI server",
  "uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload",
  "",
  "# Verify API is live",
  "curl http://localhost:8000/api/v1/health",
  "# {\"status\": \"ok\", \"models_loaded\": true}",
  "",
  "# Test priority list endpoint",
  "curl -H 'Authorization: Bearer <token>' \\",
  "     'http://localhost:8000/api/v1/reps/REP001/priority-list?limit=5'",
  "",
  "# Swagger docs available at:",
  "# http://localhost:8000/docs",
]));
children.push(spacer());
children.push(h2("23.6 Mobile App Setup"));
children.push(...codeBlock([
  "# Step 12: Setup React Native (Expo)",
  "cd mobile",
  "npm install",
  "npx expo install expo-sqlite @react-native-community/netinfo",
  "",
  "# Step 13: Configure API endpoint",
  "echo 'API_BASE=http://your-server:8000' > .env",
  "",
  "# Step 14: Start Expo development server",
  "npx expo start",
  "# Scan QR code with Expo Go app on Android/iOS",
  "",
  "# Step 15: Test offline flow",
  "# 1. Load app while online → sync triggers → data loads into SQLite",
  "# 2. Enable airplane mode",
  "# 3. Navigate to Priority List → still shows cached data",
  "# 4. Log a visit → saved to visit_queue",
  "# 5. Disable airplane mode → sync triggers → visit uploaded",
]));
children.push(spacer());

// SECTION 24: DAY-BY-DAY HACKATHON EXECUTION PLAN
children.push(pb());
children.push(h1("24. Day-by-Day Hackathon Execution Plan"));
children.push(schemaTable(
  ["Day", "Goal", "Deliverables", "Who"],
  [
    ["Day 1 (Mon)", "Data exploration + label engineering", "Notebooks: EDA, label engineering validation, conversion rate analysis", "Data/ML engineer"],
    ["Day 2 (Tue)", "Feature engineering + model training", "feature_matrix table, XGBoost trained, AUC > 0.72, IsoForest trained", "ML engineer"],
    ["Day 3 (Wed)", "SHAP + NBA + Backend API", "SHAP explanations working, NBA rules implemented, FastAPI endpoints live", "ML + Backend"],
    ["Day 4 (Thu)", "Mobile app + SQLite + offline sync", "Priority list screen, visit logger, SQLite cache, sync working end-to-end", "Mobile engineer"],
    ["Day 5 (Fri)", "Route optimization + integration + demo polish", "Route suggestion endpoint, all screens connected, demo flow scripted", "All"],
    ["Day 6 (Sat)", "Demo preparation + documentation + presentation", "Live demo running, documentation complete, 10-min presentation ready", "All"]
  ]
));
children.push(spacer());

// SECTION 25: DEMO FLOW
children.push(pb());
children.push(h1("25. Demo Flow"));
children.push(h2("25.1 Yellow Rust Scenario — Ludhiana, Punjab"));
children.push(p("The demo tells a complete, data-grounded story in under 10 minutes. Every step maps to a real system component."));
children.push(spacer());
children.push(numbered("Open weather overlay: show 8°C nights, 85% humidity across Ludhiana — Yellow Rust trigger conditions met."));
children.push(numbered("Show Tilt 250 EC inventory chart for Ludhiana district retailers — average stock down 62% from 4 weeks prior."));
children.push(numbered("Show POS demand spike chart: Tilt 250 EC weekly revenue up 3.1× from 6-week baseline."));
children.push(numbered("Open field rep 'Rajesh Kumar' dashboard: Today's priority list loads. Top result: Singh Agro Store, Ludhiana."));
children.push(numbered("Tap Singh Agro Store → Opportunity Card: Score 0.87. Action: URGENT_RESTOCK. SHAP explanation: 'Tilt 250 EC stock critically low (3 days). 18 days since last visit. WhatsApp disease-alert message clicked 5 days ago.'"));
children.push(numbered("Show route suggestion: 3 retailers in Ludhiana tehsil clustered together — efficient morning route."));
children.push(numbered("Simulate visit: rep logs 'Order placed — 50 units Tilt 250 EC.' Saved to visit_queue."));
children.push(numbered("Enable airplane mode. Navigate app — priority list still shows. Log another visit — saved offline."));
children.push(numbered("Re-enable connectivity: sync triggers. 2 visits uploaded. 'Sync complete' banner shown."));
children.push(numbered("On backend: show 5-day window. 4 days later, POS transaction recorded for Singh Agro Store. Visit labeled as converted. Model will retrain with this signal."));
children.push(spacer());

// SECTION 26: EXPECTED KPIs
children.push(pb());
children.push(h1("26. Expected KPIs"));
children.push(schemaTable(
  ["Metric", "Target", "Measurement Method"],
  [
    ["XGBoost AUC (ROC)", "> 0.75", "Test set evaluation during training"],
    ["Conversion rate baseline", "~25–35%", "Label engineering output"],
    ["SHAP top feature alignment", "> 60% match with intuition", "Manual review of top-3 reasons"],
    ["Anomaly detection precision", "> 70% on known outliers", "Manual validation of flagged retailers"],
    ["API response time (priority list)", "< 200ms at p95", "Load test with locust"],
    ["Mobile sync time (cold)", "< 5 seconds for full delta", "Expo performance profiling"],
    ["Offline visit queue reliability", "100% no data loss", "Airplane mode test protocol"],
    ["Route suggestion cluster quality", "> 80% retailers in correct tehsil group", "Manual geo validation"]
  ]
));
children.push(spacer());

// SECTION 27: LIMITATIONS
children.push(pb());
children.push(h1("27. Honest Limitations"));
children.push(h2("27.1 Known Constraints"));
children.push(bullet("Attribution window ambiguity: the 3–7 day conversion label is an approximation. Some POS transactions within the window are coincidental, not caused by the rep visit. The model learns correlations, not causal relationships."));
children.push(bullet("Cold start problem: retailers with fewer than 5 historical visits have unreliable feature estimates. These are handled by tehsil-median imputation but remain lower-confidence predictions."));
children.push(bullet("No weather API integration in MVP: the Yellow Rust risk signal in the demo is a static flag based on the demo date. Production would integrate IMD or ECMWF weather API for real-time disease risk scoring."));
children.push(bullet("GPS approximation: tehsil centroid routing is operationally useful but not optimal. Turn-by-turn navigation requires exact retailer coordinates not available in the hackathon dataset."));
children.push(bullet("Model staleness: the XGBoost model is retrained weekly in the MVP. Daily online learning would improve adaptation to rapid disease outbreak dynamics."));
children.push(bullet("Single-product focus: the MVP focuses primarily on Tilt 250 EC for clarity of demo. Multi-product scoring requires separate label engineering per product category."));
children.push(spacer());

// SECTION 28: FUTURE IMPROVEMENTS
children.push(pb());
children.push(h1("28. Future Improvements"));
children.push(schemaTable(
  ["Improvement", "Description", "Impact", "Feasibility"],
  [
    ["Weather API integration", "Real-time IMD weather feed for disease risk scoring per district", "High — core signal for disease-product demand", "Medium — API key + pipeline change"],
    ["Online learning", "Incremental XGBoost update on each new labeled visit", "High — faster model adaptation", "Medium — requires streaming pipeline"],
    ["Exact GPS routing", "Collect retailer GPS during visit log, enable turn-by-turn route", "High — operational efficiency", "Low effort once GPS data collected"],
    ["Multi-product scoring", "Separate opportunity scores per product category", "High — broader Syngenta portfolio", "Medium — feature engineering expansion"],
    ["Grower network features", "Link retailer scores to downstream grower purchase patterns", "Medium — richer demand signal", "Medium — growers.csv integration"],
    ["Voice interaction", "Field rep dictates visit notes via voice, transcribed to structured outcome", "High — usability in field conditions", "Medium — WhisperAPI integration"],
    ["Manager dashboard", "Web dashboard for territory managers to view team performance", "Medium — operational oversight", "Low — additional React frontend"]
  ]
));
children.push(spacer());

// SECTION 29: INFERENCE PIPELINE
children.push(pb());
children.push(h1("29. Full Inference Pipeline"));
children.push(...codeBlock([
  "# ml/inference_pipeline.py",
  "\"\"\"",
  "Full nightly inference pipeline.",
  "Runs as a Celery task after data ingestion.",
  "\"\"\"",
  "import pandas as pd",
  "import joblib",
  "import json",
  "from sqlalchemy import create_engine",
  "from datetime import date",
  "",
  "from pipeline.feature_engineering import build_feature_matrix",
  "from ml.anomaly_detection import score_anomalies",
  "from ml.explain import batch_shap_explanations",
  "from ml.next_best_action import assign_actions_batch",
  "",
  "engine = create_engine('postgresql://agripulse:password@localhost:5432/agripulse')",
  "",
  "def run_daily_scoring(score_date: str = None):",
  "    if score_date is None:",
  "        score_date = str(date.today())",
  "",
  "    print(f'[Pipeline] Running daily scoring for {score_date}')",
  "",
  "    # 1. Build feature matrix",
  "    features = build_feature_matrix(as_of_date=score_date)",
  "    print(f'[Pipeline] Feature matrix: {features.shape}')",
  "",
  "    # 2. XGBoost opportunity scoring",
  "    model   = joblib.load('models/xgboost_opportunity_scorer.pkl')",
  "    f_cols  = joblib.load('models/feature_cols.pkl')",
  "    X = features[f_cols].fillna(0)",
  "    features['opportunity_score'] = model.predict_proba(X)[:, 1]",
  "",
  "    # 3. Anomaly detection",
  "    anomaly_scores = score_anomalies(features)",
  "    features = features.merge(anomaly_scores, on='retailer_id', how='left')",
  "",
  "    # 4. SHAP explanations",
  "    shap_df = batch_shap_explanations(features)",
  "    features = features.merge(shap_df, on='retailer_id', how='left')",
  "",
  "    # 5. Next Best Action assignment",
  "    features = assign_actions_batch(features)",
  "",
  "    # 6. Assign rep_id (from territory mapping)",
  "    rep_mapping = pd.read_sql(",
  "        'SELECT retailer_id, rep_id FROM retailer_territory_mapping', engine",
  "    )",
  "    features = features.merge(rep_mapping, on='retailer_id', how='left')",
  "",
  "    # 7. Write to daily_scores table",
  "    output_cols = [",
  "        'retailer_id', 'rep_id', 'opportunity_score', 'anomaly_score',",
  "        'anomaly_flag', 'action_code', 'action_label', 'top_reason_text',",
  "        'shap_reasons', 'priority'",
  "    ]",
  "    output = features[[c for c in output_cols if c in features.columns]].copy()",
  "    output['score_date'] = score_date",
  "    output.to_sql('daily_scores', engine, if_exists='append', index=False)",
  "    print(f'[Pipeline] Wrote {len(output)} score records for {score_date}')",
  "",
  "if __name__ == '__main__':",
  "    run_daily_scoring()",
]));
children.push(spacer());

// SECTION 30: TECH STACK SUMMARY
children.push(pb());
children.push(h1("30. Technology Stack Summary"));
children.push(schemaTable(
  ["Layer", "Technology", "Version", "Purpose"],
  [
    ["Data Processing", "pandas", "2.1+", "CSV ingestion, feature engineering"],
    ["Data Processing", "numpy", "1.26+", "Numerical operations"],
    ["Database ORM", "SQLAlchemy", "2.0+", "PostgreSQL interface"],
    ["ML Framework", "XGBoost", "2.0+", "Opportunity scoring classifier"],
    ["ML Framework", "scikit-learn", "1.3+", "IsolationForest, preprocessing"],
    ["Explainability", "SHAP", "0.44+", "TreeExplainer for XGBoost"],
    ["Model Serialization", "joblib", "1.3+", "Save/load .pkl model files"],
    ["API Framework", "FastAPI", "0.104+", "REST API server"],
    ["API Server", "Uvicorn", "0.24+", "ASGI server for FastAPI"],
    ["Task Queue", "Celery", "5.3+", "Nightly pipeline scheduling"],
    ["Message Broker", "Redis", "7.x", "Celery broker + API cache"],
    ["Primary DB", "PostgreSQL", "15.x", "All structured data"],
    ["Mobile DB", "SQLite (expo-sqlite)", "latest", "Offline data on device"],
    ["Mobile Framework", "React Native (Expo)", "SDK 50+", "Cross-platform mobile app"],
    ["Network Detection", "NetInfo", "11.x", "Connectivity state detection"],
    ["Containerization", "Docker + Compose", "24.x", "Reproducible deployment"],
    ["Auth", "python-jose", "3.3+", "JWT token generation/validation"]
  ]
));
children.push(spacer());

// CLOSING
children.push(pb());
children.push(new Paragraph({
  children: [new TextRun({ text: "AgriPulse AI — Implementation Complete", size: 36, bold: true, color: "1E4D78" })],
  alignment: AlignmentType.CENTER,
  spacing: { before: 480, after: 240 }
}));
children.push(new Paragraph({
  children: [new TextRun({ text: "This document constitutes the complete engineering blueprint for the AgriPulse AI MVP. Every component described herein is implementable within the 6-day hackathon timeline using the real Syngenta × IITM BS 2026 dataset. The system is grounded in honest data engineering, realistic ML expectations, and operationally meaningful design for field representatives working in India's wheat belt.", size: 22, italics: true, color: "444444" })],
  alignment: AlignmentType.CENTER,
  spacing: { before: 0, after: 240 }
}));

// ── BUILD DOCUMENT ─────────────────────────────────────────────────────────────
const doc = new Document({
  styles: {
    default: {
      document: { run: { font: "Arial", size: 22 } }
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, color: "1E4D78", font: "Arial" },
        paragraph: { spacing: { before: 480, after: 240 }, outlineLevel: 0,
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "1E4D78", space: 4 } } }
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, color: "2E5B8A", font: "Arial" },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 1 }
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, color: "2E7D32", font: "Arial" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 }
      },
    ]
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      },
      {
        reference: "numbers",
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          children: [
            new TextRun({ text: "AgriPulse AI — Engineering Implementation Manual", size: 18, color: "1E4D78", bold: true }),
            new TextRun({ text: "\t\tSyngenta × IITM BS Hackathon 2026", size: 18, color: "888888" })
          ],
          tabStops: [{ type: "right", position: 9360 }],
          border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "1E4D78", space: 4 } }
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          children: [
            new TextRun({ text: "Track 2: AI-Guided Field Force Intelligence  |  Page ", size: 18, color: "888888" }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "888888" }),
            new TextRun({ text: " of ", size: 18, color: "888888" }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: "888888" }),
          ],
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC", space: 4 } }
        })]
      })
    },
    children
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('C:\\Users\\Smriti\\Desktop\\Syngenta\\AgriPulse_AI_v4_Engineering_Manual.docx', buf);
  console.log('Done. File written.');
});
