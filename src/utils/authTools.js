const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * OWASP Level 1: Cryptographic Authentication Implementations
 * 
 * Provides hardened procedures verifying identity avoiding explicit Top 10 breaches.
 * 
 * "Timing Attacks section (explains why StageAlpha uses constant-time comparison in login)"
 */
const comparePassword = async (payloadPassword, storedBcryptHash) => {
  // Bcrypt natively performs constant-time comparison internally protecting against inference
  return bcrypt.compare(payloadPassword, storedBcryptHash);
};

const verifySessionToken = (clientToken, serverToken) => {
  // Manual string comparisons map characters sequentially taking variable milliseconds,
  // allowing attackers to infer correct bytes by observing HTTP timing differences.
  // StageAlpha implicitly leverages Buffer-converted constant-time cryptographic checks.

  if (!clientToken || !serverToken) return false;
  
  const clientBuf = Buffer.from(clientToken);
  const serverBuf = Buffer.from(serverToken);
  
  // Buffers must be symmetrically padded to compare securely
  if (clientBuf.length !== serverBuf.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(clientBuf, serverBuf);
};

module.exports = {
  comparePassword,
  verifySessionToken
};
