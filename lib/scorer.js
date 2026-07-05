/**
 * SEO SCORING ENGINE
 * ------------------
 * Produces 4 category scores (0-100 each) + 1 weighted overall score (0-100).
 * This logic is custom-built (not copied from Woorank) and is explained in
 * full in SCORING_EXPLANATION.md at the repo root.
 *
 * Category weights toward the overall score:
 *   On-Page SEO   -> 30%
 *   Technical SEO -> 25%
 *   Content       -> 25%
 *   Performance   -> 20%
 */

function computeScores(data) {
  const notes = { technical: [], onPage: [], content: [], performance: [] };

  // ---------------- TECHNICAL SEO (max 100) ----------------
  let tech = 0;
  const t = data.technical;

  if (t.isHttps) tech += 20;
  else notes.technical.push('Site is not served over HTTPS (-20)');

  if (t.robotsTxt.exists) tech += 15;
  else notes.technical.push('robots.txt not found (-15)');

  if (t.sitemapXml.exists) tech += 15;
  else notes.technical.push('sitemap.xml not found (-15)');

  if (data.onPage.canonical) tech += 15;
  else notes.technical.push('Canonical tag missing (-15)');

  const blockedByRobotsMeta = data.onPage.robotsMeta && /noindex/i.test(data.onPage.robotsMeta);
  if (!blockedByRobotsMeta) tech += 15;
  else notes.technical.push('Page has a "noindex" robots meta tag (-15)');

  if (data.onPage.structuredDataCount > 0) tech += 10;
  else notes.technical.push('No structured data (JSON-LD) found (-10)');

  if (data.statusCode === 200) tech += 10;
  else notes.technical.push(`Page returned HTTP status ${data.statusCode} instead of 200 (-10)`);

  // ---------------- ON-PAGE SEO (max 100) ----------------
  let onp = 0;
  const p = data.onPage;

  if (p.titleLength >= 10 && p.titleLength <= 60) onp += 20;
  else notes.onPage.push(`Title tag length is ${p.titleLength} chars (ideal: 10-60)`);

  if (p.metaDescriptionLength >= 50 && p.metaDescriptionLength <= 160) onp += 20;
  else notes.onPage.push(`Meta description length is ${p.metaDescriptionLength} chars (ideal: 50-160)`);

  if (p.h1Count === 1) onp += 15;
  else notes.onPage.push(`Found ${p.h1Count} H1 tag(s), ideal is exactly 1`);

  const headingsUsedInOrder = evaluateHeadingHierarchy(p.headings);
  if (headingsUsedInOrder) onp += 10;
  else notes.onPage.push('Heading hierarchy skips levels (e.g. H1 -> H3 with no H2)');

  const altCoverage = p.imagesTotal === 0 ? 1 : (p.imagesTotal - p.imagesWithoutAlt) / p.imagesTotal;
  onp += Math.round(altCoverage * 15);
  if (altCoverage < 1) notes.onPage.push(`${p.imagesWithoutAlt} of ${p.imagesTotal} image(s) missing alt text`);

  if (p.internalLinks > 0) onp += 10;
  else notes.onPage.push('No internal links found on the page');

  const urlLen = (data.finalUrl || data.url || '').length;
  if (urlLen <= 100) onp += 10;
  else notes.onPage.push(`URL is ${urlLen} characters long (ideal: under 100)`);

  // ---------------- CONTENT QUALITY (max 100) ----------------
  let content = 0;

  if (p.wordCount >= 300) content += 30;
  else notes.content.push(`Page has only ${p.wordCount} words (ideal: 300+)`);

  const r = data.readability.score;
  if (r >= 50 && r <= 80) content += 30;
  else notes.content.push(`Flesch Reading Ease score is ${r} (comfortable range: 50-80)`);

  const topDensity = data.keywords[0] ? data.keywords[0].densityPercent : 0;
  if (topDensity >= 0.5 && topDensity <= 3) content += 20;
  else notes.content.push(`Top keyword density is ${topDensity}% (ideal: 0.5%-3%, avoids keyword stuffing)`);

  const anyHeadingsUsed = Object.values(p.headings).some((arr) => arr.length > 0);
  if (anyHeadingsUsed) content += 20;
  else notes.content.push('No headings (H1-H6) used to structure the content');

  // ---------------- PERFORMANCE (max 100) ----------------
  let perf;
  if (data.lighthouse && data.lighthouse.available) {
    perf = data.lighthouse.performanceScore;
  } else {
    let ps = 0;
    const lt = data.performance.loadTimeMs;
    if (lt <= 1000) ps += 50;
    else if (lt <= 2500) ps += 35;
    else if (lt <= 5000) ps += 20;
    else { ps += 5; notes.performance.push(`Slow server response time: ${lt}ms`); }

    const size = data.performance.pageSizeKB;
    if (size <= 500) ps += 30;
    else if (size <= 1500) ps += 20;
    else { ps += 5; notes.performance.push(`Large HTML payload: ${size}KB`); }

    if (data.mobileFriendly) ps += 20;
    else notes.performance.push('No responsive viewport meta tag found (mobile-friendliness signal)');

    perf = ps;
  }

  tech = Math.min(100, tech);
  onp = Math.min(100, onp);
  content = Math.min(100, content);
  perf = Math.min(100, Math.max(0, perf));

  const overall = Math.round(tech * 0.25 + onp * 0.30 + content * 0.25 + perf * 0.20);

  return {
    technical: tech,
    onPage: onp,
    content,
    performance: perf,
    overall,
    notes,
  };
}

function evaluateHeadingHierarchy(headings) {
  // crude but effective check: a level should not have content unless a
  // higher-priority level (H1..that level-1) also has content, OR it's H1 itself.
  const levels = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  let seenEmpty = false;
  for (const lvl of levels) {
    const used = headings[lvl] && headings[lvl].length > 0;
    if (used && seenEmpty) return false; // this level used after a gap
    if (!used) seenEmpty = true;
  }
  return true;
}

module.exports = { computeScores };
