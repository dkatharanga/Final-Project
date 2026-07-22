// src/index.js
// DEPRECATED ENTRYPOINT — the app now has a single server in src/server.js.
// This file used to be a second, diverging Express bootstrap (different CORS,
// body limits, and rate limiting), which was a frequent source of "works in one
// but not the other" bugs. It now simply re-exports the real server so any old
// `node src/index.js` / `require('./index')` still starts the same app.
module.exports = require('./server')
