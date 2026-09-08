# Flex Living Real-time Analytics System - Monitoring & Troubleshooting Guide

## 📊 Table of Contents
1. [Monitoring Architecture](#monitoring-architecture)
2. [Key Performance Indicators (KPIs)](#key-performance-indicators-kpis)
3. [Prometheus Metrics](#prometheus-metrics)
4. [Grafana Dashboards](#grafana-dashboards)
5. [Alert Configuration](#alert-configuration)
6. [Log Management](#log-management)
7. [Troubleshooting Procedures](#troubleshooting-procedures)
8. [Performance Optimization](#performance-optimization)
9. [Capacity Planning](#capacity-planning)
10. [Security Monitoring](#security-monitoring)

## 🏗 Monitoring Architecture

### System Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │────│   Prometheus    │────│    Grafana      │
│   Components    │    │   Metrics       │    │   Dashboards    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ELK Stack     │    │   AlertManager  │    │   Health Checks │
│   (Logs)        │    │   & PagerDuty   │    │   & Uptime      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Monitoring Stack Components
- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **AlertManager**: Alert routing and escalation
- **ELK Stack**: Centralized logging (Elasticsearch, Logstash, Kibana)
- **Jaeger**: Distributed tracing
- **Custom Health Checks**: Service-level monitoring

## 📈 Key Performance Indicators (KPIs)

### Technical KPIs
| Metric | Target | Critical Threshold | Measurement Method |
|--------|--------|-------------------|-------------------|
| API Response Time | < 100ms (95th percentile) | > 500ms | Prometheus histogram |
| WebSocket Latency | < 50ms (average) | > 200ms | Custom WebSocket metrics |
| Event Processing Rate | > 1000 events/second | < 100 events/second | Queue metrics |
| Database Query Time | < 50ms (average) | > 200ms | Query performance monitoring |
| Memory Usage | < 80% | > 95% | System metrics |
| CPU Usage | < 70% | > 90% | System metrics |
| Error Rate | < 0.1% | > 1% | Application metrics |

### Business KPIs
| Metric | Target | Critical Threshold | Data Source |
|--------|--------|-------------------|-------------|
| Real-time Update Latency | < 100ms | > 500ms | WebSocket metrics |
| Dashboard Load Time | < 2 seconds | > 5 seconds | Frontend performance |
| Data Accuracy | 99.9% | < 99% | Data validation |
| Uptime | 99.9% | < 99.5% | Uptime monitoring |
| User Session Duration | Track trends | Anomaly detection | User analytics |

## 📊 Prometheus Metrics

### Application Metrics

#### Backend API Metrics
```python
# Custom metrics exposed by the backend API
from prometheus_client import Counter, Histogram, Gauge

# Request metrics
api_requests_total = Counter('api_requests_total', 'Total API requests', ['method', 'endpoint', 'status'])
api_request_duration = Histogram('api_request_duration_seconds', 'API request duration')
api_active_connections = Gauge('api_active_connections', 'Active API connections')

# Business metrics
reviews_processed_total = Counter('reviews_processed_total', 'Total reviews processed')
sentiment_analysis_duration = Histogram('sentiment_analysis_duration_seconds', 'Sentiment analysis duration')
property_updates_total = Counter('property_updates_total', 'Property updates processed')
```

#### WebSocket Metrics
```python
# WebSocket-specific metrics
websocket_connections_active = Gauge('websocket_connections_active', 'Active WebSocket connections')
websocket_messages_total = Counter('websocket_messages_total', 'Total WebSocket messages', ['direction', 'type'])
websocket_message_duration = Histogram('websocket_message_duration_seconds', 'WebSocket message processing time')
websocket_reconnect_total = Counter('websocket_reconnect_total', 'WebSocket reconnections', ['reason'])
```

#### Analytics Orchestrator Metrics
```python
# Analytics processing metrics
events_processed_total = Counter('events_processed_total', 'Total events processed', ['event_type', 'priority'])
event_processing_duration = Histogram('event_processing_duration_seconds', 'Event processing time')
event_queue_size = Gauge('event_queue_size', 'Event queue size', ['priority'])
batch_processed_total = Counter('batch_processed_total', 'Batches processed', ['event_type'])
ai_analysis_duration = Histogram('ai_analysis_duration_seconds', 'AI analysis duration', ['service'])
```

### Infrastructure Metrics

#### Database Metrics
```yaml
# PostgreSQL exporter metrics
pg_stat_database_tup_fetched_total
pg_stat_database_tup_inserted_total
pg_stat_database_tup_updated_total
pg_stat_database_tup_deleted_total
pg_stat_database_blks_read_total
pg_stat_database_blks_hit_total
```

#### System Metrics
```yaml
# Node exporter metrics
node_cpu_usage_percent
node_memory_usage_percent
node_disk_usage_percent
node_network_bytes_total
node_file_descriptors_used
```

## 📊 Grafana Dashboards

### 1. System Overview Dashboard
```
┌─────────────────┬─────────────────┬─────────────────┐
│   System Health │   API Performance│  WebSocket Status│
│                 │                 │                 │
│ CPU: ████░░░░ 60%│Latency: ████  │Connections:     │
│ Mem: ████░░░░ 65%│85ms     ████  │1,234 active     │
│ Disk: ██░░░░░░ 30%│Rate: ██████   │Rate: 99.8%      │
│                 │245 req/s ████  │                 │
└─────────────────┴─────────────────┴─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┬─────────────────┬─────────────────┐
│   Database      │    Event Flow   │   Alert Status  │
│                 │                 │                 │
│ PostgreSQL: OK  │Events: ████████ │Active: 2        │
│ MongoDB: OK     │2,450/s  ██████  │Resolved: 15     │
│ Redis: OK       │Queue:  ████     │Critical: 0      │
│                 │156     ██░░░    │                 │
└─────────────────┴─────────────────┴─────────────────┘
```

### 2. Real-time Analytics Dashboard
```
┌─────────────────┬─────────────────┬─────────────────┐
│ Event Processing│   AI Analysis   │Data Pipeline    │
│                 │                 │                 │
│ Rate: 1,234/s   │Groq: ████ 95ms  │Ingestion: ████ │
│ Queue: 45/200   │Gemini: ████ 120ms│Processing: ████│
│ Lag: <100ms     │Accuracy: 99.2%  │Delivery: ████  │
│ Error: 0.05%    │Throughput: 45/s │End-to-end: 85ms│
└─────────────────┴─────────────────┴─────────────────┘
```

### 3. Business Metrics Dashboard
```
┌─────────────────┬─────────────────┬─────────────────┐
│ Property Performance│Review Analytics│ Sentiment Trend │
│                    │                │                 │
│ Avg Rating: 4.6    │Today's: 156    │Positive: 78%    │
│ Reviews: 1,234     │This Week: 892  │Neutral: 18%     │
│ Growth: +12%       │Growth: +23%    │Negative: 4%     │
│ Top Issue: Value   │Anomalies: 3    │Trend: Improving │
└─────────────────┴─────────────────┴─────────────────┘
```

## 🚨 Alert Configuration

### Alert Rules (Prometheus)
```yaml
# /opt/flex-living/deployment/monitoring/prometheus/flex_living_rules.yml
groups:
  - name: flex_living_critical
    rules:
      - alert: HighAPILatency
        expr: histogram_quantile(0.95, rate(api_request_duration_seconds_bucket[5m])) > 0.5
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "API latency is high"
          description: "95th percentile latency is {{ $value }}s for more than 2 minutes"
      
      - alert: WebSocketDisconnections
        expr: rate(websocket_reconnect_total[5m]) > 10
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "High WebSocket reconnection rate"
          description: "{{ $value }} reconnections per second detected"
      
      - alert: DatabaseConnectionFailure
        expr: pg_up == 0
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL is down"
          description: "PostgreSQL database is not responding"
      
      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100 > 90
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value }}% on {{ $labels.instance }}"
      
      - alert: EventProcessingLag
        expr: event_queue_size > 1000
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "Event processing lag detected"
          description: "Event queue has {{ $value }} items waiting for processing"
      
      - alert: RealTimeLatencyHigh
        expr: avg(websocket_message_duration_seconds) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Real-time latency exceeds SLA"
          description: "Average WebSocket message processing time is {{ $value }}s"

  - name: flex_living_business
    rules:
      - alert: PropertyRatingDrop
        expr: property_average_rating < 3.5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Property rating dropped"
          description: "Property {{ $labels.property_id }} rating is {{ $value }}"
      
      - alert: NegativeSentimentSpike
        expr: rate(sentiment_analysis_total{sentiment="negative"}[1h]) > 0.3
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Negative sentiment spike detected"
          description: "Negative sentiment rate is {{ $value }} for property {{ $labels.property_id }}"
```

### AlertManager Configuration
```yaml
# /opt/flex-living/deployment/monitoring/alertmanager.yml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@flexliving.com'
  smtp_auth_username: 'alerts@flexliving.com'
  smtp_auth_password: '${SMTP_PASSWORD}'

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
    - match:
        severity: warning
      receiver: 'warning-alerts'
    - match:
        service: database
      receiver: 'database-team'

receivers:
  - name: 'default'
    email_configs:
      - to: 'ops-team@flexliving.com'
        subject: 'Flex Living Alert: {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Severity: {{ .Labels.severity }}
          Instance: {{ .Labels.instance }}
          {{ end }}

  - name: 'critical-alerts'
    email_configs:
      - to: 'oncall@flexliving.com'
        subject: 'CRITICAL: Flex Living System Alert'
        body: |
          🚨 CRITICAL ALERT 🚨
          
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Instance: {{ .Labels.instance }}
          Time: {{ .StartsAt }}
          {{ end }}
          
          Please investigate immediately.

    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#alerts-critical'
        title: 'Critical Flex Living Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'

  - name: 'database-team'
    email_configs:
      - to: 'db-team@flexliving.com'
        subject: 'Database Alert: {{ .GroupLabels.alertname }}'
        body: |
          Database team alert for Flex Living:
          
          {{ range .Alerts }}
          {{ .Annotations.summary }}
          {{ .Annotations.description }}
          {{ end }}
```

## 📝 Log Management

### Log Collection Architecture
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Backend   │───▶│   Filebeat  │───▶│Elasticsearch│
│   Logs      │    │   (Docker)  │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
       │                                    │
       ▼                                    ▼
┌─────────────┐                      ┌─────────────┐
│ Analytics   │                      │    Kibana   │
│   Logs      │                      │  (Frontend) │
└─────────────┘                      └─────────────┘
       │                                    ▲
       │              ┌─────────────┐       │
       └──────────────│   Logstash  │───────┘
                      │ (Processor) │
                      └─────────────┘
```

### Log Configuration
```yaml
# /opt/flex-living/deployment/logging/filebeat.yml
filebeat.inputs:
  - type: container
    paths:
      - /var/lib/docker/containers/*/*.log
    processors:
      - add_docker_metadata:
          host: "unix:///var/run/docker.sock"
      - decode_json_fields:
          fields: ["message"]
          target: "json"
          overwrite_keys: true
      - drop_fields:
          fields: ["ecs", "agent", "input", "log.file.path"]
    
output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  index: "flex-living-logs-%{+yyyy.MM.dd}"
  
setup.template:
  name: "flex-living-logs"
  pattern: "flex-living-logs-*"
  settings:
    index.number_of_shards: 3
    index.number_of_replicas: 1

logging.level: info
logging.to_files: true
logging.files:
  path: /var/log/filebeat
  name: filebeat
  keepfiles: 7
  permissions: 0644
```

### Log Analysis Queries (Kibana)
```kibana
# Error Rate Analysis
GET flex-living-logs-*/_search
{
  "query": {
    "bool": {
      "must": [
        {"range": {"@timestamp": {"gte": "now-1h"}}},
        {"term": {"level": "ERROR"}}
      ]
    }
  },
  "aggs": {
    "errors_by_service": {
      "terms": {
        "field": "service.keyword",
        "size": 10
      }
    },
    "errors_timeline": {
      "date_histogram": {
        "field": "@timestamp",
        "calendar_interval": "1m"
      }
    }
  }
}

# Performance Analysis
GET flex-living-logs-*/_search
{
  "query": {
    "bool": {
      "must": [
        {"range": {"@timestamp": {"gte": "now-1h"}}},
        {"exists": {"field": "response_time"}}
      ]
    }
  },
  "aggs": {
    "avg_response_time": {
      "avg": {"field": "response_time"}
    },
    "response_time_percentiles": {
      "percentiles": {
        "field": "response_time",
        "percents": [50, 95, 99]
      }
    }
  }
}
```

## 🔧 Troubleshooting Procedures

### Common Issues and Solutions

#### 1. High API Latency (>100ms)
**Symptoms:**
- Slow response times
- High CPU usage on API servers
- User complaints about dashboard performance

**Diagnosis:**
```bash
# Check system resources
htop
docker stats

# Check database performance
curl -X POST http://localhost:8000/api/v1/admin/db-performance
# Or use PostgreSQL directly
docker exec -it flex_living_postgres_1 psql -U postgres -c "
SELECT query, mean_time, calls, total_time 
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;
"

# Check Redis performance
docker exec -it flex_living_redis_1 redis-cli --latency-history
```

**Solutions:**
- Optimize slow database queries
- Increase database connection pool
- Add Redis caching for frequent queries
- Scale API services horizontally
- Enable database query optimization

**Prevention:**
- Monitor query performance regularly
- Set up automated performance alerts
- Regular database maintenance
- Cache frequently accessed data

#### 2. WebSocket Connection Issues
**Symptoms:**
- Clients disconnecting frequently
- High reconnection rates
- Real-time updates not reaching clients

**Diagnosis:**
```bash
# Check WebSocket service health
curl -f http://localhost:8080/health

# Test WebSocket connectivity
wscat -c ws://localhost:8080/ws --verbose

# Check nginx WebSocket configuration
docker exec flex_living_nginx_1 nginx -t

# Monitor WebSocket metrics
curl http://localhost:8080/metrics | grep websocket
```

**Solutions:**
- Increase WebSocket timeout values
- Optimize nginx WebSocket proxy configuration
- Check for network connectivity issues
- Monitor client connection patterns
- Implement connection pooling

**Prevention:**
- Regular connectivity testing
- Monitor WebSocket performance metrics
- Implement client-side retry logic
- Use connection health checks

#### 3. Database Connection Issues
**Symptoms:**
- "Connection refused" errors
- High connection pool usage
- Timeout errors

**Diagnosis:**
```bash
# Check database status
docker-compose -f docker-compose.production.yml ps postgres mongodb redis

# Test connections
docker exec flex_living_postgres_1 pg_isready -U postgres
docker exec -it flex_living_mongodb_1 mongosh --eval "db.adminCommand('ping')"
docker exec -it flex_living_redis_1 redis-cli ping

# Check connection pools
curl -X GET http://localhost:8000/api/v1/admin/db-stats
```

**Solutions:**
- Increase connection pool size
- Check database resource limits
- Optimize connection timeout settings
- Implement connection retry logic
- Scale database resources

**Prevention:**
- Monitor connection pool usage
- Set up connection timeout alerts
- Regular database health checks
- Implement circuit breakers

#### 4. Event Processing Backlog
**Symptoms:**
- Event queue growing
- Delayed real-time updates
- High event processing lag

**Diagnosis:**
```bash
# Check event queue status
curl http://localhost:8001/api/v1/events/queue-stats

# Check event processing metrics
curl http://localhost:8001/metrics | grep event_queue

# Check worker processes
docker-compose -f docker-compose.production.yml top analytics-orchestrator
```

**Solutions:**
- Increase worker process count
- Optimize event processing logic
- Implement event batching
- Scale analytics orchestrator
- Add event prioritization

**Prevention:**
- Monitor event processing rate
- Set up queue size alerts
- Regular performance optimization
- Implement load testing

#### 5. Memory Leaks
**Symptoms:**
- Gradually increasing memory usage
- Out of memory errors
- Service restarts

**Diagnosis:**
```bash
# Check memory usage
free -h
docker stats --no-stream

# Check for memory leaks
docker exec -it flex_living_backend_1 ps aux --sort=-%mem | head -10

# Check application memory profiling
curl http://localhost:8000/api/v1/admin/memory-profile
```

**Solutions:**
- Identify and fix memory leaks
- Implement garbage collection tuning
- Add memory monitoring
- Scale resources appropriately
- Implement resource limits

**Prevention:**
- Regular memory profiling
- Set up memory usage alerts
- Code review for memory patterns
- Automated testing for memory leaks

## ⚡ Performance Optimization

### Database Optimization
```sql
-- PostgreSQL optimization queries
-- Add indexes for frequently queried columns
CREATE INDEX CONCURRENTLY idx_reviews_property_id ON reviews(property_id);
CREATE INDEX CONCURRENTLY idx_reviews_created_at ON reviews(created_at);
CREATE INDEX CONCURRENTLY idx_sentiment_analysis_property_id ON sentiment_analysis(property_id);

-- Update table statistics
ANALYZE reviews;
ANALYZE sentiment_analysis;
ANALYZE properties;

-- Monitor query performance
SELECT query, mean_time, calls, total_time 
FROM pg_stat_statements 
WHERE mean_time > 100 
ORDER BY mean_time DESC 
LIMIT 10;
```

### Application Optimization
```python
# Add database connection pooling
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=30,
    pool_timeout=60,
    pool_recycle=3600
)

# Add Redis caching
import redis
r = redis.Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    password=REDIS_PASSWORD,
    max_connections=20,
    socket_timeout=5,
    socket_connect_timeout=5
)

# Cache frequently accessed data
@cache.memoize(timeout=300)
def get_property_analytics(property_id: str):
    # Expensive database query
    return expensive_analytics_computation(property_id)
```

### WebSocket Optimization
```python
# Optimize WebSocket configuration
WEBSOCKET_CONFIG = {
    "max_connections": 5000,
    "ping_interval": 30,
    "ping_timeout": 10,
    "close_timeout": 10,
    "max_size": 10 * 1024 * 1024,  # 10MB
    "compression": "deflate",
    "buffer_limit": 64 * 1024  # 64KB
}

# Implement connection pooling
class WebSocketPool:
    def __init__(self, max_size=100):
        self.pool = asyncio.Queue(maxsize=max_size)
        self.active_connections = set()
    
    async def get_connection(self):
        if not self.pool.empty():
            return await self.pool.get()
        return None
```

## 📊 Capacity Planning

### Resource Planning
```yaml
# Capacity planning recommendations
environments:
  development:
    cpu: "2 cores"
    memory: "4GB"
    storage: "50GB SSD"
    users: "5-10"
    
  staging:
    cpu: "4 cores"
    memory: "8GB"
    storage: "100GB SSD"
    users: "10-50"
    
  production:
    cpu: "16 cores"
    memory: "32GB"
    storage: "500GB SSD"
    users: "1000+"
    
    # High availability
    high_availability:
      cpu: "32 cores"
      memory: "64GB"
      storage: "1TB SSD"
      users: "10000+"
```

### Scaling Triggers
```yaml
# Automatic scaling triggers
scaling_rules:
  - metric: "api_request_rate"
    threshold: "1000 req/min per instance"
    action: "scale_up"
    
  - metric: "websocket_connections"
    threshold: "4000 connections per instance"
    action: "scale_up"
    
  - metric: "event_queue_size"
    threshold: "1000 events"
    action: "scale_up_analytics"
    
  - metric: "database_connections"
    threshold: "80% of max connections"
    action: "scale_up_database"
```

### Performance Benchmarks
```bash
# Load testing script
#!/bin/bash
echo "Running performance benchmarks..."

# API load test
ab -n 10000 -c 100 http://localhost:8000/api/v1/analytics/overview

# WebSocket load test
wscat -c ws://localhost:8080/ws --parallel 100

# Database performance
pgbench -h localhost -U postgres -d flex_living -c 10 -T 60

# Memory usage under load
stress --cpu 4 --timeout 60s
```

## 🔐 Security Monitoring

### Security Metrics
```yaml
# Security monitoring rules
security_alerts:
  - name: "Failed Authentication Attempts"
    query: "rate(failed_authentication_total[5m]) > 10"
    severity: "warning"
    
  - name: "SQL Injection Attempts"
    query: "rate(sql_injection_attempts_total[5m]) > 5"
    severity: "critical"
    
  - name: "Unusual API Usage"
    query: "rate(api_requests_total[5m]) > 1000"
    severity: "warning"
    
  - name: "WebSocket Security Events"
    query: "rate(websocket_security_events_total[5m]) > 0"
    severity: "critical"
```

### Log Analysis for Security
```kibana
# Security event analysis
# Failed login attempts
GET flex-living-security-*/_search
{
  "query": {
    "bool": {
      "must": [
        {"term": {"event_type": "authentication_failed"}},
        {"range": {"@timestamp": {"gte": "now-1h"}}}
      ]
    }
  },
  "aggs": {
    "failed_attempts_by_ip": {
      "terms": {
        "field": "source_ip.keyword",
        "size": 20
      }
    }
  }
}

# API abuse detection
GET flex-living-logs-*/_search
{
  "query": {
    "bool": {
      "must": [
        {"term": {"endpoint": "/api/v1/admin"}},
        {"range": {"@timestamp": {"gte": "now-1h"}}},
        {"term": {"status": 403}}
      ]
    }
  }
}
```

---

**Document Version**: 1.0.0  
**Last Updated**: 2025-11-07  
**Review Schedule**: Monthly  
**Owner**: DevOps Team