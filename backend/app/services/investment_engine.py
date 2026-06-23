from typing import Dict, Any, List
from decimal import Decimal

class InvestmentEngine:
    def recommend(self, age: int, monthly_income: Decimal, current_savings: Decimal, risk_tolerance: str) -> Dict[str, Any]:
        risk_tolerance = risk_tolerance.capitalize()
        if risk_tolerance not in ["Conservative", "Moderate", "Aggressive"]:
            risk_tolerance = "Moderate"
            
        recommendations = []
        
        # Apply age-based scaling: "100 minus age" rule for equity allocation
        equity_cap = max(10.0, min(90.0, 100.0 - age))
        
        if risk_tolerance == "Conservative":
            # Focus on capital preservation
            fd_pct = round(40.0 + (100.0 - equity_cap) * 0.2, 1)
            debt_pct = round(35.0 + (100.0 - equity_cap) * 0.1, 1)
            sip_pct = round(15.0 * (equity_cap / 50.0), 1)
            idx_pct = round(10.0 * (equity_cap / 50.0), 1)
            
            # Normalize to 100%
            total = fd_pct + debt_pct + sip_pct + idx_pct
            fd_pct = round(fd_pct + (100.0 - total), 1)
            
            recommendations = [
                {
                    "asset_class": "Fixed Deposits (FD)",
                    "recommended_percentage": fd_pct,
                    "description": "Risk-free bank instruments offering guaranteed returns (6.5% - 7.5% annual yield) backed by deposit insurance."
                },
                {
                    "asset_class": "Debt Funds",
                    "recommended_percentage": debt_pct,
                    "description": "Short-to-medium-term mutual funds investing in corporate bonds and government securities, offering high liquidity and tax-efficient yields."
                },
                {
                    "asset_class": "Equity SIPs (Large Cap)",
                    "recommended_percentage": sip_pct,
                    "description": "Systematic Investment Plans targeting blue-chip companies with established cash flows, providing stable long-term compounding."
                },
                {
                    "asset_class": "Index Funds (Nifty 50)",
                    "recommended_percentage": idx_pct,
                    "description": "Low-cost passive mutual funds tracking the top 50 Indian companies, matching general stock market performance."
                }
            ]
            
            ai_explanation = (
                f"With a Conservative profile at age {age}, capital preservation is prioritized. "
                f"Approximately {fd_pct + debt_pct}% of your capital is anchored in guaranteed fixed income and bond assets. "
                f"This guards your core savings of ₹{current_savings:,.2f} against stock market downturns while a {sip_pct + idx_pct}% equity component "
                f"enables you to outpace long-term inflation without exposing you to excessive volatility."
            )
            
        elif risk_tolerance == "Moderate":
            # Balanced growth and safety
            idx_pct = round(30.0 * (equity_cap / 60.0), 1)
            sip_pct = round(25.0 * (equity_cap / 60.0), 1)
            hybrid_pct = round(20.0, 1)
            fd_pct = round(15.0 + (60.0 - equity_cap) * 0.3, 1)
            debt_pct = round(10.0 + (60.0 - equity_cap) * 0.2, 1)
            
            total = idx_pct + sip_pct + hybrid_pct + fd_pct + debt_pct
            idx_pct = round(idx_pct + (100.0 - total), 1)
            
            recommendations = [
                {
                    "asset_class": "Index Funds (Broad Market)",
                    "recommended_percentage": idx_pct,
                    "description": "Passive funds mirroring broad indices (e.g., Nifty 50 and Nifty Next 50) for diversified market growth."
                },
                {
                    "asset_class": "Equity SIPs (Active Mid-Cap)",
                    "recommended_percentage": sip_pct,
                    "description": "Systematic monthly investing in active mutual funds targeting medium-sized companies with high growth potential."
                },
                {
                    "asset_class": "Hybrid Mutual Funds",
                    "recommended_percentage": hybrid_pct,
                    "description": "Balanced asset allocation funds that dynamically switch between equity and debt based on market valuations."
                },
                {
                    "asset_class": "Fixed Deposits (FD)",
                    "recommended_percentage": fd_pct,
                    "description": "Guaranteed-return safety anchor to ensure instant liquidity and capital preservation."
                },
                {
                    "asset_class": "Debt Funds",
                    "recommended_percentage": debt_pct,
                    "description": "Liquid debt holdings providing better returns than savings accounts with minimal interest-rate risk."
                }
            ]
            
            ai_explanation = (
                f"At age {age}, a Moderate risk profile recommends a balanced growth allocation. "
                f"We deploy {idx_pct + sip_pct + hybrid_pct}% of capital into diversified equities and hybrid assets "
                f"to capture mid-to-long term compounding. To mitigate downside risks, the remaining {fd_pct + debt_pct}% "
                f"is structured in high-liquidity fixed-income instruments, creating a buffer for near-term cash needs."
            )
            
        else: # Aggressive
            # Wealth maximization
            idx_pct = round(40.0 * (equity_cap / 70.0), 1)
            sip_pct = round(35.0 * (equity_cap / 70.0), 1)
            sectoral_pct = round(15.0 * (equity_cap / 70.0), 1)
            debt_pct = round(10.0, 1)
            
            total = idx_pct + sip_pct + sectoral_pct + debt_pct
            idx_pct = round(idx_pct + (100.0 - total), 1)
            
            recommendations = [
                {
                    "asset_class": "Index Funds (Large & Midcap)",
                    "recommended_percentage": idx_pct,
                    "description": "Passive exposure across the top 250 market cap corporations, maximizing cost-effective stock market returns."
                },
                {
                    "asset_class": "Active Equity SIP (Small & Midcap)",
                    "recommended_percentage": sip_pct,
                    "description": "Systematic plans focusing on fast-growing small and mid-sized enterprises to yield alpha returns."
                },
                {
                    "asset_class": "Sectoral / Technology Funds",
                    "recommended_percentage": sectoral_pct,
                    "description": "High-risk thematic funds focused on booming sectors (e.g. IT, Banking, Infrastructure) for tactical upside."
                },
                {
                    "asset_class": "Short-Term Debt Funds",
                    "recommended_percentage": debt_pct,
                    "description": "Minimal bond fund buffer for asset rebalancing and emergency cash buffers, keeping 90% capital compounding."
                }
            ]
            
            ai_explanation = (
                f"With your Aggressive risk profile at age {age}, we position {idx_pct + sip_pct + sectoral_pct}% "
                f"of your capital directly in high-growth equity vehicles. This strategy aims for aggressive capital "
                f"appreciation over a 5+ year window. A minimal {debt_pct}% debt allocation is maintained solely for emergency "
                f"liquidity and capital re-allocations during stock market corrections."
            )
            
        return {
            "risk_tolerance": risk_tolerance,
            "recommendations": recommendations,
            "ai_explanation": ai_explanation
        }

investment_engine = InvestmentEngine()
