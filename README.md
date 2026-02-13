# FieldMind

**AI-Powered Photo Management & Maintenance Monitoring System**

FieldMind is a production-ready web + mobile application for contractors and property managers to capture, organize, and analyze job site photos with deep integration into the Prop-Trax building intelligence platform.

## Key Features

✨ **AI-Powered Analysis**
- Automatic photo analysis using vision AI (OpenAI GPT-4 Vision or mock provider)
- Detailed technical descriptions and issue detection
- Severity scoring and repair priority estimation
- Automatic maintenance event creation for critical issues

🏢 **Building-Centric Design**
- All photos linked to Prop-Trax buildings
- Building health metrics tracking (roof integrity, water risk, structural risk, hail exposure)
- Maintenance timeline and event management
- GPS-based building suggestions

📸 **Professional Photo Management**
- Secure S3 storage with presigned URLs
- Project and folder organization
- Metadata extraction (EXIF, GPS, timestamp)
- Full-text search and filtering

🤝 **Collaboration Features**
- Photo notes and task management
- Role-based access control (Admin, PM, Field Tech, Office, Client Viewer)
- Share links with optional password protection
- PDF report generation

## Tech Stack

### Backend (NestJS)
- **Framework**: NestJS + TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Queue**: BullMQ + Redis
- **Storage**: AWS S3
- **AI**: OpenAI Vision API (provider-agnostic)

### Web (Next.js)
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: React hooks + API client

### Mobile (Expo)
- **Framework**: Expo + React Native
- **Navigation**: React Navigation
- **Camera**: Expo Camera + Image Picker
- **Storage**: Expo SecureStore

## Project Structure

```
FieldMind/
├── apps/
│   ├── api/              # NestJS backend
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── teams/
│   │   │   ├── buildings/
│   │   │   ├── projects/
│   │   │   ├── photos/
│   │   │   ├── maintenance/
│   │   │   ├── stats/
│   │   │   ├── share/
│   │   │   ├── reports/
│   │   │   ├── ai/
│   │   │   ├── jobs/
│   │   │   └── storage/
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       └── seed.ts
│   ├── web/              # Next.js web app
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   └── mobile/           # Expo mobile app
│       ├── src/
│       │   ├── screens/
│       │   ├── navigation/
│       │   └── services/
│       └── App.tsx
├── packages/
│   └── shared/           # Shared types
└── docker-compose.yml
```

## Getting Started

### Prerequisites

- Node.js 20+
- Docker + Docker Compose
- AWS account (for S3)
- OpenAI API key (optional, can use mock provider)

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Infrastructure

```bash
docker compose up -d
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379

### 3. Configure Environment

Create `.env` files from examples:

```bash
# API
cp apps/api/.env.example apps/api/.env

# Web
cp apps/web/.env.example apps/web/.env

# Mobile
cp apps/mobile/.env.example apps/mobile/.env
```

Edit `apps/api/.env`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fieldmind
REDIS_URL=redis://localhost:6379

JWT_SECRET=your-secret-key-change-this

AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
S3_BUCKET=your-bucket-name

AI_PROVIDER=mock  # or 'openai'
OPENAI_API_KEY=your-openai-key  # if using OpenAI
```

### 4. Run Database Migrations

```bash
cd apps/api
npx prisma migrate dev
npx prisma generate
```

### 5. Seed Database

```bash
npm run seed
```

This creates:
- Demo team "Prop-Trax Demo"
- Admin user: `admin@proptrax.com` / `password123`
- Field tech user: `field@proptrax.com` / `password123`
- Sample building, project, and photos with AI annotations

### 6. Start Development Servers

```bash
# From root directory (runs all apps in parallel)
npm run dev
```

Or start individually:

```bash
# API (port 3001)
cd apps/api && npm run dev

# Web (port 3000)
cd apps/web && npm run dev

# Mobile
cd apps/mobile && npm start
```

## Usage

### Web App

1. Open http://localhost:3000
2. Login with demo credentials
3. Navigate to Buildings → View building details
4. See photos, AI analysis, maintenance events, and health stats

### Mobile App

1. Start Expo: `cd apps/mobile && npm start`
2. Scan QR code with Expo Go app
3. Login with demo credentials
4. Browse projects and upload photos

### API Documentation

- Swagger docs: http://localhost:3001/api-docs
- Health check: http://localhost:3001

## Key Workflows

### Photo Upload Flow

1. **Client** requests presigned URL: `POST /photos/presign-upload`
   - Validates building + project belong to team
   - Creates Photo record in DB
   - Generates S3 presigned PUT URL (5 min expiry)

2. **Client** uploads file directly to S3 using presigned URL

3. **Client** completes upload: `POST /photos/complete-upload`
   - Updates photo metadata (GPS, EXIF, timestamp)
   - Enqueues AI analysis job

4. **Worker** processes AI job:
   - Fetches photo from S3
   - Calls vision AI API
   - Saves AiAnnotation
   - Auto-creates MaintenanceEvent if high severity
   - Updates BuildingHealthStat

