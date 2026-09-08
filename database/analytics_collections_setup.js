/**
 * MongoDB Analytics Collections Setup Script
 * Sets up analytics_results and ai_insights collections with proper indexes and validation
 * Run with: mongosh < analytics_collections_setup.js
 */

print("🚀 Setting up Flex Living Analytics Collections...");

// Switch to flex_living database
db = db.getSiblingDB('flex_living');

print("📊 Creating analytics_results collection...");

// Create analytics_results collection with validation
db.createCollection("analytics_results", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["id", "timestamp", "sentiment_trends", "topic_analysis", "property_kpis", "metadata"],
            properties: {
                id: {
                    bsonType: "string",
                    description: "Unique analytics run identifier"
                },
                timestamp: {
                    bsonType: "date",
                    description: "When the analytics were generated"
                },
                sentiment_trends: {
                    bsonType: "object",
                    description: "Sentiment analysis trends by property"
                },
                topic_analysis: {
                    bsonType: "object",
                    description: "Topic frequency and analysis results"
                },
                property_kpis: {
                    bsonType: "object",
                    description: "Key performance indicators by property"
                },
                visualizations: {
                    bsonType: "object",
                    description: "Chart and visualization data"
                },
                metadata: {
                    bsonType: "object",
                    required: ["total_properties", "total_reviews_analyzed"],
                    properties: {
                        total_properties: {
                            bsonType: "int",
                            minimum: 0,
                            description: "Number of properties analyzed"
                        },
                        total_reviews_analyzed: {
                            bsonType: "int",
                            minimum: 0,
                            description: "Total reviews processed"
                        },
                        topics_analyzed: {
                            bsonType: "int",
                            minimum: 0,
                            description: "Number of unique topics identified"
                        },
                        processing_time_seconds: {
                            bsonType: ["int", "null"],
                            minimum: 0,
                            description: "Time taken to process analytics"
                        }
                    }
                }
            }
        }
    },
    validationLevel: "moderate",
    validationAction: "warn"
});

print("🤖 Creating ai_insights collection...");

// Create ai_insights collection with validation
db.createCollection("ai_insights", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["analytics_id", "timestamp", "insights", "metadata"],
            properties: {
                analytics_id: {
                    bsonType: "string",
                    description: "Reference to analytics_results document"
                },
                timestamp: {
                    bsonType: "date",
                    description: "When the insights were generated"
                },
                insights: {
                    bsonType: "object",
                    description: "AI-generated insights and recommendations"
                },
                metadata: {
                    bsonType: "object",
                    required: ["ai_service_used", "properties_analyzed"],
                    properties: {
                        ai_service_used: {
                            enum: ["groq", "vertex_ai", "none"],
                            description: "AI service used for insights"
                        },
                        properties_analyzed: {
                            bsonType: "int",
                            minimum: 0,
                            description: "Number of properties with AI insights"
                        },
                        market_insights_generated: {
                            bsonType: "bool",
                            description: "Whether market insights were generated"
                        },
                        trend_analysis_generated: {
                            bsonType: "bool",
                            description: "Whether trend analysis was generated"
                        }
                    }
                }
            }
        }
    },
    validationLevel: "moderate",
    validationAction: "warn"
});

print("🔍 Creating performance indexes...");

// Analytics Results Indexes
print("📈 Creating analytics_results indexes...");

// Primary lookup index
db.analytics_results.createIndex(
    { "id": 1 },
    {
        name: "analytics_id_unique",
        unique: true,
        background: true
    }
);

// Timestamp-based queries (most common)
db.analytics_results.createIndex(
    { "timestamp": -1 },
    {
        name: "analytics_timestamp_desc",
        background: true
    }
);

// Metadata queries
db.analytics_results.createIndex(
    { "metadata.total_properties": 1 },
    {
        name: "analytics_total_properties",
        background: true
    }
);

db.analytics_results.createIndex(
    { "metadata.total_reviews_analyzed": 1 },
    {
        name: "analytics_total_reviews",
        background: true
    }
);

// Compound index for time-range queries with property count
db.analytics_results.createIndex(
    { "timestamp": -1, "metadata.total_properties": 1 },
    {
        name: "analytics_time_properties",
        background: true
    }
);

// AI Insights Indexes
print("🧠 Creating ai_insights indexes...");

