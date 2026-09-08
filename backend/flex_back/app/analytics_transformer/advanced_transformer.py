import pandas as pd
import numpy as np
from datetime import datetime
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots

import groq
from typing import Dict, List

from ..core.config import get_settings

settings = get_settings()

class AdvancedAnalyticsTransformer:
    def __init__(self, db):
        try:
            # Use Groq instead of Client for better compatibility
            self.client = groq.Groq(
                api_key=settings.GROQ_API_KEY
            )
            print("✅ Analytics transformer Groq client initialized")
        except TypeError as e:
            if "proxies" in str(e):
                import httpx
                self.client = groq.Groq(
                    api_key=settings.GROQ_API_KEY,
                    http_client=httpx.Client()
                )
                print("✅ Analytics transformer Groq client initialized with fallback")
            else:
                print(f"❌ Analytics transformer Groq client initialization failed: {e}")
                self.client = None
        except Exception as e:
            print(f"❌ Analytics transformer Groq client initialization failed: {e}")
            self.client = None
        
        self.db = db
        self.collections = {
            'reviews': settings.REVIEW_COLLECTION,
            'properties': settings.PROPERTY_COLLECTION,
            'guests': settings.GUEST_COLLECTION,
            'analytics': settings.ANALYTICS_COLLECTION,
            'visualizations': settings.VISUALIZATION_COLLECTION
        }

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

        completion = await self.client.chat.completions.create(
            model="mixtral-8x7b-32768",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=500
        )

        return eval(completion.choices[0].message.content)

    def generate_property_radar_chart(self, property_data: Dict) -> Dict:
        """Generate radar chart for property performance comparison"""
        metrics = [
            'average_rating', 'sentiment_score', 'response_rate',
            'engagement_rate', 'review_count'
        ]
        
        values = [
            property_data.get(metric, 0) for metric in metrics
        ]

        fig = go.Figure()
        fig.add_trace(go.Scatterpolar(
            r=values,
            theta=metrics,
            fill='toself',
            name=property_data['name']
        ))

        return {
            'figure': fig.to_json(),
            'metrics': metrics,
            'values': values
        }

    def create_aspect_sentiment_chart(self, reviews_data: List[Dict]) -> Dict:
        """Create aspect-based sentiment analysis chart"""
        aspects = {}
        for review in reviews_data:
            for topic in review.get('topics', []):
                if topic not in aspects:
                    aspects[topic] = []
                aspects[topic].append(review['sentiment_score'])

        aspect_sentiments = {
            topic: np.mean(scores) for topic, scores in aspects.items()
        }

        fig = px.bar(
            x=list(aspect_sentiments.keys()),
            y=list(aspect_sentiments.values()),
            title='Aspect-Based Sentiment Analysis'
        )

        return {
            'figure': fig.to_json(),
            'aspects': list(aspect_sentiments.keys()),
            'scores': list(aspect_sentiments.values())
        }

    def generate_emotion_distribution(self, reviews_data: List[Dict]) -> Dict:
        """Generate emotion distribution visualization"""
        emotions = {}
        for review in reviews_data:
            for emotion in review.get('emotions', []):
                emotions[emotion['name']] = emotions.get(emotion['name'], 0) + emotion['score']

        total = sum(emotions.values())
        emotion_dist = {k: v/total for k, v in emotions.items()}

        fig = px.pie(
            values=list(emotion_dist.values()),
            names=list(emotion_dist.keys()),
            title='Emotion Distribution'
        )

        return {
            'figure': fig.to_json(),
            'emotions': list(emotion_dist.keys()),
            'values': list(emotion_dist.values())
        }

    def create_topic_heatmap(self, property_reviews: Dict[str, List[Dict]]) -> Dict:
        """Create topic frequency heatmap across properties"""
        topic_counts = {}
        for prop_id, reviews in property_reviews.items():
            topic_counts[prop_id] = {}
            for review in reviews:
                for topic in review.get('topics', []):
                    topic_counts[prop_id][topic] = topic_counts[prop_id].get(topic, 0) + 1

        # Convert to z-scores for better visualization
        df = pd.DataFrame(topic_counts).fillna(0)
        z_scores = (df - df.mean()) / df.std()

        fig = px.imshow(
            z_scores,
            labels=dict(x="Properties", y="Topics", color="Z-Score"),
            title="Topic Frequency Heatmap"
        )

        return {
            'figure': fig.to_json(),
            'properties': list(topic_counts.keys()),
            'topics': list(set(t for counts in topic_counts.values() for t in counts.keys())),
            'z_scores': z_scores.to_dict()
        }

    def generate_performance_trends(self, reviews_data: List[Dict]) -> Dict:
        """Generate performance trends visualization"""
        df = pd.DataFrame(reviews_data)
        df['date'] = pd.to_datetime(df['created_at'])
        
        monthly_metrics = df.set_index('date').resample('M').agg({
            'rating': 'mean',
            'sentiment_score': 'mean'
        }).reset_index()

        fig = make_subplots(specs=[[{"secondary_y": True}]])

        fig.add_trace(
            go.Scatter(x=monthly_metrics['date'], y=monthly_metrics['rating'],
                      name="Average Rating"),
            secondary_y=False
        )

        fig.add_trace(
            go.Scatter(x=monthly_metrics['date'], y=monthly_metrics['sentiment_score'],
                      name="Sentiment Score"),
            secondary_y=True
        )

        return {
            'figure': fig.to_json(),
            'dates': monthly_metrics['date'].dt.strftime('%Y-%m').tolist(),
            'ratings': monthly_metrics['rating'].tolist(),
            'sentiment_scores': monthly_metrics['sentiment_score'].tolist()
        }

    def generate_ai_insights(self, property_data: Dict, reviews_data: List[Dict]) -> Dict:
        """Generate AI-powered insights and recommendations"""
        context = {
            'property_name': property_data['name'],
            'avg_rating': np.mean([r['rating'] for r in reviews_data]),
            'recent_sentiment': np.mean([r['sentiment_score'] for r in reviews_data[-10:]]),
            'common_topics': self._get_common_topics(reviews_data)
        }

        prompt = f"""Based on this property data:
        Property: {context['property_name']}
        Average Rating: {context['avg_rating']:.2f}
        Recent Sentiment: {context['sentiment_score']:.2f}
        Common Topics: {', '.join(context['common_topics'])}

        Generate:
        1. Key insights about performance
        2. Specific recommendations for improvement
        3. Risk assessment
        4. Competitive positioning
        5. Predicted trends

        Format as JSON with these keys:
        insights, recommendations, risks, positioning, trends
        """

        completion = self.client.chat.completions.create(
            model="mixtral-8x7b-32768",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=1000
        )

        return eval(completion.choices[0].message.content)

    def _get_common_topics(self, reviews_data: List[Dict], top_n: int = 5) -> List[str]:
        """Extract most common topics from reviews"""
        topic_counts = {}
        for review in reviews_data:
            for topic in review.get('topics', []):
                topic_counts[topic] = topic_counts.get(topic, 0) + 1
        return sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)[:top_n]

    async def process_new_review(self, review_data: Dict):
        """Process a new review with enhanced analytics"""
        # Analyze sentiment and topics
        analysis = await self.analyze_review_sentiment(review_data['review_text'])
        
        # Update review with analysis
        review_analytics = {
            'review_id': review_data['_id'],
            'property_id': review_data['property_id'],
            'sentiment_score': analysis['sentiment_score'],
            'sentiment_label': analysis['sentiment_label'],
            'emotions': analysis['emotions'],
            'topics': analysis['topics'],
            'confidence_score': analysis['confidence_score']
        }
        
        # Store analytics
        await self.db[self.collections['analytics']].update_one(
            {'review_id': review_data['_id']},
            {'$set': review_analytics},
            upsert=True
        )
        
        # Update property analytics
        await self.update_property_analytics(review_data['property_id'])

    async def update_property_analytics(self, property_id: str):
        """Update comprehensive property analytics"""
        # Fetch all data
        property_data = await self.db[self.collections['properties']].find_one({'_id': property_id})
        reviews = await self.db[self.collections['reviews']].find({'property_id': property_id}).to_list(None)
        
        # Generate all visualizations
        visualizations = {
            'radar_chart': self.generate_property_radar_chart(property_data),
            'aspect_sentiment': self.create_aspect_sentiment_chart(reviews),
            'emotion_dist': self.generate_emotion_distribution(reviews),
            'performance_trends': self.generate_performance_trends(reviews)
        }
        
        # Generate AI insights
        insights = self.generate_ai_insights(property_data, reviews)
        
        # Store everything
        analytics_doc = {
            'property_id': property_id,
            'visualizations': visualizations,
            'insights': insights,
            'updated_at': datetime.utcnow()
        }
        
        await self.db[self.collections['analytics']].update_one(
            {'property_id': property_id},
            {'$set': analytics_doc},
            upsert=True
        )
