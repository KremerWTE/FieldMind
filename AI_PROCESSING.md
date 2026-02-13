# FieldMind AI Processing System 🤖

## Overview

The AI Processing System is FieldMind's signature feature that automatically analyzes construction photos to detect maintenance issues, generate technical descriptions, and update building health metrics. This creates a proactive maintenance monitoring system that alerts property managers to problems before they become critical.

## Architecture

### Components

1. **AIService** - Provider-agnostic abstraction layer
2. **IVisionAnnotator** - Interface for AI vision providers
3. **MockVisionAnnotator** - Development/testing provider
4. **OpenAIVisionAnnotator** - Production GPT-4 Vision provider
5. **PhotoAIAnalysisJob** - Hangfire background job processor
6. **AiAnnotation Model** - Stores AI analysis results
7. **MaintenanceEvent Model** - Auto-created for severe issues
8. **BuildingHealthStat Model** - Time-series health metrics

### Data Flow

```
Photo Upload Complete
    ↓
Hangfire Job Enqueued (PhotoAIAnalysisJob)
    ↓
Fetch Photo from DB + Generate S3 Presigned URL
    ↓
Call AI Vision Provider (Mock or OpenAI)
    ↓
Parse AI Response (JSON)
    ↓
Save AiAnnotation to DB
    ↓
IF high/critical severity detected:
    → Auto-create MaintenanceEvent
    ↓
Update BuildingHealthStats
    ↓
Photo.aiStatus = Complete
```

## AI Vision Output Structure

### VisionAnnotationOutput

```csharp
public class VisionAnnotationOutput
{
    public string ShortDescription { get; set; }        // 1-2 sentences for gallery view
    public string FullDescription { get; set; }         // 5-10 sentences technical analysis
    public List<string> Tags { get; set; }              // Searchable keywords
    public List<string> Categories { get; set; }        // Structural categories
    public List<DetectedIssue> DetectedIssues { get; set; }
    public string EstimatedRepairPriority { get; set; } // low/medium/high/urgent
    public int StructuralImpactScore { get; set; }      // 0-100
}
```

### DetectedIssue

```csharp
public class DetectedIssue
{
    public string Type { get; set; }           // "hail damage", "water intrusion", etc.
    public string Severity { get; set; }       // "low", "medium", "high", "critical"
    public double Confidence { get; set; }     // 0-1 (AI confidence level)
    public string Description { get; set; }    // Detailed issue description
}
```

## AI Providers

### Mock Provider (Development)

**Use case:** Local development, testing, demo environments

**Configuration:**
```json
"AI": {
  "Provider": "mock"
}
```

**Behavior:**
- Instant results (no API calls)
- Random but realistic outputs
- Variable severity for testing all scenarios
- Always includes shortDescription, fullDescription, tags, categories
- 60% chance of detecting issues
- 20% chance of high/critical severity (triggers maintenance event)

**Example Output:**
```json
{
  "shortDescription": "Mock AI analysis of construction photo",
  "fullDescription": "This is a simulated AI analysis for development purposes...",
  "tags": ["mock", "development", "construction", "building"],
  "categories": ["roof", "exterior"],
  "detectedIssues": [
    {
      "type": "roof damage",
      "severity": "high",
      "confidence": 0.82,
      "description": "Mock detected issue in roof area requiring attention"
    }
  ],
  "estimatedRepairPriority": "high",
  "structuralImpactScore": 68
}
```

### OpenAI Provider (Production)

**Use case:** Production environments with real photo analysis

**Configuration:**
```json
"AI": {
  "Provider": "openai",
  "OpenAI": {
    "ApiKey": "sk-...",
    "Model": "gpt-4o",
    "BaseUrl": "https://api.openai.com/v1"
  }
}
```

**Behavior:**
- Calls OpenAI Vision API with construction-specific prompts
- Expert system prompt instructs model as "expert construction inspector"
- Returns structured JSON with analysis
- ~2-5 second processing time
- Costs ~$0.01-0.02 per photo (GPT-4o pricing)

