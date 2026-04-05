const { redis, isAvailable } = require('../config/redis')

const checkCache = (keyFn, ttl = 300) => async (req, res, next) => {
  if (!isAvailable()) return next()  // Redis down? Skip cache, serve from DB
  
  const key = typeof keyFn === 'function' ? keyFn(req) : keyFn
  try {
    const cached = await redis.get(key)
    if (cached) {
      return res.json({ success: true, data: JSON.parse(cached), fromCache: true })
    }
    // Intercept res.json to cache the response
    const originalJson = res.json.bind(res)
    res.json = (body) => {
      if (body?.success && body?.data) {
        redis.setex(key, ttl, JSON.stringify(body.data)).catch(() => {})
      }
      return originalJson(body)
    }
    next()
  } catch (err) {
    console.warn('[Cache] Read failed:', err.message)
    next()
  }
}

const invalidate = async (...keys) => {
  if (!isAvailable()) return
  await Promise.all(keys.map(k => redis.del(k))).catch(() => {})
}

/**
 * Invalidate cache keys matching a pattern.
 * Uses SCAN instead of KEYS for production safety (O(1) per call vs O(N) blocking).
 */
const invalidatePattern = async (pattern) => {
  if (!isAvailable()) return
  try {
    const stream = redis.scanStream({ match: pattern, count: 100 })
    const pipeline = redis.pipeline()
    let scanCount = 0

    stream.on('data', (keys) => {
      keys.forEach(key => {
        pipeline.del(key)
        scanCount++
      })
    })

    await new Promise((resolve, reject) => {
      stream.on('end', async () => {
        if (scanCount > 0) await pipeline.exec()
        resolve()
      })
      stream.on('error', reject)
    })
  } catch (err) {
    // Fallback: try KEYS if SCAN fails (e.g. Redis < 2.8)
    try {
      const keys = await redis.keys(pattern)
      if (keys.length) await redis.del(...keys)
    } catch {
      console.warn('[Cache] Pattern invalidation failed for:', pattern)
    }
  }
}

module.exports = { checkCache, invalidate, invalidatePattern }
