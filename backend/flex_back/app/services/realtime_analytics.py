"""
Real-time Analytics Service with MongoDB Change Streams
Automatically updates analytics when data changes in MongoDB
"""

import asyncio
from typing import Dict, Any, Set
from datetime import datetime
from ..core.database import db
from .real_analytics import RealAnalyticsService
import logging

logger = logging.getLogger(__name__)

class RealTimeAnalyticsService:
    def __init__(self):
        self.analytics_service = RealAnalyticsService()
        self.cache = {}
        self.last_updated = None
        self.change_streams = {}
        self.subscribers = set()
        
    async def start_change_streams(self):
        """Start MongoDB change streams to monitor for data changes"""
        try:
            logger.info("🔄 Starting MongoDB change streams for real-time analytics...")
            
            # Monitor reviews collection
            change_stream = db.db.rev_data.watch([
                {"$match": {"operationType": {"$in": ["insert", "update", "replace", "delete"]}}}
            ])
            
            # Start monitoring in background
            asyncio.create_task(self._monitor_change_stream(change_stream, "reviews"))
            
            # Monitor properties collection
            properties_stream = db.db.prop_data.watch([
                {"$match": {"operationType": {"$in": ["insert", "update", "replace", "delete"]}}}
            ])
            
            asyncio.create_task(self._monitor_change_stream(properties_stream, "properties"))
            
            # Monitor guest data collection
            guest_stream = db.db.guest_data.watch([
                {"$match": {"operationType": {"$in": ["insert", "update", "replace", "delete"]}}}
            ])
            
            asyncio.create_task(self._monitor_change_stream(guest_stream, "guests"))
            
            logger.info("✅ Real-time analytics monitoring started successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to start change streams: {e}")
    
    async def _monitor_change_stream(self, change_stream, collection_name: str):
        """Monitor a specific change stream"""
        try:
            async for change in change_stream:
                logger.info(f"📊 {collection_name} collection changed: {change['operationType']}")
                
                # Trigger analytics refresh after data change
                await self._trigger_analytics_refresh()
                
        except Exception as e:
            logger.error(f"❌ Error in {collection_name} change stream: {e}")
    
    async def _trigger_analytics_refresh(self):
        """Trigger analytics refresh for all subscribers"""
        try:
            # Clear cache to force fresh data fetch
            self.cache.clear()
            self.last_updated = datetime.utcnow()
            
            logger.info("🔄 Analytics cache invalidated, triggering refresh...")
            
            # Notify all subscribers of data change
            for subscriber in self.subscribers:
                try:
                    if hasattr(subscriber, 'on_analytics_update'):
                        await subscriber.on_analytics_update()
                except Exception as e:
                    logger.error(f"❌ Error notifying subscriber: {e}")
            
        except Exception as e:
            logger.error(f"❌ Error triggering analytics refresh: {e}")
    
    async def get_fresh_analytics(
        self, 
        property_id: str = None, 
        start_date: str = None, 
        end_date: str = None,
        force_refresh: bool = False
    ) -> Dict[str, Any]:
        """Get fresh analytics data, optionally forcing refresh"""
        
        # Create cache key
        cache_key = f"analytics_{property_id}_{start_date}_{end_date}"
        
        # Check if we need fresh data
        should_refresh = force_refresh or self._should_refresh_cache()
        
        if should_refresh or cache_key not in self.cache:
            logger.info(f"🔄 Fetching fresh analytics data (force_refresh: {force_refresh})")
            
            # Get fresh data from analytics service
            fresh_analytics = await self.analytics_service.get_comprehensive_analytics(
                property_id=property_id,
                start_date=start_date,
                end_date=end_date
            )
            
            # Add real-time metadata
            fresh_analytics["_metadata"] = {
                "last_updated": datetime.utcnow().isoformat(),
                "data_source": "real_time",
                "force_refresh": force_refresh,
                "cached": False
            }
            
            # Cache the result
            self.cache[cache_key] = fresh_analytics
            self.last_updated = datetime.utcnow()
            
            return fresh_analytics
        else:
            # Return cached data
            cached_data = self.cache[cache_key].copy()
            cached_data["_metadata"] = {
                "last_updated": self.last_updated.isoformat(),
                "data_source": "cache",
                "force_refresh": force_refresh,
                "cached": True,
                "cache_age_seconds": (datetime.utcnow() - self.last_updated).total_seconds()
            }
            
            return cached_data
    
    def _should_refresh_cache(self) -> bool:
        """Determine if cache should be refreshed"""
        if self.last_updated is None:
            return True
        
        # Refresh cache if it's older than 30 seconds
        cache_age = (datetime.utcnow() - self.last_updated).total_seconds()
        return cache_age > 30
    
    async def subscribe_to_updates(self, subscriber):
        """Subscribe to real-time analytics updates"""
        self.subscribers.add(subscriber)
        logger.info(f"📡 New analytics subscriber added: {len(self.subscribers)} total")
    
    async def unsubscribe_from_updates(self, subscriber):
        """Unsubscribe from real-time analytics updates"""
        self.subscribers.discard(subscriber)
        logger.info(f"📡 Analytics subscriber removed: {len(self.subscribers)} remaining")
    
    async def get_cache_status(self) -> Dict[str, Any]:
        """Get current cache status"""
        cache_keys = list(self.cache.keys())
        
        return {
            "cache_size": len(self.cache),
            "cache_keys": cache_keys,
            "last_updated": self.last_updated.isoformat() if self.last_updated else None,
            "subscribers_count": len(self.subscribers),
            "cache_age_seconds": (datetime.utcnow() - self.last_updated).total_seconds() if self.last_updated else None
        }
    
    async def clear_cache(self):
        """Manually clear analytics cache"""
        self.cache.clear()
        self.last_updated = None
        logger.info("🗑️ Analytics cache cleared manually")

# Global real-time analytics service instance
realtime_analytics_service = RealTimeAnalyticsService()