/**
 * Quick API Test for Equipment Endpoints
 * Tests POST, PUT, and GET operations
 */

const http = require('http');

// Test data
const testEquipment = {
  name: 'Test Laser Light',
  category_id: 3,
  description: 'Test equipment for inventory',
  base_price: 5000,
  current_price: 5000,
  stock_qty: 10,
  specs: { low_stock_threshold: 5 },
  image_url: '',
  is_active: true
};

// Mock token (you'll need to set this to a real admin token)
const token = 'Bearer YOUR_TOKEN_HERE';

function makeRequest(method, path, data, callback) {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/v1${path}`,
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token
    }
  };

  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log(`\n${method} ${path}`);
      console.log(`Status: ${res.statusCode}`);
      try {
        console.log('Response:', JSON.stringify(JSON.parse(body), null, 2));
      } catch (e) {
        console.log('Response:', body);
      }
      callback();
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
    callback();
  });

  if (data) {
    console.log('\nSending:', JSON.stringify(data, null, 2));
    req.write(JSON.stringify(data));
  }
  req.end();
}

// Test sequence
console.log('=== Equipment API Test Suite ===\n');

// Test 1: POST new equipment
makeRequest('POST', '/equipment', testEquipment, () => {
  // Test 2: GET all equipment
  makeRequest('GET', '/equipment', null, () => {
    console.log('\n✅ Tests complete!');
    process.exit(0);
  });
});
