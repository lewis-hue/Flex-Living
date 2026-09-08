import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from .core.config import get_settings
from .core.database import db
from .services.analytics import analytics_service

settings = get_settings()

async def watch_collection_changes():
    """Watch for changes in MongoDB collections and trigger analytics updates"""
    try:
        # Watch for changes in reviews collection
        review_pipeline = [{'$match': {'operationType': {'$in': ['insert', 'update']}}}]
        reviews_collection = db.get_collection(settings.REVIEW_COLLECTION)
        async with reviews_collection.watch(pipeline=review_pipeline) as stream:
            async for change in stream:
                if change['operationType'] == 'insert':
                    review_data = change['fullDocument']
                    await analytics_service.process_new_review(review_data)
                    
        # Watch for changes in properties collection
        property_pipeline = [{'$match': {'operationType': {'$in': ['insert', 'update']}}}]
        properties_collection = db.get_collection(settings.PROPERTY_COLLECTION)
        async with properties_collection.watch(pipeline=property_pipeline) as stream:
            async for change in stream:
                if change['operationType'] in ['insert', 'update']:
                    property_id = change['documentKey']['_id']
                    await analytics_service.update_property_analytics(property_id)
                    
    except Exception as e:
        print(f"Error in change stream: {str(e)}")
        # Implement proper error handling and logging here
        
async def start_change_streams():
    """Start watching MongoDB change streams"""
    await watch_collection_changes()

# Function to start the change stream listener
def run_change_stream_listener():
    """Run the change stream listener in the background"""
    try:
        loop = asyncio.get_running_loop()
        # If we're already in an event loop, create a task
        loop.create_task(start_change_streams())
    except RuntimeError:
        # No event loop running, create one and run the coroutine
        asyncio.run(start_change_streams())