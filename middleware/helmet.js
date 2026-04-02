/**
 * SECURITY HEADERS MIDDLEWARE
 * 
 * Helmet configuration for HTTP security headers
 * - Prevents clickjacking: X-Frame-Options
 * - Prevents XSS: X-XSS-Protection, Content-Security-Policy
 * - Prevents MIME-type sniffing: X-Content-Type-Options
 * 
 * Note: helmet() is used directly in server.js
 * This can hold custom helmet config if needed
 */

module.exports = {};
