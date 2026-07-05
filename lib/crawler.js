const axios = require('axios');

const UA = 'Mozilla/5.0 (compatible; CustomSEOAnalyzer/1.0; +https://example.com/bot)';

/**
 * Fetches a page, follows redirects, and records basic timing/size info.
 * We DO NOT use any paid SEO API here — this is a plain HTTP GET, timed manually.
 */
async function fetchPage(url) {
  const start = Date.now();
  const response = await axios.get(url, {
    maxRedirects: 5,
    validateStatus: () => true, // we want to inspect 3xx/4xx/5xx ourselves
    headers: { 'User-Agent': UA },
    timeout: 20000,
    responseType: 'text',
    transformResponse: [(data) => data], // keep raw string, don't let axios try JSON parse
  });
  const loadTime = Date.now() - start;

  const finalUrl = (response.request && response.request.res && response.request.res.responseUrl)
    || (response.request && response.request._redirectable && response.request._redirectable._currentUrl)
    || url;

  const html = typeof response.data === 'string' ? response.data : '';

  return {
    html,
    status: response.status,
    headers: response.headers,
    finalUrl,
    loadTime,
    sizeBytes: Buffer.byteLength(html || ''),
  };
}

/**
 * Fetches a plain text resource (robots.txt / sitemap.xml) without throwing on 404.
 */
async function fetchText(url) {
  try {
    const res = await axios.get(url, {
      timeout: 10000,
      validateStatus: () => true,
      headers: { 'User-Agent': UA },
      transformResponse: [(data) => data],
    });
    return {
      exists: res.status >= 200 && res.status < 300,
      status: res.status,
      content: typeof res.data === 'string' ? res.data : '',
    };
  } catch (e) {
    return { exists: false, status: null, content: '' };
  }
}

module.exports = { fetchPage, fetchText };
