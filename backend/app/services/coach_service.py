from typing import List, Dict, Any, Optional
from decimal import Decimal
from openai import OpenAI
from app.config import settings
from app.models.user import User
from app.services.health_scorer import health_scorer

class CoachService:
    def get_coach_context(self, user: User) -> str:
        """Summarize user metrics for the LLM context prompt."""
        profile = user.profile
        income = float(profile.monthly_income) if (profile and profile.monthly_income) else 0.0
        currency = profile.currency if profile else "INR"
        
        # Calculate spending stats
        expenses = [t for t in user.transactions if t.type == "expense"]
        total_expense = sum(float(e.amount) for e in expenses)
        
        # Category breakdown
        cat_sums: Dict[str, float] = {}
        for e in expenses:
            cat_sums[e.category] = cat_sums.get(e.category, 0.0) + float(e.amount)
            
        cat_str = ", ".join([f"{cat}: {currency} {amt:,.2f}" for cat, amt in cat_sums.items()])
        
        # Budgets
        budgets = user.budgets
        budget_str = ", ".join([f"{b.category}: limit {currency} {float(b.limit_amount):,.2f}" for b in budgets])
        
        # Health score
        score_data = health_scorer.calculate_score(user)
        score = score_data["score"]
        
        context = (
            f"User Profile Context:\n"
            f"- Monthly Income: {currency} {income:,.2f}\n"
            f"- Total Expenses recorded: {currency} {total_expense:,.2f}\n"
            f"- Financial Health Score: {score}/100\n"
            f"- Spending by Category: {cat_str if cat_str else 'No expenses recorded yet.'}\n"
            f"- Budgets: {budget_str if budget_str else 'No budgets set.'}\n"
            f"- Recommendations from Health Scorer: {'; '.join(score_data['recommendations'])}\n"
        )
        return context

    def chat(self, user: User, message: str, chat_history: List[Dict[str, str]] = None) -> str:
        """
        Processes a chat query from the user.
        Uses OpenAI if a key is configured, otherwise falls back to a rules-based local analyst.
        """
        context = self.get_coach_context(user)
        
        # Try OpenAI if API key exists
        if settings.OPENAI_API_KEY:
            try:
                client = OpenAI(api_key=settings.OPENAI_API_KEY)
                
                # Format system message
                system_msg = (
                    "You are FinSense AI, an experienced, highly encouraging, and empathetic personal financial coach.\n"
                    "Your goal is to guide users to financial wellness. Use the user's spending summaries and health score "
                    "provided in the context to offer highly concrete, customized, data-driven savings recommendations. "
                    "Reference their actual categories and numbers where applicable.\n\n"
                    f"User Context:\n{context}\n\n"
                    "Always reply in clean Markdown format with structured bullet points. Keep it conversational yet highly professional."
                )
                
                messages = [{"role": "system", "content": system_msg}]
                if chat_history:
                    # Append last few messages
                    messages.extend(chat_history[-6:])
                messages.append({"role": "user", "content": message})
                
                response = client.chat.completions.create(
                    model="gpt-4-turbo",
                    messages=messages,
                    temperature=0.7,
                    max_tokens=600
                )
                return response.choices[0].message.content
            except Exception as e:
                # Log and proceed to fallback
                pass
                
        # Run local analytical fallback
        return self._generate_local_advice(user, message)

    def _generate_local_advice(self, user: User, query: str) -> str:
        """
        A detailed local financial analyst fallback that parses the user's spending data
        and writes specific financial advice based on actual parameters.
        """
        query_lower = query.lower()
        profile = user.profile
        income = float(profile.monthly_income) if (profile and profile.monthly_income) else 0.0
        currency = profile.currency if profile else "INR"
        
        expenses = [t for t in user.transactions if t.type == "expense"]
        total_expense = sum(float(e.amount) for e in expenses)
        
        cat_sums: Dict[str, float] = {}
        for e in expenses:
            cat_sums[e.category] = cat_sums.get(e.category, 0.0) + float(e.amount)
            
        score_data = health_scorer.calculate_score(user)
        score = score_data["score"]
        
        # Check query intent
        if "save" in query_lower or "saving" in query_lower or "reduce" in query_lower:
            # Analyze highest categories
            if cat_sums:
                highest_cat = max(cat_sums, key=cat_sums.get)
                highest_amt = cat_sums[highest_cat]
                pct_of_total = (highest_amt / total_expense * 100) if total_expense > 0 else 0.0
                potential_savings = highest_amt * 0.15
                
                response = (
                    f"### Savings Analysis & Recommendation 📉\n\n"
                    f"Analyzing your transaction log, your primary expense category is **{highest_cat}**, "
                    f"accounting for **{pct_of_total:.1f}%** of your total monthly outflow (spending a total of {currency} {highest_amt:,.2f}).\n\n"
                    f"Here is a concrete action plan to optimize your savings:\n"
                    f"- **Target {highest_cat}**: Reducing your spending in this category by just **15%** will save you approximately **{currency} {potential_savings:,.2f}** per month.\n"
                    f"- **Adopt the 50/30/20 Rule**: Allocate 50% of your income ({currency} {income*0.5:,.2f}) to Needs, 30% ({currency} {income*0.3:,.2f}) to Wants, and commit 20% ({currency} {income*0.2:,.2f}) straight to savings/investments.\n"
                    f"- **Build a Category Budget**: If you haven't already, head to the Budget section and set a hard cap for `{highest_cat}` at {currency} {highest_amt * 0.85:,.2f}."
                )
            else:
                response = (
                    f"### Savings Advice 📈\n\n"
                    f"We don't see any expense transactions registered yet! To provide custom advice, try adding a few manual transactions or importing bank statements.\n\n"
                    f"**General savings tips to start with:**\n"
                    f"1. **Automate Savings**: Set up an auto-transfer of 15-20% of your income into a savings account on salary day.\n"
                    f"2. **Track Micro-transactions**: Often it is the daily minor expenses (coffees, quick rides) that aggregate into major leakages."
                )
                
        elif "budget" in query_lower or "compliance" in query_lower:
            budgets = user.budgets
            if budgets:
                compliance_summary = []
                for b in budgets:
                    spent = cat_sums.get(b.category, 0.0)
                    pct = (spent / float(b.limit_amount)) * 100
                    status = "✅ On Track" if pct <= 80 else "⚠️ Near Limit" if pct <= 100 else "❌ Over Limit"
                    compliance_summary.append(f"- **{b.category}**: {currency} {spent:,.2f} spent of {currency} {float(b.limit_amount):,.2f} limit ({pct:.1f}%) - {status}")
                
                response = (
                    f"### Budget Compliance Health Check 📋\n\n"
                    f"Here is a summary of your active budgets:\n\n"
                    f"{chr(10).join(compliance_summary)}\n\n"
                    f"**Recommendations:**\n"
                    f"- **Overspent/Near Limit Categories**: Pause non-essential purchases in those categories for the rest of the cycle.\n"
                    f"- **Dynamic Allocation**: Re-allocate surplus from your high-compliance categories to cover minor deficits elsewhere."
                )
            else:
                response = (
                    f"### Budget Planning Advice 📋\n\n"
                    f"You do not have any budgets set up yet! Setting boundaries is the first step toward financial independence.\n\n"
                    f"**How to start budgeting:**\n"
                    f"1. Create a **Food & Dining** budget at 15% of your income.\n"
                    f"2. Set an **Entertainment** budget cap at 10% of income.\n"
                    f"3. Track your usage daily on the Budgets dashboard."
                )
                
        elif "score" in query_lower or "health" in query_lower or "financial health" in query_lower:
            recs_list = "\n".join([f"- {r}" for r in score_data["recommendations"]])
            response = (
                f"### Financial Health Diagnostic 🩺\n\n"
                f"Your current Financial Health Score is **{score}/100**.\n\n"
                f"**Score Breakdown:**\n"
                f"- **Savings Rate**: {(score_data['savings_ratio']*100):.1f}% (Ideal: >=25%)\n"
                f"- **Credit/Debt Load**: {(score_data['debt_ratio']*100):.1f}% (Ideal: <15%)\n"
                f"- **Emergency Reserve**: {score_data['emergency_fund_coverage']:.1f} months covered (Ideal: 6 months)\n\n"
                f"**Key Steps to Elevate Your Score:**\n"
                f"{recs_list}"
            )
            
        elif "invest" in query_lower or "portfolio" in query_lower or "stock" in query_lower or "mutual fund" in query_lower:
            response = (
                f"### Smart Investing Principles 💰\n\n"
                f"To structure a portfolio, we must align it with your age and risk comfort. Based on your profile:\n"
                f"- **Emergency Fund First**: Ensure you have 3 to 6 months of expenses in a highly liquid savings account or debt fund before entering volatile markets.\n"
                f"- **Diversification**: Split investments across broad Index Funds (for stock market index matching), debt funds (for stability), and fixed assets (for safety).\n"
                f"- **SIP Investing**: Leverage Systematic Investment Plans to automate investing, allowing rupee cost averaging to smooth out market volatility.\n\n"
                f"👉 Go to our **Investments** screen to run the risk questionnaire and fetch a detailed, customized asset split plan!"
            )
            
        else:
            response = (
                f"### Hello! I am your FinSense Financial Coach 🤖👋\n\n"
                f"I can help you review your budgets, analyze your category spending, optimize savings, or break down your Financial Health Score.\n\n"
                f"**Try asking me details like:**\n"
                f"- *\"How can I save more money this month?\"*\n"
                f"- *\"Check my budget compliance status.\"*\n"
                f"- *\"Explain my financial health score and how to improve it.\"*\n"
                f"- *\"What are the rules of thumb for investing?\"*"
            )
            
        return response

coach_service = CoachService()
