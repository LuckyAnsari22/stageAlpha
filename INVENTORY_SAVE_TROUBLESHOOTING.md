# 🔧 INVENTORY SAVE FIX - DETAILED TROUBLESHOOTING

## 🎯 What Was Fixed

### 1. **Specs Field Format** ✅
**Problem**: Was sending specs as JSON string: `"specs": "{\"low_stock_threshold\": 5}"`  
**Fix**: Now sending as object: `"specs": {"low_stock_threshold": 5}`  
**Why**: Database column is JSONB type, expects object not string

### 2. **Field Validation** ✅
**Problem**: Generic error message "Invalid input fields"  
**Fix**: Specific validation with meaningful messages  
**Changes**:
```
- Check name exists
- Check category_id exists
- Validate base_price > 0 (converted to number)
- Validate stock_qty >= 0 (converted to number)
```

### 3. **Type Conversion** ✅
**Problem**: Sending prices and quantities as strings  
**Fix**: Convert to numbers before sending  
```javascript
base_price: parseInt($scope.form.price_per_day) || 0   // string → number
stock_qty: parseInt($scope.form.quantity) || 0         // string → number
```

### 4. **Dropdown Styling** ✅
**Problem**: White text on white background (not visible)  
**Fix**: Added CSS for `<option>` elements
```css
.form-select option {
  background: var(--admin-dark-bg);    /* Dark background */
  color: var(--admin-text);             /* Light text */
  padding: 8px;
}
```

### 5. **Enhanced Logging** ✅
**Added Console Output**:
```javascript
[Inventory] Form: {...form data...}
[Inventory] Category ID mapped: 3 from: Stage Lighting
[Inventory] API Data: {...complete api object...}
[Inventory] Save success: {...response...}
[Inventory] Save error: {...error details...}
```

---

## 🧪 Testing Instructions

### Step 1: Open DevTools
Press **F12** in browser and go to **Console** tab

### Step 2: Try Adding Equipment
1. Click "Add Item" button
2. Fill form:
   - Name: "Test Laser Light"
   - Category: "Stage Lighting" (select from dropdown)
   - Price: "5000"
   - Quantity: "10"
3. Click "Save Equipment"

### Step 3: Check Console Logs

You should see:
```
[Inventory] Form: Object {name: "Test Laser Light", category: "Stage Lighting", ...}
[Inventory] Category ID mapped: 3 from: Stage Lighting
[Inventory] Saving: POST /api/v1/equipment
[Inventory] API Data: {
  name: "Test Laser Light",
  category_id: 3,
  base_price: 5000,
  current_price: 5000,
  stock_qty: 10,
  specs: {low_stock_threshold: 5},
  ...
}
```

If successful:
```
[Inventory] Save success: Object
```

If failed:
```
[Inventory] Save error: Object {...error details...}
[Inventory] Error details: {
  status: 400,
  message: "Name is required" (or specific error)
}
```

---

## ⚠️ Troubleshooting

### Issue: 400 Bad Request

**Check Console Logs For**:
1. Is `category_id` numeric (1-5)?
   ```
   ✅ category_id: 3
   ❌ category_id: "Stage Lighting"
   ```

2. Is `base_price` > 0?
   ```
   ✅ base_price: 5000
   ❌ base_price: 0
   ❌ base_price: -1
   ```

3. Is `stock_qty` >= 0?
   ```
   ✅ stock_qty: 10
   ✅ stock_qty: 0
   ❌ stock_qty: -1
   ```

4. Check the actual error message in console:
   ```
   [Inventory] Error details: {
     status: 400,
     message: "Base price must be greater than 0"  ← Look here!
   }
   ```

### Issue: 500 Internal Server Error

**Common Causes**:
1. Category ID doesn't exist in database
   ```
   ✅ category_id: 1-5 (valid)
   ❌ category_id: 99 (doesn't exist)
   ```

2. Check server logs for SQL error

**Fix**:
```javascript
// If category_id is wrong, check getCategoryId function
getCategoryId("Stage Lighting")  // Should return: 3
getCategoryId("Invalid")          // Should return: 1 (default)
```

### Issue: Dropdown Options Not Visible

