#!/bin/bash

# FieldMind Quick Setup Script

set -e

echo "🚀 FieldMind Setup Script"
echo "=========================="
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js 20+ required. You have: $(node -v)"
    exit 1
fi
echo "✅ Node.js version OK: $(node -v)"
echo ""

# Check Docker
echo "🐳 Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    exit 1
fi
echo "✅ Docker found: $(docker --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Start Docker services
echo "🐳 Starting PostgreSQL and Redis..."
docker compose up -d
echo "⏳ Waiting for services to be ready..."
sleep 5
echo "✅ Infrastructure running"
echo ""

# Setup API
echo "🔧 Setting up API..."
cd apps/api

# Copy environment file if doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit apps/api/.env with your configuration"
fi

# Generate Prisma client
echo "🔨 Generating Prisma client..."
npx prisma generate

# Run migrations
echo "🔄 Running database migrations..."
npx prisma migrate dev --name init

# Seed database
echo "🌱 Seeding database..."
npm run seed

cd ../..
echo "✅ API setup complete"
echo ""

# Setup web
echo "🌐 Setting up web app..."
cd apps/web
if [ ! -f .env.local ]; then
    cp .env.example .env.local
fi
cd ../..
echo "✅ Web setup complete"
echo ""

# Setup mobile
echo "📱 Setting up mobile app..."
cd apps/mobile
if [ ! -f .env ]; then
    cp .env.example .env
fi
cd ../..
echo "✅ Mobile setup complete"
echo ""

echo "✨ Setup complete!"
echo ""
echo "🎉 You can now start development with:"
echo "   npm run dev"
echo ""
echo "📧 Demo credentials:"
echo "   Admin: admin@proptrax.com / password123"
echo "   Field: field@proptrax.com / password123"
echo ""
echo "📚 Documentation:"
echo "   API: http://localhost:3001/api-docs"
echo "   Web: http://localhost:3000"
echo ""