**System Prompt:**
```
You are an expert construction inspector analyzing job site photos.

Analyze this photo and return ONLY valid JSON with this exact structure:
{
  "shortDescription": "1-2 sentence summary",
  "fullDescription": "5-10 sentence technical analysis including materials, condition, concerns",
  "tags": ["keyword1", "keyword2"],
  "categories": ["roof", "exterior", "damage"],
  "detectedIssues": [
    {
      "type": "hail damage",
      "severity": "medium",
      "confidence": 0.87,
      "description": "Multiple impact marks on shingles"
    }
  ],
  "estimatedRepairPriority": "medium",
  "structuralImpactScore": 65
}

Severity levels: low (cosmetic), medium (monitor), high (repair soon), critical (immediate action)
Confidence: 0-1 (how certain you are)
StructuralImpactScore: 0-100 (0=no concern, 100=structural failure)
Categories: roof, exterior, interior, foundation, damage, moisture, structural, hail, water-intrusion, etc.
```

## Background Job Processing

### PhotoAIAnalysisJob

**Trigger:** Automatically enqueued when `POST /photos/complete-upload` is called

**Process:**
1. Fetch photo from database (with Building relationship)
2. Update photo.aiStatus = "Processing"
3. Generate S3 presigned GET URL (1 hour expiry)
4. Call AI provider with image URL
5. Parse AI response JSON
6. Calculate severity score (0-100 based on detected issues)
7. Calculate confidence score (average of all issue confidences)
8. Parse repair priority enum (Low/Medium/High/Urgent)
9. Save AiAnnotation to database
10. Update photo.aiProcessed = true, aiStatus = "Complete"
11. Check for high/critical severity issues
12. If found: Auto-create MaintenanceEvent
13. Update BuildingHealthStats based on categories

**Retry Logic:**
- Max 3 attempts (Hangfire default)
- Exponential backoff
- On final failure: photo.aiStatus = "Failed"

**Error Handling:**
- Network errors: Retry
- Invalid JSON: Log error, mark as failed
- S3 access errors: Retry
- Database errors: Retry

## Automatic MaintenanceEvent Creation

### Trigger Conditions

MaintenanceEvent is auto-created when:
- AI detects issues with severity = "high" OR "critical"
- Multiple issues: Uses highest severity

### Event Properties

```csharp
new MaintenanceEvent
{
    BuildingId = photo.BuildingId,
    Type = MaintenanceEventType.MonitoringAlert,
    DetectedBy = DetectionSource.AI,
    Severity = IssueSeverity.High | IssueSeverity.Critical,
    Status = MaintenanceEventStatus.Open,
    Title = "AI Detected: {issueType}",
    Description = "Automated analysis detected {count} issue(s): {descriptions}"
}
```

### Linking

- Photo.MaintenanceEventId → MaintenanceEvent.Id
- Photo appears in event's RelatedPhotos collection

### Notification (Future Enhancement)

When critical severity:
- Email to PM and Admin roles
- In-app notification
- SMS alert (optional)

## Building Health Statistics

### Metrics Tracked

1. **RoofIntegrity** (0-100, starts at 100)
   - Decreases with roof-related damage
   - Categories: "roof", "shingles", "flashing", "storm damage"
   - Delta: Low issue (-1), Medium (-3), High (-5), Critical (-10)

2. **WaterRisk** (0-100, starts at 0)
   - Increases with water/moisture detection
   - Categories: "water intrusion", "moisture", "leak", "drainage"
   - Delta: Low issue (+2), Medium (+5), High (+10), Critical (+20)

3. **HailExposure** (cumulative count)
   - Increments by 1 for each hail damage detection
   - Used for insurance claims and trend analysis

4. **StructuralRisk** (0-100, max over time)
   - Updated when AI structuralImpactScore > 50
   - Never decreases (unless manually reset)
   - Tracks worst structural condition observed

### Time-Series Storage

