# FinSense AI – AI-Powered Personal Finance Intelligence Platform

FinSense AI is a production-ready, full-stack personal financial intelligence SaaS platform. It combines automated receipt OCR scanners, transaction categorizers, time-series spending forecast projections, Isolation Forest outlier detectors, and personal AI financial advisory coaching into a sleek, dark-themed dashboard.

## System Architecture

The platform is constructed as a decoupled Modular Monolith split into:
1. **Backend**: FastAPI (Python 3.12) server backed by SQLAlchemy schemas. Includes fallbacks supporting local SQLite databases for developer ease alongside PostgreSQL connections for production.
2. **Frontend**: Next.js 15 (React 19) dashboard powered by Tailwind CSS (v4), TypeScript, Zustand auth state containers, React Query caching, and Recharts visualization grids.
3. **Caching & Queue**: Redis instances mapping cache pipelines and monitoring logs.
4. **Machine Learning Engines**:
   - **OCR Parser**: Unified OpenCV receipt preprocess scanner hooking pytesseract and EasyOCR engines, backed by regex total/date parsers.
   - **Categorization**: Hybrid classifier using keyword-matching dictionaries and TF-IDF cosine similarity metrics to assign category labels.
   - **Forecaster**: Autoregressive statsmodel Trend + Seasonality linear regressions projecting future weekly/monthly/quarterly margins.
   - **Anomaly Detector**: Multidimensional Isolation Forest model coupled with category-specific standard deviation Z-score boundaries.
   - **Health Scorer**: Rule-weighted calculator measuring savings ratios, emergency reserve covers, and budget compliance factors.

---

## Workspace Directory Tree

```
fin sense ai/
├── backend/
│   ├── app/
│   │   ├── models/        # SQLAlchemy Database Entities
│   │   ├── schemas/       # Pydantic Schemas for validation
│   │   ├── services/      # AI/ML, OCR, and Scoring Services
│   │   ├── routers/       # FastAPI endpoints and dependencies
│   │   ├── utils/         # Seeding helper & security functions
│   │   ├── config.py      # Environment configurations
│   │   ├── database.py    # Database connection session
│   │   └── main.py        # Entrypoint FastAPI script
│   ├── tests/             # Pytest Unit & Integration testing suite
│   ├── static/receipts/   # Receipt file storage container
│   ├── Dockerfile         # Python slim production builder
│   └── requirements.txt   # Python dependency versions
├── frontend/
│   ├── src/
│   │   ├── app/           # Next.js 15 Pages and Routing Groups
│   │   ├── components/    # Reusable navigation sidebar and context providers
│   │   ├── store/         # Zustand global states (auth session)
│   │   └── utils/         # API fetch wrapper helper
│   ├── public/            # Static assets
│   ├── Dockerfile         # Node Alpine multi-stage builder
│   ├── package.json       # React, Recharts and Zustand libraries
│   └── tailwind.config.ts # Core styling tokens
├── docker-compose.yml     # Orchestration configs (Backend, Frontend, Redis)
└── README.md              # Documentation manual
```

---

## Local Development Guide

### 1. Prerequisites
- **Node.js**: v20 or v22
- **Python**: v3.12

### 2. Backend Setup
1. Open a terminal in `backend/`
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   ```
3. Install package dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server (autobootstrapping database tables and seeding realistic data on startup):
   ```bash
   uvicorn app.main:app --reload
   ```
   *The Swagger UI documentation is live at [http://localhost:8000/docs](http://localhost:8000/docs)*

### 3. Frontend Setup
1. Open a terminal in `frontend/`
2. Install Node packages:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
4. Access the web interface at [http://localhost:3000](http://localhost:3000)

### 4. Running Tests
Run backend unit assertions directly via pytest:
```bash
cd backend
.venv\Scripts\pytest
```

---

## Sandbox Access Accounts

When logging into the system, you can use the pre-seeded accounts:
- **Standard User**:
  - Email: `user@finsense.ai`
  - Password: `user123`
- **System Admin**:
  - Email: `admin@finsense.ai`
  - Password: `admin123`

---

## Docker Container Orchestration

To compile and launch the entire stack inside containers (FastAPI + Next.js + Redis):
```bash
docker-compose up --build
```
This serves:
- Next.js Web Portal: [http://localhost:3000](http://localhost:3000)
- FastAPI Docs API: [http://localhost:8000/docs](http://localhost:8000/docs)