// Foreign key relationship
db.ai_insights.createIndex(
    { "analytics_id": 1 },
    {
        name: "ai_analytics_id",
        background: true,
        unique: true
    }
);

// Timestamp queries
db.ai_insights.createIndex(
    { "timestamp": -1 },
    {
        name: "ai_timestamp_desc",
        background: true
    }
);

// Metadata queries
db.ai_insights.createIndex(
    { "metadata.ai_service_used": 1 },
    {
        name: "ai_service_used",
        background: true
    }
);

db.ai_insights.createIndex(
    { "metadata.properties_analyzed": 1 },
    {
        name: "ai_properties_analyzed",
        background: true
    }
);

// Compound index for analytics joins
db.ai_insights.createIndex(
    { "analytics_id": 1, "timestamp": -1 },
    {
        name: "ai_analytics_time",
        background: true
    }
);

print("📊 Setting up collection configurations...");

// Configure collection options for analytics_results
db.runCommand({
    collMod: "analytics_results",
    usePowerOf2Sizes: true
});

// Configure collection options for ai_insights
db.runCommand({
    collMod: "ai_insights",
    usePowerOf2Sizes: true
});

print("🧹 Creating TTL indexes for data retention...");

// TTL index for analytics_results (keep 1 year of data)
db.analytics_results.createIndex(
    { "timestamp": 1 },
    {
        name: "analytics_ttl",
        expireAfterSeconds: 31536000, // 1 year in seconds
        background: true
    }
);

// TTL index for ai_insights (keep 1 year of data)
db.ai_insights.createIndex(
    { "timestamp": 1 },
    {
        name: "ai_insights_ttl",
        expireAfterSeconds: 31536000, // 1 year in seconds
        background: true
    }
);

print("✅ Creating capped collections for real-time analytics (optional)...");

// Optional: Create capped collections for high-frequency analytics data
// Uncomment if you need capped collections for real-time data streams

/*
db.createCollection("analytics_realtime", {
    capped: true,
    size: 104857600, // 100MB
    max: 10000 // Maximum 10,000 documents
});

db.analytics_realtime.createIndex(
    { "timestamp": -1 },
    { name: "realtime_timestamp", background: true }
);
*/

print("📈 Creating aggregation pipeline optimization indexes...");

// Indexes to support common aggregation queries
db.analytics_results.createIndex(
    {
        "sentiment_trends": 1,
        "timestamp": -1
    },
    {
        name: "analytics_sentiment_agg",
        background: true,
        sparse: true
    }
);

db.analytics_results.createIndex(
    {
        "property_kpis": 1,
        "timestamp": -1
    },
    {
        name: "analytics_kpis_agg",
        background: true,
        sparse: true
    }
);

print("🔐 Setting up collection security and monitoring...");

// Create a view for analytics summary (optional)
db.createView("analytics_summary", "analytics_results", [
    {
        $project: {
            _id: 0,
            id: 1,
            timestamp: 1,
            total_properties: "$metadata.total_properties",
            total_reviews: "$metadata.total_reviews_analyzed",
            topics_analyzed: "$metadata.topics_analyzed",
            processing_time: "$metadata.processing_time_seconds"
        }
    }
]);

print("✅ Analytics collections setup completed!");
print("\n📋 Summary:");
print("• Created analytics_results collection with validation");
print("• Created ai_insights collection with validation");
print("• Set up 12 performance indexes");
print("• Configured TTL indexes for data retention (1 year)");
print("• Created analytics_summary view");
print("• Collections are ready for the analytics pipeline");

// Verify setup
print("\n🔍 Verification:");
const collections = db.getCollectionNames();
if (collections.includes("analytics_results")) {
    print("✅ analytics_results collection created");
    const analyticsIndexes = db.analytics_results.getIndexes();
    print(`   - ${analyticsIndexes.length} indexes created`);
} else {
    print("❌ analytics_results collection not found");
}

if (collections.includes("ai_insights")) {
    print("✅ ai_insights collection created");
    const aiIndexes = db.ai_insights.getIndexes();
    print(`   - ${aiIndexes.length} indexes created`);
} else {
    print("❌ ai_insights collection not found");
}

print("\n🎉 Setup complete! Collections are ready for analytics data ingestion.");