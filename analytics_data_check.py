#!/usr/bin/env python3
"""
Simple test to check analytics data availability in MongoDB
"""

import os
import subprocess

def main():
    """Main function to run the analytics data check from backend directory"""
    print("🚀 Flex Living Analytics Data Availability Check")
    print("=" * 60)
    
    # Get the backend directory path
    current_dir = os.path.dirname(__file__)
    backend_path = os.path.join(current_dir, 'backend', 'flex_back')
    
    # Check if backend directory exists
    if not os.path.exists(backend_path):
        print("❌ Backend directory not found. Please ensure the backend is properly set up.")
        return
    
    # Change to backend directory and run the script
    try:
        print("🔧 Running analytics check from backend directory...")
        
        # Create a simple script to run the analytics check
        check_script = """
import asyncio
import sys
import os

# Ensure we can import from the app module
sys.path.insert(0, os.getcwd())

try:
    from app.core.database import db
    from app.core.config import get_settings
    
    settings = get_settings()
    
    async def check_analytics_collections():
        print("🔍 Checking Analytics Collections Data Availability...")
        
        try:
            # Connect to database
            await db.connect_to_database()
            print("✅ Database connection successful")
            
            # Check all collections mentioned in analytics setup
            collections_to_check = [
                'analytics_results',
                'sentiment_analyses',
                'visualization_data',  # Used in transformer.py
                'rev_data',           # Used in transformer.py
                'prop_data',          # Used in transformer.py
                'guest_data',         # Used in transformer.py
                'properties',         # Used in various places
                'reviews',            # Used in various places
                'guests'              # Used in various places
            ]
            
            print("\\n📊 Collection Status:")
            for collection_name in collections_to_check:
                try:
                    count = await db.get_collection(collection_name).count_documents({})
                    print(f"   {collection_name}: {count} documents")
                except Exception as e:
                    print(f"   {collection_name}: ❌ Error - {e}")
            
            # Sample data from key collections
            print("\\n📋 Sample Data Preview:")
            
            # Check analytics_results
            try:
                analytics_results = await db.get_collection('analytics_results').find_one({})
                if analytics_results:
                    print("✅ analytics_results collection has data")
                    print(f"   Sample document keys: {list(analytics_results.keys())}")
                else:
                    print("❌ analytics_results collection is empty")
            except Exception as e:
                print(f"❌ analytics_results collection error: {e}")
            
            # Check sentiment_analyses
            try:
                sentiment_analyses = await db.get_collection('sentiment_analyses').find_one({})
                if sentiment_analyses:
                    print("✅ sentiment_analyses collection has data")
                    print(f"   Sample document keys: {list(sentiment_analyses.keys())}")
                else:
                    print("❌ sentiment_analyses collection is empty")
            except Exception as e:
                print(f"❌ sentiment_analyses collection error: {e}")
                
        except Exception as e:
            print(f"❌ Database check failed: {e}")
    
    if __name__ == "__main__":
        asyncio.run(check_analytics_collections())
        
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Backend dependencies may not be fully installed.")
"""
        
        # Write the check script to backend directory
        check_script_path = os.path.join(backend_path, 'temp_analytics_check.py')
        with open(check_script_path, 'w') as f:
            f.write(check_script)
        
        # Run the script from backend directory
        result = subprocess.run([
            'python3', 'temp_analytics_check.py'
        ], cwd=backend_path, capture_output=True, text=True, 
           env={**os.environ, 'PYTHONPATH': backend_path})
        
        # Clean up
        if os.path.exists(check_script_path):
            os.remove(check_script_path)
        
        if result.returncode == 0:
            print(result.stdout)
        else:
            print(f"❌ Error running analytics check: {result.stderr}")
            if result.stdout:
                print(f"Output: {result.stdout}")
                
    except Exception as e:
        print(f"❌ Error running analytics check: {e}")
    
    print("=" * 60)

if __name__ == "__main__":
    main()