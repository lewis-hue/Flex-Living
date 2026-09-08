from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime
from enum import Enum

class SentimentType(str, Enum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"

class PropertyAnalytics(BaseModel):
    property_id: str = Field(..., description="Unique identifier of the property")
    average_rating: float = Field(..., description="Average rating of the property")
    total_reviews: int = Field(..., description="Total number of reviews")
    sentiment_distribution: Dict[SentimentType, float] = Field(..., description="Distribution of sentiments")
    common_topics: List[Dict[str, float]] = Field(..., description="Common topics mentioned in reviews")
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ReviewAnalytics(BaseModel):
    review_id: str = Field(..., description="Unique identifier of the review")
    property_id: str = Field(..., description="Property ID the review belongs to")
    sentiment: SentimentType = Field(..., description="Analyzed sentiment of the review")
    topics: List[str] = Field(..., description="Topics extracted from review text")
    sentiment_score: float = Field(..., description="Numerical sentiment score")
    created_at: datetime = Field(default_factory=datetime.utcnow)

class VisualizationData(BaseModel):
    viz_id: str = Field(..., description="Unique identifier for the visualization")
    property_id: Optional[str] = Field(None, description="Property ID if visualization is property-specific")
    viz_type: str = Field(..., description="Type of visualization")
    data: Dict = Field(..., description="Visualization data")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class TrendAnalytics(BaseModel):
    trend_id: str = Field(..., description="Unique identifier for the trend")
    metric: str = Field(..., description="Metric being tracked")
    values: List[Dict[str, float]] = Field(..., description="Time series data points")
    property_id: Optional[str] = Field(None, description="Property ID if trend is property-specific")
    start_date: datetime = Field(..., description="Start date of trend data")
    end_date: datetime = Field(..., description="End date of trend data")
    created_at: datetime = Field(default_factory=datetime.utcnow)