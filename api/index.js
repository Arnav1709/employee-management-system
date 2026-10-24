// Vercel serverless entry — the whole Express app runs as one function.
const { app } = require('../server/index.js');
module.exports = app;
