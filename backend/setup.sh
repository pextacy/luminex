#!/bin/bash

# Luminex Backend Setup Script
# This script sets up the development environment

set -e

echo "🚀 Setting up Luminex Backend..."

# Navigate to backend directory
cd "$(dirname "$0")"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi

echo "✅ npm version: $(npm --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your actual configuration values!"
fi

# Generate Prisma client
echo "🗃️  Generating Prisma client..."
npx prisma generate

# Check if Docker is running for database
if command -v docker &> /dev/null; then
    echo "🐳 Docker is available"
    
    read -p "Do you want to start development databases with Docker? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗄️  Starting PostgreSQL and Redis..."
        docker-compose -f ../docker-compose.dev.yml up -d postgres redis
        
        # Wait for database to be ready
        echo "⏳ Waiting for database to be ready..."
        sleep 5
        
        # Run database migrations
        echo "🔄 Running database migrations..."
        npx prisma migrate dev --name init
    fi
else
    echo "⚠️  Docker not found. Make sure you have PostgreSQL and Redis running."
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Update your .env file with proper configuration"
echo "  2. Start development databases: docker-compose -f docker-compose.dev.yml up -d"
echo "  3. Run migrations: cd backend && npx prisma migrate dev"
echo "  4. Seed the database: npx prisma db seed"
echo "  5. Start the server: npm run dev"
echo ""
echo "🔗 API will be available at: http://localhost:3001"
echo "🔗 Health check: http://localhost:3001/health"
echo "🔗 WebSocket: ws://localhost:3001/ws"
