"""
Database migration utilities for Flex Living.
Handles data transformation and migration to standard format.
"""

import asyncio
from typing import Dict, Any
from datetime import datetime
import sys
import os

# Ensure we can import from the app package
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from app.core.database import db
from app.core.config import get_settings
from app.services.data_transformer import data_transformer

settings = get_settings()


class DataMigration:
    """Handles data migration from current format to standard format"""
    
    def __init__(self):
        self.migration_stats = {
            "reviews_processed": 0,
            "reviews_migrated": 0,
            "reviews_failed": 0,
            "properties_processed": 0,
            "properties_migrated": 0,
            "properties_failed": 0,
            "guests_created": 0,
            "guests_found": 0,
            "errors": []
        }
    
    async def migrate_reviews_to_standard(self) -> Dict[str, Any]:
        """Migrate all reviews to standard format"""
        print("🔄 Starting review migration to standard format...")
        
        try:
            # Get all reviews from current collection
            reviews_collection = db.get_collection(settings.REVIEW_COLLECTION)
            all_reviews = await reviews_collection.find({}).to_list(length=None)
            
            self.migration_stats["reviews_processed"] = len(all_reviews)
            
            for review in all_reviews:
                try:
                    # Transform to standard format
                    standard_review = data_transformer.transform_review_to_standard(review)
                    
                    # Create or find guest
                    if standard_review.get("guest_id") or standard_review.get("reviewer_email"):
                        # Check if guest already exists in standard format
                        if standard_review.get("guest_id"):
                            existing_guest = await db.get_collection(settings.GUEST_COLLECTION).find_one(
                                {"_id": standard_review["guest_id"]}
                            )
                        else:
                            existing_guest = None
                        
                        # If no guest found, create one
                        if not existing_guest and standard_review.get("reviewer_email"):
                            guest_data = {
                                "name": standard_review.get("reviewer_name", "Unknown"),
                                "email": standard_review["reviewer_email"],
                                "country": "Unknown",
                                "joined_date": standard_review.get("created_at", datetime.utcnow())
                            }
                            result = await db.get_collection(settings.GUEST_COLLECTION).insert_one(guest_data)
                            standard_review["guest_id"] = str(result.inserted_id)
                            self.migration_stats["guests_created"] += 1
                        elif existing_guest:
                            self.migration_stats["guests_found"] += 1
                    
                    # Remove reviewer info from review (will be linked via guest_id)
                    if "reviewer_name" in standard_review:
                        del standard_review["reviewer_name"]
                    if "reviewer_email" in standard_review:
                        del standard_review["reviewer_email"]
                    
                    # Update the review in the collection
                    review_id = review.get("_id")
                    await reviews_collection.update_one(
                        {"_id": review_id},
                        {"$set": standard_review}
                    )
                    
                    self.migration_stats["reviews_migrated"] += 1
                    
                except Exception as e:
                    error_msg = f"Failed to migrate review {review.get('_id')}: {str(e)}"
                    self.migration_stats["errors"].append(error_msg)
                    self.migration_stats["reviews_failed"] += 1
                    print(f"❌ {error_msg}")
            
            print("✅ Review migration completed:")
            print(f"   - Reviews processed: {self.migration_stats['reviews_processed']}")
            print(f"   - Reviews migrated: {self.migration_stats['reviews_migrated']}")
            print(f"   - Reviews failed: {self.migration_stats['reviews_failed']}")
            print(f"   - Guests created: {self.migration_stats['guests_created']}")
            print(f"   - Guests found: {self.migration_stats['guests_found']}")
            
            return self.migration_stats
            
        except Exception as e:
            error_msg = f"Migration failed: {str(e)}"
            self.migration_stats["errors"].append(error_msg)
            print(f"❌ {error_msg}")
            return self.migration_stats
    
    async def migrate_properties_to_standard(self) -> Dict[str, Any]:
        """Migrate all properties to standard format"""
        print("🏠 Starting property migration to standard format...")
        
        try:
            # Get all properties from current collection
            properties_collection = db.get_collection(settings.PROPERTY_COLLECTION)
            all_properties = await properties_collection.find({}).to_list(length=None)
            
            self.migration_stats["properties_processed"] = len(all_properties)
            
            for prop in all_properties:
                try:
                    # Transform to standard format
                    standard_prop = data_transformer.transform_property_to_standard(prop)
                    
                    # Update the property in the collection
                    prop_id = prop.get("_id")
                    await properties_collection.update_one(
                        {"_id": prop_id},
                        {"$set": standard_prop}
                    )
                    
                    self.migration_stats["properties_migrated"] += 1
                    
                except Exception as e:
                    error_msg = f"Failed to migrate property {prop.get('_id')}: {str(e)}"
                    self.migration_stats["errors"].append(error_msg)
                    self.migration_stats["properties_failed"] += 1
                    print(f"❌ {error_msg}")
            
            print("✅ Property migration completed:")
            print(f"   - Properties processed: {self.migration_stats['properties_processed']}")
            print(f"   - Properties migrated: {self.migration_stats['properties_migrated']}")
            print(f"   - Properties failed: {self.migration_stats['properties_failed']}")
            
            return self.migration_stats
            
        except Exception as e:
            error_msg = f"Property migration failed: {str(e)}"
            self.migration_stats["errors"].append(error_msg)
            print(f"❌ {error_msg}")
            return self.migration_stats
    
    async def create_indexes(self) -> None:
        """Create indexes for better performance"""
        print("📊 Creating database indexes...")
        
        try:
            # Indexes for reviews collection
            reviews_collection = db.get_collection(settings.REVIEW_COLLECTION)
            await reviews_collection.create_index([("property_id", 1)])
            await reviews_collection.create_index([("guest_id", 1)])
            await reviews_collection.create_index([("created_at", -1)])
            await reviews_collection.create_index([("rating", 1)])
            await reviews_collection.create_index([("sentiment", 1)])
            
            # Indexes for guests collection
            guests_collection = db.get_collection(settings.GUEST_COLLECTION)
            await guests_collection.create_index([("email", 1)], unique=True)
            await guests_collection.create_index([("name", "text")])
            await guests_collection.create_index([("created_at", -1)])
            
            # Indexes for properties collection
            properties_collection = db.get_collection(settings.PROPERTY_COLLECTION)
            await properties_collection.create_index([("name", "text")])
            await properties_collection.create_index([("property_type", 1)])
            await properties_collection.create_index([("price", 1)])
            await properties_collection.create_index([("created_at", -1)])
            
            print("✅ Database indexes created successfully")
            
        except Exception as e:
            print(f"❌ Failed to create indexes: {str(e)}")
    
    async def run_full_migration(self) -> Dict[str, Any]:
        """Run complete migration from current to standard format"""
        print("🚀 Starting full data migration...")
        print("=" * 50)
        
        # Reset stats
        self.migration_stats = {
            "reviews_processed": 0,
            "reviews_migrated": 0,
            "reviews_failed": 0,
            "properties_processed": 0,
            "properties_migrated": 0,
            "properties_failed": 0,
            "guests_created": 0,
            "guests_found": 0,
            "errors": []
        }
        
        # Run migrations
        await self.migrate_reviews_to_standard()
        await self.migrate_properties_to_standard()
        await self.create_indexes()
        
        print("=" * 50)
        print("🎉 Full migration completed!")
        
        return self.migration_stats


async def main():
    """Main migration function"""
    await db.connect_to_database()
    
    migration = DataMigration()
    stats = await migration.run_full_migration()
    
    print("\n📋 Migration Summary:")
    print(f"Total errors: {len(stats['errors'])}")
    if stats['errors']:
        print("Error details:")
        for error in stats['errors']:
            print(f"  - {error}")
    
    await db.close_database_connection()


if __name__ == "__main__":
    asyncio.run(main())