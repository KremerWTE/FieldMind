# FieldMind .NET 10 Quick Start Guide

## 🎉 What's Been Built

Your FieldMind backend has been **rebuilt with .NET 10** (ASP.NET Core)!

### ✅ Core Features Complete:
- **13 Entity Framework Models** (User, Team, Building, Project, Photo, etc.)
- **Database Context** with all relationships
- **JWT Authentication** (Register, Login, Refresh, Logout)
- **PostgreSQL Integration** via Entity Framework Core
- **Swagger API Documentation**
- **CORS Configuration**
- **Database Migrations** ready to run

## 🚀 Quick Start (5 Minutes)

### 1. Start PostgreSQL
```bash
docker compose up -d
```

### 2. Run Database Migrations
```bash
cd apps/api
dotnet ef database update
```

### 3. Start the API
```bash
dotnet run
```

The API will start on:
- **HTTP**: http://localhost:5000
- **HTTPS**: https://localhost:5001
- **Swagger Docs**: http://localhost:5000/api-docs

## 🧪 Test It Out

### Register a User
```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "password123",
    "firstName": "Admin",
    "lastName": "User",
    "teamSlug": "my-team",
    "teamName": "My Team"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "password123"
  }'
```

You'll get back:
```json
{
  "user": {
    "id": "...",
    "email": "admin@test.com",
    "firstName": "Admin",
    "lastName": "User",
    "role": "FieldTech",
    "teamId": "...",
    "team": {
      "id": "...",
      "name": "My Team",
      "slug": "my-team"
    }
  },
  "accessToken": "eyJ...",
  "refreshToken": "..."
}
```

## 📁 Project Structure

```
apps/api/
├── Controllers/
│   └── AuthController.cs          # ✅ Authentication endpoints
├── Data/
│   ├── FieldMindDbContext.cs      # ✅ EF Core DbContext
│   └── DesignTimeDbContextFactory.cs # ✅ For migrations
├── DTOs/
│   └── AuthDtos.cs                # ✅ Request/Response models
├── Models/                         # ✅ 13 Entity models
│   ├── User.cs
│   ├── Team.cs
│   ├── Building.cs
│   ├── Project.cs
│   ├── Photo.cs
│   ├── AiAnnotation.cs
│   ├── MaintenanceEvent.cs
│   ├── BuildingHealthStat.cs
│   ├── Folder.cs
│   ├── PhotoNote.cs
│   ├── PhotoTask.cs
│   ├── ShareLink.cs
│   └── RefreshToken.cs
├── Services/
│   └── AuthService.cs             # ✅ Auth business logic
├── Migrations/                     # ✅ EF migrations
├── Program.cs                      # ✅ App configuration
├── appsettings.json               # ✅ Configuration
└── FieldMind.Api.csproj           # ✅ Project file
```

## 🔧 Configuration

Edit `appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=fieldmind;Username=postgres;Password=postgres"
  },
  "JWT": {
    "Secret": "your-super-secret-jwt-key-change-this-in-production"
  },
  "Frontend": {
    "Url": "http://localhost:3000"
  },
  "AWS": {
    "Region": "us-east-1",
    "S3Bucket": "fieldmind-photos-dev"
  },
  "AI": {
    "Provider": "mock"
  }
}
```

## 📊 What's Next?

The authentication system is complete! To finish the full application, you need to implement:

### High Priority
1. **BuildingsController** - CRUD for buildings
2. **ProjectsController** - CRUD for projects
3. **PhotosController** - Photo upload with S3
4. **S3StorageService** - AWS S3 integration

### Medium Priority
5. **AiService** - Photo analysis (Mock + OpenAI)
6. **MaintenanceController** - Event management
7. **Background Jobs** - Async photo processing

### Low Priority
8. **StatsController** - Building health metrics
9. **ShareController** - Public sharing
10. **Search** - Full-text search implementation

## 💻 Development Workflow

### Watch Mode
```bash
dotnet watch run
```
Changes to C# files will auto-reload the API!

### Add New Migration
```bash
dotnet ef migrations add MigrationName
dotnet ef database update
```

### Rollback Migration
```bash
dotnet ef migrations remove
```

### View Database
```bash
# Using Prisma Studio (from old Node.js setup)
cd ../..
cd apps/api-old  # if you kept it
npx prisma studio

# Or use a PostgreSQL client
docker exec -it fieldmind-postgres psql -U postgres -d fieldmind
```

## 🌐 Frontend Integration

The **web** and **mobile** apps can stay as-is! Just update the API URL:

**Web** (`apps/web/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

**Mobile** (`apps/mobile/.env`):
```env
EXPO_PUBLIC_API_URL=http://localhost:5000
```

## 📚 Useful Commands

```bash
# Build project
dotnet build

# Run tests (when added)
dotnet test

# Clean build artifacts
dotnet clean

# List installed packages
dotnet list package

# Add a package
dotnet add package PackageName

# Format code
dotnet format
```

## 🐛 Troubleshooting

### "Unable to connect to database"
```bash
# Check PostgreSQL is running
docker ps

# Restart it
docker compose restart postgres
```

### "Migration pending"
```bash
dotnet ef database update
```

### "Port 5000 already in use"
Edit `Properties/launchSettings.json` or use:
```bash
dotnet run --urls "http://localhost:3001"
```

## 🎯 Key Differences from Node.js

| Aspect | Node.js (NestJS) | .NET (ASP.NET Core) |
|--------|------------------|---------------------|
| **Language** | TypeScript | C# |
| **ORM** | Prisma | Entity Framework Core |
| **DI** | Decorators (@Injectable) | Built-in DI container |
| **Config** | .env files | appsettings.json |
| **Packages** | npm/package.json | NuGet/.csproj |
| **Async** | Promise<T> | Task<T> |
| **Runtime** | Node.js | .NET Runtime |

## ✅ Success Criteria

You're ready to develop when:
- ✅ `dotnet run` starts without errors
- ✅ Swagger UI loads at `/api-docs`
- ✅ Can register and login via API
- ✅ Database migrations applied
- ✅ JWT tokens are returned

---

**Current Status**: 🟢 **READY FOR DEVELOPMENT**

The foundation is solid! Start building the remaining controllers and services to match the full FieldMind feature set.
