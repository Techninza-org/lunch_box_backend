# Order Management API Documentation

## Overview

The Order Management System supports three types of orders:

- **ONETIME**: Single delivery order
- **WEEKLY**: 7-day subscription with daily meals
- **MONTHLY**: 30-day subscription with daily meals

The system automatically creates meal schedules for subscription orders and provides comprehensive order tracking.

## Authentication

All order APIs require user authentication via Bearer token:

```
Authorization: Bearer <jwt_token>
```

## API Endpoints

### 1. Create Order

**POST** `/api/orders`

Creates a new order from cart items with support for subscriptions.

#### Request Body:

```json
{
  "orderType": "ONETIME|WEEKLY|MONTHLY",
  "paymentType": "CASH_ON_DELIVERY|RAZORPAY|UPI|CARD|WALLET",
  "paymentId": "payment_gateway_transaction_id",
  "deliveryAddressId": 1,
  "subscriptionStartDate": "2025-08-05T00:00:00.000Z",
  "orderNotes": "Please deliver before 2 PM"
}
```

#### Success Response (201):

```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": 1,
    "userId": 1,
    "vendorId": 2,
    "orderType": "WEEKLY",
    "status": "PENDING",
    "subtotal": 299.0,
    "deliveryCharges": 0,
    "taxes": 14.95,
    "discount": 0,
    "totalAmount": 313.95,
    "paymentType": "RAZORPAY",
    "paymentId": "pay_xyz123",
    "paymentStatus": "COMPLETED",
    "deliveryAddress": "123 Main Street, Apartment 4B",
    "deliveryCity": "Mumbai",
    "deliveryState": "Maharashtra",
    "deliveryZipCode": "400001",
    "deliveryPhone": "+91-9876543210",
    "subscriptionStartDate": "2025-08-05T00:00:00.000Z",
    "subscriptionEndDate": "2025-08-12T00:00:00.000Z",
    "totalMealsInSubscription": 14,
    "vendor": {
      "id": 2,
      "name": "Mumbai Tiffin Service",
      "businessName": "Mumbai Tiffin Co.",
      "logo": "/uploads/logos/vendor2.png",
      "phoneNumber": "+91-9876543210"
    },
    "orderItems": [
      {
        "id": 1,
        "mealTitle": "Dal Rice Combo",
        "mealDescription": "Healthy dal with steamed rice",
        "mealImage": "/uploads/meals/dal-rice.jpg",
        "mealType": "Lunch",
        "mealCuisine": "NorthIndian",
        "isVeg": true,
        "quantity": 2,
        "unitPrice": 149.5,
        "totalPrice": 299.0,
        "selectedOptions": []
      }
    ],
    "mealSchedules": [
      {
        "id": 1,
        "scheduledDate": "2025-08-05T00:00:00.000Z",
        "scheduledTimeSlot": "12:00-14:00",
        "mealType": "Lunch",
        "mealTitle": "Dal Rice Combo",
        "quantity": 2,
        "status": "SCHEDULED"
      }
      // ... 6 more days for weekly subscription
    ],
    "createdAt": "2025-08-04T12:00:00.000Z"
  }
}
```

### 2. Get User Orders

**GET** `/api/orders?page=1&limit=10&status=PENDING&orderType=WEEKLY`

Retrieves user's orders with pagination and filtering.

#### Query Parameters:

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by order status
- `orderType` (optional): Filter by order type

#### Success Response (200):

```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": 1,
        "orderType": "WEEKLY",
        "status": "PENDING",
        "totalAmount": 313.95,
        "createdAt": "2025-08-04T12:00:00.000Z",
        "vendor": {
          "id": 2,
          "name": "Mumbai Tiffin Service",
          "businessName": "Mumbai Tiffin Co.",
          "logo": "/uploads/logos/vendor2.png"
        },
        "orderItems": [...],
        "_count": {
          "mealSchedules": 14
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalOrders": 25,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

### 3. Get Order Details

**GET** `/api/orders/:orderId`

Retrieves detailed information about a specific order.

#### Success Response (200):

```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 1,
    "vendorId": 2,
    "orderType": "WEEKLY",
    "status": "CONFIRMED",
    "subtotal": 299.00,
    "deliveryCharges": 0,
    "taxes": 14.95,
    "totalAmount": 313.95,
    "vendor": {
      "id": 2,
      "name": "Mumbai Tiffin Service",
      "businessName": "Mumbai Tiffin Co.",
      "logo": "/uploads/logos/vendor2.png",
      "phoneNumber": "+91-9876543210",
      "address": "Shop 15, Food Court Plaza"
    },
    "deliveryPartner": {
      "id": 3,
      "name": "Rahul Sharma",
      "phoneNumber": "+91-9876543211"
    },
    "orderItems": [...],
    "mealSchedules": [...],
    "createdAt": "2025-08-04T12:00:00.000Z"
  }
}
```

### 4. Cancel Order

**PATCH** `/api/orders/:orderId/cancel`

Cancels an order and future meal schedules.

#### Request Body:

```json
{
  "cancelReason": "Changed my mind about the subscription"
}
```

#### Success Response (200):

```json
{
  "success": true,
  "message": "Order cancelled successfully"
}
```

### 5. Get User Meal Schedules

**GET** `/api/orders/schedules?startDate=2025-08-05&endDate=2025-08-12&status=SCHEDULED&mealType=Lunch`

Retrieves user's meal schedules with filtering options.

#### Query Parameters:

- `startDate` (optional): Filter schedules from this date
- `endDate` (optional): Filter schedules until this date
- `status` (optional): Filter by schedule status
- `mealType` (optional): Filter by meal type

#### Success Response (200):

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "scheduledDate": "2025-08-05T00:00:00.000Z",
      "scheduledTimeSlot": "12:00-14:00",
      "mealType": "Lunch",
      "mealTitle": "Dal Rice Combo",
      "mealImage": "/uploads/meals/dal-rice.jpg",
      "quantity": 2,
      "status": "SCHEDULED",
      "order": {
        "id": 1,
        "orderType": "WEEKLY",
        "vendor": {
          "id": 2,
          "name": "Mumbai Tiffin Service",
          "businessName": "Mumbai Tiffin Co.",
          "logo": "/uploads/logos/vendor2.png"
        }
      }
    }
  ]
}
```

