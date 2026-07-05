const cheerio = require('cheerio');

/**
 * Extracts all on-page SEO signals from raw HTML using Cheerio (jQuery-like DOM parsing).
 * No external SEO API is used — every field below is derived from the DOM ourselves.
 */
function analyzeOnPage(html, baseUrl) {
  const $ = cheerio.load(html);

  const title = $('title').first().text().trim();
  const metaDescription = ($('meta[name="description"]').attr('content') || '').trim();

  const headings = {};
  for (let i = 1; i <= 6; i++) {
    headings['h' + i] = $('h' + i)
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean);
  }

  const imgEls = $('img');
  let imagesWithoutAlt = 0;
  imgEls.each((_, el) => {
    const alt = $(el).attr('alt');
    if (!alt || !alt.trim()) imagesWithoutAlt++;
  });

  let internalLinks = 0;
  let externalLinks = 0;
  let host = null;
  try { host = new URL(baseUrl).hostname; } catch (e) { /* ignore */ }

  const linkList = [];
  $('a[href]').each((_, el) => {
    const href = ($(el).attr('href') || '').trim();
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;
    try {
      const resolved = new URL(href, baseUrl);
      const isInternal = host && resolved.hostname === host;
      if (isInternal) internalLinks++; else externalLinks++;
      linkList.push({ href: resolved.toString(), internal: !!isInternal, text: $(el).text().trim().slice(0, 80) });
    } catch (e) { /* skip malformed href */ }
  });

  const canonical = $('link[rel="canonical"]').attr('href') || null;
  const robotsMeta = $('meta[name="robots"]').attr('content') || null;
  const viewportMeta = $('meta[name="viewport"]').attr('content') || null;
  const langAttr = $('html').attr('lang') || null;

  const openGraph = {};
  $('meta[property^="og:"]').each((_, el) => {
    const prop = $(el).attr('property');
    if (prop) openGraph[prop] = $(el).attr('content') || '';
  });

  const twitter = {};
  $('meta[name^="twitter:"]').each((_, el) => {
    const name = $(el).attr('name');
    if (name) twitter[name] = $(el).attr('content') || '';
  });

  const structuredData = $('script[type="application/ld+json"]')
    .map((_, el) => $(el).html())
    .get()
    .filter(Boolean);

  // Strip script/style before computing visible text for content analysis
  const $clone = cheerio.load(html);
  $clone('script, style, noscript').remove();
  const bodyText = $clone('body').text().replace(/\s+/g, ' ').trim();
  const wordCount = bodyText ? bodyText.split(' ').filter(Boolean).length : 0;

  return {
    title,
    titleLength: title.length,
    metaDescription,
    metaDescriptionLength: metaDescription.length,
    headings,
    h1Count: headings.h1.length,
    imagesTotal: imgEls.length,
    imagesWithoutAlt,
    internalLinks,
    externalLinks,
    links: linkList.slice(0, 200), // cap payload size
    canonical,
    robotsMeta,
    viewportMeta,
    lang: langAttr,
    openGraph,
    twitter,
    structuredDataCount: structuredData.length,
    structuredDataTypes: structuredData.map(extractLdJsonType).filter(Boolean),
    bodyText,
    wordCount,
  };
}

function extractLdJsonType(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    const obj = Array.isArray(parsed) ? parsed[0] : parsed;
    return obj && obj['@type'] ? obj['@type'] : null;
  } catch (e) {
    return null;
  }
}

module.exports = { analyzeOnPage };
