require('dotenv').config();

const requiredVariables = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
for (const varName of requiredVariables) {
    if (!process.env[varName]) {
        throw new Error(`FATAL: Missing required environment variable: ${varName}`);
    }
}

const nodeEnv = process.env.NODE_ENV || 'development';

const config = Object.freeze({
    db: { 
        url: process.env.DATABASE_URL 
    },
    jwt: { 
        secret: process.env.JWT_SECRET, 
        refreshSecret: process.env.JWT_REFRESH_SECRET, 
        accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m', 
        refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d' 
    },
    redis: { 
        url: process.env.REDIS_URL || null 
    },
    app: { 
        port: parseInt(process.env.PORT) || 3000, 
        nodeEnv, 
        corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000' 
    },
    security: { 
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12 
    }
});

console.log(`StageAlpha config loaded | env: ${nodeEnv} | db: connected? (defer to pool) | redis: ${config.redis.url ? 'configured' : 'none'}`);

module.exports = config;
