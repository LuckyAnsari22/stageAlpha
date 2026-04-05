# 🔧 INVENTORY SAVE ERROR FIX - Complete Solution

## Problem Summary
Equipment save operations were failing with:
- **400 (Bad Request)** on POST /api/v1/equipment
- **500 (Internal Server Error)** on PUT /api/v1/equipment/:id

**Root Cause**: Data structure mismatch between form and API
- Form was sending: `name`, `category` (string), `price_per_day`, `quantity`, etc.
- API expected: `name`, `category_id` (numeric), `base_price`, `stock_qty`, etc.

---

## 🎯 Solution Implemented

### 1. **Category Mapping**
Updated categories to match database values from `seed.sql`:
```javascript
// OLD (incorrect)
$scope.categories = ['Audio', 'Lighting', 'Stage', 'Video', 'Other'];

// NEW (correct - from database)
$scope.categories = ['PA Systems', 'DJ Equipment', 'Stage Lighting', 'Microphones', 'Cables & Stands'];
```

Database categories:
| ID | Category | Description |
|----|----------|-------------|
| 1 | PA Systems | Professional audio amplification |
| 2 | DJ Equipment | Mixers, controllers, CDJs |
| 3 | Stage Lighting | LED pars, moving heads, wash |
| 4 | Microphones | Wired, wireless, lapel mics |
| 5 | Cables & Stands | Power, audio, speaker stands |

### 2. **Field Name Mapping**
Created helper functions to convert between form fields and API fields:

```javascript
// Form → API: Convert category name to ID
var getCategoryId = function(categoryName) {
  var categoryMap = {
    'PA Systems': 1,
    'DJ Equipment': 2,
    'Stage Lighting': 3,
    'Microphones': 4,
    'Cables & Stands': 5
  };
  return categoryMap[categoryName] || 1;
};

// API → Form: Convert category ID to name
var getCategoryName = function(categoryId) {
  var categoryMap = {
    1: 'PA Systems',
    2: 'DJ Equipment',
    3: 'Stage Lighting',
    4: 'Microphones',
    5: 'Cables & Stands'
  };
  return categoryMap[categoryId] || 'PA Systems';
};
```

### 3. **Data Transformation in saveItem()**
Now properly converts form data to API format before sending:

```javascript
// Before save, transform form data to API format
var apiData = {
  name: $scope.form.name,
  category_id: getCategoryId($scope.form.category),    // ✅ Convert string to ID
  description: $scope.form.description,
  base_price: parseInt($scope.form.price_per_day) || 0,     // ✅ Renamed field
  current_price: parseInt($scope.form.price_per_day) || 0,
  stock_qty: parseInt($scope.form.quantity) || 0,      // ✅ Renamed field
  specs: JSON.stringify({
    low_stock_threshold: parseInt($scope.form.low_stock_threshold) || 5
  }),
  image_url: '',
  is_active: true
};
```

### 4. **Data Transformation in editItem()**
When loading data for editing, maps API fields back to form fields:

```javascript
$scope.form = {
  id: item.id,
  name: item.name,
  category: getCategoryName(item.category_id),        // ✅ Convert ID back to name
  description: item.description,
  price_per_day: item.base_price || item.current_price || 0,   // ✅ Use API field
  quantity: item.stock_qty || 0,                       // ✅ Use API field
  low_stock_threshold: (item.specs && typeof item.specs === 'object' && item.specs.low_stock_threshold) ? item.specs.low_stock_threshold : 5
};
```

### 5. **Data Transformation in loadInventory()**
Maps API response to display format for all equipment:

```javascript
$scope.equipment = rawData.map(function(item) {
  return {
    id: item.id,
    name: item.name,
    category: getCategoryName(item.category_id),
    category_id: item.category_id,
    description: item.description,
    price_per_day: item.base_price || item.current_price || 0,
    quantity: item.stock_qty || 0,
    low_stock_threshold: (item.specs && typeof item.specs === 'object' && item.specs.low_stock_threshold) ? item.specs.low_stock_threshold : 5
  };
});
```

