# Workflow Engine Docker Management
# =================================

.PHONY: help dev prod test clean logs shell db backup restore

# Default target
help:
	@echo "Workflow Engine Docker Commands"
	@echo "==============================="
	@echo ""
	@echo "Development:"
	@echo "  dev          Start development environment"
	@echo "  dev-build    Build and start development environment"
	@echo "  dev-logs     View development logs"
	@echo "  dev-shell    Open shell in backend container"
	@echo ""
	@echo "Production:"
	@echo "  prod         Start production environment"
	@echo "  prod-build   Build and start production environment"
	@echo "  prod-logs    View production logs"
	@echo ""
	@echo "Testing:"
	@echo "  test         Run workflow tests"
	@echo "  test-build   Build and run tests"
	@echo "  test-runner  Run manual test suite"
	@echo ""
	@echo "Database:"
	@echo "  db           Connect to database"
	@echo "  db-backup    Backup database"
	@echo "  db-restore   Restore database"
	@echo ""
	@echo "Maintenance:"
	@echo "  clean        Clean up containers and volumes"
	@echo "  logs         View all logs"
	@echo "  status       Show container status"
	@echo "  restart      Restart all services"

# Development Environment
dev:
	docker-compose up -d

dev-build:
	docker-compose up --build -d

dev-logs:
	docker-compose logs -f

dev-shell:
	docker-compose exec backend sh

# Production Environment
prod:
	docker-compose -f docker-compose.prod.yml up -d

prod-build:
	docker-compose -f docker-compose.prod.yml up --build -d

prod-logs:
	docker-compose -f docker-compose.prod.yml logs -f

# Testing
test:
	docker-compose --profile testing up --build

test-build:
	docker-compose --profile testing build

test-runner:
	docker-compose run --rm workflow-tester npm run test:runner

# Database Management
db:
	docker-compose exec postgres psql -U workflow_user -d workflow_db

db-backup:
	docker-compose exec postgres pg_dump -U workflow_user workflow_db > backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "Database backed up to backup_$(shell date +%Y%m%d_%H%M%S).sql"

db-restore:
	@echo "Available backups:"
	@ls -la backup_*.sql 2>/dev/null || echo "No backups found"
	@echo ""
	@read -p "Enter backup filename: " file; \
	docker-compose exec -T postgres psql -U workflow_user workflow_db < $$file

# Maintenance
clean:
	docker-compose down -v
	docker system prune -f

logs:
	docker-compose logs -f

status:
	docker-compose ps

restart:
	docker-compose restart

# Health Checks
health:
	@echo "Checking service health..."
	@curl -s http://localhost:4000/health | jq . || echo "Backend health check failed"
	@curl -s http://localhost:3000 > /dev/null && echo "Frontend is accessible" || echo "Frontend health check failed"
	@docker-compose exec postgres pg_isready -U workflow_user -d workflow_db > /dev/null && echo "Database is ready" || echo "Database health check failed"

# Quick Setup
setup:
	@echo "Setting up Workflow Engine..."
	@echo "1. Starting services..."
	@make dev-build
	@echo "2. Waiting for services to be ready..."
	@sleep 10
	@echo "3. Running health checks..."
	@make health
	@echo ""
	@echo "Setup complete! Access the application at:"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Backend:  http://localhost:4000"
	@echo "  Adminer:  http://localhost:8080"

# Development helpers
dev-restart:
	docker-compose restart backend frontend

dev-rebuild:
	docker-compose down
	docker-compose up --build -d

# Production helpers
prod-restart:
	docker-compose -f docker-compose.prod.yml restart

prod-rebuild:
	docker-compose -f docker-compose.prod.yml down
	docker-compose -f docker-compose.prod.yml up --build -d

# Monitoring
monitor:
	@echo "Service Status:"
	@docker-compose ps
	@echo ""
	@echo "Resource Usage:"
	@docker stats --no-stream
	@echo ""
	@echo "Recent Logs:"
	@docker-compose logs --tail=10

# Database helpers
db-reset:
	@echo "Resetting database..."
	docker-compose exec postgres psql -U workflow_user -d workflow_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
	@echo "Database reset complete"

db-seed:
	@echo "Seeding database with test data..."
	docker-compose exec backend npm run test:runner
	@echo "Database seeded with test data"

# Workflow specific
workflow-status:
	@echo "Workflow Execution Status:"
	@curl -s http://localhost:4000/health | jq '.stats' || echo "Unable to fetch workflow status"

workflow-trigger:
	@echo "Triggering test workflow..."
	@curl -X POST http://localhost:4000/api/workflow/trigger \
		-H "Content-Type: application/json" \
		-d '{"type": "subscription", "product": "united"}' || echo "Workflow trigger failed"

# Environment management
env-check:
	@echo "Checking environment variables..."
	@echo "DB_HOST: $(DB_HOST)"
	@echo "DB_PORT: $(DB_PORT)"
	@echo "DB_USER: $(DB_USER)"
	@echo "SMTP_HOST: $(SMTP_HOST)"
	@echo "NODE_ENV: $(NODE_ENV)"

# Quick commands
up: dev
down: clean
build: dev-build
logs: dev-logs
shell: dev-shell
