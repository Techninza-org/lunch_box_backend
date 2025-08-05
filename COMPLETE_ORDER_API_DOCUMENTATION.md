# Complete Order Management API Documentation

## Overview

This document provides comprehensive API documentation for order management across different user roles: Admin, Vendor, and Delivery Partner.

## Authentication Required

All endpoints require appropriate authentication middleware:

- Admin routes: Admin auth middleware
- Vendor routes: Vendor auth middleware
- Delivery Partner routes: Delivery Partner auth middleware

---

## Admin APIs

### 1. Get All Orders

**GET** `/admin/orders`

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by order status
- `orderType` (optional): Filter by order type (ONETIME, WEEKLY, MONTHLY)
- `vendorId` (optional): Filter by vendor ID
- `startDate` (optional): Filter orders from date
- `endDate` (optional): Filter orders to date
- `searchTerm` (optional): Search in user name, email, phone, vendor name, address

**Response:**

```json
{
  "success": true,
  "data": {
    "orders": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalOrders": 50,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "statistics": {
      "totalOrders": 50,
      "statusBreakdown": {
        "PENDING": { "count": 10, "totalAmount": 5000 },
        "DELIVERED": { "count": 30, "totalAmount": 15000 }
      },
      "totalRevenue": 20000
    }
  }
}
```

### 2. Get Order Details by ID

**GET** `/admin/orders/:orderId`

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 1,
    "vendorId": 1,
    "orderType": "WEEKLY",
    "status": "CONFIRMED",
    "totalAmount": 1500,
    "user": { ... },
    "vendor": { ... },
    "deliveryPartner": { ... },
    "orderItems": [...],
    "mealSchedules": [...]
  }
}
```

### 3. Update Order Status

**PATCH** `/admin/orders/:orderId/status`

**Body:**

```json
{
  "status": "CONFIRMED",
  "notes": "Order confirmed by admin"
}
```

**Valid Statuses:**

- PENDING, CONFIRMED, PREPARING, OUT_FOR_DELIVERY, DELIVERED, CANCELLED, REFUNDED

### 4. Assign Delivery Partner

**PATCH** `/admin/orders/:orderId/assign-delivery-partner`

**Body:**

```json
{
  "deliveryPartnerId": 5,
  "scheduleId": 10 // Optional: assign to specific schedule only
}
```

### 5. Get Dashboard Statistics

**GET** `/admin/dashboard-stats`

**Query Parameters:**

- `startDate` (optional): Filter from date
- `endDate` (optional): Filter to date

**Response:**

```json
{
  "success": true,
  "data": {
    "orders": {
      "total": 100,
      "revenue": 50000,
      "statusBreakdown": { ... }
    },
    "users": {
      "totalUsers": 500,
      "totalVendors": 25,
      "totalDeliveryPartners": 15
    },
    "schedules": {
      "statusBreakdown": { ... }
    }
  }
}
```

---

## Vendor APIs

### 1. Get Vendor Orders

**GET** `/vendor/orders`

**Query Parameters:**

- `page`, `limit`, `status`, `orderType`, `startDate`, `endDate`, `searchTerm`

**Response:** Similar to admin orders but filtered for vendor

### 2. Get Vendor Order Details

**GET** `/vendor/orders/:orderId`

**Response:** Complete order details for vendor's order

### 3. Update Order Status (Vendor)

**PATCH** `/vendor/orders/:orderId/status`

**Body:**

```json
{
  "status": "CONFIRMED",
  "notes": "Order confirmed and preparation started"
}
```

**Allowed Statuses for Vendors:**

- CONFIRMED, PREPARING, READY_FOR_PICKUP

### 4. Get Vendor Dashboard Stats

**GET** `/vendor/dashboard-stats`

**Query Parameters:**

- `date` (optional): Specific date (default: today)

**Response:**

```json
{
  "success": true,
  "data": {
    "today": {
      "date": "2025-08-05",
      "totalSchedules": 25,
      "scheduleBreakdown": { ... },
      "completionRate": "80.00"
    },
    "monthly": {
      "totalOrders": 150,
      "totalRevenue": 75000,
      "orderBreakdown": { ... }
    },
    "pending": {
      "pendingSchedules": 10
    }
  }
}
```

### 5. Get Vendor Meal Schedules

**GET** `/vendor/schedules`

**Query Parameters:**

- `startDate`, `endDate`, `status`, `mealType`

### 6. Bulk Update Schedule Status

**PATCH** `/vendor/schedules/bulk-update`

**Body:**

```json
{
  "scheduleIds": [1, 2, 3, 4],
  "status": "PREPARED",
  "notes": "All meals prepared and ready for pickup"
}
```

### 7. Get Schedule Statistics

**GET** `/vendor/schedule-stats`

**Query Parameters:**

- `date` (optional): Specific date

### 8. Assign Delivery Partner to Schedule

**PATCH** `/vendor/schedules/:scheduleId/assign-delivery-partner`

**Body:**

```json
{
  "deliveryPartnerId": 5
}
```

---

## Delivery Partner APIs

### 1. Get Assigned Schedules

**GET** `/delivery-partner/schedules`

**Query Parameters:**

- `page`, `limit`, `status`, `startDate`, `endDate`, `mealType`

**Response:**

```json
{
  "success": true,
  "data": {
    "schedules": [...],
    "pagination": { ... },
    "statistics": {
      "totalSchedules": 20,
      "statusBreakdown": { ... },
      "completionRate": "90.00"
    }
  }
}
```

### 2. Get Schedule Details

**GET** `/delivery-partner/schedules/:scheduleId`

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "scheduledDate": "2025-08-05",
    "scheduledTimeSlot": "12:00-14:00",
    "mealType": "Lunch",
    "status": "PREPARED",
    "order": {
      "deliveryAddress": "...",
      "deliveryLat": 12.34,
      "deliveryLng": 56.78,
      "user": { ... },
      "orderItems": [...]
    },
    "vendor": { ... }
  }
}
```

