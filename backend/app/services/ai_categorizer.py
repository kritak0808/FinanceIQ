import re
from typing import Tuple

# Default known patterns
MERCHANT_PATTERNS = [
    # Food & Dining
    (r"(swiggy|zomato|starbucks|mcdonald|kfc|burger king|restaurant|pizza|cafe|bar|diner|food|bakery|subway|domino)", "Food & Dining"),
    # Shopping
    (r"(amazon|flipkart|myntra|zara|h&m|clovia|decathlon|target|walmart|mall|boutique|fashion|clothing|shoes)", "Shopping"),
    # Transportation
    (r"(uber|ola|rapido|metro|irctc|rail|flight|airline|indigo|bus|taxi|fuel|petrol|shell|hpCL|bpcl|garage|auto)", "Transportation"),
    # Utilities
    (r"(electricity|water|gas|broadband|wifi|jio|airtel|vi |bill|mobile|recharge|dth|tata play|bescom)", "Utilities"),
    # Healthcare
    (r"(apollo|pharmacy|chemist|hospital|clinic|doctor|dentist|medplus|netmeds|health|medical|insurance)", "Healthcare"),
    # Education
    (r"(coursera|udemy|udacity|edx|college|tuition|school|bookstore|course|training|class|exam)", "Education"),
    # Entertainment
    (r"(netflix|prime video|spotify|bookmyshow|cinema|movie|theatre|youtube premium|hotstar|gaming|steam|nintendo)", "Entertainment"),
    # Travel
    (r"(make-my-trip|mmt|agoda|booking\.com|airbnb|hotel|resort|travel|vacation|expedia)", "Travel"),
    # Investment
    (r"(zerodha|groww|upstox|mutual fund|sip|stock|share|broker|deposit|indmoney)", "Investment"),
]

class AICategorizer:
    def __init__(self):
        # Category seed training text for similarity mappings
        self.training_data = [
            ("Dinner with family at restaurant", "Food & Dining"),
            ("Grocery shopping at supermarket", "Shopping"),
            ("Cab ride to office", "Transportation"),
            ("Monthly subscription for Netflix", "Entertainment"),
            ("Medicine from Apollo pharmacy", "Healthcare"),
            ("Online course subscription", "Education"),
            ("Electricity bill payment", "Utilities"),
            ("Flight ticket booking for holiday", "Travel"),
            ("SIP investment in mutual fund", "Investment"),
        ]
        
        self.use_transformers = False
        try:
            from sentence_transformers import SentenceTransformer
            # Load a lightweight, performant model for local execution
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
            self.use_transformers = True
            
            # Precompute embeddings for standard categories
            self.corpus = [item[0] for item in self.training_data]
            self.categories = [item[1] for item in self.training_data]
            self.corpus_embeddings = self.model.encode(self.corpus, convert_to_tensor=True)
        except Exception:
            pass

    def categorize(self, description: str, merchant: str) -> Tuple[str, float]:
        text = f"{merchant} {description}".lower()
        
        # 1. Try pattern matching first
        for pattern, category in MERCHANT_PATTERNS:
            if re.search(pattern, text):
                return category, 0.98
                
        # 2. Try Sentence Transformers semantic similarity
        if self.use_transformers:
            try:
                from sentence_transformers import util
                import torch
                target_embedding = self.model.encode(text, convert_to_tensor=True)
                cos_scores = util.cos_sim(target_embedding, self.corpus_embeddings)[0]
                
                max_idx = int(torch.argmax(cos_scores))
                max_sim = float(cos_scores[max_idx])
                
                if max_sim > 0.35:
                    confidence = 0.5 + (max_sim * 0.45)
                    return self.categories[max_idx], round(confidence, 2)
            except Exception:
                pass
                
        # 3. Fallback to TF-IDF cosine similarity
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.metrics.pairwise import cosine_similarity
            
            corpus = [item[0] for item in self.training_data]
            categories = [item[1] for item in self.training_data]
            
            vectorizer = TfidfVectorizer().fit(corpus + [text])
            corpus_vectors = vectorizer.transform(corpus)
            target_vector = vectorizer.transform([text])
            
            similarities = cosine_similarity(target_vector, corpus_vectors)[0]
            max_idx = similarities.argmax()
            max_sim = float(similarities[max_idx])
            
            if max_sim > 0.15:
                confidence = 0.5 + (max_sim * 0.4)
                return categories[max_idx], round(confidence, 2)
        except Exception:
            pass
            
        # 4. Default fallback
        return "Miscellaneous", 0.50

ai_categorizer = AICategorizer()