### AI Analysis

The system supports pluggable AI providers:

- **Mock Provider** (default for development)
  - Returns realistic fake data
  - No API calls, instant results

- **OpenAI Provider** (production)
  - Uses GPT-4 Vision API
  - Structured JSON output
  - Configurable via `AI_PROVIDER=openai`

### Building Health Metrics

Automatically calculated from AI detections:

- **roofIntegrity** (0-100, higher = better)
  - Decreases with roof-related issues

- **waterRisk** (0-100, higher = worse)
  - Increases with water intrusion detections

- **hailExposure** (cumulative count)
  - Increments for each hail damage detection

- **structuralRisk** (0-100, max over time)
  - Tracks highest structural impact score

## API Endpoints

### Auth
- `POST /auth/register` - Create account
- `POST /auth/login` - Login (returns JWT)
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Logout

### Buildings
- `GET /buildings` - List buildings
- `POST /buildings` - Create building
- `GET /buildings/:id` - Building details
- `GET /buildings/:id/photos` - Building photos
- `GET /buildings/:id/maintenance-events` - Maintenance timeline
- `GET /buildings/:id/health-stats` - Health metrics

### Projects
- `GET /projects` - List projects
- `POST /projects` - Create project (requires buildingId)
- `GET /projects/:id` - Project details
- `POST /projects/:id/folders` - Create folder

### Photos
- `POST /photos/presign-upload` - Get S3 upload URL
- `POST /photos/complete-upload` - Finalize upload + trigger AI
- `GET /photos` - Search/filter photos
- `GET /photos/:id` - Photo details + AI
- `POST /photos/:id/ai/regenerate` - Re-run AI (Admin/PM)
- `POST /photos/:id/notes` - Add note
- `POST /photos/:id/tasks` - Create task

### Maintenance
- `GET /maintenance-events` - List events
- `PATCH /maintenance-events/:id/status` - Update status

### Share
- `POST /share/links` - Create share link
- `GET /share/:token` - Public gallery (no auth)

### Reports
- `POST /reports/photo-pdf` - Generate PDF (async)
- `GET /reports/:jobId/status` - Check status

## Database Schema

Key models:
- `User` - Team members with roles
- `Team` - Organization/company
- `Building` - Prop-Trax building (required for all photos)
- `Project` - Job/inspection (belongs to building)
- `Folder` - Organization within project
- `Photo` - Image with S3 reference
- `AiAnnotation` - AI analysis results
- `MaintenanceEvent` - Auto-created or manual events
- `BuildingHealthStat` - Time-series health metrics
- `ShareLink` - Public sharing with optional password

## Security

- JWT authentication (15 min access token, 7 day refresh token)
- Role-based access control (RBAC)
- Private S3 bucket with presigned URLs
- Password hashing with bcrypt
- Team-scoped data isolation

## Production Deployment

### Checklist

- [ ] Set strong `JWT_SECRET`
- [ ] Configure AWS S3 bucket with lifecycle policies
- [ ] Set up Redis (managed or self-hosted)
- [ ] Configure database connection pooling
- [ ] Set `AI_PROVIDER=openai` with valid API key
- [ ] Enable CORS for production frontend URL
- [ ] Set up monitoring (Sentry, LogDrain)
- [ ] Configure automated database backups
- [ ] Set up CDN for S3 (optional: CloudFront)

### Scaling

- **Horizontal**: Run multiple API instances (stateless design)
- **Workers**: Dedicated BullMQ worker processes
- **Database**: Read replicas for analytics
- **CDN**: CloudFront for photo delivery

## Development

### Running Tests

```bash
# API tests
cd apps/api
npm test

# E2E tests (web)
cd apps/web
npm run test:e2e
```

### Database Management

```bash
# Create migration
cd apps/api
npx prisma migrate dev --name your-migration-name

# Reset database
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio
```

### AI Provider Development

Create new provider in `apps/api/src/ai/providers/`:

```typescript
import { IVisionAnnotator, VisionAnnotationInput, VisionAnnotationOutput } from '../interfaces/vision-annotator.interface';

export class MyCustomProvider implements IVisionAnnotator {
  async annotate(input: VisionAnnotationInput): Promise<VisionAnnotationOutput> {
    // Your implementation
  }
}
```

Register in `ai.service.ts`.

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps

# View logs
docker logs fieldmind-postgres

# Restart services
docker compose restart
```

### AI Jobs Not Processing

```bash
# Check Redis
docker logs fieldmind-redis

# Inspect queue
redis-cli
> LLEN bull:photo-ai-analysis:wait
```

### S3 Upload Failures

- Verify AWS credentials
- Check bucket exists and region matches
- Ensure IAM permissions include `s3:PutObject`, `s3:GetObject`

## License

Proprietary - All rights reserved

## Support

For issues or questions:
- GitHub Issues: https://github.com/proptrax/fieldmind/issues
- Email: support@proptrax.com

---

**Built with ❤️ for Prop-Trax by the FieldMind team**
