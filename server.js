const express = require('express');
const cors = require('cors');
const path = require('path');
const analyzeRouter = require('./routes/analyze');

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', analyzeRouter);

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Fallback to index.html for the simple SPA
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`SEO Analyzer backend running on port ${PORT}`);
});
