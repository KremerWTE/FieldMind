# FieldMind Search System 🔍

## Overview

The Search System enables powerful, intelligent discovery of photos across the FieldMind platform. By leveraging AI-generated tags, descriptions, and categories, users can quickly find photos showing specific issues, conditions, or locations.

## Features

✅ **Full-Text Search** - Search across AI descriptions, tags, categories, and metadata
✅ **Relevance Scoring** - Results ranked by relevance with matched field tracking
✅ **Advanced Filters** - Filter by severity, building, project, dates, AI status
✅ **Tag/Category Search** - Precise filtering by AI-detected categories and tags
✅ **Autocomplete** - Real-time search suggestions from popular tags
✅ **Team-Scoped** - All searches automatically filtered to user's team
✅ **Pagination** - Efficient handling of large result sets

## API Endpoints

### 1. POST /search - Main Search

Search photos with full-text query and filters.

**Request Body:**
```json
{
  "query": "roof damage",              // Optional: text to search for
  "buildingId": "building-123",        // Optional: filter by building
  "projectId": "project-456",          // Optional: filter by project
  "folderId": "folder-789",            // Optional: filter by folder
  "categories": ["roof", "damage"],    // Optional: must match these categories
  "tags": ["hail", "shingles"],        // Optional: must match these tags
  "minSeverity": "high",               // Optional: low|medium|high|critical
  "dateFrom": "2024-01-01T00:00:00Z",  // Optional: photos after this date
  "dateTo": "2024-12-31T23:59:59Z",    // Optional: photos before this date
  "aiStatus": "complete",              // Optional: pending|processing|complete|failed
  "page": 1,                           // Default: 1
  "pageSize": 20                       // Default: 20, max: 100
}
```

**Response:**
```json
{
  "results": [
    {
      "photo": {
        "id": "photo-123",
        "buildingId": "building-123",
        "projectId": "project-456",
        "capturedAt": "2024-01-15T10:30:00Z",
        "aiProcessed": true,
        "aiStatus": "complete",
        "uploadedBy": {
          "id": "user-789",
          "firstName": "John",
          "lastName": "Doe"
        }
      },
      "building": {
        "id": "building-123",
        "name": "123 Main Street",
        "address": "123 Main St, Austin, TX"
      },
      "project": {
        "id": "project-456",
        "name": "Roof Inspection Q1 2024"
      },
      "folder": {
        "id": "folder-789",
        "name": "Exterior Photos"
      },
      "aiAnnotation": {
        "id": "annotation-321",
        "shortDescription": "Asphalt shingle roof with visible hail damage",
        "fullDescription": "Residential roof showing multiple impact marks...",
        "tags": ["roof", "hail damage", "shingles", "residential"],
        "categories": ["roof", "damage", "exterior"],
        "severityScore": 75,
        "confidenceScore": 0.87,
        "estimatedRepairPriority": "High",
        "structuralImpactScore": 68,
        "detectedIssuesJson": "[{\"type\":\"hail damage\",\"severity\":\"high\"...}]"
      },
      "viewUrl": "https://s3.amazonaws.com/...",
      "relevanceScore": 45.0,
      "matchedFields": ["Tags", "Categories", "Full Description"]
    }
  ],
  "totalCount": 127,
  "page": 1,
  "pageSize": 20,
  "totalPages": 7
}
```

### 2. GET /search/tags - Popular Tags

Get the most frequently used AI-generated tags across all photos.

**Query Parameters:**
- `limit` (optional, default: 20) - Max number of tags to return

**Response:**
```json
{
  "tags": [
    "roof",
    "exterior",
    "damage",
    "hail damage",
    "shingles",
    "residential",
    "commercial",
    "water intrusion",
    "foundation",
    "structural"
  ]
}
```

**Use case:** Display tag cloud, suggest common searches

### 3. GET /search/categories - Popular Categories

Get all AI-detected categories sorted by frequency.

**Response:**
```json
{
  "categories": [
    "roof",
    "exterior",
    "damage",
    "interior",
    "foundation",
    "moisture",
    "structural",
    "hail",
    "water-intrusion"
  ]
}
```

**Use case:** Faceted search UI, filter dropdowns

### 4. GET /search/suggestions - Autocomplete

