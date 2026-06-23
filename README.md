# 💰 FinanceIQ

### AI-Powered Financial Intelligence Platform

FinanceIQ is a next-generation AI-driven personal finance management platform designed to help users track expenses, analyze spending patterns, forecast future expenses, detect financial anomalies, and receive personalized financial guidance.

Built with modern full-stack technologies, FinanceIQ combines FinTech, Artificial Intelligence, OCR, Data Analytics, and Forecasting into a single intelligent financial ecosystem.

🌐 **Live Demo:** https://finance-iq-nine.vercel.app/

---

## 🚀 Features

### 📊 Smart Financial Dashboard

* Real-time financial overview
* Monthly income tracking
* Expense analytics
* Net savings monitoring
* Financial Health Score
* Interactive visualizations

### 💸 Expense Management

* Add, edit, and delete transactions
* Categorize expenses automatically
* Filter and search transaction history
* Track spending patterns

### 🤖 AI Expense Categorization

Automatically categorizes transactions into:

* Food & Dining
* Shopping
* Transportation
* Healthcare
* Education
* Entertainment
* Investments
* Utilities

Example:

Amazon ₹1500 → Shopping

Swiggy ₹350 → Food & Dining

---

### 📷 OCR Receipt Scanner

Upload:

* Receipt Images
* Bills
* Transaction Screenshots

FinanceIQ extracts:

* Merchant Name
* Amount
* Date
* Category

Technologies:

* EasyOCR
* OpenCV
* Image Processing Pipeline

---

### 🧠 AI Financial Coach

Personalized financial advisor that analyzes:

* Spending behavior
* Savings trends
* Budget utilization
* Financial goals

Example:

> Your food spending accounts for 28% of monthly expenses. Reducing food spending by 10% could save approximately ₹2,000 per month.

---

### 📈 Expense Forecasting

Predict future expenses using:

* Prophet
* XGBoost
* Statistical Analysis

Forecasts:

* Weekly Expenses
* Monthly Expenses
* Quarterly Expenses

---

### 🛡️ Fraud & Anomaly Detection

Automatically detects suspicious transactions using:

* Isolation Forest
* Statistical Anomaly Detection
* Spending Pattern Analysis

Example:

Typical Food Expense: ₹300–₹700

Detected Transaction: ₹4,500

⚠️ Flagged as Anomalous

---

### 🎯 Savings Goals

Create and manage goals:

* Emergency Fund
* Laptop Purchase
* Vacation Planning
* Investments

Track:

* Progress Percentage
* Required Monthly Savings
* Expected Completion Date

---

### 📈 Investment Recommendation Engine

Provides personalized recommendations based on:

* Age
* Income
* Savings
* Risk Profile

Recommendations:

* SIPs
* Mutual Funds
* Index Funds
* Fixed Deposits

---

### 🔐 Secure Authentication

Features:

* JWT Authentication
* Refresh Tokens
* Email Verification
* Password Reset
* Role-Based Access Control

---

## 🏗️ System Architecture

```text
Frontend (Next.js)
        │
        ▼
FastAPI Backend
        │
 ┌──────┼────────┐
 │      │        │
 ▼      ▼        ▼
PostgreSQL  AI Engine  OCR Engine
 │           │         │
 ▼           ▼         ▼
Analytics  Forecasting  Receipt Processing
```

---

## 🛠️ Tech Stack

### Frontend

* Next.js 15
* TypeScript
* Tailwind CSS
* ShadCN UI
* Recharts
* React Query

### Backend

* FastAPI
* Python
* SQLAlchemy
* Alembic

### Database

* PostgreSQL
* SQLite (Development)

### AI / ML

* OpenAI API
* LangChain
* EasyOCR
* OpenCV
* Prophet
* XGBoost
* Scikit-Learn

### Authentication

* JWT
* Refresh Tokens

### DevOps

* Docker
* GitHub Actions
* Vercel
* Render

---

## 📂 Project Structure

```text
FinanceIQ/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── components/
│
├── backend/
│   ├── app/
│   │   ├── models/
│   │   ├── routers/
│   │   ├── services/
│   │   └── schemas/
│   │
│   ├── tests/
│   └── alembic/
│
├── DeploymentGuide.md
├── docker-compose.yml
├── LICENSE
└── README.md
```

---

## ⚙️ Installation

### Clone Repository

```bash
git clone https://github.com/kritak0808/FinanceIQ.git
cd FinanceIQ
```

### Frontend

```bash
cd frontend

npm install

npm run dev
```

Frontend:

```text
http://localhost:3000
```

### Backend

```bash
cd backend

pip install -r requirements.txt

uvicorn app.main:app --reload
```

Backend:

```text
http://localhost:8000
```

---

## 🔑 Environment Variables

### Frontend

```env
NEXT_PUBLIC_API_URL=
```

### Backend

```env
DATABASE_URL=
JWT_SECRET=
OPENAI_API_KEY=
FRONTEND_URL=
```

---

## 📸 Screenshots

Add screenshots here:

* Dashboard
* Transactions
* AI Coach
* Forecasting
* Goals
* Investments

```md
![Dashboard](screenshots/dashboard.png)
```

---

## 🧪 Testing

Run backend tests:

```bash
pytest
```

Run frontend linting:

```bash
npm run lint
```

---

## 🌟 Future Enhancements

* Voice Financial Assistant
* Financial Twin Simulator
* Subscription Detection
* Credit Score Estimator
* AI CFO Mode
* Tax Optimization Assistant
* Family Finance Workspace
* Financial Genome Score

---

## 👨‍💻 Developer

**Kritak Prasad**

B.Tech Computer Science & Engineering
SRM Institute of Science and Technology

GitHub: https://github.com/kritak0808

---

## 📜 License

This project is licensed under the MIT License.

---

⭐ If you found this project useful, consider giving the repository a star.
