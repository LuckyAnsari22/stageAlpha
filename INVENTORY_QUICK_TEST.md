# ⚡ INVENTORY QUICK TEST GUIDE

## 🚀 How to Test the Inventory Fix

### Step 1: Open the App
1. Start the server: `npm start`
2. Go to: `http://localhost:3000`
3. Login as admin
4. Click "Inventory" in the sidebar

### Step 2: Test ADD Equipment
1. Click the "Add Item" button (green button)
2. Fill in the form:
   ```
   Name: Laser Light Projector
   Category: Stage Lighting  (select from dropdown)
   Description: Professional laser light for events
   Price/Day: 5000
   Quantity: 3
   Low Stock: 2
   ```
3. Click "Save Equipment"
4. **Expected**: Green success toast saying "Equipment added!"
5. **New item should appear** in the list below

### Step 3: Test EDIT Equipment
1. Find an item in the list
2. Click the "Edit" button (pencil icon)
3. Change any field (e.g., Quantity from 3 to 5)
4. Click "Save Equipment"
5. **Expected**: Green success toast saying "Equipment updated!"
6. **List should refresh** with new values

### Step 4: Test DELETE Equipment
1. Click the "Delete" button (trash icon) on any item
2. Confirm the deletion popup
3. **Expected**: Green success toast saying "Equipment deleted"
4. **Item should disappear** from the list

---

## ✅ What Should NOT Happen

❌ **Error: "Invalid data: Check all required fields"**
   - Make sure you filled Name and Category
   - Make sure Category dropdown is properly selected

❌ **Error: "Server error: Check category ID"**
   - This was fixed! Should not see this anymore
   - If you do, the category mapping is wrong

❌ **Error: "Failed to save equipment"**
   - Check browser Console (F12) for detailed error
   - Look for "Save error:" message

❌ **Nothing happens on Save**
   - Check if form is valid (Name and Category required)
   - Check browser Console for errors
   - Check server logs

---

## 🔍 Debug Mode: Check Console

1. **Open DevTools**: Press `F12`
2. **Go to Console tab**
3. **Try adding item again**
4. **Look for logs like**:
   ```
   [Inventory] Save item: Object {name: "...", category: "...", ...}
   [Inventory] Saving: POST /api/v1/equipment Data: Object {name: "...", category_id: 1, ...}
   [Inventory] Save success: Object
   ```

**🎯 Key thing to check**: 
- See `category_id: 1` (numeric) in the "Saving" log?
- See "Save success" at the end?
- If yes → ✅ Fix is working!
- If no → Check error message after "Save error:"

---

## 📊 Expected Equipment List

After running the database seed, you should see these pre-existing items:

| Name | Category | Price/Day | Qty |
|------|----------|-----------|-----|
| Bose S1 Pro | PA Systems | ₹800 | 5 |
| Pioneer DDJ-400 | DJ Equipment | ₹500 | 2 |
| Elation D-Lite | Stage Lighting | ₹600 | 3 |
| Shure SM58 | Microphones | ₹200 | 8 |
| XLR Cables (pack) | Cables & Stands | ₹150 | 15 |

(Exact items may vary depending on seed data)

---

## 🎯 Form Validation Rules

The form now validates:

| Field | Rule | Example |
|-------|------|---------|
| Name | Required, not empty | "Laser Light" ✅ |
| Category | Required, from dropdown | "Stage Lighting" ✅ |
| Price/Day | Must be number | 5000 ✅ or 500.50 ✅ |
| Quantity | Must be number | 10 ✅ |
| Low Stock | Threshold (optional) | 2 ✅ |

---

## 🆘 If Tests Still Fail

1. **Clear browser cache**: Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
2. **Hard refresh page**: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
3. **Check server logs**: Look for error messages
4. **Verify categories in DB**:
   ```sql
   SELECT id, name FROM categories;
   ```
   Should show 5 categories with IDs 1-5

5. **Test API directly** using Postman or curl:
   ```bash
   curl -X POST http://localhost:3000/api/v1/equipment \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"name":"Test","category_id":1,"base_price":500,"stock_qty":5}'
   ```

---

## ✨ Summary

The inventory form now properly:
- ✅ Converts category names to IDs
- ✅ Maps price_per_day to base_price
- ✅ Maps quantity to stock_qty
- ✅ Sends correct data format to API
- ✅ Handles all CRUD operations

**Test all 4 operations to confirm everything works!** 🎉
