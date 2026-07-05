/**
 * Custom readability + keyword density implementation.
 * Uses the classic Flesch Reading Ease formula (public-domain, well documented formula —
 * not a third-party API call).
 */

function countSyllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  const matches = w.match(/[aeiouy]+/g);
  let count = matches ? matches.length : 1;
  if (w.endsWith('e') && count > 1) count -= 1;
  return Math.max(1, count);
}

function fleschReadingEase(text) {
  const cleaned = (text || '').trim();
  if (!cleaned) return 0;
  const sentenceMatches = cleaned.match(/[^.!?]+[.!?]+/g);
  const sentenceCount = sentenceMatches ? sentenceMatches.length : 1;
  const words = cleaned.split(/\s+/).filter(Boolean);
  const wordCount = words.length || 1;
  const syllableCount = words.reduce((sum, w) => sum + countSyllables(w), 0);

  const score = 206.835
    - 1.015 * (wordCount / sentenceCount)
    - 84.6 * (syllableCount / wordCount);

  return Math.max(0, Math.min(100, Math.round(score)));
}

function readabilityLabel(score) {
  if (score >= 90) return 'Very Easy';
  if (score >= 70) return 'Easy';
  if (score >= 60) return 'Fairly Easy';
  if (score >= 50) return 'Medium';
  if (score >= 30) return 'Difficult';
  return 'Very Difficult';
}

const STOPWORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'for',
  'with', 'as', 'by', 'that', 'this', 'it', 'are', 'was', 'were', 'be', 'from', 'has',
  'have', 'not', 'but', 'we', 'you', 'your', 'our', 'their', 'will', 'can', 'all',
  'about', 'more', 'if', 'so', 'no', 'do', 'does', 'up', 'out', 'its', 'they', 'he',
  'she', 'his', 'her', 'them', 'i', 'my', 'me', 'us', 'been', 'also',
]);

function keywordDensity(text, topN = 10) {
  const words = (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));

  const freq = {};
  words.forEach((w) => { freq[w] = (freq[w] || 0) + 1; });

  const total = words.length || 1;
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word, count]) => ({ word, count, densityPercent: +((count / total) * 100).toFixed(2) }));
}

module.exports = { fleschReadingEase, readabilityLabel, keywordDensity };
