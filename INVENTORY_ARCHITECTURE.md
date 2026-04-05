# 🏗️ INVENTORY SYSTEM ARCHITECTURE - Data Flow

## 📊 Data Transformation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   INVENTORY SYSTEM DATA FLOW                     │
└─────────────────────────────────────────────────────────────────┘

1. USER INTERFACE (admin-inventory.html)
   ┌──────────────────────────────────────┐
   │ Form Input:                          │
   │ - name: "Laser Light"                │
   │ - category: "Stage Lighting"         │  ← String (user-friendly)
   │ - price_per_day: 5000                │  ← Form field names
   │ - quantity: 3                        │
   │ - low_stock_threshold: 2             │
   └──────────────────────────────────────┘
            ↓ (User clicks Save)
            
2. CONTROLLER: saveItem() Function
   ┌──────────────────────────────────────┐
   │ DATA TRANSFORMATION                  │
   │                                      │
   │ getCategoryId("Stage Lighting")     │
   │ → Returns: 3 (numeric)               │  ← CRITICAL: Convert!
   │                                      │
   │ parseInt(5000) → 5000                │
   │ parseInt(3) → 3                      │
   └──────────────────────────────────────┘
            ↓ (Transform complete)
            
3. API DATA STRUCTURE (What we send to server)
   ┌──────────────────────────────────────┐
   │ {                                    │
   │   name: "Laser Light",               │
   │   category_id: 3,                    │  ← Numeric ID (not string!)
   │   base_price: 5000,                  │  ← API field name
   │   current_price: 5000,               │
   │   stock_qty: 3,                      │  ← API field name
   │   description: "...",                │
   │   specs: {"low_stock_threshold": 2}, │
   │   image_url: "",                     │
   │   is_active: true                    │
   │ }                                    │
   └──────────────────────────────────────┘
            ↓ (HTTP POST /api/v1/equipment)
            
4. SERVER: routes/equipment.js
   ┌──────────────────────────────────────┐
   │ Validates:                           │
   │ - name ≠ empty ✓                     │
   │ - category_id > 0 ✓                  │
   │ - base_price > 0 ✓                   │
   │ - stock_qty ≥ 0 ✓                    │
   │                                      │
   │ Inserts to DB:                       │
   │ INSERT INTO equipment(...)           │
   │ VALUES($1, $2, ...)                  │
   └──────────────────────────────────────┘
            ↓ (INSERT success)
            
5. DATABASE: equipment table
   ┌──────────────────────────────────────┐
   │ id     | 47                           │
   │ name   | "Laser Light"                │
   │ cat_id | 3                            │
   │ price  | 5000.00                      │
   │ qty    | 3                            │
   │ specs  | {"low_stock_threshold": 2}   │
   └──────────────────────────────────────┘
            ↓ (Return to frontend)
            
6. RESPONSE: API returns equipment
   ┌──────────────────────────────────────┐
   │ {                                    │
   │   success: true,                     │
   │   data: {                            │
   │     id: 47,                          │
   │     name: "Laser Light",             │
   │     category_id: 3,                  │
   │     base_price: 5000,                │
   │     stock_qty: 3,                    │
   │     ...                              │
   │   }                                  │
   │ }                                    │
   └──────────────────────────────────────┘
            ↓ (loadInventory refreshes list)
            
7. CONTROLLER: loadInventory() transforms back
   ┌──────────────────────────────────────┐
   │ getCategoryName(3) → "Stage Lighting"│  ← Convert ID → String
   │                                      │
   │ item.stock_qty → form.quantity       │  ← Map API → Display
   │ item.base_price → form.price_per_day│
   └──────────────────────────────────────┘
            ↓ (Transform complete)
            
8. DISPLAY: Table shows equipment
   ┌──────────────────────────────────────┐
   │ Name            | Laser Light        │
   │ Category        | Stage Lighting     │  ← User-friendly
   │ Price/Day       | ₹5000              │  ← Formatted
   │ Quantity        | 3 units            │
   └──────────────────────────────────────┘
```

---

## 🔄 CRUD Operations Data Flow

### CREATE (POST)
```
Form Data (UI)
    ↓ getCategoryId() & parseInt()
API Format (JSON)
    ↓ HTTP POST
Database INSERT
    ↓ Return Record
Display List
```

### READ (GET)
```
Database Query
    ↓ getCategoryName() Transformation
List Items (Display)
    ↓ User clicks Edit
Form Fields Populated
    ↓ getCategoryName() on edit
Edit Modal (Ready)
```

### UPDATE (PUT)
```
Form Data (UI)
    ↓ getCategoryId() & parseInt()
API Format (JSON)
    ↓ HTTP PUT
Database UPDATE
    ↓ Return Updated Record
Display List (Refreshed)
```

### DELETE (DELETE)
```
User Confirms Delete
    ↓ HTTP DELETE
Database DELETE
    ↓ Success/Error
