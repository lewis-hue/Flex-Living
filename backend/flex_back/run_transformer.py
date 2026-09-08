from app.analytics_transformer.fixed_transformer import analytics_transformer
import asyncio
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def main():
    """Run the analytics transformer"""
    try:
        # Run initial analysis
        logger.info("Running initial analysis...")
        await analytics_transformer.run_analysis()
        
        # Start scheduled analysis
        logger.info("Starting scheduled analysis (hourly)...")
        while True:
            await asyncio.sleep(3600)  # Wait for one hour
            await analytics_transformer.run_analysis()
    except Exception as e:
        logger.error(f"Error in analytics transformer: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(main())