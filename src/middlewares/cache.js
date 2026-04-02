const redis = require('../config/redis');
const logger = require('../config/logger');

/**
 * Cache Strategy Interceptor
 * Transparently hooks valid Express responses before final output stream,
 * duplicating payload data internally into the Redis architecture.
 *
 * @param {Function|String} keyFn - Function deriving unique key or explicit string
 * @param {Number} ttl - Seconds threshold defining cache expiration rate. Default 300
 */
const checkCache = (keyFn, ttl = 300) => async (req, res, next) => {
  if (redis.status !== 'ready') return next(); // Skip intercept without throwing

  const key = typeof keyFn === 'function' ? keyFn(req) : keyFn;
  
  try {
    const cached = await redis.get(key);
    
    // Stage 1: Absolute Hit (Direct Render)
    if (cached) {
      logger.debug(`[Cache Hit] Serving dataset strictly from node [${key}]`);
      const payload = JSON.parse(cached);
      return res.status(200).json({ success: true, count: payload.length, data: payload, cached: true });
    }
    
    // Stage 2: Cache Miss (Intercept res.json dynamically binding wrapper)
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Prevent caching system API errors or malformed structures
      if (body.success && body.data) {
        redis.setex(key, ttl, JSON.stringify(body.data))
             .catch(e => logger.warn(`Silent Cache Sync Error [${key}]: ${e.message}`));
      }
      return originalJson(body);
    };
    
    // Continue down Express logical pipeline toward the Database
    next();
  } catch (err) {
    // Structural Fault: Prevent system crash by gracefully resuming native routes.
    logger.error('Redis Access Violation. Bypassing interceptor.', err);
    next();
  }
};

module.exports = checkCache;
