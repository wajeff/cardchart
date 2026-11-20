// Local dev API server. It serves the same handlers Vercel runs in /api,
// so local and production always talk to the database the same way.
const path = require('path');
const { pathToFileURL } = require('url');
const express = require('express');
const cors = require('cors');

require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const apiDir = path.join(__dirname, '..', 'api');
const loadHandler = (name) =>
  import(pathToFileURL(path.join(apiDir, `${name}.js`)).href).then((m) => m.default);

const route = (name) => async (req, res) => {
  try {
    const handler = await loadHandler(name);
    await handler(req, res);
  } catch (error) {
    console.error(`${name} error:`, error);
    if (!res.headersSent) res.status(500).json({ error: error.message });
  }
};

app.get('/api/data', route('data'));
app.post('/api/alerts-subscribe', route('alerts-subscribe'));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
