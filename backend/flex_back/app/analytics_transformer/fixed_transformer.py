import pandas as pd
import numpy as np
from datetime import datetime
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import groq
from typing import Dict, List
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from ..core.config import get_settings

settings = get_settings()

# Set up logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

class AnalyticsTransformer:
    def __init__(self):
        # Initialize Groq client with error handling for proxy issues
        try:
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
                raise e
        # Initialize MongoDB connection
        self.mongo_client = AsyncIOMotorClient(settings.MONGODB_URL)
        self.db = self.mongo_client[settings.MONGODB_DATABASE]
        
        self.collections = {
            'reviews': settings.REVIEW_COLLECTION,
            'properties': settings.PROPERTY_COLLECTION,
            'guests': settings.GUEST_COLLECTION,
            'analytics': settings.ANALYTICS_COLLECTION,
            'visualizations': settings.VISUALIZATION_COLLECTION
        }

    async def process_reviews_data(self, reviews_data: List[Dict]) -> pd.DataFrame:
        """Process reviews data into a clean DataFrame"""
        df = pd.DataFrame(reviews_data).copy()  # Create a copy to avoid SettingWithCopyWarning
        if not df.empty and 'created_at' in df.columns:
            df.loc[:, 'created_at'] = pd.to_datetime(df['created_at'])
        return df

    async def analyze_review_sentiment(self, review_text: str) -> Dict:
        """Enhanced sentiment analysis using Groq AI"""
        prompt = f"""Analyze this property review for sentiment, emotions, and topics.
        Return a detailed JSON with:
        - sentiment_score (-1 to 1)
        - sentiment_label (positive/negative/neutral)
        - emotions (list of emotions with scores)
        - topics (list of discussed topics)
        - confidence_score (0 to 1)

        Review: {review_text}
        """

        completion = await self.groq_client.chat.completions.create(
            model="mixtral-8x7b-32768",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=500
        )

        return eval(completion.choices[0].message.content)

    async def generate_performance_trends(self, reviews_data: List[Dict]) -> Dict:
        """Generate performance trends visualization"""
        df = await self.process_reviews_data(reviews_data)
        
        # Create monthly aggregations using proper indexing
        monthly_metrics = df.set_index('created_at').copy()
        monthly_metrics.loc[:, 'rating'] = pd.to_numeric(monthly_metrics['rating'], errors='coerce')
        if 'sentiment_score' in monthly_metrics.columns:
            monthly_metrics.loc[:, 'sentiment_score'] = pd.to_numeric(monthly_metrics['sentiment_score'], errors='coerce')
        else:
            monthly_metrics.loc[:, 'sentiment_score'] = 0.0  # Default value if column doesn't exist

        monthly_agg = monthly_metrics.resample('M').agg({
            'rating': 'mean',
            'sentiment_score': 'mean'
        }).reset_index()

        fig = make_subplots(specs=[[{"secondary_y": True}]])

        fig.add_trace(
            go.Scatter(x=monthly_agg['created_at'], y=monthly_agg['rating'],
                      name="Average Rating"),
            secondary_y=False
        )

        fig.add_trace(
            go.Scatter(x=monthly_agg['created_at'], y=monthly_agg['sentiment_score'],
                      name="Sentiment Score"),
            secondary_y=True
        )

        return {
            'figure': fig.to_json(),
            'dates': monthly_agg['created_at'].dt.strftime('%Y-%m').tolist(),
            'ratings': monthly_agg['rating'].tolist(),
            'sentiment_scores': monthly_agg['sentiment_score'].tolist()
        }

    async def run_analysis(self):
        """Run full analytics pipeline"""
        try:
            logger.info("Starting analytics transformation")
            # Get all reviews
            reviews = await self.db[self.collections['reviews']].find().to_list(None)
            
            # Process reviews and generate visualizations
            trends = await self.generate_performance_trends(reviews)
            await self.db[self.collections['visualizations']].update_one(
                {'viz_id': 'performance_trends'},
                {'$set': {'data': trends}},
                upsert=True
            )
            
            logger.info("Analytics transformation completed successfully")
        except Exception as e:
            logger.error(f"Error in analytics transformation: {str(e)}")
            raise

# Create analytics transformer instance
analytics_transformer = AnalyticsTransformer()