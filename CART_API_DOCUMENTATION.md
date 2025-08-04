# Cart API Documentation

This document provides comprehensive information about the Cart APIs for users in the Lunch Box Backend system.

## Base URL

All cart endpoints are prefixed with: `/api/users/cart`

**Authentication Required:** All cart endpoints require user authentication via Bearer token.

## Endpoints Overview

### 1. Add Item to Cart

- **Endpoint:** `POST /api/users/cart/add`
- **Description:** Add a meal to the user's cart. Handles both SINGLE and CUSTOMIZABLE meals.

### 2. Get Cart Items

- **Endpoint:** `GET /api/users/cart`
- **Description:** Retrieve all items in the user's cart with detailed information.

### 3. Get Cart Summary

- **Endpoint:** `GET /api/users/cart/summary`
- **Description:** Get a quick summary of cart (total items, total amount, item count).

### 4. Update Cart Item

- **Endpoint:** `PATCH /api/users/cart/:cartItemId`
- **Description:** Update quantity or delivery date of a specific cart item.

### 5. Remove Cart Item

- **Endpoint:** `DELETE /api/users/cart/:cartItemId`
- **Description:** Remove a specific item from the cart.

### 6. Clear Cart

- **Endpoint:** `DELETE /api/users/cart/clear`
- **Description:** Remove all items from the user's cart.

---

## Detailed API Specifications

### 1. Add Item to Cart

**POST** `/api/users/cart/add`

#### Request Body

```json
{
  "mealId": 1,
  "quantity": 2,
  "deliveryDate": "2025-08-05T12:00:00Z", // Optional
  "selectedOptions": [
    // Required for CUSTOMIZABLE meals
    {
      "optionId": 5,
      "quantity": 1
    },
    {
      "optionId": 8,
      "quantity": 2
    }
  ]
}
```

#### Success Response (200)

```json
{
  "success": true,
  "message": "Item added to cart successfully",
  "data": {
    "id": 1,
    "userId": 123,
    "mealId": 1,
    "quantity": 2,
    "totalPrice": 299.98,
    "deliveryDate": "2025-08-05T12:00:00Z",
    "createdAt": "2025-08-04T10:30:00Z",
    "updatedAt": "2025-08-04T10:30:00Z",
    "meal": {
      "id": 1,
      "title": "Protein Thali",
      "image": "/uploads/meals/meal1.jpg",
      "basePrice": 149.99,
      "configType": "CUSTOMIZABLE",
      "type": "Lunch",
      "vendor": {
        "id": 5,
        "name": "John's Kitchen",
        "businessName": "John's Healthy Kitchen"
      }
    },
    "selectedOptions": [
      {
        "id": 1,
        "optionId": 5,
        "quantity": 1,
        "price": 10.0
      }
    ]
  }
}
```

#### Error Responses

```json
// Meal not found
{
  "success": false,
  "message": "Meal not found or not available"
}

// Missing required options for customizable meal
{
  "success": false,
  "message": "Required options must be selected for customizable meals",
  "requiredGroups": [
    {
      "id": 1,
      "title": "Choose your bread",
      "minSelect": 1,
      "maxSelect": 2
    }
  ]
}

// Invalid option constraints
{
  "success": false,
  "message": "Choose your bread requires at least 1 selection(s). You selected 0."
}
```

### 2. Get Cart Items

**GET** `/api/users/cart`

