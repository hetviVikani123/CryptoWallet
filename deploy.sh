#!/bin/bash

# Quick Deployment Script for Linux/Mac

set -e

echo "================================"
echo "Crypto Wallet Deployment Script"
echo "================================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "ERROR: Docker is not running!"
    echo "Please start Docker and try again."
    exit 1
fi

echo "[1/5] Checking environment file..."
if [ ! -f .env ]; then
    echo "WARNING: .env file not found!"
    echo "Creating from .env.example..."
    cp .env.example .env
    echo ""
    echo "IMPORTANT: Please edit .env file with your credentials before continuing!"
    echo ""
    read -p "Press enter to continue..."
fi

echo "[2/5] Building Docker images..."
docker-compose build --no-cache

echo "[3/5] Starting services..."
docker-compose up -d

echo "[4/5] Waiting for services to be healthy..."
sleep 10

echo "[5/5] Checking health..."
if curl -s http://localhost:5000/health > /dev/null; then
    echo "Backend: OK"
else
    echo "WARNING: Backend health check failed"
fi

if curl -s http://localhost:3001/ > /dev/null; then
    echo "Frontend: OK"
else
    echo "WARNING: Frontend health check failed"
fi

echo ""
echo "================================"
echo "Deployment Complete!"
echo "================================"
echo ""
echo "Services:"
echo "  Frontend: http://localhost:3001"
echo "  Backend:  http://localhost:5000"
echo "  Nginx:    http://localhost:80"
echo ""
echo "Admin Credentials:"
echo "  Email:    admin@gmail.com"
echo "  Password: Admin@123"
echo ""
echo "View logs:     docker-compose logs -f"
echo "Stop services: docker-compose down"
echo ""
