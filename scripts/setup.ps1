# FieldMind Quick Setup Script (PowerShell)

Write-Host "🚀 FieldMind Setup Script" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js version
Write-Host "📦 Checking Node.js version..." -ForegroundColor Yellow
try {
    $nodeVersion = (node -v).Replace('v','').Split('.')[0]
    if ([int]$nodeVersion -lt 20) {
        Write-Host "❌ Node.js 20+ required. You have: $(node -v)" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Node.js version OK: $(node -v)" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js 20+" -ForegroundColor Red
    exit 1
}

# Check Docker
Write-Host "🐳 Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker found: $dockerVersion" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Docker not found. Please install Docker Desktop" -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install
Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Start Docker services
Write-Host "🐳 Starting PostgreSQL and Redis..." -ForegroundColor Yellow
docker compose up -d
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
Write-Host "✅ Infrastructure running" -ForegroundColor Green
Write-Host ""

# Setup API
Write-Host "🔧 Setting up API..." -ForegroundColor Yellow
Set-Location apps/api

# Copy environment file if doesn't exist
if (-not (Test-Path .env)) {
    Write-Host "📝 Creating .env file..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "⚠️  Please edit apps/api/.env with your configuration" -ForegroundColor Yellow
}

# Generate Prisma client
Write-Host "🔨 Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate

# Run migrations
Write-Host "🔄 Running database migrations..." -ForegroundColor Yellow
npx prisma migrate dev --name init

# Seed database
Write-Host "🌱 Seeding database..." -ForegroundColor Yellow
npm run seed

Set-Location ../..
Write-Host "✅ API setup complete" -ForegroundColor Green
Write-Host ""

# Setup web
Write-Host "🌐 Setting up web app..." -ForegroundColor Yellow
Set-Location apps/web
if (-not (Test-Path .env.local)) {
    Copy-Item .env.example .env.local
}
Set-Location ../..
Write-Host "✅ Web setup complete" -ForegroundColor Green
Write-Host ""

# Setup mobile
Write-Host "📱 Setting up mobile app..." -ForegroundColor Yellow
Set-Location apps/mobile
if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
}
Set-Location ../..
Write-Host "✅ Mobile setup complete" -ForegroundColor Green
Write-Host ""

Write-Host "✨ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🎉 You can now start development with:" -ForegroundColor Cyan
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "📧 Demo credentials:" -ForegroundColor Cyan
Write-Host "   Admin: admin@proptrax.com / password123" -ForegroundColor White
Write-Host "   Field: field@proptrax.com / password123" -ForegroundColor White
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "   API: http://localhost:3001/api-docs" -ForegroundColor White
Write-Host "   Web: http://localhost:3000" -ForegroundColor White
Write-Host ""
