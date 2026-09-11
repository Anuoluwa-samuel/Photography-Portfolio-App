// Thin console wrapper so log lines are consistently tagged, e.g. "[db] ..." / "[mail] ...".
const logger = tag => ({
  info: (...a) => console.log(`[${tag}]`, ...a),
  warn: (...a) => console.warn(`[${tag}]`, ...a),
  error: (...a) => console.error(`[${tag}]`, ...a),
});

module.exports = logger;