#### Success Response (200)

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "userId": 123,
        "mealId": 1,
        "quantity": 2,
        "totalPrice": 299.98,
        "deliveryDate": "2025-08-05T12:00:00Z",
        "createdAt": "2025-08-04T10:30:00Z",
        "updatedAt": "2025-08-04T10:30:00Z",
        "meal": {
          "id": 1,
          "title": "Protein Thali",
          "description": "Healthy protein-rich thali",
          "image": "/uploads/meals/meal1.jpg",
          "type": "Lunch",
          "configType": "CUSTOMIZABLE",
          "cuisine": "NorthIndian",
          "isVeg": true,
          "basePrice": 149.99,
          "vendor": {
            "id": 5,
            "name": "John's Kitchen",
            "businessName": "John's Healthy Kitchen",
            "logo": "/uploads/logos/vendor5.png"
          },
          "mealImages": [
            {
              "id": 1,
              "url": "/uploads/meals/meal1_gallery1.jpg"
            }
          ]
        },
        "selectedOptions": [
          {
            "id": 1,
            "cartItemId": 1,
            "optionId": 5,
            "quantity": 1,
            "price": 10.0
          }
        ]
      }
    ],
    "summary": {
      "totalItems": 2,
      "totalAmount": 299.98,
      "vendorCount": 1
    },
    "itemsByVendor": [
      {
        "vendor": {
          "id": 5,
          "name": "John's Kitchen",
          "businessName": "John's Healthy Kitchen",
          "logo": "/uploads/logos/vendor5.png"
        },
        "items": [...], // Same structure as items above
        "vendorTotal": 299.98
      }
    ]
  }
}
```

### 3. Get Cart Summary

**GET** `/api/users/cart/summary`

#### Success Response (200)

```json
{
  "success": true,
  "data": {
    "totalItems": 5,
    "totalAmount": 749.95,
    "itemCount": 3
  }
}
```

### 4. Update Cart Item

**PATCH** `/api/users/cart/:cartItemId`

#### Request Body

```json
{
  "quantity": 3,
  "deliveryDate": "2025-08-06T13:00:00Z" // Optional
}
```

#### Success Response (200)

```json
{
  "success": true,
  "message": "Cart item updated successfully",
  "data": {
    "id": 1,
    "userId": 123,
    "mealId": 1,
    "quantity": 3,
    "totalPrice": 449.97,
    "deliveryDate": "2025-08-06T13:00:00Z",
    "createdAt": "2025-08-04T10:30:00Z",
    "updatedAt": "2025-08-04T11:15:00Z",
    "meal": { ... }, // Same structure as above
    "selectedOptions": [ ... ] // Same structure as above
  }
}
```

### 5. Remove Cart Item

**DELETE** `/api/users/cart/:cartItemId`

#### Success Response (200)

```json
{
  "success": true,
  "message": "Item removed from cart successfully"
}
```

#### Error Response (404)

```json
{
  "success": false,
  "message": "Cart item not found"
}
```

### 6. Clear Cart

**DELETE** `/api/users/cart/clear`

#### Success Response (200)

```json
{
  "success": true,
  "message": "Cart cleared successfully"
}
```

---

## Usage Examples

### Adding a Single Meal to Cart

```javascript
// For SINGLE type meals
const response = await fetch("/api/users/cart/add", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer your-jwt-token",
  },
  body: JSON.stringify({
    mealId: 1,
    quantity: 2,
  }),
});
```

### Adding a Customizable Meal to Cart

```javascript
// For CUSTOMIZABLE type meals
const response = await fetch("/api/users/cart/add", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer your-jwt-token",
  },
  body: JSON.stringify({
    mealId: 2,
    quantity: 1,
    deliveryDate: "2025-08-05T12:00:00Z",
    selectedOptions: [
      { optionId: 5, quantity: 1 }, // Tandoori Roti
      { optionId: 8, quantity: 2 }, // Extra Dal
      { optionId: 12, quantity: 1 }, // Gulab Jamun
    ],
  }),
});
```

---

## Important Notes

1. **Authentication**: All endpoints require user authentication via Bearer token in the Authorization header.

2. **Meal Types**:

   - **SINGLE**: Standard meals with fixed configuration, no options needed
   - **CUSTOMIZABLE**: Meals with option groups that allow customization

3. **Option Validation**: For customizable meals:

   - Required option groups must have at least one selection
   - Minimum and maximum selection constraints are enforced
   - Each option group validates independently

4. **Cart Behavior**:

   - Each user can only have one cart item per meal (updates quantity if already exists)
   - Total price is automatically calculated including base price and option prices
   - Cart items persist until explicitly removed or cleared

5. **Price Calculation**:

   - Total Price = (Base Price + Sum of Option Prices) × Quantity
   - Option prices are stored at time of adding to cart to handle price changes

6. **Delivery Date**: Optional field to specify when the meal should be delivered.

7. **Error Handling**: All endpoints return appropriate HTTP status codes and descriptive error messages for validation failures.
