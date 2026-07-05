# API Documentation

Base URL (local): `http://localhost:5000`
Base URL (deployed): `https://<your-deployed-url>`

All responses are JSON.

---

## 1. `POST /api/analyze`

Starts an asynchronous SEO analysis for a given URL.

### Request

```
POST /api/analyze
Content-Type: application/json

{
  "url": "https://example.com"
}
```

### Response — 202 Accepted

```json
{
  "jobId": "b6f1a2e4-3c2a-4b8b-9b7e-1234567890ab",
  "status": "queued",
  "message": "Analysis started. Poll GET /api/results/:id for status."
}
```

### Error — 400 Bad Request

```json
{ "error": "Invalid URL. Include the protocol, e.g. https://example.com" }
```

---

## 2. `GET /api/results/:id`

Fetches the current status and (once ready) the full SEO report for a job.

### Request

```
GET /api/results/b6f1a2e4-3c2a-4b8b-9b7e-1234567890ab
```

### Response — while processing

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

`status` will be one of: `queued`, `processing`, `completed`, `failed`.

### Response — completed (abridged)

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
      "headings": { "h1": ["Example Domain"], "h2": [], "h3": [], "h4": [], "h5": [], "h6": [] },
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
    "readability": { "score": 62, "label": "Fairly Easy" },
    "keywords": [{ "word": "example", "count": 2, "densityPercent": 8.33 }],
    "technical": {
      "isHttps": true,
      "robotsTxt": { "exists": false, "url": "https://example.com/robots.txt" },
      "sitemapXml": { "exists": false, "url": "https://example.com/sitemap.xml" }
    },
    "performance": { "loadTimeMs": 220, "pageSizeKB": 1.3, "estimatedRequests": 1 },
    "lighthouse": { "available": false, "reason": "Lighthouse/Puppeteer unavailable..." },
    "mobileFriendly": false,
    "socialMeta": { "openGraphPresent": false, "twitterPresent": false },
    "scores": {
      "technical": 55,
      "onPage": 71,
      "content": 50,
      "performance": 100,
      "overall": 66,
      "notes": {
        "technical": ["robots.txt not found (-15)", "sitemap.xml not found (-15)"],
        "onPage": ["Meta description length is 0 chars (ideal: 50-160)"],
        "content": ["Page has only 28 words (ideal: 300+)"],
        "performance": []
      }
    }
  }
}
```

### Error — 404 Not Found

```json
{ "error": "Job not found. Check the jobId." }
```

---

## Notes

- The API is **stateless per job** — poll `/api/results/:id` every 1–2 seconds until
  `status` is `completed` or `failed`.
- No authentication is required for this assignment build. Add an API key middleware
  before any public production deployment.
