# Share Links - Public Photo Galleries 🔗

## Overview

Share Links enable you to create secure, public photo galleries that can be shared with clients, contractors, or stakeholders without requiring them to have a FieldMind account or login.

Perfect for:
- Sharing inspection results with property owners
- Sending project progress to clients
- Collaborating with external contractors
- Creating portfolio showcases
- Insurance claim documentation

## Features

✅ **No Authentication Required** - Recipients view galleries without logging in
✅ **Flexible Scope** - Share entire buildings, specific projects, or individual folders
✅ **Password Protection** - Optional password for sensitive galleries
✅ **Expiration Dates** - Auto-expire links after a set time
✅ **View Tracking** - See how many times link was accessed
✅ **Revocable** - Delete links anytime to revoke access
✅ **AI Insights Included** - Shared galleries show AI analysis results
✅ **Custom Branding** - Add title and description to galleries

## API Endpoints

### 1. POST /share/links - Create Share Link

Create a new shareable link for a building, project, or folder.

**Authentication:** Required (JWT Bearer token)

**Request Body:**
```json
{
  "scope": "building",        // "building", "project", or "folder"
  "scopeId": "building-123",  // ID of the entity to share
  "password": "secret123",    // Optional: password protect
  "expiresAt": "2024-12-31T23:59:59Z",  // Optional: expiration
  "title": "Q1 Roof Inspection",  // Optional: custom title
  "description": "Comprehensive inspection results for 123 Main St"  // Optional
}
```

**Response:**
```json
{
  "shareLink": {
    "id": "link-456",
    "token": "abc123xyz...",  // 43-character URL-safe token
    "scope": "building",
    "scopeId": "building-123",
    "expiresAt": "2024-12-31T23:59:59Z",
    "title": "Q1 Roof Inspection",
    "description": "Comprehensive inspection results...",
    "createdAt": "2024-01-15T10:00:00Z",
    "hasPassword": true
  },
  "shareUrl": "https://fieldmind.io/share/abc123xyz...",
  "message": "Share link created successfully"
}
```

---

### 2. GET /share/links - Get My Share Links

List all share links created by the current user.

**Authentication:** Required

**Response:**
```json
{
  "links": [
    {
      "id": "link-456",
      "token": "abc123xyz...",
      "scope": "building",
      "scopeId": "building-123",
      "title": "Q1 Roof Inspection",
      "description": "Comprehensive inspection...",
      "expiresAt": "2024-12-31T23:59:59Z",
      "createdAt": "2024-01-15T10:00:00Z",
      "viewCount": 42,
      "lastAccessedAt": "2024-01-20T14:30:00Z",
      "hasPassword": true,
      "shareUrl": "https://fieldmind.io/share/abc123xyz...",
      "isExpired": false
    }
  ]
}
```

---

### 3. DELETE /share/links/{token} - Revoke Share Link

Delete a share link to revoke access.

**Authentication:** Required (must be the creator)

**Response:**
```json
{
  "message": "Share link revoked successfully"
}
```

---

### 4. GET /share/{token} - View Shared Gallery (PUBLIC)

Access a shared photo gallery. **No authentication required!**

**Query Parameters:**
- `password` (optional) - Required if link is password-protected

**Example:**
```
GET /share/abc123xyz?password=secret123
```

**Response:**
```json
{
  "shareInfo": {
    "title": "Q1 Roof Inspection",
    "description": "Comprehensive inspection results for 123 Main St",
    "createdAt": "2024-01-15T10:00:00Z",
    "createdBy": {
      "firstName": "John",
      "lastName": "Doe"
    }
  },
  "content": {
    "scope": "building",
    "building": {
      "id": "building-123",
      "name": "123 Main Street",
      "address": "123 Main St, Austin, TX"
    },
    "photos": [
      {
        "id": "photo-789",
        "capturedAt": "2024-01-14T15:30:00Z",
        "uploadedAt": "2024-01-14T15:35:00Z",
        "viewUrl": "https://s3.amazonaws.com/...",  // 1-hour presigned URL
        "aiAnnotation": {
          "shortDescription": "Asphalt shingle roof with visible hail damage",
          "tags": ["roof", "hail damage", "shingles"],
          "categories": ["roof", "damage", "exterior"],
          "severityScore": 75
        }
      }
    ],
    "totalPhotos": 12
  }
}
```

**If password required but not provided:**
```json
{
  "error": "Password required",
  "requiresPassword": true
}
```

---

### 5. POST /share/{token}/validate-password - Check Password (PUBLIC)

Validate a password before accessing gallery. Useful for frontend password prompts.

**Request Body:**
```json
{
  "password": "secret123"
}
```

**Response:**
```json
{
  "valid": true
}
```

---

## Use Cases

### 1. Share Inspection with Client

```bash
# Create share link for building
curl -X POST http://localhost:5000/share/links \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scope": "building",
    "scopeId": "building-123",
    "title": "Annual Inspection Results",
    "description": "Completed inspection for 123 Main St - January 2024",
    "expiresAt": "2024-02-15T00:00:00Z"
  }'

# Response includes shareUrl - send to client
# Client opens: https://fieldmind.io/share/abc123xyz...
# No login required!
```