### 6. **API Field Requirements**
According to `routes/equipment.js`:

**POST /api/v1/equipment** (Create)
- Required: `name`, `category_id` (numeric), `base_price`, `stock_qty`
- Optional: `current_price`, `description`, `specs`, `image_url`
- Validation: name must not be empty, base_price > 0, stock_qty >= 0

**PUT /api/v1/equipment/:id** (Update)
- Accepts: all fields including `is_active`, `current_price`
- Updates: `updated_at` automatically
- Validation: same as POST

---

## 📝 Files Modified

### `public/js/controllers/admin-inventory.controller.js`
- ✅ Updated $scope.categories list (5 real categories)
- ✅ Modified loadInventory() to map API → display fields
- ✅ Modified editItem() to convert API fields back to form
- ✅ Modified saveItem() to convert form → API fields
- ✅ Added getCategoryId() helper function
- ✅ Added getCategoryName() helper function
- ✅ Added detailed console logging for debugging

---

## ✅ Testing Checklist

After applying these changes, verify:

1. **Load Equipment**
   - [ ] Inventory page loads without errors
   - [ ] Equipment list displays (should show pre-seeded items)
   - [ ] Categories display correctly in dropdown

2. **Add New Equipment**
   - [ ] Click "Add Item" button
   - [ ] Enter name (e.g., "Laser Light Projector")
   - [ ] Select category from dropdown (e.g., "Stage Lighting")
   - [ ] Enter price and quantity
   - [ ] Click Save
   - [ ] ✅ Should show success toast (not 400 error)
   - [ ] ✅ New item should appear in list

3. **Edit Equipment**
   - [ ] Click "Edit" on any item
   - [ ] Verify category displays correctly
   - [ ] Verify price and quantity pre-filled
   - [ ] Change a field
   - [ ] Click Save
   - [ ] ✅ Should show success toast (not 500 error)
   - [ ] ✅ Changes should appear in list

4. **Delete Equipment**
   - [ ] Click "Delete" on any item
   - [ ] Confirm deletion
   - [ ] ✅ Should show success toast
   - [ ] ✅ Item should be removed from list

5. **Console Logging**
   - [ ] Open browser DevTools (F12)
   - [ ] Check Console tab
   - [ ] Should see messages like:
     ```
     [Inventory] Save item: Object
     [Inventory] Saving: POST /api/v1/equipment Data: Object
     [Inventory] Save success: Object
     ```
   - [ ] ✅ No "Uncaught" errors

---

## 🔍 Debugging If Issues Persist

If you still see errors:

1. **Open DevTools → Console tab**
2. **Look for the actual error message** in the Save error:
   ```javascript
   [Inventory] Save error: {...error details...}
   ```

3. **Common errors and fixes**:
   - `"Invalid input fields"` → Missing required fields or wrong data types
     - Verify category_id is numeric (1-5)
     - Verify base_price is > 0
     - Verify stock_qty is >= 0
   
   - `"Not found"` → Equipment ID doesn't exist
     - Use browser DevTools to check item.id
   
   - `"Unexpected error"` → Database or server issue
     - Check server logs for details
     - Verify database connection

4. **Test the API directly** using curl:
   ```bash
   # Create new equipment
   curl -X POST http://localhost:3000/api/v1/equipment \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "name": "Test Equipment",
       "category_id": 1,
       "base_price": 500,
       "stock_qty": 10,
       "description": "Test item"
     }'
   ```

---

## 🎉 Summary

The fix ensures proper data transformation between:
- **Form UI** (user-friendly names: "PA Systems")
- **API Layer** (database IDs: `category_id: 1`)
- **Display** (formatted for UI: `price_per_day`, `quantity`)

All three CRUD operations (Create, Read, Update) should now work flawlessly! ✨
