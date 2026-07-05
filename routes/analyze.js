const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const jobStore = require('../lib/jobStore');
const { runAnalysis } = require('../lib/pipeline');

/**
 * POST /api/analyze
 * Body: { "url": "https://example.com" }
 * Returns immediately with a jobId; analysis runs asynchronously in the background.
 */
router.post('/analyze', (req, res) => {
  const { url } = req.body || {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Field "url" (string) is required in the request body.' });
  }

  let parsed;
  try {
    parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('bad protocol');
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL. Include the protocol, e.g. https://example.com' });
  }

  const jobId = uuidv4();
  jobStore.create(jobId, parsed.toString());

  // Fire-and-forget async processing — this is what makes /api/analyze non-blocking.
  runAnalysis(jobId, parsed.toString()).catch((err) => {
    jobStore.fail(jobId, err.message || 'Unknown error during analysis');
  });

  res.status(202).json({ jobId, status: 'queued', message: 'Analysis started. Poll GET /api/results/:id for status.' });
});

/**
 * GET /api/results/:id
 * Returns current job status, and the full report once completed.
 */
router.get('/results/:id', (req, res) => {
  const job = jobStore.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found. Check the jobId.' });
  res.json(job);
});

module.exports = router;
