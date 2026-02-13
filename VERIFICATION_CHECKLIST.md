# FieldMind Implementation Verification Checklist

## 📋 Pre-Flight Checklist

Before running the application, verify these items:

### ✅ Infrastructure
- [ ] Docker Desktop is installed and running
- [ ] Node.js 20+ is installed (`node -v`)
- [ ] PostgreSQL container is running (`docker ps`)
- [ ] Redis container is running (`docker ps`)

### ✅ Environment Configuration
- [ ] `apps/api/.env` exists and is configured
- [ ] `apps/web/.env.local` exists (optional)
- [ ] `apps/mobile/.env` exists (optional)
- [ ] Database URL is correct in `apps/api/.env`
- [ ] JWT_SECRET is set (not default "changeme")
- [ ] AI_PROVIDER is set (mock or openai)

### ✅ Database Setup
- [ ] Prisma client is generated (`npx prisma generate`)
- [ ] Migrations are run (`npx prisma migrate dev`)
- [ ] Database is seeded (`npm run seed`)
- [ ] Can connect to database (`npx prisma studio`)

### ✅ Dependencies
- [ ] Root dependencies installed (`npm install` in root)
- [ ] API dependencies installed (automatic via workspace)
- [ ] Web dependencies installed (automatic via workspace)
- [ ] Mobile dependencies installed (automatic via workspace)

## 🧪 Testing Checklist

### API Tests

#### 1. Health Check
```bash
curl http://localhost:3001
# Expected: API response or 404 (app is running)
```

#### 2. Register User
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123",
    "firstName": "Test",
    "lastName": "User",
    "teamSlug": "test-team"
  }'
# Expected: User object + access token
```

#### 3. Login
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@proptrax.com",
    "password": "password123"
  }'
# Expected: { user, accessToken, refreshToken }
```

#### 4. Get Buildings (requires auth)
```bash
curl http://localhost:3001/buildings \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
# Expected: { data: [...], meta: {...} }
```

#### 5. Get Projects
```bash
curl http://localhost:3001/projects \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
# Expected: Array of projects
```

#### 6. Presign Upload
```bash
curl -X POST http://localhost:3001/photos/presign-upload \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "buildingId": "YOUR_BUILDING_ID",
    "projectId": "YOUR_PROJECT_ID",
    "filename": "test.jpg",
    "contentType": "image/jpeg"
  }'
# Expected: { uploadUrl, key, photoId }
```

### Web Tests

#### 1. Landing Page
- [ ] Navigate to http://localhost:3000
- [ ] Page loads without errors
- [ ] See FieldMind title and description
- [ ] "Go to Dashboard" and "Login" buttons visible

#### 2. Styling
- [ ] Tailwind CSS is working
- [ ] Fonts load correctly
- [ ] Responsive design works

### Mobile Tests

#### 1. Expo Start
```bash
cd apps/mobile
npm start
```
- [ ] Expo Dev Tools opens
- [ ] QR code displays
- [ ] No build errors

#### 2. Login Screen
- [ ] Login screen displays
- [ ] Email/password inputs work
- [ ] Login button is visible

#### 3. Navigation
- [ ] Bottom tabs visible after "login"
- [ ] Can navigate between Projects and Upload

## 🔍 Database Verification

### Using Prisma Studio
```bash
cd apps/api
npx prisma studio
```

Check that these tables exist and have data:
- [ ] User (2 users: admin, field)
- [ ] Team (1 team: Prop-Trax Demo)
- [ ] Building (1 building: 123 Main Street)
- [ ] Project (1 project: Roof Inspection Q1 2024)
- [ ] Folder (2 folders: Exterior, Roof)
- [ ] Photo (3 photos with mock data)
- [ ] AiAnnotation (3 annotations)
- [ ] MaintenanceEvent (1-2 events)
- [ ] BuildingHealthStat (4 metrics)

### Using PostgreSQL CLI
```bash
docker exec -it fieldmind-postgres psql -U postgres -d fieldmind
```

