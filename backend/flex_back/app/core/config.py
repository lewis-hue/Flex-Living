import os
from pydantic_settings import BaseSettings
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", True)
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    WORKERS: int = os.getenv("WORKERS", 1)
    
    # Server Settings
    HOST: str = os.getenv("HOST", "localhost")
    PORT: int = os.getenv("PORT", 8080)
    
    # MongoDB Settings
    MONGODB_URL: str = os.getenv("MONGODB_URL", "")
    MONGODB_DATABASE: str = os.getenv("MONGODB_DATABASE", "flex_living")
    
    # Authentication & Security
    JWT_SECRET: str = os.getenv("JWT_SECRET", "your_jwt_secret")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", 30)
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = os.getenv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", 7)
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "Y8x9Wm2Qp5Rt7Vb0Nf4Lc3Zs6Hd1Kj9A")
    
    # CORS Configuration
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:8080,http://localhost:8081,http://localhost:8080,http://127.0.0.1:8080,https://datascrapex-job3-1070255625225.us-central1.run.app,https://datascrapex-job3-1070255625225.us-central1.run.app/*")
    
    # External Integrations
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    HOSTAWAY_API_KEY: str = os.getenv("HOSTAWAY_API_KEY", "f94377ebbbb479490bb3ec3646491682dc443dda2e4830facaf5de2e74ccc9152")
    HOSTAWAY_ACCOUNT_ID: int = os.getenv("HOSTAWAY_ACCOUNT_ID", 61148)
    HOSTAWAY_BASE_URL: str = os.getenv("HOSTAWAY_BASE_URL", "https://api.hostaway.com/v1")
    
    # Feature Flags
    DEBUG_EMAIL_TESTING: bool = os.getenv("DEBUG_EMAIL_TESTING", True)
    ENABLE_AI_ANALYSIS: bool = os.getenv("ENABLE_AI_ANALYSIS", True)
    ENABLE_EMAIL_NOTIFICATIONS: bool = os.getenv("ENABLE_EMAIL_NOTIFICATIONS", True)
    ENABLE_RATE_LIMITING: bool = os.getenv("ENABLE_RATE_LIMITING", True)
    ENABLE_CORS: bool = os.getenv("ENABLE_CORS", True)
    ENABLE_HOSTAWAY_INTEGRATION: bool = os.getenv("ENABLE_HOSTAWAY_INTEGRATION", True)
    ENABLE_GOOGLE_PLACES_INTEGRATION: bool = os.getenv("ENABLE_GOOGLE_PLACES_INTEGRATION", True)
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = os.getenv("RATE_LIMIT_PER_MINUTE", 60)
    RATE_LIMIT_PER_HOUR: int = os.getenv("RATE_LIMIT_PER_HOUR", 1000)
    
    # Collections
    PROPERTY_COLLECTION: str = "prop_data"
    REVIEW_COLLECTION: str = "rev_data"
    GUEST_COLLECTION: str = "guest_data"
    ANALYTICS_COLLECTION: str = "analytics_data"
    VISUALIZATION_COLLECTION: str = "visualization_data"
    PROPERTY_ANALYTICS_COLLECTION: str = "property_analytics"
    TREND_ANALYTICS_COLLECTION: str = "trend_analytics"
    AUTH_COLLECTION: str = "auth_data"
    VERIFICATION_COLLECTION: str = "verification_codes"
    
    # Email Configuration (SendGrid)
    SENDGRID_API_KEY: str = os.getenv("SENDGRID_API_KEY", "")
    FROM_EMAIL: str = os.getenv("FROM_EMAIL", "roddymark706@gmail.com")
    FROM_NAME: str = os.getenv("FROM_NAME", "Flex Living")
    
    # Frontend & CORS Settings
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:8080")
    TEST_EMAIL: str = os.getenv("TEST_EMAIL", "lewiemuguna417@gmail.com")
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = os.getenv("RATE_LIMIT_PER_MINUTE", 60)
    RATE_LIMIT_PER_HOUR: int = os.getenv("RATE_LIMIT_PER_HOUR", 1000)
    
    # External Services
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    HOSTAWAY_API_KEY: str = os.getenv("HOSTAWAY_API_KEY", "f94377ebbbb479490bb3ec3646491682dc443dda2e4830facaf5de2e74ccc9152")
    HOSTAWAY_ACCOUNT_ID: int = os.getenv("HOSTAWAY_ACCOUNT_ID", 61148)
    HOSTAWAY_BASE_URL: str = os.getenv("HOSTAWAY_BASE_URL", "https://api.hostaway.com/v1")
    
    # Feature Flags
    ENABLE_EMAIL_NOTIFICATIONS: bool = os.getenv("ENABLE_EMAIL_NOTIFICATIONS", True)
    ENABLE_RATE_LIMITING: bool = os.getenv("ENABLE_RATE_LIMITING", True)
    ENABLE_CORS: bool = os.getenv("ENABLE_CORS", True)
    ENABLE_AI_ANALYSIS: bool = os.getenv("ENABLE_AI_ANALYSIS", True)
    ENABLE_HOSTAWAY_INTEGRATION: bool = os.getenv("ENABLE_HOSTAWAY_INTEGRATION", True)

    class Config:
        env_file = ".env"
        case_sensitive = True
        populate_by_name = True

@lru_cache()
def get_settings() -> Settings:
    return Settings()