### 3. Update Schedule Status

**PATCH** `/delivery-partner/schedules/:scheduleId/status`

**Body:**

```json
{
  "status": "OUT_FOR_DELIVERY",
  "notes": "Picked up from vendor, heading to customer",
  "latitude": 12.34,
  "longitude": 56.78
}
```

**Allowed Statuses for Delivery Partners:**

- OUT_FOR_DELIVERY, DELIVERED, MISSED

### 4. Get Today's Schedules

**GET** `/delivery-partner/schedules/today`

**Response:**

```json
{
  "success": true,
  "data": {
    "date": "2025-08-05",
    "schedules": {
      "08:00-10:00": [...],
      "12:00-14:00": [...],
      "19:00-21:00": [...]
    },
    "totalSchedules": 15,
    "statistics": { ... }
  }
}
```

### 5. Get Dashboard Statistics

**GET** `/delivery-partner/dashboard-stats`

**Query Parameters:**

- `date` (optional): Specific date

**Response:**

```json
{
  "success": true,
  "data": {
    "today": {
      "date": "2025-08-05",
      "totalDeliveries": 12,
      "statusBreakdown": { ... },
      "completionRate": "83.33"
    },
    "weekly": {
      "totalDeliveries": 85,
      "statusBreakdown": { ... }
    },
    "pending": {
      "pendingDeliveries": 5
    }
  }
}
```

---

## Common Response Formats

### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error information"
}
```

### Pagination Format

```json
{
  "currentPage": 1,
  "totalPages": 5,
  "totalItems": 50,
  "hasNextPage": true,
  "hasPrevPage": false
}
```

---

## Status Enums

### Order Status

- PENDING
- CONFIRMED
- PREPARING
- OUT_FOR_DELIVERY
- DELIVERED
- CANCELLED
- REFUNDED

### Schedule Status

- SCHEDULED
- PREPARED
- OUT_FOR_DELIVERY
- DELIVERED
- CANCELLED
- MISSED

### Order Types

- ONETIME
- WEEKLY
- MONTHLY

### Payment Types

- CASH_ON_DELIVERY
- RAZORPAY
- UPI
- CARD
- WALLET

---

## Notes

1. **Authentication**: All endpoints require appropriate role-based authentication
2. **Pagination**: Most list endpoints support pagination with `page` and `limit` parameters
3. **Filtering**: Date ranges and status filters are available on most endpoints
4. **Search**: Text search is available on order listing endpoints
5. **Real-time Updates**: Consider implementing WebSocket connections for real-time status updates
6. **Error Handling**: All endpoints return consistent error response format
7. **Validation**: Input validation is performed on all endpoints with appropriate error messages
