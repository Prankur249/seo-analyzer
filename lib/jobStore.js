/**
 * Simple in-memory job store.
 * For production/scale, swap this for Redis (e.g. BullMQ) — the interface
 * below is intentionally small so that swap is a drop-in change.
 */
const jobs = new Map();

function create(id, url) {
  jobs.set(id, {
    id,
    url,
    status: 'queued', // queued -> processing -> completed | failed
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    result: null,
    error: null,
  });
  return jobs.get(id);
}

function update(id, patch) {
  const job = jobs.get(id);
  if (!job) return null;
  Object.assign(job, patch, { updatedAt: new Date().toISOString() });
  jobs.set(id, job);
  return job;
}

function complete(id, result) {
  return update(id, { status: 'completed', result, error: null });
}

function fail(id, errorMessage) {
  return update(id, { status: 'failed', error: errorMessage });
}

function get(id) {
  return jobs.get(id) || null;
}

module.exports = { create, update, complete, fail, get };
