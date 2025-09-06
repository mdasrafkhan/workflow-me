# Docker Setup for Workflow Engine

This directory contains Docker configurations for the complete workflow execution system including the frontend, backend, databases, and supporting services.

## 🏗️ Architecture

### Services

- **PostgreSQL** - Main database for workflow data
- **Redis** - Queue system and caching (future use)
- **Backend** - NestJS workflow execution engine
- **Frontend** - React workflow builder
- **Adminer** - Database administration tool
- **Nginx** - Reverse proxy (production only)

### Development vs Production

- **Development**: Hot reloading, volume mounting, debugging
- **Production**: Optimized builds, security, performance

## 🚀 Quick Start

### Using Makefile (Recommended)

```bash
# Quick setup with health checks
make setup

# Development environment
make dev

# Production environment
make prod

# Run tests
make test

# View logs
make logs

# Clean up
make clean
```

### Manual Docker Commands

#### Development Environment

```bash
# Start all services
docker-compose up --build

# Start in background
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

#### Production Environment

```bash
# Build and start production services
docker-compose -f docker-compose.prod.yml up --build

# Start in background
docker-compose -f docker-compose.prod.yml up -d --build
```

## 📊 Service Details

### PostgreSQL Database

**Port**: 15432 (dev) / 5432 (prod)
**Credentials**: workflow_user / workflow_password
**Database**: workflow_db

**Tables**:
- `dummy_users` - Test user data
- `dummy_subscriptions` - Subscription records
- `dummy_subscription_types` - Product definitions
- `dummy_newsletters` - Newsletter subscriptions
- `workflow_executions` - Workflow execution tracking
- `workflow_delays` - Delay scheduling
- `email_logs` - Email audit trail

### Redis Cache

**Port**: 16379 (dev) / 6379 (prod)
**Purpose**: Queue system and caching
**Health Check**: Built-in ping check

### Backend API

**Port**: 4000
**Health Endpoint**: http://localhost:4000/health
**Features**:
- Workflow execution engine
- Batch processing (30-second intervals)
- Email service with templates
- State machine management
- Comprehensive logging

### Frontend

**Port**: 3000
**Features**:
- Visual workflow builder
- Node-based editor
- Real-time workflow execution
- Template management

### Adminer

**Port**: 8080
**Purpose**: Database administration
**Access**: http://localhost:8080

## 🔧 Configuration

### Environment Variables

#### Database Configuration
```env
DB_HOST=postgres
DB_PORT=5432
DB_USER=workflow_user
DB_PASSWORD=workflow_password
DB_NAME=workflow_db
```

#### Redis Configuration
```env
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
```

#### Email Configuration
```env
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_password
FROM_EMAIL=noreply@workflow.example.com
```

#### Workflow Configuration
```env
WORKFLOW_BATCH_INTERVAL=30
WORKFLOW_MAX_RETRIES=3
WORKFLOW_DELAY_TOLERANCE=1000
```

## 🧪 Testing

### Run Tests in Docker

```bash
# Run workflow tests
docker-compose --profile testing up --build

# Run specific test suite
docker-compose run workflow-tester npm run test:workflow

# Run test runner
docker-compose run workflow-tester npm run test:runner
```

### Test Database

**Port**: 15433
**Credentials**: test_user / test_password
**Database**: workflow_test

## 📈 Monitoring

### Health Checks

All services include health checks:

```bash
# Check all services
docker-compose ps

# Check specific service
docker inspect workflow-backend | grep Health -A 10
```

### Health Endpoints

- **Backend**: http://localhost:4000/health
- **Readiness**: http://localhost:4000/health/ready
- **Liveness**: http://localhost:4000/health/live

### Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

## 🔒 Security

### Production Security

- **Non-root users** in containers
- **Resource limits** to prevent abuse
- **Health checks** for monitoring
- **Environment variable** configuration
- **SSL/TLS** support (with certificates)

### Network Security

- **Isolated networks** for services
- **Internal communication** only
- **Exposed ports** minimized
- **Health check** endpoints protected

## 🚀 Deployment

### Development Deployment

```bash
# Start development environment
docker-compose up --build

# Access services
# Frontend: http://localhost:3000
# Backend: http://localhost:4000
# Database: localhost:15432
# Adminer: http://localhost:8080
```

### Production Deployment

```bash
# Set environment variables
export DB_PASSWORD=your_secure_password
export SMTP_USER=your_email@example.com
export SMTP_PASS=your_smtp_password

# Start production environment
docker-compose -f docker-compose.prod.yml up -d --build

# Check status
docker-compose -f docker-compose.prod.yml ps
```

## 🛠️ Development

### Hot Reloading

Development containers support hot reloading:

- **Frontend**: Volume mounted for instant changes
- **Backend**: NestJS watch mode enabled
- **Database**: Persistent volumes for data

### Debugging

```bash
# Attach to backend container
docker-compose exec backend sh

# View backend logs
docker-compose logs -f backend

# Check database
docker-compose exec postgres psql -U workflow_user -d workflow_db
```

### Rebuilding

```bash
# Rebuild specific service
docker-compose build backend

# Rebuild all services
docker-compose build

# Force rebuild (no cache)
docker-compose build --no-cache
```

## 📊 Performance

### Resource Limits

Production containers include resource limits:

- **Backend**: 512MB memory, 0.5 CPU
- **Database**: Default PostgreSQL limits
- **Redis**: Default Redis limits

### Optimization

- **Multi-stage builds** for smaller images
- **Layer caching** for faster builds
- **Health checks** for reliability
- **Restart policies** for availability

## 🔧 Troubleshooting

### Common Issues

1. **Port conflicts**: Check if ports are already in use
2. **Database connection**: Verify PostgreSQL is running
3. **Email sending**: Check SMTP credentials
4. **Memory issues**: Increase Docker memory limits

### Debug Commands

```bash
# Check container status
docker-compose ps

# View container logs
docker-compose logs [service]

# Execute commands in container
docker-compose exec [service] [command]

# Restart specific service
docker-compose restart [service]

# Remove all containers and volumes
docker-compose down -v
```

### Reset Everything

```bash
# Stop and remove all containers
docker-compose down -v

# Remove all images
docker system prune -a

# Rebuild from scratch
docker-compose up --build
```

## 📚 Additional Commands

### Database Management

```bash
# Access PostgreSQL
docker-compose exec postgres psql -U workflow_user -d workflow_db

# Backup database
docker-compose exec postgres pg_dump -U workflow_user workflow_db > backup.sql

# Restore database
docker-compose exec -T postgres psql -U workflow_user workflow_db < backup.sql
```

### Service Management

```bash
# Scale services
docker-compose up --scale backend=3

# Update services
docker-compose pull
docker-compose up --build

# View resource usage
docker stats
```

## 🎯 Next Steps

1. **Configure SMTP** for email sending
2. **Set up SSL certificates** for production
3. **Configure monitoring** and alerting
4. **Set up backup** strategies
5. **Implement CI/CD** pipelines

## 📞 Support

For issues and questions:

1. **Check logs** for error details
2. **Verify configuration** in environment variables
3. **Test connectivity** between services
4. **Review health check** status
5. **Check resource usage** and limits