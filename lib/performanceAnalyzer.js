const cheerio = require('cheerio');

/**
 * Basic performance metrics derived purely from our own crawl (no third-party API):
 * - load time (measured while fetching)
 * - page size in KB
 * - rough request count estimate (script/css/img tags)
 */
function basicPerformance(pageData, html) {
  const $ = cheerio.load(html);
  const scriptTags = $('script[src]').length;
  const stylesheetTags = $('link[rel="stylesheet"]').length;
  const imageTags = $('img').length;

  return {
    loadTimeMs: pageData.loadTime,
    pageSizeKB: +(pageData.sizeBytes / 1024).toFixed(1),
    estimatedRequests: scriptTags + stylesheetTags + imageTags + 1,
    scriptTags,
    stylesheetTags,
    imageTags,
  };
}

/**
 * Optional Lighthouse/Core Web Vitals integration.
 * Puppeteer + Lighthouse are heavy (need a headless Chromium) and may not be installable
 * on every free hosting tier — so this is wrapped to fail gracefully and fall back to
 * basicPerformance() above, keeping the rest of the pipeline fully functional either way.
 */
async function tryLighthouse(url) {
  try {
    const puppeteer = require('puppeteer');
    const lighthouse = (await import('lighthouse')).default;

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const { port } = new URL(browser.wsEndpoint());

    const result = await lighthouse(url, {
      port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: ['performance'],
    });

    await browser.close();
    const lhr = result.lhr;

    return {
      available: true,
      performanceScore: Math.round((lhr.categories.performance?.score || 0) * 100),
      largestContentfulPaint: lhr.audits['largest-contentful-paint']?.displayValue || null,
      cumulativeLayoutShift: lhr.audits['cumulative-layout-shift']?.displayValue || null,
      totalBlockingTime: lhr.audits['total-blocking-time']?.displayValue || null,
      firstContentfulPaint: lhr.audits['first-contentful-paint']?.displayValue || null,
      speedIndex: lhr.audits['speed-index']?.displayValue || null,
    };
  } catch (e) {
    return {
      available: false,
      reason: 'Lighthouse/Puppeteer unavailable in this environment — using basic performance metrics instead.',
    };
  }
}

module.exports = { basicPerformance, tryLighthouse };