```sql
-- Check tables exist
\dt

-- Count records
SELECT 'Users' as table_name, COUNT(*) FROM "User"
UNION ALL
SELECT 'Buildings', COUNT(*) FROM "Building"
UNION ALL
SELECT 'Photos', COUNT(*) FROM "Photo"
UNION ALL
SELECT 'AI Annotations', COUNT(*) FROM "AiAnnotation";

-- View sample photo with AI
SELECT p.id, p."s3Key", p."aiStatus", a."shortDescription"
FROM "Photo" p
LEFT JOIN "AiAnnotation" a ON a."photoId" = p.id
LIMIT 3;
```

## 🎯 Feature Verification

### Authentication
- [ ] Can register new user
- [ ] Can login with credentials
- [ ] Receive JWT access token
- [ ] Can access protected endpoints with token
- [ ] Unauthorized access is blocked (401)

### Buildings
- [ ] Can list buildings (with team scope)
- [ ] Can create building
- [ ] Can get building details
- [ ] Can get building photos
- [ ] Can get building maintenance events
- [ ] Can get building health stats

### Projects
- [ ] Can list projects
- [ ] Can create project (linked to building)
- [ ] Can get project details
- [ ] Can create folders in project

### Photos
- [ ] Can request presigned upload URL
- [ ] Upload creates Photo record
- [ ] Complete upload updates metadata
- [ ] AI job is enqueued
- [ ] Can list photos with filters
- [ ] Can get photo details with AI annotation

### AI Processing
- [ ] Mock provider returns data (AI_PROVIDER=mock)
- [ ] Photo status changes: pending → processing → complete
- [ ] AiAnnotation is created
- [ ] Severity score is calculated
- [ ] High-severity issues create MaintenanceEvent
- [ ] Building health stats are updated

### Maintenance
- [ ] Can list maintenance events
- [ ] Can filter by building/status/severity
- [ ] Can get event details
- [ ] Can update event status

### Share Links
- [ ] Can create share link
- [ ] Can access shared content without auth
- [ ] Password protection works
- [ ] Expiration is enforced

## 📊 Swagger API Docs

- [ ] Navigate to http://localhost:3001/api-docs
- [ ] All endpoints are documented
- [ ] Can test endpoints from Swagger UI
- [ ] Request/response schemas are shown

## 🐛 Common Issues & Solutions

### Issue: Database connection failed
**Solution:**
```bash
# Check if PostgreSQL is running
docker ps

# Restart containers
docker compose restart

# Check DATABASE_URL in .env
# Should be: postgresql://postgres:postgres@localhost:5432/fieldmind
```

### Issue: Prisma client not found
**Solution:**
```bash
cd apps/api
npx prisma generate
```

### Issue: Migrations fail
**Solution:**
```bash
# Reset database (warning: deletes all data)
npx prisma migrate reset

# Or delete and recreate
docker compose down -v
docker compose up -d
sleep 5
npx prisma migrate dev
```

### Issue: AI jobs not processing
**Solution:**
```bash
# Check Redis
docker logs fieldmind-redis

# Check BullMQ queue
redis-cli
> LLEN bull:photo-ai-analysis:wait

# Restart API to reconnect to Redis
```

### Issue: Port already in use
**Solution:**
```bash
# Find process using port 3001
lsof -i :3001  # Mac/Linux
netstat -ano | findstr :3001  # Windows

# Kill process or change PORT in .env
```

### Issue: Module not found
**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Or clean and reinstall
npm run clean
npm install
```

## ✅ Success Criteria

You've successfully set up FieldMind when:

- ✅ All 3 apps start without errors
- ✅ Can login with demo credentials
- ✅ Can view buildings in API response
- ✅ Can view projects in API response
- ✅ Swagger docs are accessible
- ✅ Database has seed data
- ✅ AI mock provider returns annotations
- ✅ Photos can be queried via API
- ✅ Health stats exist for demo building

## 🎉 Next Steps

Once verification is complete:

1. **Explore the API** via Swagger docs
2. **Test photo upload** flow
3. **Trigger AI analysis** by completing an upload
4. **View building health** stats
5. **Create maintenance events** manually
6. **Build web UI pages** for your workflows
7. **Implement mobile screens** for field work
8. **Customize AI prompts** for your use case
9. **Configure production** environment
10. **Deploy to staging/production**

---

**Need help?** Check IMPLEMENTATION_SUMMARY.md for detailed information.
