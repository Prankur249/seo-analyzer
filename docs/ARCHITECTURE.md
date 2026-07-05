# Backend Architecture Explanation

## High-Level Flow

```
Client (browser)
    │
    │ POST /api/analyze { url }
    ▼
Express Route (routes/analyze.js)
    │  - validates URL
    │  - creates job in jobStore (status: queued)
    │  - responds immediately with { jobId, status }
    │  - kicks off runAnalysis() WITHOUT awaiting it (fire-and-forget)
    ▼
Pipeline (lib/pipeline.js)  ── runs in the background ──
    │
    ├─▶ crawler.js        → fetch HTML, robots.txt, sitemap.xml (Axios)
    ├─▶ onPageAnalyzer.js → parse DOM with Cheerio → title/meta/headings/links/OG/Twitter/JSON-LD
    ├─▶ technicalAnalyzer.js → HTTPS / robots / sitemap / noindex checks
    ├─▶ contentAnalyzer.js   → readability (Flesch) + keyword density
    ├─▶ performanceAnalyzer.js → load time/size, optional Lighthouse
    │
    ▼
scorer.js → computes 4 category scores + weighted overall score
    │
    ▼
jobStore.complete(jobId, result)   (status: completed)

Client polls:
    GET /api/results/:id  (every 1-2s)
    → returns { status, result } until status === 'completed' | 'failed'
```

## Why Async Job Pattern (not a synchronous request)?

Crawling a live website + optionally running Lighthouse can take anywhere from ~500ms to
20+ seconds depending on the target site. Blocking an HTTP request for that long is bad
practice (proxies/load balancers commonly timeout at 30s, and it ties up a request thread
per analysis). Instead:

1. `POST /api/analyze` does only cheap work (URL validation, jobId creation) and returns
   in milliseconds.
2. The actual analysis (`runAnalysis`) is invoked without `await`— it runs on Node's
   event loop in the background while the HTTP response has already been sent.
3. The client polls `GET /api/results/:id` for status, which is a cheap in-memory lookup.

This is the same pattern used by real-world async APIs (e.g. video encoding APIs, batch
LLM inference APIs) — "submit job → poll for result."

## Component Responsibilities

| File | Responsibility |
|---|---|
| `server.js` | Express app bootstrap, middleware, static file serving |
| `routes/analyze.js` | HTTP layer only — input validation, job creation, response shaping |
| `lib/jobStore.js` | Job lifecycle state machine (queued → processing → completed/failed) |
| `lib/crawler.js` | All outbound HTTP (page fetch, robots.txt, sitemap.xml) — the only place `axios` is used |
| `lib/onPageAnalyzer.js` | Pure function: HTML string → structured on-page SEO data (Cheerio) |
| `lib/technicalAnalyzer.js` | Technical SEO checks that require extra network calls (robots/sitemap) |
| `lib/contentAnalyzer.js` | Pure functions: text → readability score, text → keyword density |
| `lib/performanceAnalyzer.js` | Timing/size metrics + optional Lighthouse integration with graceful fallback |
| `lib/scorer.js` | Pure function: structured analysis data → 4 scores + notes (see SCORING_EXPLANATION.md) |
| `lib/pipeline.js` | Orchestrator — wires the above together in the correct order, handles partial failures |

Keeping each concern in its own module means:
- **Testability** — every analyzer is a pure function you can unit test with mock HTML/data (no network needed).
- **Swappability** — e.g. `jobStore.js` can be replaced with a Redis-backed store, or
  `crawler.js` can be swapped for a headless-browser-based crawler for JS-heavy SPAs,
  without touching the scoring logic.
- **Fault isolation** — if Lighthouse fails to launch (common on constrained hosts), only
  `performanceAnalyzer.js` degrades (falls back), the rest of the report is unaffected.

## Scalability Notes (for a production version beyond this assignment)

- Replace `lib/jobStore.js`'s in-memory `Map` with **Redis** + a proper queue (BullMQ/Bee-Queue)
  so jobs survive server restarts and can be processed by multiple worker instances.
- Move the crawl+analyze pipeline into a **separate worker process** (queue consumer),
  keeping the API server thin and horizontally scalable independent of crawl load.
- Add **rate limiting** per IP/API key on `POST /api/analyze` to prevent abuse (this crawler
  makes outbound requests to arbitrary user-supplied URLs — classic SSRF-adjacent surface,
  so in production you'd also want URL allow/deny-listing and a request timeout ceiling).
- Cache results by normalized URL for N minutes to avoid re-crawling the same site repeatedly.

## Security Consideration Already Handled

- `validateStatus: () => true` on Axios calls means we never throw on 4xx/5xx — we inspect
  and report the status instead of crashing the job.
- URL protocol is restricted to `http:`/`https:` only in the route validation, rejecting
  `file://`, `ftp://`, etc.
- Timeouts are set on every outbound request (15–20s) so a slow/hanging target site can't
  hang a job indefinitely.
