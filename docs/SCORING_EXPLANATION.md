# SEO Scoring Explanation

This document explains, in full, how every score shown in the report is calculated.
The logic lives in `lib/scorer.js`. It is a custom rubric — not a copy of Woorank's
(undisclosed, proprietary) algorithm — built on widely-accepted, publicly documented
SEO best practices (Google's own SEO Starter Guide, W3C accessibility guidance, and
standard readability research).

## Overall Score

```
Overall = (Technical × 0.25) + (On-Page × 0.30) + (Content × 0.25) + (Performance × 0.20)
```

On-Page is weighted highest because title/description/headings/links are the signals
most directly under a site owner's control and most correlated with how a page is
understood by both users and search engines. Technical and Content are weighted equally
next, and Performance is weighted slightly lower since it can vary run-to-run based on
network conditions and is partly infrastructure-dependent rather than purely a content
decision.

---

## 1. Technical SEO Score (max 100)

| Check | Points | Why |
|---|---|---|
| Served over HTTPS | 20 | Ranking signal since 2014; also a basic trust/security requirement |
| `robots.txt` exists | 15 | Confirms crawl-control is explicitly configured |
| `sitemap.xml` exists | 15 | Helps search engines discover all indexable URLs |
| Canonical tag present | 15 | Prevents duplicate-content dilution |
| Not blocked by `noindex` meta robots tag | 15 | Confirms the page is actually indexable |
| Structured data (JSON-LD) present | 10 | Enables rich results / better machine understanding |
| Page returns HTTP 200 | 10 | Confirms the page is reachable and not erroring/redirect-looping |

**Total: 100**

---

## 2. On-Page SEO Score (max 100)

| Check | Points | Ideal range / condition |
|---|---|---|
| Title length | 20 | 10–60 characters |
| Meta description length | 20 | 50–160 characters |
| Exactly one H1 | 15 | Exactly 1 |
| Heading hierarchy consistency | 10 | No level skipped (e.g. H1 → H3 without H2) |
| Image ALT coverage | up to 15 | Scaled: `15 × (images_with_alt / total_images)` |
| Internal links present | 10 | At least 1 |
| URL length | 10 | ≤ 100 characters |

**Total: 100**

---

## 3. Content Quality Score (max 100)

| Check | Points | Ideal range / condition |
|---|---|---|
| Word count | 30 | ≥ 300 words |
| Flesch Reading Ease | 30 | Score between 50–80 (comfortable for a general audience) |
| Top keyword density | 20 | 0.5%–3% (enough focus without keyword stuffing) |
| Headings used to structure content | 20 | At least one heading tag used anywhere |

**Total: 100**

**Readability formula (Flesch Reading Ease)**, computed manually in `contentAnalyzer.js`:

```
206.835 − 1.015 × (total words / total sentences) − 84.6 × (total syllables / total words)
```

This is the standard public-domain formula (Flesch, 1948) — no external readability API
is used.

**Keyword density** is computed by stripping stopwords, counting frequency of remaining
terms, and expressing each term's count as a percentage of total content words. Top 10
terms are returned; density of the #1 term feeds the score above.

---

## 4. Performance Score (max 100)

Two modes:

**A. If Lighthouse is available** (Puppeteer + headless Chrome successfully launched):
`performance = Math.round(lighthouse.categories.performance.score × 100)` — i.e. we pass
through Lighthouse's own 0–100 performance score directly, since it's already a
well-validated industry metric (based on FCP, LCP, TBT, CLS, Speed Index).

**B. Fallback (no Lighthouse available)** — computed from our own crawl timing:

| Signal | Points | Thresholds |
|---|---|---|
| Load time | up to 50 | ≤1000ms: 50, ≤2500ms: 35, ≤5000ms: 20, else: 5 |
| Page size | up to 30 | ≤500KB: 30, ≤1500KB: 20, else: 5 |
| Mobile viewport meta tag present | 20 | Present / absent |

**Total: 100**

The fallback exists because Lighthouse requires a full headless Chromium instance, which
isn't guaranteed to be installable on every free hosting tier. The app detects this at
runtime and switches modes automatically — this is disclosed to the user in the report
(`lighthouse.available: false` + a `reason` field).

---

## Design Philosophy

- Every score is **explainable**: the `notes` object returned alongside each score lists
  exactly which checks failed and why, in plain language — this mirrors Woorank's own
  "explanation per check" UX without copying its exact algorithm or thresholds.
- Thresholds (e.g. "10–60 chars for title") are drawn from long-standing, publicly
  published SEO guidance (Google Search Central, Moz, Yoast documentation) rather than
  invented arbitrarily.
- The system is intentionally modular (`lib/scorer.js` is a single pure function) so
  weights/thresholds can be tuned without touching the crawler or analyzers.
