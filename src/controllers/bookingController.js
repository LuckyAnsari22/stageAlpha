const db = require('../config/database');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

/** POST /api/bookings — Customer creates a booking via stored procedure */
const createBooking = catchAsync(async (req, res) => {
    const { start_date, end_date, items } = req.body;
    const customer_id = req.user.id;
    
    if (!start_date || !end_date || !items || !Array.isArray(items) || items.length === 0) {
        throw new ApiError(400, 'start_date, end_date, and items[] are required.');
    }
    
    // Call the stored procedure
    const result = await db.query(
        'SELECT fn_create_booking($1, $2::DATE, $3::DATE, $4::JSONB) AS booking_id',
        [customer_id, start_date, end_date, JSON.stringify(items)]
    );
    
    const bookingId = result.rows[0].booking_id;
    
    // Fetch the complete booking to return
    const booking = await db.query(`
        SELECT b.*, c.name AS customer_name, c.email
        FROM bookings b JOIN customers c ON c.id = b.customer_id
        WHERE b.id = $1
    `, [bookingId]);
    
    res.status(201).json({ success: true, data: booking.rows[0] });
});

/** GET /api/bookings/my — Customer views their own bookings */
const getMyBookings = catchAsync(async (req, res) => {
    const result = await db.query(`
        SELECT 
            b.id, b.start_date, b.end_date, b.total_amount, b.status, b.booking_date,
            json_agg(json_build_object(
                'equipment_name', e.name,
                'category', cat.name,
                'quantity', bi.quantity,
                'price_per_day', bi.price,
                'line_total', bi.price * bi.quantity
            )) AS items
        FROM bookings b
        JOIN booking_items bi ON bi.booking_id = b.id
        JOIN equipment e ON e.id = bi.equipment_id
        JOIN categories cat ON cat.id = e.category_id
        WHERE b.customer_id = $1
        GROUP BY b.id
        ORDER BY b.booking_date DESC
    `, [req.user.id]);
    
    res.status(200).json({ success: true, count: result.rowCount, data: result.rows });
});

/** PATCH /api/bookings/:id/cancel — Customer cancels via stored procedure */
const cancelBooking = catchAsync(async (req, res) => {
    await db.query(
        'SELECT fn_cancel_booking($1::INT, $2::INT)',
        [req.params.id, req.user.id]
    );
    
    res.status(200).json({ success: true, message: 'Booking cancelled successfully. Stock restored.' });
});

/** GET /api/bookings — Admin views ALL bookings */
const getAllBookings = catchAsync(async (req, res) => {
    const result = await db.query(`
        SELECT 
            b.id, c.name AS customer_name, c.email, c.phone,
            b.start_date, b.end_date, b.total_amount, b.status, b.booking_date,
            json_agg(json_build_object(
                'equipment_name', e.name,
                'quantity', bi.quantity,
                'price_per_day', bi.price
            )) AS items
        FROM bookings b
        JOIN customers c ON c.id = b.customer_id
        JOIN booking_items bi ON bi.booking_id = b.id
        JOIN equipment e ON e.id = bi.equipment_id
        GROUP BY b.id, c.name, c.email, c.phone
        ORDER BY b.booking_date DESC
    `);
    
    res.status(200).json({ success: true, count: result.rowCount, data: result.rows });
});

/** PATCH /api/bookings/:id/status — Admin confirms/completes a booking */
const updateStatus = catchAsync(async (req, res) => {
    const { status } = req.body;
    const validStatuses = ['Confirmed', 'Completed', 'Cancelled'];
    
    if (!validStatuses.includes(status)) {
        throw new ApiError(400, `Status must be one of: ${validStatuses.join(', ')}`);
    }
    
    const result = await db.query(
        'UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *',
        [status, req.params.id]
    );
    
    if (result.rowCount === 0) {
        throw new ApiError(404, 'Booking not found.');
    }
    
    res.status(200).json({ success: true, data: result.rows[0] });
});

module.exports = { createBooking, getMyBookings, cancelBooking, getAllBookings, updateStatus };
