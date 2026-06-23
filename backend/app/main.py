import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.database import engine, SessionLocal
from app.utils.seed_data import seed_db

# Configure structured standard logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("finsense_api")

# Late import routers
from app.routers import (
    auth_router,
    transactions_router,
    budgets_router,
    forecasts_router,
    coach_router,
    goals_router,
    investments_router,
    admin_router,
    ocr_router
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("Starting up FinSense AI API...")
    
    # Auto-initialize and seed SQLite database for local test suite
    if settings.DATABASE_URL.startswith("sqlite"):
        logger.info("SQLite database URL detected. Automatically running database seeding...")
        db = SessionLocal()
        try:
            seed_db(db)
        finally:
            db.close()
    yield
    # Shutdown actions
    logger.info("Shutting down FinSense AI API...")

import time
from collections import defaultdict
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from fastapi import Request

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, limit: int = 100, window: int = 60):
        super().__init__(app)
        self.limit = limit
        self.window = window
        self.requests = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if path.startswith("/static") or path in ["/docs", "/redoc", "/openapi.json"]:
            return await call_next(request)
            
        client_ip = request.client.host if request.client else "127.0.0.1"
        now = time.time()
        
        # Reset requests list if requested (used to isolate test runs)
        if "x-test-rate-limit-reset" in request.headers:
            self.requests[client_ip].clear()
            return await call_next(request)

        # Test override limit header to trigger 429 deterministically in tests
        limit = self.limit
        if "x-test-rate-limit" in request.headers:
            try:
                limit = int(request.headers["x-test-rate-limit"])
            except ValueError:
                pass

        # Filter request timestamps within sliding window
        self.requests[client_ip] = [t for t in self.requests[client_ip] if now - t < self.window]
        
        if len(self.requests[client_ip]) >= limit:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please try again later."}
            )
            
        self.requests[client_ip].append(now)
        return await call_next(request)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';"
        return response

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Set up Middlewares
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware, limit=100, window=60)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded receipts locally
RECEIPT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "receipts")
os.makedirs(RECEIPT_DIR, exist_ok=True)
app.mount("/static/receipts", StaticFiles(directory=RECEIPT_DIR), name="receipts")

# Register all API endpoints
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(transactions_router, prefix=settings.API_V1_STR)
app.include_router(budgets_router, prefix=settings.API_V1_STR)
app.include_router(forecasts_router, prefix=settings.API_V1_STR)
app.include_router(coach_router, prefix=settings.API_V1_STR)
app.include_router(goals_router, prefix=settings.API_V1_STR)
app.include_router(investments_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)
app.include_router(ocr_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "message": "Welcome to FinSense AI - AI-Powered Personal Finance Intelligence Platform API",
        "version": settings.VERSION,
        "docs_url": "/docs"
    }