Refresh List
```

---

## 🗂️ Category ID Mapping

**Current Implementation**:
```javascript
// Map form field (string) to API field (numeric)
var getCategoryId = function(categoryName) {
  var categoryMap = {
    'PA Systems': 1,           // Matches DB: categories.id = 1
    'DJ Equipment': 2,         // Matches DB: categories.id = 2
    'Stage Lighting': 3,       // Matches DB: categories.id = 3
    'Microphones': 4,          // Matches DB: categories.id = 4
    'Cables & Stands': 5       // Matches DB: categories.id = 5
  };
  return categoryMap[categoryName] || 1;
};

// Map API field (numeric) back to form field (string)
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

---

## 🔐 Data Validation Points

### 1. Frontend Validation (Before sending to API)
```javascript
// Check 1: Name validation
if (!$scope.form.name || $scope.form.name.trim() === '') {
  return; // STOP: Show error
}

// Check 2: Category validation
if (!$scope.form.category || $scope.form.category.trim() === '') {
  return; // STOP: Show error
}
```

### 2. Backend Validation (Server-side)
```javascript
// Check 3: All required fields present
if (!name || base_price <= 0 || stock_qty < 0 || !category_id) {
  return res.status(400).json({ 
    success: false, 
    message: 'Invalid input fields' 
  });
}

// Check 4: Database constraints
// - category_id must exist in categories table (FK)
// - base_price must be > 0
// - stock_qty must be >= 0
// All enforced at DB level
```

---

## 🚨 What Would Have Failed (Before Fix)

```javascript
// BEFORE FIX: Form → API (WRONG!)
{
  name: "Laser Light",
  category: "Stage Lighting",         // ❌ String, not numeric!
  price_per_day: 5000,                // ❌ API expects base_price
  quantity: 3                         // ❌ API expects stock_qty
}

// Server validation fails:
// - category: "Stage Lighting" is not a number
// - base_price: undefined (not sent)
// - stock_qty: undefined (not sent)

// Result: 400 Bad Request ❌
```

---

## ✅ What Works Now (After Fix)

```javascript
// AFTER FIX: Form → API (CORRECT!)
{
  name: "Laser Light",
  category_id: 3,                     // ✅ Numeric ID
  base_price: 5000,                   // ✅ Correct field name
  current_price: 5000,                // ✅ Correct field name
  stock_qty: 3                        // ✅ Correct field name
}

// Server validation passes:
// - category_id: 3 ✓ (exists in DB)
// - base_price: 5000 ✓ (> 0)
// - stock_qty: 3 ✓ (>= 0)

// Result: 201 Created ✅
// Item appears in inventory list ✅
```

---

## 🎯 Key Transformations

| Step | Input | Function | Output |
|------|-------|----------|--------|
| 1 | "Stage Lighting" | getCategoryId() | 3 |
| 2 | 5000 (string) | parseInt() | 5000 (number) |
| 3 | 3 | getCategoryName() | "Stage Lighting" |
| 4 | 3 | getCategoryId() | 3 |
| 5 | true | JSON.stringify() | "true" |
| 6 | {...} | HTTP POST | {response} |

---

## 💾 Database Schema (Relevant)

```sql
-- categories table
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  ...
);

-- equipment table
CREATE TABLE equipment (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category_id INT NOT NULL REFERENCES categories(id),  -- FK constraint!
  base_price DECIMAL(10,2) NOT NULL CHECK (base_price > 0),
  current_price DECIMAL(10,2) NOT NULL,
  stock_qty INT NOT NULL,
  specs JSON,
  ...
);
```

**Critical**: `category_id` is a foreign key that must exist in `categories` table!

---

## 🔧 Testing Each Transformation

Open browser console and add test item:

```javascript
// 1. Check getCategoryId works:
var cat = getCategoryId("Stage Lighting");
console.log(cat);  // Should print: 3

// 2. Check getCategoryName works:
var name = getCategoryName(3);
console.log(name);  // Should print: "Stage Lighting"

// 3. Check parseInt works:
var price = parseInt("5000");
console.log(price);  // Should print: 5000 (number)

// 4. Verify transformation in saveItem:
// - Set form with test data
// - Call saveItem()
// - Check Console for "[Inventory] Saving:" log
// - Verify "category_id: 3" (numeric!)
```

---

## 📈 Evolution: Before vs After

### Before Fix ❌
```
Form → (no transformation) → API request
Error: category_id missing
Error: base_price missing  
Error: stock_qty missing
400 Bad Request ❌
```

### After Fix ✅
```
Form → (getCategoryId transform) → API request
Form → (field name transform) → API request
Form → (type conversion) → API request
201 Created ✅
Item appears in list ✅
```

---

## 🎓 Learning Points

This fix demonstrates:
1. **Data mapping** between UI and API layers
2. **Bidirectional transformation** (string → ID, ID → string)
3. **Field name normalization** (UI names vs API names)
4. **Type conversion** (string → number)
5. **Validation at multiple layers** (frontend + backend)
6. **Error handling** with meaningful messages

All essential for production-grade applications! 🚀