Each update creates a new BuildingHealthStat record:
```csharp
new BuildingHealthStat
{
    BuildingId = buildingId,
    MetricType = HealthMetricType.RoofIntegrity,
    Value = 92.0, // Calculated from previous + delta
    Source = MetricSource.AI,
    RecordedAt = DateTime.UtcNow
}
```

**Benefits:**
- Track trends over time
- Generate charts (integrity declining, risk increasing)
- Compare buildings
- Predictive maintenance scheduling

## Configuration

### Development (Mock)

```json
{
  "AI": {
    "Provider": "mock"
  }
}
```

**No API key required!** Perfect for:
- Local development
- CI/CD testing
- Demo environments
- Frontend development without AI costs

### Production (OpenAI)

```json
{
  "AI": {
    "Provider": "openai",
    "OpenAI": {
      "ApiKey": "sk-proj-...",
      "Model": "gpt-4o",
      "BaseUrl": "https://api.openai.com/v1"
    }
  }
}
```

**OpenAI API Key:**
1. Sign up at https://platform.openai.com
2. Create API key
3. Add billing method (pay-as-you-go)
4. Set usage limits ($10/month recommended for small deployments)

**Cost Estimation:**
- GPT-4o Vision: ~$0.01-0.02 per photo
- 100 photos/day = ~$1-2/day = $30-60/month

### Alternative Providers (Future)

The `IVisionAnnotator` interface supports any provider:
- **Anthropic Claude Vision** (add ClaudeVisionAnnotator)
- **Google Gemini Vision** (add GeminiVisionAnnotator)
- **Azure Computer Vision** (add AzureVisionAnnotator)
- **Custom Fine-tuned Model** (add CustomVisionAnnotator)

## Monitoring Jobs

### Hangfire Dashboard

Access at: `http://localhost:5000/hangfire` (development only)

**Features:**
- View queued jobs
- Monitor processing jobs
- See completed jobs
- Retry failed jobs manually
- View job history
- Check performance metrics

**Production:**
- Add authentication (JWT or basic auth)
- Limit to Admin role only
- Optional: Disable in production, use logging instead

### Job Metrics

Monitor these metrics:
- **Enqueued/sec** - Photo upload rate
- **Processing time** - Should be < 10 seconds
- **Success rate** - Target 95%+
- **Retry rate** - Target < 5%
- **Failed jobs** - Investigate any failures

## API Endpoints Related to AI

### Check AI Status

```bash
GET /photos/:id
```

Response includes:
```json
{
  "photo": {
    "id": "...",
    "aiProcessed": true,
    "aiStatus": "complete"
  },
  "viewUrl": "https://...",
  "aiAnnotation": {
    "shortDescription": "...",
    "fullDescription": "...",
    "tags": [...],
    "categories": [...],
    "detectedIssues": [...],
    "severityScore": 75,
    "confidenceScore": 0.87,
    "estimatedRepairPriority": "High"
  }
}
```

### Get Maintenance Events

```bash
GET /buildings/:buildingId/maintenance-events
```

Filters by AI-detected events:
```json
[
  {
    "id": "...",
    "type": "MonitoringAlert",
    "detectedBy": "AI",
    "severity": "High",
    "title": "AI Detected: roof damage",
    "description": "Automated analysis detected 2 issue(s): ...",
    "status": "Open",
    "relatedPhotos": [...]
  }
]
```

### Get Building Health Stats

```bash
GET /buildings/:buildingId/health-stats
```

Time-series data:
```json
[
  {
    "metricType": "RoofIntegrity",
    "value": 92.0,
    "source": "AI",
    "recordedAt": "2024-01-15T10:30:00Z"
  },
  {
    "metricType": "WaterRisk",
    "value": 15.0,
    "source": "AI",
    "recordedAt": "2024-01-15T10:30:00Z"
  }
]
```

## Testing the AI System

### 1. Mock Provider Test (Default)

