from typing import List, Dict, Any
from decimal import Decimal
from app.models.user import User, Account, Profile
from app.models.transaction import Transaction
from app.models.budget import Budget
import numpy as np

class HealthScorer:
    def calculate_score(self, user: User, db_session=None) -> Dict[str, Any]:
        profile = user.profile
        monthly_income = float(profile.monthly_income) if (profile and profile.monthly_income) else 0.0
        
        # Load transactions
        transactions = user.transactions
        accounts = user.accounts
        budgets = user.budgets
        
        # 1. Total savings balance vs. expenses
        savings_balance = sum(float(a.balance) for a in accounts if a.type in ["savings", "checking"])
        credit_balance = sum(float(a.balance) for a in accounts if a.type == "credit_card")
        
        # Average monthly expenses (last 60 days)
        expenses = [t for t in transactions if t.type == "expense"]
        total_expense_val = sum(float(e.amount) for e in expenses)
        
        # Group expenses by month
        dates = [e.date for e in expenses]
        if dates:
            min_date = min(dates)
            days_range = max(1.0, (max(dates) - min_date).days)
            months_range = max(1.0, days_range / 30.4)
            avg_monthly_expense = total_expense_val / months_range
        else:
            avg_monthly_expense = 0.0
            
        # Metrics
        # Savings Ratio
        monthly_savings = max(0.0, monthly_income - avg_monthly_expense)
        savings_ratio = (monthly_savings / monthly_income) if monthly_income > 0 else 0.0
        
        # Debt ratio (credit card debt to monthly income)
        debt_ratio = (credit_balance / monthly_income) if monthly_income > 0 else 0.0
        
        # Budget Compliance
        overspent_count = 0
        total_budgets = len(budgets)
        budget_compliance_ratio = 1.0
        if total_budgets > 0:
            for b in budgets:
                cat_expenses = sum(float(e.amount) for e in expenses if e.category == b.category)
                if cat_expenses > float(b.limit_amount):
                    overspent_count += 1
            budget_compliance_ratio = (total_budgets - overspent_count) / total_budgets
            
        # Emergency Fund Coverage (Months of expenses covered)
        emergency_fund_coverage = (savings_balance / avg_monthly_expense) if avg_monthly_expense > 0 else 0.0
        
        # Spending Stability (variance of month-on-month expenses)
        spending_stability = 1.0  # Default stable
        if len(expenses) > 10:
            # Resample monthly expense values
            import pandas as pd
            df = pd.DataFrame([{"date": e.date, "amount": float(e.amount)} for e in expenses])
            monthly_totals = df.set_index("date").resample("M").sum()
            if len(monthly_totals) >= 2:
                std_spent = float(np.std(monthly_totals["amount"]))
                mean_spent = float(np.mean(monthly_totals["amount"]))
                # Coefficient of variation (CV)
                cv = (std_spent / mean_spent) if mean_spent > 0 else 0.0
                # Higher CV means less stable
                spending_stability = max(0.0, 1.0 - cv)

        # 2. Score Calculation (Weighted)
        # Components:
        # - Savings Ratio (weight: 25%) - Ideal >= 25% (score = ratio/0.25 * 100)
        # - Debt Ratio (weight: 20%) - Ideal <= 10% (score = 100 - (ratio/0.3 * 100))
        # - Budget Compliance (weight: 20%) - Ideal = 100% compliance
        # - Emergency Fund (weight: 20%) - Ideal >= 6 months
        # - Stability (weight: 15%) - Stable spending = 100%
        
        savings_score = min(100.0, (savings_ratio / 0.25) * 100) if savings_ratio > 0 else 0.0
        debt_score = max(0.0, 100.0 - (debt_ratio / 0.35) * 100)
        compliance_score = budget_compliance_ratio * 100
        emergency_score = min(100.0, (emergency_fund_coverage / 6.0) * 100)
        stability_score = spending_stability * 100
        
        # Weighted score
        raw_score = (
            (savings_score * 0.25) +
            (debt_score * 0.20) +
            (compliance_score * 0.20) +
            (emergency_score * 0.20) +
            (stability_score * 0.15)
        )
        
        score = int(round(raw_score))
        if score == 0 and monthly_income == 0:
            score = 70  # default average for initial setup
            
        # 3. Generate recommendations
        recs = []
        if savings_ratio < 0.15:
            recs.append(f"Your savings ratio ({savings_ratio*100:.1f}%) is below the healthy 20% mark. Aim to trim subscription overheads or dining expenses by 10%.")
        else:
            recs.append("Great job! Your savings ratio is high, reflecting excellent financial discipline.")
            
        if emergency_fund_coverage < 3.0:
            shortfall = max(0.0, (3.0 * avg_monthly_expense) - savings_balance)
            recs.append(f"Emergency fund covers only {emergency_fund_coverage:.1f} months. Build up your liquid savings by another ₹{shortfall:,.2f} to cover 3 full months of basic expenses.")
        else:
            recs.append(f"Solid emergency reserve! Your checking/savings accounts cover {emergency_fund_coverage:.1f} months of expenses.")
            
        if debt_ratio > 0.25:
            recs.append(f"Your credit card utilization ({debt_ratio*100:.1f}%) is high. Focus on clearing outstanding high-interest balances immediately to save on interest costs.")
            
        if overspent_count > 0:
            recs.append(f"You exceeded your budget targets in {overspent_count} categories this month. Try setting auto-lock alert notifications at 80% capacity.")
            
        if spending_stability < 0.65:
            recs.append("Expense trends show high volatility. Categorize large annual/one-off payments and budget for them incrementally throughout the year.")

        return {
            "score": max(5, min(100, score)),
            "savings_ratio": float(round(savings_ratio, 3)),
            "debt_ratio": float(round(debt_ratio, 3)),
            "budget_compliance": float(round(budget_compliance_ratio, 3)),
            "spending_stability": float(round(spending_stability, 3)),
            "emergency_fund_coverage": float(round(emergency_fund_coverage, 2)),
            "recommendations": recs
        }

health_scorer = HealthScorer()
