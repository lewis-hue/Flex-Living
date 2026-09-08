import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import plotly.express as px
import plotly.graph_objects as go
import json
from pymongo import MongoClient
from bson import ObjectId
import asyncio
import schedule
import time
from typing import Dict, List
import logging
from ..core.config import get_settings

settings = get_settings()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AnalyticsTransformer:
    def __init__(self):
        self.client = MongoClient(settings.MONGODB_URL)
        self.db = self.client[settings.MONGODB_DATABASE]
        
    def _get_collection_data(self, collection_name: str) -> List[Dict]:
        """Retrieve data from MongoDB collection"""
        return list(self.db[collection_name].find())
        
    def _save_visualization(self, viz_id: str, viz_type: str, data: Dict, property_id: str = None):
        """Save visualization to MongoDB"""
        viz_doc = {
            "viz_id": viz_id,
            "viz_type": viz_type,
            "data": data,
            "property_id": property_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        self.db.visualization_data.update_one(
            {"viz_id": viz_id},
            {"$set": viz_doc},
            upsert=True
        )
        
    def analyze_property_ratings(self):
        """Analyze property ratings and create visualizations"""
        properties = pd.DataFrame(self._get_collection_data("prop_data"))
        reviews = pd.DataFrame(self._get_collection_data("rev_data"))
        
        if properties.empty or reviews.empty:
            logger.warning("No data found in properties or reviews collection")
            return
            
        # Overall rating distribution
        fig = px.histogram(reviews, x="rating",
                          nbins=5,
                          title="Rating Distribution Across All Properties")
        
        self._save_visualization(
            viz_id="overall_rating_dist",
            viz_type="histogram",
            data={
                "figure": fig.to_json(),
                "layout": fig.layout.to_json(),
                "data": fig.data[0].to_json()
            }
        )
        
        # Property-specific analytics
        for property_id in properties["property_id"].unique():
            prop_reviews = reviews[reviews["property_id"] == property_id]
            
            # Rating trend over time
            prop_reviews["created_at"] = pd.to_datetime(prop_reviews["created_at"])
            monthly_ratings = prop_reviews.set_index("created_at")["rating"].resample("M").mean()
            
            fig = go.Figure()
            fig.add_trace(go.Scatter(
                x=monthly_ratings.index,
                y=monthly_ratings.values,
                mode="lines+markers",
                name="Average Rating"
            ))
            
            self._save_visualization(
                viz_id=f"{property_id}_rating_trend",
                viz_type="line_chart",
                property_id=property_id,
                data={
                    "figure": fig.to_json(),
                    "dates": monthly_ratings.index.strftime("%Y-%m").tolist(),
                    "values": monthly_ratings.values.tolist()
                }
            )
            
    def analyze_sentiments(self):
        """Analyze review sentiments and create visualizations"""
        reviews = pd.DataFrame(self._get_collection_data("rev_data"))
        
        if reviews.empty:
            logger.warning("No data found in reviews collection")
            return
            
        # Overall sentiment distribution
        sentiment_counts = reviews["sentiment"].value_counts()
        fig = px.pie(values=sentiment_counts.values,
                    names=sentiment_counts.index,
                    title="Overall Sentiment Distribution")
                    
        self._save_visualization(
            viz_id="overall_sentiment_dist",
            viz_type="pie_chart",
            data={
                "figure": fig.to_json(),
                "labels": sentiment_counts.index.tolist(),
                "values": sentiment_counts.values.tolist()
            }
        )
        
        # Property-specific sentiment analysis
        for property_id in reviews["property_id"].unique():
            prop_reviews = reviews[reviews["property_id"] == property_id]
            sentiment_counts = prop_reviews["sentiment"].value_counts()
            
            fig = px.pie(values=sentiment_counts.values,
                        names=sentiment_counts.index,
                        title=f"Sentiment Distribution for Property {property_id}")
                        
            self._save_visualization(
                viz_id=f"{property_id}_sentiment_dist",
                viz_type="pie_chart",
                property_id=property_id,
                data={
                    "figure": fig.to_json(),
                    "labels": sentiment_counts.index.tolist(),
                    "values": sentiment_counts.values.tolist()
                }
            )
            
    def analyze_guest_demographics(self):
        """Analyze guest demographics and create visualizations"""
        guests = pd.DataFrame(self._get_collection_data("guest_data"))
        reviews = pd.DataFrame(self._get_collection_data("rev_data"))
        
        if guests.empty or reviews.empty:
            logger.warning("No data found in guests or reviews collection")
            return
            
        # Guest country distribution
        country_counts = guests["country"].value_counts()
        fig = px.bar(x=country_counts.index,
                    y=country_counts.values,
                    title="Guest Distribution by Country")
                    
        self._save_visualization(
            viz_id="guest_country_dist",
            viz_type="bar_chart",
            data={
                "figure": fig.to_json(),
                "labels": country_counts.index.tolist(),
                "values": country_counts.values.tolist()
            }
        )
        
        # Guest engagement analysis
        guest_engagement = reviews.groupby("guest_id").size().reset_index(name="review_count")
        guest_engagement = guest_engagement.merge(guests[["guest_id", "country"]], on="guest_id")
        
        fig = px.box(guest_engagement,
                    x="country",
                    y="review_count",
                    title="Review Count Distribution by Country")
                    
        self._save_visualization(
            viz_id="guest_engagement",
            viz_type="box_plot",
            data={
                "figure": fig.to_json(),
                "countries": guest_engagement["country"].unique().tolist(),
                "review_counts": guest_engagement["review_count"].tolist()
            }
        )
        
    def run_all_analyses(self):
        """Run all analytics transformations"""
        logger.info("Starting analytics transformation")
        try:
            self.analyze_property_ratings()
            self.analyze_sentiments()
            self.analyze_guest_demographics()
            logger.info("Analytics transformation completed successfully")
        except Exception as e:
            logger.error(f"Error during analytics transformation: {str(e)}")
            
    def schedule_analyses(self):
        """Schedule periodic analytics updates"""
        schedule.every(1).hour.do(self.run_all_analyses)
        
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute for scheduled tasks