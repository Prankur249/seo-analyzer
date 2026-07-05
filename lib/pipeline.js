const { fetchPage, fetchText } = require('./crawler');
const { analyzeOnPage } = require('./onPageAnalyzer');
const { fleschReadingEase, readabilityLabel, keywordDensity } = require('./contentAnalyzer');
const { checkTechnical } = require('./technicalAnalyzer');
const { basicPerformance, tryLighthouse } = require('./performanceAnalyzer');
const { computeScores } = require('./scorer');
const jobStore = require('./jobStore');

/**
 * Runs the full async SEO analysis pipeline for one job.
 * Every step is wrapped so that partial failures (e.g. robots.txt fetch fails)
 * do not crash the whole job — they just get recorded as "not found".
 */
async function runAnalysis(jobId, url) {
  jobStore.update(jobId, { status: 'processing' });

  const pageData = await fetchPage(url);

  if (pageData.status >= 400) {
    jobStore.fail(jobId, `Target URL responded with HTTP ${pageData.status}`);
    return;
  }

  const onPage = analyzeOnPage(pageData.html, pageData.finalUrl || url);
  const readabilityScore = fleschReadingEase(onPage.bodyText);
  const readability = { score: readabilityScore, label: readabilityLabel(readabilityScore) };
  const keywords = keywordDensity(onPage.bodyText);
  const technical = await checkTechnical(url, fetchText);
  const performance = basicPerformance(pageData, pageData.html);
  const lighthouse = await tryLighthouse(pageData.finalUrl || url);

  const mobileFriendly = !!onPage.viewportMeta;

  const analysisData = {
    url,
    finalUrl: pageData.finalUrl,
    statusCode: pageData.status,
    redirected: !!(pageData.finalUrl && pageData.finalUrl !== url),
    onPage,
    readability,
    keywords,
    technical,
    performance,
    lighthouse,
    mobileFriendly,
    socialMeta: {
      openGraphPresent: Object.keys(onPage.openGraph).length > 0,
      twitterPresent: Object.keys(onPage.twitter).length > 0,
      openGraph: onPage.openGraph,
      twitter: onPage.twitter,
    },
  };

  const scores = computeScores(analysisData);

  jobStore.complete(jobId, { ...analysisData, scores, analyzedAt: new Date().toISOString() });
}

module.exports = { runAnalysis };
