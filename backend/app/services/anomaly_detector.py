import numpy as np
from typing import List, Tuple, Dict, Any, Optional
from sklearn.ensemble import IsolationForest
from app.models.transaction import Transaction

class AnomalyDetector:
    def detect_anomalies(self, transactions: List[Transaction]) -> List[Tuple[Transaction, str]]:
        """
        Scan a user's transaction history and detect anomalies.
        Returns a list of tuples containing:
          - The anomalous transaction
          - A string reason explaining why it is flagged
        """
        expenses = [t for t in transactions if t.type == "expense"]
        if len(expenses) < 5:
            # Not enough transactions for meaningful detection, return empty
            return []
            
        anomalies = []
        
        # Group transactions by category to calculate category-specific metrics
        cat_data: Dict[str, List[float]] = {}
        for t in expenses:
            cat = t.category
            if cat not in cat_data:
                cat_data[cat] = []
            cat_data[cat].append(float(t.amount))
            
        # 1. Statistical Outlier Detection (Z-Score & Absolute Ratio)
        # Highly effective for clear explanations
        for t in expenses:
            cat = t.category
            amount = float(t.amount)
            amounts_in_cat = cat_data.get(cat, [])
            
            if len(amounts_in_cat) >= 3:
                mean_val = np.mean(amounts_in_cat)
                std_val = np.std(amounts_in_cat)
                median_val = np.median(amounts_in_cat)
                
                # Check 1: Amount exceeds median by over 5x
                if amount > 5 * median_val and amount > 500:
                    ratio = amount / median_val
                    anomalies.append((t, f"Amount of ₹{amount:,.2f} is {ratio:.1f}x the median expense (₹{median_val:,.2f}) for category '{cat}'."))
                    continue
                
                # Check 2: Z-score is greater than 3 (3 standard deviations)
                if std_val > 0:
                    z_score = (amount - mean_val) / std_val
                    if z_score > 3.0 and amount > 1000:
                        anomalies.append((t, f"Amount of ₹{amount:,.2f} represents a standard deviation spike (Z-Score: {z_score:.2f}) compared to normal spending in '{cat}'."))
                        continue

        # 2. Multidimensional Isolation Forest Detection
        # Finds unusual patterns (e.g. high amounts coupled with unusual dates/payment methods)
        try:
            # Prepare data matrix for IsolationForest
            # Features: amount, hour of day, day of week, day of month
            data_matrix = []
            valid_transactions = []
            
            for t in expenses:
                # Skip transactions already flagged by the simpler statistical checks to avoid duplicates
                if any(t.id == item[0].id for item in anomalies):
                    continue
                dt = t.date
                data_matrix.append([
                    float(t.amount),
                    dt.hour,
                    dt.weekday(),
                    dt.day
                ])
                valid_transactions.append(t)
                
            if len(data_matrix) >= 10:
                X = np.array(data_matrix)
                # Fit IsolationForest
                clf = IsolationForest(contamination=0.05, random_state=42)
                preds = clf.fit_predict(X)
                
                for idx, pred in enumerate(preds):
                    if pred == -1:  # Outlier
                        t = valid_transactions[idx]
                        anomalies.append((t, f"Isolation Forest flagged this transaction as anomalous based on combined indicators (amount ₹{t.amount:,.2f}, day {t.date.day}, payment method: {t.payment_method})."))
        except Exception:
            pass
            
        return anomalies

    def check_single_transaction(self, t: Transaction, history: List[Transaction]) -> Tuple[bool, float, Optional[str]]:
        """
        Evaluate a single new transaction against historical expenses.
        Returns:
          - is_anomaly (bool)
          - confidence_score (float)
          - reason (str)
        """
        if t.type == "income":
            return False, 1.0, None
            
        expenses = [h for h in history if h.type == "expense" and h.category == t.category]
        if not expenses:
            # No context for this category, mark as standard
            return False, 0.95, None
            
        amounts = [float(h.amount) for h in expenses]
        median_val = np.median(amounts)
        amount = float(t.amount)
        
        # If the amount is massive compared to the historical median, flag it
        if len(expenses) >= 3 and amount > 6 * median_val and amount > 1000:
            ratio = amount / median_val
            reason = f"Transaction amount of ₹{amount:,.2f} is {ratio:.1f}x higher than your average spend of ₹{median_val:,.2f} on {t.category}."
            return True, 0.85, reason
            
        return False, 0.95, None

anomaly_detector = AnomalyDetector()