Get search suggestions based on partial query.

**Query Parameters:**
- `query` (required, min length: 2) - Partial search term

**Request:**
```
GET /search/suggestions?query=ro
```

**Response:**
```json
{
  "suggestions": [
    "roof",
    "roof damage",
    "roofing",
    "roof inspection"
  ]
}
```

**Use case:** Search bar autocomplete

## Search Scoring Algorithm

### Relevance Calculation

The search engine assigns scores based on where matches are found:

| Match Location | Score Per Term | Priority |
|----------------|----------------|----------|
| **Tags** | +15 | Highest |
| **Categories** | +12 | Very High |
| **Short Description** | +10 | High |
| **Detected Issues** | +8 | Medium-High |
| **Full Description** | +5 | Medium |
| **Building/Project Name** | +3 | Low |

**Additional Boosts:**
- Category filter match: +5
- Tag filter match: +5

### Sorting

Results are sorted by:
1. **Relevance Score** (descending) - Higher scores first
2. **Upload Date** (descending) - Recent photos first (tie-breaker)

### Matched Fields

The `matchedFields` array shows WHERE the search terms were found:
- `"Tags"` - Found in AI tags
- `"Categories"` - Found in AI categories
- `"Short Description"` - Found in short description
- `"Full Description"` - Found in full description
- `"Detected Issues"` - Found in issue descriptions
- `"Building"` - Found in building name
- `"Project"` - Found in project name

## Filter Logic

### Text Query

- **Tokenization:** Query split by spaces ("roof damage" → ["roof", "damage"])
- **Case-insensitive:** "ROOF" matches "roof"
- **Partial matching:** "dam" matches "damage"
- **All fields searched:** Descriptions, tags, categories, issues, building/project names

### Severity Filtering

`minSeverity` sets the minimum threshold:
- `"low"` - Include all photos (low, medium, high, critical)
- `"medium"` - Include medium, high, critical
- `"high"` - Include high, critical only
- `"critical"` - Include critical only

**How it works:**
1. Extract all detected issues from `detectedIssuesJson`
2. Find highest severity issue in photo
3. Compare to minimum threshold
4. Include photo if severity >= threshold

### Category/Tag Filtering

- **Categories:** Photo must have ALL specified categories (AND logic)
- **Tags:** Photo must have ALL specified tags (AND logic)
- **Example:** `categories: ["roof", "damage"]` requires BOTH categories present

### Date Filtering

- `dateFrom` - Photos uploaded on or after this date
- `dateTo` - Photos uploaded on or before this date
- Both are inclusive
- Use ISO 8601 format: `"2024-01-15T00:00:00Z"`

### AI Status Filtering

Filter by processing status:
- `"pending"` - Job not yet started
- `"processing"` - AI analysis in progress
- `"complete"` - AI analysis finished successfully
- `"failed"` - AI analysis encountered error

## Usage Examples

### Example 1: Simple Text Search

Find all photos mentioning "hail":

```bash
curl -X POST http://localhost:5000/search \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "hail"}'
```

**Matches:**
- Photos with "hail" in tags
- Photos with "hail damage" detected
- Photos with hail mentioned in descriptions

### Example 2: High-Severity Damage Search

Find severe issues across all buildings:

```bash
curl -X POST http://localhost:5000/search \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "minSeverity": "high",
    "page": 1,
    "pageSize": 50
  }'
```

**Returns:** All photos with high or critical severity issues

### Example 3: Roof Damage by Building

Find roof damage photos for a specific building:

```bash
curl -X POST http://localhost:5000/search \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "damage",
    "buildingId": "building-123",
    "categories": ["roof"]
  }'
```

### Example 4: Recent Water Issues

Find water-related problems from the last 30 days:

```bash
curl -X POST http://localhost:5000/search \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "water moisture leak",
    "dateFrom": "2024-12-15T00:00:00Z",
    "minSeverity": "medium"
  }'
```

### Example 5: Category-Based Search

Find all structural issues:

```bash
curl -X POST http://localhost:5000/search \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "categories": ["structural", "foundation"]
  }'
```

**Note:** This finds photos with BOTH categories (AND logic)

### Example 6: Project-Specific Search

Search within a specific project:

```bash
curl -X POST http://localhost:5000/search \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "project-456",
    "aiStatus": "complete"
  }'
```

## Frontend Integration

### Search Bar Component

```typescript
// React example
const [query, setQuery] = useState('');
const [suggestions, setSuggestions] = useState([]);

const getSuggestions = async (value: string) => {
  if (value.length < 2) return;

  const response = await fetch(
    `/search/suggestions?query=${encodeURIComponent(value)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const { suggestions } = await response.json();
  setSuggestions(suggestions);
};

const performSearch = async () => {
  const response = await fetch('/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query, page: 1, pageSize: 20 })
  });

  const { results, totalCount } = await response.json();
  // Display results...
};
```

### Filter UI

```typescript
// Advanced search filters
const filters = {
  query: 'roof damage',
  buildingId: selectedBuilding,
  minSeverity: 'high',
  categories: ['roof', 'damage'],
  dateFrom: '2024-01-01T00:00:00Z'
};

const results = await searchPhotos(filters);
```

### Tag Cloud

```typescript
// Display popular tags
const { tags } = await fetch('/search/tags?limit=30').then(r => r.json());

return (
  <div className="tag-cloud">
    {tags.map(tag => (
      <button
        key={tag}
        onClick={() => searchByTag(tag)}
        className="tag-button"
      >
        {tag}
      </button>
    ))}
  </div>
);
```

## Performance Considerations

### Current Implementation

- **In-memory filtering** after database fetch
- Suitable for: < 10,000 photos per team
- Fast for typical use cases
- No additional database setup required

### Optimization Paths

If performance degrades with large datasets:

1. **PostgreSQL Full-Text Search (recommended)**
   - Add `tsvector` columns to Photo/AiAnnotation
   - Create GIN indexes
   - Use `to_tsquery` for searches
   - ~10x faster for large datasets

2. **Elasticsearch Integration**
   - Index photos in Elasticsearch
   - Near-instant search regardless of size
   - Advanced features: fuzzy matching, synonyms
   - Requires separate service

3. **Caching**
   - Cache popular search results (15 min TTL)
   - Cache tags/categories lists (1 hour TTL)
   - Reduce database load

### Current Limitations

- Max 100 items per page
- Full-text search is simple substring matching (not stemming/fuzzy)
- No synonym support ("roof" won't match "roofing" unless AI tagged both)

## Security

### Team Isolation

All searches are automatically scoped to the user's team:
```csharp
.Where(p => p.Building.TeamId == teamId)
```

**Users CANNOT:**
- Search photos from other teams
- See tags/categories from other teams
- Access buildings/projects outside their team

### Authorization

- All endpoints require JWT authentication
- `[Authorize]` attribute enforces login
- Team ID extracted from token claims

## Troubleshooting

### No Results Found

**Possible causes:**
1. Query too specific - Try broader terms
2. AI analysis not complete - Check `aiStatus: "complete"`
3. Filters too restrictive - Remove some filters
4. Typos in search query

**Solution:** Start broad, then refine

### Slow Search Performance

**Causes:**
- Large number of photos (> 10,000)
- Complex queries with many terms

**Solutions:**
1. Add pagination - Limit page size to 20-50
2. Add filters - Narrow by building/project/date
3. Implement PostgreSQL full-text search (see Optimization)

### Missing Tags/Categories

**Cause:** AI analysis not run or failed

**Solution:**
- Check photo.aiStatus
- Retry AI analysis: `POST /photos/:id/ai/regenerate`

## Future Enhancements

1. **Fuzzy Matching**
   - "damaje" matches "damage"
   - Typo tolerance

2. **Stemming**
   - "roofing" matches "roof"
   - "damaged" matches "damage"

3. **Synonyms**
   - "leak" matches "water intrusion"
   - Configurable synonym dictionary

4. **Visual Search**
   - "Find similar photos"
   - Image similarity based on AI embeddings

5. **Saved Searches**
   - Save complex filter combinations
   - Email alerts for new matches

6. **Natural Language Queries**
   - "Show me critical roof issues from last month"
   - Parse and translate to filters

---

**The Search System unlocks the full value of AI-powered photo analysis by making all that rich metadata instantly discoverable!** 🔍✨