**Check**:
1. Open DevTools → Elements tab
2. Inspect a `<select>` element
3. Should see:
   ```html
   <select ng-model="form.category" class="form-select">
     <option value="">Select Category</option>
     <option ng-repeat="cat in categories" value="PA Systems">PA Systems</option>
     ...
   </select>
   ```

4. Check computed styles on `<option>`:
   - Background-color should be dark
   - Color should be light
   - If white on white: CSS fix not applied

**Solution**: Hard refresh page (Ctrl+F5)

### Issue: Error Says "Check category ID"

This means category_id is missing or invalid. Check:
```javascript
var categoryId = getCategoryId($scope.form.category);
console.log('Debug:', {
  formCategory: $scope.form.category,
  mappedId: categoryId,
  isValid: categoryId >= 1 && categoryId <= 5
});
```

---

## 🔍 Advanced Debugging

### View Exact Request Being Sent

1. Open DevTools → Network tab
2. Try to save equipment
3. Look for request to POST `/api/v1/equipment`
4. Click on it → "Request" tab
5. Scroll down to see "Request Payload":
```json
{
  "name": "Test",
  "category_id": 3,
  "base_price": 5000,
  "stock_qty": 10,
  ...
}
```

### View Server Response

1. Same Network tab
2. Click on POST request
3. Go to "Response" tab
4. Should show:
```json
{
  "success": false,
  "message": "Base price must be greater than 0"
}
```
or
```json
{
  "success": true,
  "data": {...equipment object...}
}
```

---

## ✅ Success Indicators

### ✅ Add Equipment Works
```
Console shows: [Inventory] Save success: Object
Toast message: "Equipment added!" (green)
Item appears in inventory list
```

### ✅ Edit Equipment Works
```
Console shows: [Inventory] Save success: Object
Toast message: "Equipment updated!" (green)
List refreshes with changes
```

### ✅ Category Dropdown Works
```
All 5 options visible:
- PA Systems
- DJ Equipment
- Stage Lighting
- Microphones
- Cables & Stands
```

### ✅ Console Logging Works
```
All [Inventory] logs appear in console
Shows form data, category mapping, API data
Shows error details if anything fails
```

---

## 🎯 Quick Fix Reference

| Error | Check | Fix |
|-------|-------|-----|
| 400 Bad Request | Console logs | Look for specific error message |
| 500 Server Error | category_id | Must be 1-5, not "Stage Lighting" |
| Dropdown invisible | CSS | Hard refresh (Ctrl+F5) |
| No console logs | Controller | Check if admin-inventory.controller.js loaded |
| "Invalid data" | Form fields | Ensure name and category filled |
| Category not mapping | Function | getCategoryId("Stage Lighting") → 3 |

---

## 🔬 Test Data

Use this for testing:

```javascript
// Valid test data
{
  name: "LED Par 64",
  category: "Stage Lighting",        // Must match exactly
  price_per_day: 500,
  quantity: 5,
  low_stock_threshold: 2
}

// Invalid test data (will fail)
{
  name: "",                          // ❌ Empty
  category: "Invalid Cat",           // ❌ Not in list
  price_per_day: 0,                  // ❌ Must be > 0
  quantity: -1                       // ❌ Can't be negative
}
```

---

## 🚀 Next Steps If Still Failing

1. **Check server is running**
   ```bash
   npm start
   ```

2. **Verify database connection**
   ```sql
   SELECT * FROM categories;
   -- Should show 5 rows
   ```

3. **Check if categories table exists**
   ```sql
   SELECT COUNT(*) FROM categories;
   ```

4. **Look at server logs** (if available)
   - Should see console logs from equipment.js
   - Look for validation errors

5. **Check browser console** (F12)
   - Should see [Inventory] logs
   - Should show exact error message

6. **Test API directly** (if curl available)
   ```bash
   curl -X POST http://localhost:3000/api/v1/equipment \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer TOKEN" \
     -d '{"name":"Test","category_id":1,"base_price":500,"stock_qty":5}'
   ```

---

**Status**: All fixes implemented  
**Next**: Test the system and report any remaining issues  
**Debug**: Use console logs to identify exact problem  
**Support**: Check this guide for troubleshooting steps
