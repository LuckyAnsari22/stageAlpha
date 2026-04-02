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
  } catch { next() }
}

const invalidate = async (...keys) => {
  if (!isAvailable()) return
  await Promise.all(keys.map(k => redis.del(k))).catch(() => {})
}

const invalidatePattern = async (pattern) => {
  if (!isAvailable()) return
  const keys = await redis.keys(pattern).catch(() => [])
  if (keys.length) await redis.del(...keys).catch(() => {})
}

module.exports = { checkCache, invalidate, invalidatePattern }
