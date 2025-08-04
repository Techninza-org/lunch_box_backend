# Cart Vendor Switching Feature Test

## Feature Description

The cart system now enforces single-vendor ordering:

- Users can add multiple items from the **same vendor** to their cart
- When adding items from a **different vendor**, the cart is automatically cleared first
- Users are notified when their cart is cleared due to vendor switching

## Implementation Details

### Modified Function: `addToCart` in `cart.controller.js`

1. **Check existing cart items** and their vendor
2. **Compare vendor IDs** between existing items and new item
3. **Clear cart automatically** if vendors don't match
4. **Add new item** after clearing (if needed)
5. **Provide clear feedback** to user about what happened

## API Response Messages

### Same Vendor Addition

```json
{
  "success": true,
  "message": "Item added to cart successfully",
  "data": { ... },
  "meta": {
    "currentVendorId": 1,
    "wasCartCleared": false
  }
}
```

### Different Vendor Addition (Cart Cleared)

```json
{
  "success": true,
  "message": "Previous cart items were cleared. Item added from new restaurant successfully",
  "data": { ... },
  "meta": {
    "currentVendorId": 2,
    "wasCartCleared": true
  }
}
```

### Same Item Update

```json
{
  "success": true,
  "message": "Cart item updated successfully",
  "data": { ... },
  "meta": {
    "currentVendorId": 1,
    "wasCartCleared": false
  }
}
```

## Test Scenarios

### Test 1: Add items from same vendor

```bash
# Step 1: Add first item from vendor 1
curl -X POST http://localhost:4000/api/users/cart/add \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mealId": 1, "quantity": 2}'

# Expected: "Item added to cart successfully"

# Step 2: Add second item from same vendor
curl -X POST http://localhost:4000/api/users/cart/add \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mealId": 4, "quantity": 1}'

# Expected: "Item added to cart successfully" (if meal 4 is from same vendor)
```

### Test 2: Switch vendors (cart clearing)

```bash
# Step 1: Add item from vendor 1
curl -X POST http://localhost:4000/api/users/cart/add \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mealId": 1, "quantity": 2}'

# Step 2: Add item from vendor 2 (different vendor)
curl -X POST http://localhost:4000/api/users/cart/add \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mealId": 10, "quantity": 1}'

# Expected: "Previous cart items were cleared. Item added from new restaurant successfully"
```

### Test 3: Verify cart state

```bash
# Check cart after each operation
curl -X GET http://localhost:4000/api/users/cart \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check cart summary
curl -X GET http://localhost:4000/api/users/cart/summary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Business Logic Benefits

1. **Order Consistency**: Ensures all items in an order come from single restaurant
2. **Delivery Efficiency**: Single vendor orders are easier to process and deliver
3. **User Experience**: Clear messaging about cart changes
4. **Reduced Confusion**: Prevents mixed-vendor orders that might cause issues

## Error Handling

The feature maintains all existing error handling:

- Invalid meal IDs
- Unavailable meals
- Required customization options
- Authentication errors

## Database Impact

- No schema changes required
- Uses existing `vendorId` in `Meal` model
- Leverages existing cart clearing functionality
- Maintains referential integrity

## Logging

Console logging is added to track vendor switches:

```
Cart cleared for user {userId} - switching from vendor {oldVendorId} to vendor {newVendorId}
```

This helps with debugging and analytics.
