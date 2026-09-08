from typing import Dict, Optional, List
import groq
import json
from datetime import datetime
from ..core.config import get_settings

settings = get_settings()

class AnalyticsService:
    def __init__(self):
        try:
            # Use Groq instead of Client for better compatibility
            self.groq_client = groq.Groq(
                api_key=settings.GROQ_API_KEY
            )
        except TypeError as e:
            if "proxies" in str(e):
                import httpx
                self.groq_client = groq.Groq(
                    api_key=settings.GROQ_API_KEY,
                    http_client=httpx.Client()
                )
            else:
                print(f"Warning: Failed to initialize Groq client: {e}")
                self.groq_client = None
        except Exception as e:
            print(f"Warning: Failed to initialize Groq client: {e}")
            self.groq_client = None
        
    async def test_groq_connection(self) -> Dict:
        """Test Groq AI service connection"""
        if not self.groq_client:
            return {"status": "error", "message": "Groq client not initialized"}
            
        try:
            response = self.groq_client.chat.completions.create(
                messages=[{"role": "user", "content": "Test connection"}],
                model="llama-3.1-70b-versatile",  # Updated to current model
                temperature=0.1,
                max_tokens=10
            )
            if response and response.choices:
                print("✅ Groq AI service test successful")
                return {"status": "success", "message": "Groq AI service is working correctly"}
            else:
                raise Exception("Invalid response format")
        except Exception as e:
            error_msg = f"❌ Groq AI service test failed: {str(e)}"
            print(error_msg)
            return {"status": "error", "message": error_msg}

    async def analyze_review_sentiment(self, review_text: str) -> Dict:
        """Analyze sentiment of review text using Groq AI"""
        if not self.groq_client:
            return {
                "sentiment": "neutral",
                "sentiment_score": 0,
                "topics": [],
                "confidence": 0,
                "error": "Groq client not initialized",
                "processed_at": datetime.utcnow().isoformat()
            }
            
        try:
            prompt = f"""Analyze the sentiment of this property review and extract key topics.
            Return the analysis in JSON format with the following structure:
            {{
                "sentiment": "positive|neutral|negative",
                "sentiment_score": float between -1 and 1,
                "topics": ["topic1", "topic2", ...],
                "confidence": float between 0 and 1,
                "key_phrases": ["phrase1", "phrase2", ...]
            }}
            
            Review: {review_text}
            """
            
            completion = self.groq_client.chat.completions.create(
                model="llama-3.1-70b-versatile",  # Updated to current model
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=500
            )
            
            result = json.loads(completion.choices[0].message.content)
            
            # Validate response format
            required_fields = ["sentiment", "sentiment_score", "topics"]
            if not all(field in result for field in required_fields):
                raise ValueError("Invalid response format from Groq AI")
                
            result["processed_at"] = datetime.utcnow().isoformat()
            return result
            
        except Exception as e:
            print(f"❌ Groq sentiment analysis failed: {e}")
            return {
                "sentiment": "neutral",
                "sentiment_score": 0,
                "topics": [],
                "confidence": 0,
                "error": str(e),
                "processed_at": datetime.utcnow().isoformat()
            }

    async def get_property_analytics(self, property_id: str) -> Dict:
        """Get analytics data for a specific property"""
        try:
            # This would typically aggregate analytics data from the database
            # For now, return a basic structure
            return {
                "property_id": property_id,
                "average_rating": 0.0,
                "total_reviews": 0,
                "sentiment_distribution": {"positive": 0, "neutral": 0, "negative": 0},
                "updated_at": datetime.utcnow().isoformat()
            }
        except Exception as e:
            print(f"❌ Failed to get property analytics: {e}")
            raise

# Create analytics service instance
analytics_service = AnalyticsService()