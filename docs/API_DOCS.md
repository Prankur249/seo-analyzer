# API Documentation

Base URL (local): `http://localhost:5000`
Base URL (deployed): `https://seo-analyzer-ax3f.onrender.com`

All responses are JSON.

---

# 1. POST /api/analyze

Starts an asynchronous SEO analysis for a given URL.

## Request

```http
POST /api/analyze
Content-Type: application/json
```

### Request Body

```json
{
  "url": "https://example.com"
}
```

### Success Response (202 Accepted)

```json
{
  "jobId": "b6f1a2e4-3c2a-4b8b-9b7e-1234567890ab",
  "status": "queued",
  "message": "Analysis started. Poll GET /api/results/:id for status."
}
```

### Error Response (400 Bad Request)

```json
{
  "error": "Invalid URL. Include the protocol, e.g. https://example.com"
}
```

---

# 2. GET /api/results/:id

Returns the current status or completed SEO report.

## Request

```http
GET /api/results/{jobId}
```

Example:

```http
GET /api/results/b6f1a2e4-3c2a-4b8b-9b7e-1234567890ab
```

### Processing Response

```json
{
  "id": "b6f1a2e4-3c2a-4b8b-9b7e-1234567890ab",
  "url": "https://example.com",
  "status": "processing",
  "createdAt": "2026-07-05T10:00:00.000Z",
  "updatedAt": "2026-07-05T10:00:01.000Z",
  "result": null,
  "error": null
}
```

Possible status values:

- queued
- processing
- completed
- failed

---

### Completed Response

```json
{
  "id": "b6f1a2e4-...",
  "status": "completed",
  "result": {
    "url": "https://example.com",
    "finalUrl": "https://example.com/",
    "statusCode": 200,
    "redirected": false,

    "onPage": {
      "title": "Example Domain",
      "titleLength": 14,
      "metaDescription": "",
      "metaDescriptionLength": 0,
      "h1Count": 1,
      "imagesTotal": 0,
      "imagesWithoutAlt": 0,
      "internalLinks": 0,
      "externalLinks": 1,
      "canonical": null,
      "robotsMeta": null,
      "structuredDataCount": 0,
      "wordCount": 28
    },

    "technical": {
      "isHttps": true,
      "robotsTxt": true,
      "sitemapXml": true
    },

    "performance": {
      "loadTimeMs": 220,
      "pageSizeKB": 1.3,
      "estimatedRequests": 1
    },

    "content": {
      "readability": 62,
      "keywordDensity": [
        {
          "word": "example",
          "count": 2
        }
      ]
    },

    "social": {
      "openGraph": false,
      "twitterCard": false
    },

    "scores": {
      "technical": 55,
      "onPage": 71,
      "content": 50,
      "performance": 100,
      "overall": 66
    }
  }
}
```

### Error Response (404)

```json
{
  "error": "Job not found."
}
```

---

# Notes

- The API works asynchronously.
- Call `POST /api/analyze` first.
- Save the returned `jobId`.
- Poll `GET /api/results/:id` until the status becomes `completed`.
- All responses are JSON.
- No authentication is required for this assignment version.
