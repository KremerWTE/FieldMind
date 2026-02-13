# FieldMind Quick Start Guide 🚀

Get FieldMind API running in 5 minutes with auto-seeded test data!

## Prerequisites

- ✅ **.NET 10 SDK** - Already installed (confirmed via build)
- ✅ **Docker Desktop** - Install from [docker.com](https://www.docker.com/products/docker-desktop)
- ✅ **Git** - Already installed

## Step 1: Start Docker Services (1 minute)

### Windows:
1. Open **Docker Desktop**
2. Wait for Docker to fully start (whale icon in system tray)
3. Open PowerShell in the project root:

```powershell
cd C:\Users\Chris Kremer\Documents\GitHub\FieldMind
docker compose up -d
```

### Verify Services:
```powershell
docker compose ps
```

You should see:
- `postgres` - Running on port 5432
- `redis` - Running on port 6379

## Step 2: Run the API (Auto-migration & Auto-seeding) (2 minutes)

```powershell
cd apps\api
dotnet run
```

**What happens automatically:**
1. ✅ Database migrations are applied
2. ✅ Database is seeded with test data
3. ✅ Hangfire dashboard starts
4. ✅ API starts on http://localhost:5000

**Look for these console messages:**
```
✅ Database migrations applied successfully
✅ Database seeded successfully!
Created:
  - 1 Team: Prop-Trax Demo
  - 3 Users: admin@fieldmind.io, pm@fieldmind.io, tech@fieldmind.io (password: password123)
  - 3 Buildings
  - 3 Projects
  - 3 Folders
  - 4 Photos with AI annotations
  - 2 Critical maintenance events
  - 7 Building health stats
  - 2 Photo notes
  - 3 Photo tasks
🚀 FieldMind API (.NET 10) running
📚 API Documentation: http://localhost:5000/api-docs
🔧 Hangfire Dashboard: http://localhost:5000/hangfire
🤖 AI Provider: mock
```

## Step 3: Test the API (2 minutes)

### Option A: Swagger UI (Recommended)
1. Open browser: http://localhost:5000/api-docs
2. Click "Authorize" button
3. Login first to get a token:
   - POST `/auth/login`
   - Request body:
     ```json
     {
       "email": "admin@fieldmind.io",
       "password": "password123"
     }
     ```
   - Copy the `token` from response
4. Click "Authorize" again, paste token, click "Authorize"
5. Now test any endpoint!

### Option B: cURL Commands

**Login:**
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fieldmind.io","password":"password123"}'
```

**Get Buildings:**
```bash
curl -X GET http://localhost:5000/buildings \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Search Photos:**
```bash
curl -X GET "http://localhost:5000/search/photos?query=hail+damage" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Step 4: Explore Hangfire Dashboard

Visit: http://localhost:5000/hangfire

- **Jobs**: See background jobs (AI processing, report generation)
- **Recurring Jobs**: None yet (can be added)
- **Servers**: Active Hangfire workers
- **Retries**: Failed job retry queue

## Test Data Overview

### 👥 Users (All passwords: `password123`)
1. **admin@fieldmind.io** - Admin role (full access)
2. **pm@fieldmind.io** - Project Manager role
3. **tech@fieldmind.io** - Field Technician role

### 🏢 Buildings
1. **Downtown Office Complex** - Chicago, IL
   - 🚨 Critical hail damage (severity 88)
   - 1 open maintenance event
   - Roof integrity declining
2. **Riverside Apartments** - Chicago, IL
   - 🚨 Critical water intrusion (severity 92)
   - 1 open maintenance event
   - High water risk
3. **Industrial Warehouse #7** - Chicago, IL
   - ✅ Good condition (severity 18)
   - Minor cosmetic wear

### 📂 Projects
1. **Q1 2025 Roof Inspection** - Building 1
2. **Storm Damage Assessment** - Building 2
3. **Annual Facility Inspection** - Building 3

### 📸 Photos (4 total)
1. **Severe hail damage** - AI analyzed, critical severity
2. **Minor roof aging** - AI analyzed, low severity
3. **Active water leak** - AI analyzed, critical severity
4. **Warehouse exterior** - AI analyzed, good condition

### 📊 AI Annotations
All photos have complete AI analysis with:
- Short & full descriptions
- Tags and categories
- Detected issues with severity and confidence
- Repair priority recommendations
- Structural impact scores

### 🔧 Maintenance Events (2 critical)
1. Hail damage on Building 1 (open)
2. Water intrusion on Building 2 (open)

### 📝 Tasks (3 total)
1. Get contractor quotes (in progress)
2. Schedule plumber (done)
3. Ceiling repair (open)

## Optional: Enable Email Notifications

Edit `apps/api/appsettings.json`:

```json
{
  "Email": {
    "Enabled": true,
    "SmtpHost": "smtp.gmail.com",
    "SmtpPort": 587,
    "SmtpUser": "your-email@gmail.com",
    "SmtpPassword": "your-gmail-app-password",
    "UseSsl": true
  }
}
```

**Gmail Setup:**
1. Enable 2FA on Google Account
2. Generate App Password: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Use app password in configuration

Restart API after configuration change.

## API Endpoints Quick Reference

### 🔐 Authentication
- `POST /auth/register` - Create account
- `POST /auth/login` - Get JWT token
- `POST /auth/refresh` - Refresh token
- `GET /me` - Current user info

### 🏢 Buildings (8 endpoints)
- `GET /buildings` - List all buildings
- `GET /buildings/{id}` - Building details
- `GET /buildings/{id}/photos` - Photos for building
- `GET /buildings/{id}/maintenance-events` - Maintenance timeline
- `GET /buildings/{id}/health-stats` - Health metrics over time

### 📂 Projects (7 endpoints)
- `GET /projects` - List projects
- `POST /projects` - Create project
- `GET /projects/{id}/folders` - List folders

### 📸 Photos (12 endpoints)
- `POST /photos/presign-upload` - Get S3 upload URL
- `POST /photos/complete-upload` - Finalize upload & trigger AI
- `GET /photos` - Search/filter photos
- `GET /photos/{id}` - Photo details with AI analysis
- `POST /photos/{id}/ai/regenerate` - Re-run AI analysis

### 🔍 Search (4 endpoints)
- `GET /search/photos` - Full-text search with filters
- `GET /search/tags` - Get all unique tags
- `GET /search/categories` - Get all categories
- `GET /search/suggestions` - Search suggestions

### 📄 Reports (4 endpoints)
- `POST /reports/generate` - Generate PDF report (async)
- `GET /reports/{jobId}/status` - Check generation status
- `GET /reports` - List all report jobs
- `DELETE /reports/{jobId}` - Delete report

### 🔗 Share Links (5 endpoints)
- `POST /share-links` - Create share link
- `GET /share-links` - List all links
- `GET /share/{token}` - Public gallery view
- `POST /share/{token}/validate-password` - Validate password
- `DELETE /share-links/{id}` - Revoke link

### 📦 Features (4 endpoints)
- `GET /features` - List product features
- `GET /features/categories` - Feature categories
- `GET /features/stats` - Feature statistics

### 🏢 Company (4 endpoints)
- `GET /company/info` - Company information
- `GET /company/stats` - Company statistics
- `GET /company/testimonials` - Customer testimonials
- `GET /company/pricing` - Pricing plans

**Total: 47 API Endpoints**

## Testing AI Processing

### 1. Upload a Photo (simulated)
Since we don't have real S3 configured, AI analysis works on the seeded photos.

### 2. Manually Trigger AI Analysis
In Hangfire dashboard:
- Go to "Jobs" → "Enqueued"
- Or create a new job in Swagger using photo ID

### 3. Check Results
```bash
GET /photos/{photoId}
```

Response includes `aiAnnotation` with:
- Descriptions
- Tags, categories
- Detected issues
- Severity score

## Testing Report Generation

### 1. Generate Building Report
```bash
POST /reports/generate
{
  "type": "Building",
  "entityId": "BUILDING_ID_FROM_GET_BUILDINGS",
  "includeAI": true,
  "includeMaintenanceEvents": true,
  "includeHealthStats": true
}
```

### 2. Check Status
```bash
GET /reports/{jobId}/status
```

### 3. Download PDF
Once status is `Complete`, use the `downloadUrl` from the response.

**Note:** Requires AWS S3 configuration for actual file upload.

## Troubleshooting

### PostgreSQL Connection Failed
- ✅ Check Docker Desktop is running
- ✅ Run `docker compose up -d`
- ✅ Verify port 5432 is not in use: `netstat -an | findstr 5432`

### Database Already Seeded
The seeder only runs once. To re-seed:
1. Drop database: `docker compose down -v`
2. Restart: `docker compose up -d`
3. Run API: `dotnet run`

### Swagger Shows Unauthorized
1. Login first: `POST /auth/login`
2. Copy token from response
3. Click "Authorize" button in Swagger
4. Paste token (without "Bearer" prefix)
5. Click "Authorize"

### Hangfire Dashboard Not Loading
- Only available in Development mode
- Ensure `ASPNETCORE_ENVIRONMENT=Development`
- Check console for error messages

## Next Steps

### 🎨 Frontend Development
- Web app: `apps/web` (Next.js scaffold ready)
- Mobile app: `apps/mobile` (Expo React Native scaffold ready)

### 🔧 Configuration
- Set up real AWS S3 bucket for photo storage
- Configure OpenAI API key for real AI analysis
- Set up email SMTP for notifications

### 📚 Documentation
- Read `DOTNET_COMPLETE.md` for full implementation details
- Read `AI_PROCESSING.md` for AI system architecture
- Read `SEARCH.md` for search functionality
- Read `EMAIL_INTEGRATION_COMPLETE.md` for email setup

### 🧪 Testing
- Test all 47 endpoints in Swagger
- Upload real photos (configure S3 first)
- Generate reports with real data
- Test email notifications

## Production Checklist

Before deploying to production:
- [ ] Configure production database (Heroku Postgres, AWS RDS, etc.)
- [ ] Set up AWS S3 bucket with proper security
- [ ] Add OpenAI API key for real AI analysis
- [ ] Configure production SMTP (SendGrid, Mailgun, etc.)
- [ ] Set strong JWT secret
- [ ] Enable HTTPS only
- [ ] Set up monitoring (Sentry, Application Insights)
- [ ] Configure CORS for production frontend URL
- [ ] Set up automated backups
- [ ] Add rate limiting
- [ ] Review security settings

## Support

- **Documentation**: Check `*.md` files in project root
- **Logs**: Console output shows detailed request/response info
- **Hangfire**: Monitor background jobs at `/hangfire`
- **Swagger**: API documentation at `/api-docs`

---

**You're all set! 🎉**

The FieldMind API is running with full test data. Start exploring the endpoints in Swagger!
