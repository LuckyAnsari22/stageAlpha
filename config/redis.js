const config = require('./index');

if (!config.redis.url) {
    console.warn('⚠️ Redis URL not provided. Running without Redis cache.');
    module.exports = {
        redis: {
            get: async () => null,
            set: async () => {},
            setex: async () => {},
            del: async () => {},
            quit: async () => {} 
        },
        isAvailable: () => false
    };
} else {
    const Redis = require('ioredis');
    const client = new Redis(config.redis.url, {
        lazyConnect: true,
        maxRetriesPerRequest: 3
    });

    client.on('error', (err) => {
        console.warn('Redis error (non-fatal):', err.message);
    });

    client.on('connect', () => {
        console.log('✅ Redis connected');
    });

    module.exports = {
        redis: client,
        isAvailable: () => client.status === 'ready'
    };
}
