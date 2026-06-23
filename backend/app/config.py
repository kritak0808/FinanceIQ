import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "FinSense AI API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Database configuration
    DATABASE_URL: str = "postgresql://finsense:finsensepass@localhost:5432/finsense_db"
    
    # CORS Configuration
    CORS_ORIGINS: str = "http://localhost:3000"
    
    # Frontend application URL (for verification and password resets)
    FRONTEND_URL: str = "http://localhost:3000"
    
    # JWT authentication configuration
    JWT_SECRET: str = "supersecretkeychangeinproduction1234567890"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    @property
    def cors_origins_list(self) -> list[str]:
        # Split dynamic comma-separated string, default to wildcard if '*' is provided
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
    
    # AI/ML Configuration
    OPENAI_API_KEY: Optional[str] = None
    
    # S3 (Mock/Local or AWS) config for uploaded receipts
    S3_BUCKET_NAME: str = "finsense-receipts"
    S3_ENDPOINT_URL: Optional[str] = None
    S3_ACCESS_KEY: Optional[str] = None
    S3_SECRET_KEY: Optional[str] = None
    
    # Cache Configuration
    REDIS_URL: Optional[str] = None
    
    # Environment
    ENV: str = "development"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
