const fs = require('fs');

const missingRoutes = ['equipment','categories','venues','bookings','customers','payments','analytics','pricing','backtest'];
for (const r of missingRoutes) {
  fs.writeFileSync('routes/' + r + '.js', "const express = require('express');\nconst router = express.Router();\nmodule.exports = router;");
}

if (!fs.existsSync('services')) {
  fs.mkdirSync('services');
}
fs.writeFileSync('services/socket.js', "module.exports = { init: (io) => {} };");
console.log("Stubs created.")