### 2. Password-Protected Project Gallery

```bash
# Create password-protected link
curl -X POST http://localhost:5000/share/links \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scope": "project",
    "scopeId": "project-456",
    "password": "client2024",
    "title": "Roof Repair Project Progress",
    "expiresAt": "2024-03-01T00:00:00Z"
  }'

# Share URL + password with client
# They access: https://fieldmind.io/share/xyz789?password=client2024
```

### 3. Share Specific Folder

```bash
# Share just exterior photos
curl -X POST http://localhost:5000/share/links \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scope": "folder",
    "scopeId": "folder-789",
    "title": "Exterior Photos",
    "description": "Building exterior condition photos"
  }'
```

### 4. Track Link Usage

```bash
# Check how many times link was viewed
curl http://localhost:5000/share/links \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response shows viewCount and lastAccessedAt for each link
```

### 5. Revoke Access

```bash
# Revoke link to stop sharing
curl -X DELETE http://localhost:5000/share/links/abc123xyz \
  -H "Authorization: Bearer YOUR_TOKEN"

# Link immediately stops working
```

---

## Security

### Token Generation

- 32-byte cryptographically secure random token
- Base64-encoded and URL-safe
- 43 characters long
- Impossible to guess

### Password Protection

- Passwords hashed with BCrypt (cost factor 12)
- Never stored in plaintext
- Verified server-side before returning gallery

### Access Control

- Only link creator can revoke
- Team-scoped validation
- Expired links auto-rejected
- View tracking for audit trail

### Photo URLs

- S3 presigned GET URLs (1-hour expiry)
- Fresh URL generated on each request
- Private S3 bucket (no public access)

---

## Frontend Integration

### React Component Example

```typescript
import { useState, useEffect } from 'react';

function SharedGallery({ token }: { token: string }) {
  const [gallery, setGallery] = useState(null);
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);

  const loadGallery = async (pwd?: string) => {
    const url = `/share/${token}${pwd ? `?password=${pwd}` : ''}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.requiresPassword) {
      setNeedsPassword(true);
      return;
    }

    setGallery(data);
  };

  useEffect(() => {
    loadGallery();
  }, [token]);

  if (needsPassword) {
    return (
      <div className="password-prompt">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
        />
        <button onClick={() => loadGallery(password)}>
          Access Gallery
        </button>
      </div>
    );
  }

  if (!gallery) return <div>Loading...</div>;

  return (
    <div className="gallery">
      <h1>{gallery.shareInfo.title}</h1>
      <p>{gallery.shareInfo.description}</p>

      <div className="photo-grid">
        {gallery.content.photos.map((photo) => (
          <div key={photo.id} className="photo-card">
            <img src={photo.viewUrl} alt={photo.aiAnnotation?.shortDescription} />
            <p>{photo.aiAnnotation?.shortDescription}</p>
            <div className="tags">
              {photo.aiAnnotation?.tags.map(tag => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Best Practices

### 1. Set Expiration Dates

Always set expiration for external shares:
```json
{
  "expiresAt": "2024-12-31T23:59:59Z"  // Auto-expire after project
}
```

### 2. Use Passwords for Sensitive Data

Protect sensitive inspections:
```json
{
  "password": "GenerateStrongPassword123!",
  "scope": "building",
  "scopeId": "building-123"
}
```

### 3. Custom Titles

Add context for recipients:
```json
{
  "title": "Annual Safety Inspection - Building A",
  "description": "Inspection completed January 15, 2024 by John Doe"
}
```

### 4. Monitor Usage

Check view counts regularly:
- High view counts = link might be shared widely
- Zero views = client hasn't accessed yet

### 5. Revoke When Done

Delete links after project completion:
```bash
DELETE /share/links/{token}
```

---

## Scope Comparisons

| Scope | Includes | Use Case |
|-------|----------|----------|
| **Building** | All photos for building across all projects | Full building portfolio, annual reports |
| **Project** | All photos within project, organized by folders | Project progress, inspection results |
| **Folder** | Only photos in specific folder | Specific area (e.g., "Roof Photos"), targeted sharing |

---

## Limitations

- Max 100 photos per gallery (pagination coming soon)
- Photo URLs expire after 1 hour (auto-refresh on reload)
- View count is approximate (caching)
- Cannot share individual photos (create folder with single photo)

---

## Error Handling

### Link Not Found
```json
{
  "error": "Share link not found or expired"
}
```

**Causes:**
- Token doesn't exist
- Link was revoked
- Link expired

### Password Required
```json
{
  "error": "Password required",
  "requiresPassword": true
}
```

**Solution:** Prompt user for password

### Invalid Password
```json
{
  "error": "Password required",  // Same as missing password
  "requiresPassword": true
}
```

**Solution:** Re-prompt with error message

---

## Analytics

Track link performance:
- **viewCount** - Total accesses
- **lastAccessedAt** - Most recent view
- **createdAt** - When link was created

**Calculate:**
- Days since creation
- Average views per day
- Time since last view

---

**Share Links make FieldMind a complete client communication platform!** 🔗✨

Recipients get a beautiful, AI-enhanced photo gallery without any friction or signup required.
