# Flex Living Real-time Analytics System - Complete Production Deployment Guide

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Database Configuration](#database-configuration)
5. [SSL Certificate Setup](#ssl-certificate-setup)
6. [Service Deployment](#service-deployment)
7. [Load Balancer Configuration](#load-balancer-configuration)
8. [Monitoring Setup](#monitoring-setup)
9. [Security Configuration](#security-configuration)
10. [Backup and Recovery](#backup-and-recovery)
11. [Performance Tuning](#performance-tuning)
12. [Troubleshooting](#troubleshooting)
13. [Maintenance](#maintenance)

## 🎯 System Overview

The Flex Living Real-time Analytics System is a comprehensive platform that provides:
- **Real-time WebSocket** data streaming with <100ms latency
- **AI-powered** sentiment analysis and insights
- **Scalable** microservices architecture
- **Production-grade** monitoring and alerting
- **High availability** with load balancing

### Architecture Components
- **Backend API**: FastAPI-based REST services
- **Analytics Orchestrator**: Real-time data processing engine
- **WebSocket Server**: Real-time event streaming
- **Frontend Dashboard**: React-based analytics interface
- **Database Layer**: PostgreSQL (transactions) + MongoDB (analytics) + Redis (caching)
- **Message Queue**: RabbitMQ for high-availability messaging
- **Monitoring Stack**: Prometheus + Grafana + ELK

## 🔧 Prerequisites

### System Requirements
- **CPU**: 8+ cores (16+ recommended for production)
- **Memory**: 16GB RAM (32GB+ for production)
- **Storage**: 500GB SSD (1TB+ for production)
- **Network**: 1Gbps+ bandwidth

### Software Requirements
- **OS**: Ubuntu 20.04+ LTS or CentOS 8+
- **Docker**: 24.0+ with Docker Compose v2
- **Python**: 3.11+ (for custom deployment)
- **Node.js**: 18+ (for frontend builds)
- **SSL Certificates**: Valid certificates for your domain

### Required Ports
```
80    - HTTP (redirect to HTTPS)
443   - HTTPS (main API)
8080  - WebSocket (wss://)
8000  - Backend API
8001  - Analytics Orchestrator
5432  - PostgreSQL
27017 - MongoDB
6379  - Redis
15672 - RabbitMQ Management
3000  - Frontend (development)
9090  - Prometheus
3001  - Grafana
5601  - Kibana
```

## 🛠 Environment Setup

### 1. Initial Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create application directory
sudo mkdir -p /opt/flex-living
sudo chown $USER:$USER /opt/flex-living
cd /opt/flex-living
```

### 2. Environment Configuration

```bash
# Clone the repository
git clone https://github.com/your-org/flex-living.git
cd flex-living

# Generate environment configuration
python3 deployment/environment_config.py

# Copy and configure environment file
cp .env.production .env
nano .env
```

### 3. Secrets Management

```bash
# Generate secrets template
python3 -c "
from deployment.environment_config import create_secrets_template
template = create_secrets_template()
with open('secrets_template.txt', 'w') as f:
    f.write(template)
print('Secrets template created: secrets_template.txt')
"

# Fill in your secrets
cp secrets_template.txt .env
# Edit .env with your actual values
```

## 🗄 Database Configuration

### PostgreSQL Setup
```bash
# Create data directory
sudo mkdir -p /opt/flex-living/data/postgres
sudo chown 999:999 /opt/flex-living/data/postgres

# Initialize database
docker run --rm \
  -v /opt/flex-living/data/postgres:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=your_secure_password \
  postgres:15 \
  initdb -D /var/lib/postgresql/data
```

### MongoDB Setup
```bash
# Create data directory
sudo mkdir -p /opt/flex-living/data/mongodb
sudo chown 999:999 /opt/flex-living/data/mongodb

# Initialize with replica set for production
docker run --rm \
  -v /opt/flex-living/data/mongodb:/data/db \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=your_mongo_password \
  mongo:7.0 \
  mongod --replSet rs0 --bind_ip_all
```

### Redis Setup
```bash
# Create data directory
sudo mkdir -p /opt/flex-living/data/redis
sudo chown 999:999 /opt/flex-living/data/redis
```

## 🔒 SSL Certificate Setup

### Using Let's Encrypt (Recommended)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com -d api.yourdomain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/flex-living/deployment/nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/flex-living/deployment/nginx/ssl/
sudo chown $USER:$USER /opt/flex-living/deployment/nginx/ssl/*
```

### Custom SSL Certificates
```bash
# Place your certificates
cp your_domain.crt /opt/flex-living/deployment/nginx/ssl/flex_living.crt
cp your_domain.key /opt/flex-living/deployment/nginx/ssl/flex_living.key
chmod 600 /opt/flex-living/deployment/nginx/ssl/flex_living.key
```

## 🚀 Service Deployment

### 1. Start Core Services First
```bash
# Start databases and caching
docker-compose -f docker-compose.production.yml up -d postgres redis mongodb

# Wait for services to be healthy
docker-compose -f docker-compose.production.yml ps

# Verify connections
docker exec -it flex_living_postgres_1 pg_isready -U postgres
docker exec -it flex_living_redis_1 redis-cli ping
docker exec -it flex_living_mongodb_1 mongosh --eval "db.adminCommand('ping')"
```

### 2. Initialize Databases
```bash
# Run database migrations
docker exec -it flex_living_backend_1 python -m alembic upgrade head

# Load initial data
docker exec -it flex_living_backend_1 python scripts/populate_sample_data.py
```

### 3. Deploy Application Services
```bash
# Start all services
docker-compose -f docker-compose.production.yml up -d

# Monitor startup logs
docker-compose -f docker-compose.production.yml logs -f backend analytics-orchestrator
```

### 4. Verify Deployment
```bash
# Check service health
curl -f http://localhost:8000/health
curl -f http://localhost:8001/health
curl -f http://localhost:8080/health

# Test WebSocket connection
wscat -c ws://localhost:8080/ws
```

## ⚖️ Load Balancer Configuration

### Nginx Configuration
```nginx
# /opt/flex-living/deployment/nginx/nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream backend_api {
        server backend:8000 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }
    
    upstream analytics_api {
        server analytics-orchestrator:8001 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }
    
    upstream websocket_backend {
        server analytics-orchestrator:8080 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=websocket:10m rate=5r/s;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    server {
        listen 80;
        server_name yourdomain.com api.yourdomain.com;
        return 301 https://$server_name$request_uri;
    }
    
    server {
        listen 443 ssl http2;
        server_name yourdomain.com api.yourdomain.com;
        
        ssl_certificate /etc/nginx/ssl/flex_living.crt;
        ssl_certificate_key /etc/nginx/ssl/flex_living.key;
        
        # API endpoints
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend_api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }
        
        # WebSocket endpoints
        location /ws {
            limit_req zone=websocket burst=10 nodelay;
            proxy_pass http://websocket_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 300s;
        }
        
        # Analytics API
        location /analytics/ {
            limit_req zone=api burst=10 nodelay;
            proxy_pass http://analytics_api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Static files
        location /static/ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

### Health Check Configuration
```bash
# Add to docker-compose.production.yml
services:
  nginx:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## 📊 Monitoring Setup

### Prometheus Configuration
```yaml
# /opt/flex-living/deployment/monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "flex_living_rules.yml"

scrape_configs:
  - job_name: 'flex-living-backend'
    static_configs:
      - targets: ['backend:8000']
    metrics_path: '/metrics'
    scrape_interval: 15s
    
  - job_name: 'flex-living-analytics'
    static_configs:
      - targets: ['analytics-orchestrator:8001']
    metrics_path: '/metrics'
    scrape_interval: 15s
    
  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['postgres-exporter:9187']
      
  - job_name: 'mongodb-exporter'
    static_configs:
      - targets: ['mongodb-exporter:9216']
      
  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['redis-exporter:9121']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### Grafana Dashboards
```bash
# Import pre-configured dashboards
curl -X POST http://admin:admin@localhost:3001/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @/opt/flex-living/deployment/monitoring/grafana/dashboards/flex-living-overview.json
```

### Key Metrics to Monitor
1. **System Metrics**:
   - CPU usage < 80%
   - Memory usage < 85%
   - Disk usage < 90%
   - Network throughput

2. **Application Metrics**:
   - API response time < 100ms (95th percentile)
   - WebSocket connection count
   - Message queue size
   - Error rate < 1%

3. **Business Metrics**:
   - Real-time update latency
   - Event processing rate
   - Database query performance
   - Cache hit rate > 95%

## 🔐 Security Configuration

### 1. Network Security
```bash
# Configure firewall
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Restrict database access
sudo ufw deny 5432/tcp   # PostgreSQL
sudo ufw deny 27017/tcp  # MongoDB
sudo ufw deny 6379/tcp   # Redis
```

### 2. Application Security
```bash
# Enable rate limiting
# Already configured in nginx.conf

# API key authentication
export API_KEY_HEADER="X-API-Key"
export RATE_LIMIT_PER_MINUTE=500

# JWT configuration
export JWT_SECRET_KEY="your-super-secure-jwt-secret"
export JWT_EXPIRATION_HOURS=8
```

### 3. Database Security
```sql
-- PostgreSQL: Create application user
CREATE USER flex_app WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE flex_living TO flex_app;
GRANT USAGE ON SCHEMA public TO flex_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO flex_app;

-- MongoDB: Create application user
use admin
db.createUser({
  user: "flex_analytics",
  pwd: "secure_mongo_password",
  roles: [
    { role: "readWrite", db: "flex_living_analytics" },
    { role: "dbAdmin", db: "flex_living_analytics" }
  ]
})
```

## 💾 Backup and Recovery

### 1. Automated Backup Script
```bash
#!/bin/bash
# /opt/flex-living/deployment/scripts/backup.sh

BACKUP_DIR="/opt/backups/flex-living"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backups
docker exec flex_living_postgres_1 pg_dump -U postgres flex_living > $BACKUP_DIR/postgres_$DATE.sql
docker exec flex_living_mongodb_1 mongodump --uri="mongodb://admin:password@localhost:27017/flex_living_analytics?authSource=admin" --out /tmp/mongo_backup
tar -czf $BACKUP_DIR/mongodb_$DATE.tar.gz -C /tmp/mongo_backup .

# Redis backup
docker exec flex_living_redis_1 redis-cli BGSAVE
docker cp flex_living_redis_1:/data/dump.rdb $BACKUP_DIR/redis_$DATE.rdb

# Application data backup
docker run --rm -v /opt/flex-living:/data alpine tar -czf $BACKUP_DIR/app_data_$DATE.tar.gz -C /data .

# Clean old backups
find $BACKUP_DIR -name "*.sql" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.rdb" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $DATE"
```

### 2. Recovery Procedures
```bash
# PostgreSQL recovery
docker exec -i flex_living_postgres_1 psql -U postgres -d flex_living < /opt/backups/postgres_20231107_020000.sql

# MongoDB recovery
docker run --rm -v /opt/backups:/backup mongo:7.0 mongorestore --uri="mongodb://admin:password@mongodb:27017/flex_living_analytics?authSource=admin" /backup/mongodb_20231107_020000

# Redis recovery
docker cp /opt/backups/redis_20231107_020000.rdb flex_living_redis_1:/data/dump.rdb
docker restart flex_living_redis_1
```

## ⚡ Performance Tuning

### 1. Database Optimization
```sql
-- PostgreSQL optimization
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
SELECT pg_reload_conf();
```

```javascript
// MongoDB optimization
db.adminCommand({
  setParameter: 1,
  internalQueryPlanEvaluationWorks: 2000
});

db.adminCommand({
  setParameter: 1,
  internalQueryMaxBlockingSortMemoryUsageBytes: 33554432
});
```

### 2. Application Optimization
```yaml
# Docker Compose resource limits
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'
          
  analytics-orchestrator:
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2.0'
        reservations:
          memory: 2G
          cpus: '1.0'
```

### 3. WebSocket Optimization
```python
# Analytics configuration
MAX_CONCURRENT_PROCESSES: 20
BATCH_SIZE: 200
ORCHESTRATION_INTERVAL: 5
WEBSOCKET_MAX_CONNECTIONS: 5000
WEBSOCKET_PING_INTERVAL: 30
WEBSOCKET_PING_TIMEOUT: 10
```

## 🚨 Troubleshooting

### Common Issues and Solutions

#### 1. High Response Times
```bash
# Check system resources
htop
docker stats

# Check database performance
docker exec flex_living_postgres_1 psql -U postgres -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# Check Redis performance
docker exec flex_living_redis_1 redis-cli info stats
```

#### 2. WebSocket Connection Issues
```bash
# Check WebSocket service health
curl -f http://localhost:8080/health

# Check network connectivity
wscat -c ws://localhost:8080/ws --verbose

# Check nginx configuration
nginx -t
docker exec flex_living_nginx_1 nginx -t
```

#### 3. Database Connection Issues
```bash
# Check database status
docker-compose -f docker-compose.production.yml ps postgres mongodb redis

# Test connections
docker exec flex_living_postgres_1 pg_isready -U postgres
docker exec flex_living_mongodb_1 mongosh --eval "db.adminCommand('ping')"
docker exec flex_living_redis_1 redis-cli ping
```

#### 4. Memory Issues
```bash
# Check memory usage
free -h
docker exec -it flex_living_backend_1 free -h

# Check for memory leaks
docker exec -it flex_living_backend_1 ps aux --sort=-%mem | head -10
```

### Log Locations
```bash
# Application logs
tail -f /opt/flex-living/logs/backend.log
tail -f /opt/flex-living/logs/analytics.log
tail -f /opt/flex-living/logs/websocket.log

# Docker logs
docker-compose -f docker-compose.production.yml logs -f backend
docker-compose -f docker-compose.production.yml logs -f analytics-orchestrator

# System logs
journalctl -u docker -f
```

### Emergency Procedures
```bash
# Restart all services
docker-compose -f docker-compose.production.yml restart

# Emergency maintenance mode
docker exec flex_living_nginx_1 nginx -s stop
# Fix issues, then:
docker exec flex_living_nginx_1 nginx

# Scale down services
docker-compose -f docker-compose.production.yml up -d --scale backend=1
```

## 🔧 Maintenance

### Daily Tasks
- Monitor system health dashboards
- Check error logs
- Verify backup completion
- Review performance metrics

### Weekly Tasks
- Update security patches
- Review and clean old logs
- Performance optimization review
- Security audit

### Monthly Tasks
- Database maintenance
- SSL certificate renewal check
- Disaster recovery testing
- Capacity planning review

### Upgrade Procedures
```bash
# 1. Backup current system
./deployment/scripts/backup.sh

# 2. Update code
git pull origin main

# 3. Update dependencies
docker-compose -f docker-compose.production.yml pull

# 4. Run migrations
docker exec flex_living_backend_1 python -m alembic upgrade head

# 5. Restart services
docker-compose -f docker-compose.production.yml up -d
```

## 📞 Support and Contact

For technical support:
- **Documentation**: [Internal Wiki]
- **Issue Tracking**: [GitHub Issues]
- **Emergency Contact**: [On-call Number]
- **Email**: tech-support@flexliving.com

---

**Version**: 1.0.0  
**Last Updated**: 2025-11-07  
**Next Review**: 2025-12-07