### 6. Get Today's Meal Schedules (For Cron Jobs)

**GET** `/api/orders/schedules/today`

Retrieves all scheduled meals for today - used by cron jobs for order processing.

#### Success Response (200):

```json
{
  "success": true,
  "data": {
    "schedules": [
      {
        "id": 1,
        "scheduledDate": "2025-08-04T00:00:00.000Z",
        "scheduledTimeSlot": "12:00-14:00",
        "mealType": "Lunch",
        "mealTitle": "Dal Rice Combo",
        "quantity": 2,
        "status": "SCHEDULED",
        "order": {
          "id": 1,
          "user": {
            "id": 1,
            "name": "John Doe",
            "email": "john@example.com",
            "phoneNumber": "+91-9876543210"
          },
          "vendor": {
            "id": 2,
            "name": "Mumbai Tiffin Service",
            "businessName": "Mumbai Tiffin Co.",
            "phoneNumber": "+91-9876543210"
          }
        }
      }
    ],
    "totalSchedules": 1,
    "date": "2025-08-04"
  }
}
```

### 7. Update Meal Schedule Status

**PATCH** `/api/orders/schedules/:scheduleId/status`

Updates the status of a meal schedule (for vendors/admin).

#### Request Body:

```json
{
  "status": "DELIVERED",
  "actualDeliveryTime": "2025-08-04T13:30:00.000Z",
  "notes": "Delivered successfully to customer"
}
```

#### Success Response (200):

```json
{
  "success": true,
  "message": "Schedule status updated successfully",
  "data": {
    "id": 1,
    "status": "DELIVERED",
    "actualDeliveryTime": "2025-08-04T13:30:00.000Z",
    "notes": "Delivered successfully to customer"
  }
}
```

## Order Types & Subscription Logic

### ONETIME Orders

- Single delivery
- 1 meal schedule created for next day
- No subscription dates

### WEEKLY Orders

- 7-day subscription
- Creates 7 × quantity meal schedules
- `subscriptionStartDate` to `subscriptionStartDate + 7 days`
- Each day gets scheduled meals based on cart items

### MONTHLY Orders

- 30-day subscription
- Creates 30 × quantity meal schedules
- `subscriptionStartDate` to `subscriptionStartDate + 30 days`
- Each day gets scheduled meals based on cart items

## Order Status Flow

```
PENDING → CONFIRMED → PREPARING → OUT_FOR_DELIVERY → DELIVERED
    ↓
 CANCELLED (only from PENDING/CONFIRMED)
    ↓
 REFUNDED
```

## Meal Schedule Status Flow

```
SCHEDULED → PREPARED → OUT_FOR_DELIVERY → DELIVERED
     ↓
  CANCELLED / MISSED
```

## Pricing Calculation

1. **Subtotal**: Sum of all cart items' total prices
2. **Delivery Charges**: ₹50 if subtotal < ₹500, else ₹0
3. **Taxes**: 5% of subtotal
4. **Discount**: Applied discounts (future feature)
5. **Total Amount**: Subtotal + Delivery + Taxes - Discount

## Data Preservation

The system preserves meal and option details in order tables to maintain order history even if:

- Meals are deleted by vendors
- Options are modified
- Vendor information changes

This ensures order integrity and provides complete order history for users and vendors.

## Cron Job Integration

The `/api/orders/schedules/today` endpoint is designed for cron jobs to:

1. Get all scheduled meals for today
2. Send notifications to vendors
3. Generate preparation lists
4. Track delivery schedules
5. Update order statuses automatically

## Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "message": "Cart is empty"
}
```

### 404 Not Found

```json
{
  "success": false,
  "message": "Order not found"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Detailed error message"
}
```
