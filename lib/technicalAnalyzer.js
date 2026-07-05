async function checkTechnical(targetUrl, fetchText) {
  const parsed = new URL(targetUrl);
  const isHttps = parsed.protocol === 'https:';
  const origin = `${parsed.protocol}//${parsed.host}`;
  const robotsUrl = `${origin}/robots.txt`;
  const sitemapUrl = `${origin}/sitemap.xml`;

  const [robots, sitemap] = await Promise.all([
    fetchText(robotsUrl),
    fetchText(sitemapUrl),
  ]);

  const disallowsAll = robots.exists && /Disallow:\s*\/\s*(\r?\n|$)/im.test(robots.content) && !/Disallow:\s*\/\S/.test(robots.content);
  const sitemapReferencedInRobots = robots.exists && /sitemap:/i.test(robots.content);

  return {
    isHttps,
    robotsTxt: { exists: robots.exists, url: robotsUrl, status: robots.status, disallowsAll },
    sitemapXml: { exists: sitemap.exists, url: sitemapUrl, status: sitemap.status, referencedInRobots: sitemapReferencedInRobots },
  };
}

module.exports = { checkTechnical };
