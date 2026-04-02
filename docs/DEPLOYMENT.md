# FieldMind Deployment Guide

## Architecture

| Component | Service | Notes |
|-----------|---------|-------|
| API (.NET 10) | Azure App Service (Linux) | Docker container |
| Web (Next.js) | Azure Static Web Apps or Vercel | |
| Database | Azure Database for PostgreSQL Flexible Server | Enable TimescaleDB extension |
| File Storage | AWS S3 + CloudFront | Photos & reports |
| Email | SendGrid | Transactional email |
| Logs | Self-hosted Seq (same App Service plan) | Optional |

---

## Prerequisites

- Azure CLI: `az login`
- Docker: `docker build` for API image
- AWS CLI: configured with S3 permissions

---

## 1. Database

### Azure PostgreSQL Flexible Server

```bash
az postgres flexible-server create \
  --name fieldmind-db \
  --resource-group fieldmind-rg \
  --location eastus \
  --admin-user fieldmind \
  --admin-password <STRONG_PASSWORD> \
  --sku-name Standard_D2s_v3 \
  --tier GeneralPurpose \
  --version 16

# Enable TimescaleDB extension
az postgres flexible-server parameter set \
  --resource-group fieldmind-rg \
  --server-name fieldmind-db \
  --name azure.extensions \
  --value timescaledb
```

Connection string format:
```
Host=fieldmind-db.postgres.database.azure.com;Port=5432;Database=fieldmind;Username=fieldmind;Password=<PASSWORD>;SSL Mode=Require
```

### Run Migrations

```bash
cd apps/api
ASPNETCORE_ENVIRONMENT=Production \
ConnectionStrings__DefaultConnection="<CONNECTION_STRING>" \
dotnet ef database update
```

---

## 2. S3 Bucket

```bash
# Create bucket
aws s3api create-bucket --bucket fieldmind-photos-prod --region us-east-1

# Block public access (presigned URLs only)
aws s3api put-public-access-block \
  --bucket fieldmind-photos-prod \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# CORS for presigned uploads from web/mobile
aws s3api put-bucket-cors --bucket fieldmind-photos-prod --cors-configuration '{
  "CORSRules": [{
    "AllowedOrigins": ["https://app.fieldmind.io"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }]
}'
```

Create an IAM user with S3 policy and save the access key/secret for env vars.

---

## 3. API — Azure App Service

### Build Docker image

```bash
cd apps/api
docker build -t fieldmind-api:latest .
docker tag fieldmind-api:latest <ACR_NAME>.azurecr.io/fieldmind-api:latest
docker push <ACR_NAME>.azurecr.io/fieldmind-api:latest
```

### Create App Service

```bash
az appservice plan create \
  --name fieldmind-plan \
  --resource-group fieldmind-rg \
  --is-linux \
  --sku B2

az webapp create \
  --name fieldmind-api \
  --resource-group fieldmind-rg \
  --plan fieldmind-plan \
  --deployment-container-image-name <ACR_NAME>.azurecr.io/fieldmind-api:latest
```

### Application Settings (Environment Variables)

Set these in Azure Portal → App Service → Configuration → Application Settings,
or via CLI:

```bash
az webapp config appsettings set \
  --name fieldmind-api \
  --resource-group fieldmind-rg \
  --settings \
    ASPNETCORE_ENVIRONMENT=Production \
    "ConnectionStrings__DefaultConnection=Host=...;..." \
    JWT__Secret="<64-char-random-string>" \
    Monitoring__ApiKey="<32-char-random-string>" \
    Frontend__Url="https://app.fieldmind.io" \
    AWS__AccessKeyId="<IAM_ACCESS_KEY>" \
    AWS__SecretAccessKey="<IAM_SECRET_KEY>" \
    "AI__OpenAI__ApiKey=sk-..." \
    "Email__SmtpPassword=SG.<SENDGRID_API_KEY>" \
    Twilio__AccountSid="AC..." \
    Twilio__AuthToken="<TOKEN>" \
    Twilio__FromNumber="+15551234567"
```

---

## 4. Web — Vercel (recommended) or Azure Static Web Apps

### Vercel

```bash
cd apps/web
npx vercel --prod
# Set NEXT_PUBLIC_API_URL=https://fieldmind-api.azurewebsites.net in Vercel dashboard
```

### Azure Static Web Apps

```bash
az staticwebapp create \
  --name fieldmind-web \
  --resource-group fieldmind-rg \
  --source https://github.com/KremerWTE/FieldMind \
  --branch main \
  --app-location apps/web \
  --output-location .next
```

Set `NEXT_PUBLIC_API_URL` in Azure Portal → Static Web Apps → Configuration.

---

## 5. CORS

Update `Frontend__Url` in API settings to match the deployed web URL.
The API uses this to set CORS `AllowedOrigins`.

---

## 6. Health Check

Verify deployment:
```
GET https://fieldmind-api.azurewebsites.net/health/live   → 200
GET https://fieldmind-api.azurewebsites.net/health/ready  → 200
GET https://fieldmind-api.azurewebsites.net/health        → JSON report
```

---

## Secret Generation

```bash
# JWT secret
openssl rand -base64 64

# Monitoring API key
openssl rand -hex 32
```
