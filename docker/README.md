# Docker Setup for Workflow Application

## Development Setup

### Quick Start
```bash
# From the docker directory
docker-compose up --build
```

This will start:
- PostgreSQL database on port 15432
- Backend API on port 4000
- Frontend on port 3000

### Development Features
- **Hot Reloading**: Code changes are reflected immediately
- **Volume Mounting**: Local files are synced with containers
- **Live Debugging**: Full development environment with debugging

### Development Commands
```bash
# Start development environment
docker-compose up --build

# Start in background
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild specific service
docker-compose up --build frontend
```

## Production Setup

### Build and Deploy
```bash
# Build production images
docker-compose -f docker-compose.prod.yml up --build

# Or build without starting
docker-compose -f docker-compose.prod.yml build
```

### Production Features
- **Optimized Builds**: Multi-stage builds for smaller images
- **Nginx Serving**: Static file serving for frontend
- **Production Dependencies**: Only necessary packages included

## File Structure
```
docker/
├── docker-compose.yml          # Development setup
├── docker-compose.override.yml # Development overrides
├── docker-compose.prod.yml     # Production setup
└── README.md                   # This file
```

## Troubleshooting

### Common Issues
1. **Port conflicts**: Ensure ports 3000, 4000, 5432 are free
2. **Permission issues**: Run with `sudo` if needed
3. **Build failures**: Check Dockerfile syntax and dependencies

### Reset Everything
```bash
# Stop and remove all containers, networks, and volumes
docker-compose down -v

# Remove all images
docker system prune -a

# Rebuild from scratch
docker-compose up --build
```

### View Container Status
```bash
# List running containers
docker ps

# View container logs
docker logs workflow-frontend
docker logs workflow-backend
docker logs workflow-db
```

## Environment Variables

### Development
- `NODE_ENV=development`
- `CHOKIDAR_USEPOLLING=true` (for file watching)
- `WATCHPACK_POLLING=true`

### Production
- `NODE_ENV=production`
- Database credentials via environment variables

## Database
- **Host**: `postgres` (container name)
- **Port**: `5432` (internal container port)
- **External Port**: `15432` (host port)
- **Database**: `workflow_db`
- **User**: `workflow_user`
- **Password**: `workflow_password`

## Notes
- Development uses volume mounting for live code changes
- Production builds optimized images without volumes
- Frontend serves static files via Nginx in production
- Backend runs Node.js directly in production

