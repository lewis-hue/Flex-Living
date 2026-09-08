# Analytics Collections Setup Guide

This guide explains how to set up the `analytics_results` and `ai_insights` collections in MongoDB for the Flex Living analytics pipeline.

## Overview

The analytics system consists of two main collections:

1. **`analytics_results`** - Stores computed analytics data (sentiment trends, topic analysis, property KPIs, visualizations)
2. **`ai_insights`** - Stores AI-generated insights and recommendations linked to analytics results

## Setup Instructions

### 1. Run the MongoDB Setup Script

Execute the setup script using MongoDB shell:

```bash
# Using mongosh (MongoDB 5.0+)
mongosh --file analytics_collections_setup.js

# Or using mongo (legacy)
mongo < analytics_collections_setup.js
```

### 2. Verify Setup

Run the test script to verify the setup:

```bash
cd Flex Living/database
python3 test_analytics_setup.py
```

Expected output should show all tests passing:
```
📊 Test Results Summary:
   Collections Exist: ✅ PASS
   Indexes Complete: ✅ PASS
   Data Insertion: ✅ PASS
   Validation Rules: ✅ PASS

🎉 All tests passed!
```

## Collection Schemas

### analytics_results Collection

**Required Fields:**
- `id` (string) - Unique analytics run identifier
- `timestamp` (date) - When analytics were generated
- `sentiment_trends` (object) - Sentiment analysis by property over time
- `topic_analysis` (object) - Topic frequency and emotion analysis
- `property_kpis` (object) - Key performance indicators by property
- `metadata` (object) - Processing metadata

**Optional Fields:**
- `visualizations` (object) - Chart data for frontend display

### ai_insights Collection

**Required Fields:**
- `analytics_id` (string) - Reference to analytics_results document
- `timestamp` (date) - When insights were generated
- `insights` (object) - AI-generated insights and recommendations
- `metadata` (object) - AI service and processing metadata

## Indexes Created

### analytics_results Indexes:
- `analytics_id_unique` - Unique index on `id`
- `analytics_timestamp_desc` - Descending index on `timestamp`
- `analytics_total_properties` - Index on `metadata.total_properties`
- `analytics_total_reviews` - Index on `metadata.total_reviews`
- `analytics_time_properties` - Compound index on `timestamp` and `metadata.total_properties`
- `analytics_sentiment_agg` - Sparse index for aggregation queries
- `analytics_kpis_agg` - Sparse index for KPI aggregation
- `analytics_ttl` - TTL index for automatic cleanup (1 year retention)

### ai_insights Indexes:
- `ai_analytics_id` - Unique index on `analytics_id`
- `ai_timestamp_desc` - Descending index on `timestamp`
- `ai_service_used` - Index on `metadata.ai_service_used`
- `ai_properties_analyzed` - Index on `metadata.properties_analyzed`
- `ai_analytics_time` - Compound index on `analytics_id` and `timestamp`
- `ai_insights_ttl` - TTL index for automatic cleanup (1 year retention)

## Validation Rules

Both collections have JSON Schema validation enabled with `moderate` validation level and `warn` action. This ensures data integrity while allowing the system to continue operating.

## Data Retention

Both collections have TTL (Time-To-Live) indexes configured for 1 year retention. Documents older than 1 year will be automatically deleted by MongoDB.

## Usage in Analytics Pipeline

The analytics worker (`analytics_worker.py`) automatically stores results in these collections:

```python
# Store analytics results
await self.mongodb.database["analytics_results"].insert_one(analytics_result)

# Store AI insights
await self.mongodb.database["ai_insights"].insert_one(ai_insights_doc)
```

## Troubleshooting

### Collections Not Created
- Ensure MongoDB is running and accessible
- Check MongoDB connection string in environment variables
- Verify database permissions

### Indexes Not Created
- Check MongoDB user permissions for index creation
- Review MongoDB logs for index creation errors
- Some indexes may take time to build on large collections

### Validation Errors
- Review the JSON Schema in the setup script
- Ensure data matches the required schema structure
- Check validation level settings

### Test Failures
- Run setup script first before testing
- Ensure MongoDB connection is working
- Check Python dependencies are installed

## Performance Considerations

- Indexes are optimized for common query patterns
- TTL indexes prevent unbounded growth
- Collection validation ensures data consistency
- Use compound indexes for multi-field queries

## Monitoring

Monitor collection sizes and index usage:

```javascript
// Check collection sizes
db.analytics_results.stats()
db.ai_insights.stats()

// Check index usage
db.analytics_results.aggregate([{$indexStats: {}}])
db.ai_insights.aggregate([{$indexStats: {}}])