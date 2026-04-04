# 🔍 ADMIN FEATURES BROKEN - DIAGNOSTIC GUIDE

## ⚡ Quick Fix Steps

### Step 1: Run the Diagnostic Tool
1. Start server: `npm start`
2. Go to: `http://localhost:3000/#!/admin/diagnostic`
3. Login as admin if needed
4. This will show you exactly which APIs are failing

### Step 2: Check the Output
The diagnostic page will show:
- ✅ **GREEN** = API working, data is coming back
- ❌ **RED** = API failing, check the error message

### Step 3: Based on Results

**If Dashboard API (red):**
- Go to terminal running npm start
- Check for error messages
- Look for "error" or "500" messages
- Error might be: view doesn't exist, table doesn't exist, etc.

**If Bookings API (red):**
- Same as above - check terminal for errors
- Error likely related to vw_booking_details view

**If Equipment API (red):**
- Same as above - check terminal for errors
- Error likely related to equipment table or view

---

## 🔧 Common Issues & Fixes

### Issue 1: All APIs Failing with 401 Error
**Problem:** Auth token not being sent

**Check:**
- Are you logged in as admin?
- Try: Clear localStorage and login again
- In browser console: `localStorage.clear()`

**Fix:**
```javascript
// In browser console:
localStorage.clear();
window.location.reload();
```

### Issue 2: All APIs Failing with 403 Error
**Problem:** User not admin

**Check:**
- In browser console: `console.log(JSON.parse(localStorage.getItem('user')))`
- Look for `"role": "admin"`

**Fix:**
- Logout and login with admin account
- Or create admin account: `node resetpass.js`

### Issue 3: Database Connection Error
**Problem:** Can't connect to database

**Check terminal logs:**
- Look for "ECONNREFUSED"
- Look for "database"
- Look for "connection"

**Fix:**
- Make sure PostgreSQL is running
- Check .env DATABASE_URL is correct
- Test connection: `psql $DATABASE_URL`

### Issue 4: View/Table Not Found Error
**Problem:** Database views or tables missing

**Check terminal logs:**
- Look for "does not exist"
- Look for "vw_" (view names)

**Fix:**
- Run database setup: `npm run setup-db`
- Or manually: `node setup_db.js`

### Issue 5: API Returns 200 But No Data
**Problem:** API succeeds but data structure wrong

**Check diagnostic output:**
- Does it show SUCCESS but empty object?
- Look at the JSON response carefully

**Fix:**
- This is usually a field naming issue
- May need to update controller expectations
- Check views.sql for actual column names

---

## 🎯 Step-by-Step Debugging

### Step 1: Verify Server is Running
```bash
npm start
```
Look for: "Server running on port 3000"

### Step 2: Check You're Logged In
- Go to: http://localhost:3000/#!/admin/diagnostic
- See "Auth Status: Logged in as..."

### Step 3: Run Tests
- Click "Run Tests" button
- Wait for results

### Step 4: Analyze Each Result

**Dashboard API test:**
```json
{
  "success": true,
  "data": {
    "today_bookings": 5,
    "total_revenue": 25000,
    ...
  }
}
```
This should have fields like: today_bookings, total_revenue, etc.

**Bookings API test:**
```json
{
  "success": true,
  "data": [
    {
      "booking_id": 1,
      "customer_name": "John",
      ...
    }
  ]
}
```
This should be an array of bookings.

**Equipment API test:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "PA System",
      ...
    }
  ]
}
```
This should be an array of equipment.

### Step 5: Check Terminal for Errors
While running tests, watch the terminal where npm start is running:
- Look for red text (errors)
- Look for stack traces
- Copy the error and search online

---

## 📊 Complete Diagnostic Checklist

Run through this complete checklist:

```
[ ] npm start runs without errors
[ ] Server says "Server running on port 3000"
[ ] Can login as admin
[ ] Can navigate to /admin/diagnostic
[ ] Page shows auth status correctly
[ ] Can click "Run Tests" button
[ ] Tests complete (don't hang)
[ ] Dashboard API shows GREEN ✅
[ ] Bookings API shows GREEN ✅
[ ] Equipment API shows GREEN ✅
[ ] All API responses show data
[ ] No RED ❌ status codes
[ ] No error messages in responses
```

If ANY step fails, that's where the problem is!

---

## 🖥️ Server Terminal Debugging

While running `npm start`, watch for these messages:

**Good signs:**
```
Server running on port 3000
Database connected
```

**Bad signs:**
```
Error: connect ECONNREFUSED
Error: database error
Error: relation does not exist
Error: 401 Unauthorized
```

Copy any error messages and check:
1. What table/view is missing?
2. Is it a connection issue?
3. Is it an auth issue?

---

## 📝 API Response Format

### Dashboard Should Return:
```javascript
{
  success: true,
  data: {
    today_bookings: <number>,
    month_revenue: <number>,
    pending_bookings: <number>,
    low_stock_items: <number>,
    recent_bookings: [<array of bookings>]
  }
}
```

### Bookings Should Return:
```javascript
{
  success: true,
  data: [
    {
      booking_id: <id>,
      customer_name: "...",
      email: "...",
      status: "...",
      event_date: "...",
      total_price: <number>
      // ... more fields
    }
  ],
  total: <count>,
  page: <number>,
  limit: <number>
}
```

### Equipment Should Return:
```javascript
{
  success: true,
  data: [
    {
      id: <id>,
      name: "...",
      category_name: "...",
      base_price: <number>,
      current_price: <number>,
      stock_qty: <number>
      // ... more fields
    }
  ],
  total: <count>,
  page: <number>,
  limit: <number>
}
```

If structure is different, controllers may not recognize the fields!

---

## 🚨 If Still Stuck

1. **Take a screenshot** of the diagnostic page
2. **Copy error messages** from terminal
3. **Check database** is running: `psql -U postgres -d stagealpha`
4. **Verify tables exist**: `\dt` (in psql)
5. **Verify views exist**: `\dv` (in psql)

---

## 🎓 Understanding the Issue

**Why are features broken?**

The admin pages load but show empty/broken because:
1. ❌ API request fails (returns error status)
2. ❌ API returns wrong data format
3. ❌ Controller can't parse the response
4. ❌ Database tables/views don't exist
5. ❌ User not properly authenticated

**The diagnostic tool helps identify which of these is happening!**

---

## ✅ Once Fixed

When all APIs show GREEN ✅:
1. Go back to /admin/dashboard
2. It should now load with data
3. Go to /admin/bookings
4. Go to /admin/inventory
5. All pages should work!

---

**Use the diagnostic tool first - it will pinpoint exactly what's broken! 🎯**

Access it here:
```
http://localhost:3000/#!/admin/diagnostic
```
