# Crypto Wallet - Production Deployment Helper

.PHONY: help build up down logs clean restart backend frontend

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build all Docker images
	docker-compose build --no-cache

up: ## Start all services
	docker-compose up -d

down: ## Stop all services
	docker-compose down

logs: ## View logs from all services
	docker-compose logs -f

backend-logs: ## View backend logs only
	docker-compose logs -f backend

frontend-logs: ## View frontend logs only
	docker-compose logs -f frontend

restart: ## Restart all services
	docker-compose restart

clean: ## Remove all containers, images, and volumes
	docker-compose down -v --rmi all

status: ## Show status of all services
	docker-compose ps

shell-backend: ## Open shell in backend container
	docker-compose exec backend sh

shell-frontend: ## Open shell in frontend container
	docker-compose exec frontend sh

dev: ## Start in development mode
	docker-compose -f docker-compose.dev.yml up

prod: ## Build and start in production mode
	docker-compose build && docker-compose up -d

health: ## Check health of all services
	@echo "Backend health:"
	@curl -s http://localhost:5000/health || echo "Backend is down"
	@echo "\nFrontend health:"
	@curl -s http://localhost:3001/ > /dev/null && echo "Frontend is up" || echo "Frontend is down"