```bash
# 1. Upload a photo
curl -X POST http://localhost:5000/photos/complete-upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"photoId": "PHOTO_ID", "geoLat": 30.0, "geoLng": -97.0}'

# 2. Wait 1-2 seconds for job to complete

# 3. Check AI results
curl http://localhost:5000/photos/PHOTO_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should show:
# - aiProcessed: true
# - aiStatus: "complete"
# - AiAnnotation with mock data
```

### 2. OpenAI Provider Test

```bash
# 1. Configure OpenAI in appsettings.json
# 2. Upload a real construction photo
# 3. Wait 3-5 seconds for AI processing
# 4. Check results (should have real technical analysis)
```

### 3. Verify MaintenanceEvent Creation

```bash
# Upload multiple photos until one triggers high/critical severity
# Check maintenance events:
curl http://localhost:5000/buildings/BUILDING_ID/maintenance-events \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should see AI-created event with:
# - detectedBy: "AI"
# - severity: "High" or "Critical"
```

### 4. Verify Health Stats Updates

```bash
# After uploading 5-10 photos:
curl http://localhost:5000/buildings/BUILDING_ID/health-stats \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should see time-series data with decreasing RoofIntegrity,
# increasing WaterRisk, etc.
```

## Performance Optimization

### Caching

Consider caching:
- S3 presigned URLs (15 min cache)
- Building health stats (5 min cache for GET requests)

### Batch Processing

For bulk imports:
- Use Hangfire recurring jobs
- Process 10 photos in parallel
- Monitor queue size

### Rate Limiting

OpenAI API limits:
- Default: 60 requests/min
- If exceeded: Implement queue throttling
- Or: Use Hangfire delayed jobs

## Security Considerations

### S3 Presigned URLs

- **Upload URLs** - 5 minute expiry, PUT only
- **Download URLs** - 1 hour expiry, GET only
- **Private bucket** - No public access
- **Key format** - `{teamId}/{buildingId}/{photoId}/{filename}`

### AI API Keys

- Store in appsettings.json or environment variables
- **NEVER** commit to version control
- Rotate keys quarterly
- Monitor usage for anomalies

### Team Isolation

- Photos only accessible by same team
- Maintenance events team-scoped
- Health stats filtered by building.teamId

## Troubleshooting

### Photo stuck in "Processing"

**Cause:** Job failed but didn't update status

**Solution:**
```bash
# Check Hangfire dashboard for failed jobs
# Retry manually or:
curl -X POST http://localhost:5000/photos/PHOTO_ID/ai/regenerate \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### AI always returns generic results

**Cause:** Mock provider is active instead of OpenAI

**Solution:**
- Check `appsettings.json` → AI:Provider = "openai"
- Verify API key is set
- Check logs for API errors

### High OpenAI costs

**Cause:** Processing too many photos or using expensive model

**Solution:**
- Use Mock provider for non-production
- Switch to gpt-4o-mini (cheaper, less accurate)
- Implement photo approval workflow (only analyze approved photos)
- Cache results for duplicate photos

### MaintenanceEvents not auto-creating

**Cause:** No high/critical issues detected

**Solution:**
- Upload photos with obvious damage
- Check AI output - detectedIssues array must have severity="high" or "critical"
- Lower threshold in code if needed

## Future Enhancements

1. **Object Detection with Bounding Boxes**
   - Draw rectangles around detected issues
   - Click to zoom to problem area

2. **Multi-Photo Analysis**
   - Compare before/after photos
   - Track damage progression

3. **Custom Fine-tuned Model**
   - Train on your building types
   - Improve accuracy for specific issues (e.g., hail damage)

4. **Voice Notes**
   - Transcribe field tech audio notes
   - Combine with AI vision for richer context

5. **Automatic Repair Cost Estimation**
   - Use detected issues + regional pricing data
   - Generate cost estimates automatically

6. **Integration with Weather Data**
   - Correlate damage with recent storms
   - Automatic hail damage detection after hail events

---

**The AI Processing System makes FieldMind a proactive maintenance monitoring platform, not just a photo storage tool!** 🚀
