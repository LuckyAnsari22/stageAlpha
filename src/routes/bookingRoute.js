const express = require('express');
const bookingController = require('../controllers/bookingController');
const { protect, adminOnly } = require('../middlewares/auth');

const router = express.Router();

// Customer routes (must be logged in)
router.post('/', protect, bookingController.createBooking);
router.get('/my', protect, bookingController.getMyBookings);
router.patch('/:id/cancel', protect, bookingController.cancelBooking);

// Admin routes
router.get('/', protect, adminOnly, bookingController.getAllBookings);
router.patch('/:id/status', protect, adminOnly, bookingController.updateStatus);

module.exports = router;
