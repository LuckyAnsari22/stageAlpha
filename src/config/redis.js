const Redis = require('ioredis');
const logger = require('./logger');

// Initialize ioredis with explicit failure contingencies 
// allowing the system to operate flawlessly even if the caching tier collapses.
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  lazyConnect: true,
  maxRetriesPerRequest: 1, // Fail fast on requests to bypass to database
  retryStrategy: (times) => {
    // Retry connection logic max 3 times
    const delay = Math.min(times * 100, 2000);
    return times > 3 ? null : delay; // Stops retrying completely
  }
});

// Architectural Graceful Failures: Prevent App Crash on Redis Loss
redis.on('connect', () => {
  logger.info('🟩 Active Redis Storage Pipeline Initialized.');
});

redis.on('error', (err) => {
  if (err.code === 'ECONNREFUSED') {
    logger.warn('🟨 Redis Offline. Operating strictly via RDBMS mapping fallback.');
  } else {
    logger.error(`Redis fault detected: ${err.message}`);
  }
});

// Critical line modeled from express-redis-cache pattern
redis.on('disconnected', () => logger.warn('🟨 Redis dropped allocation pool. Requests bypassing cache implicitly.'));

module.exports = redis;
