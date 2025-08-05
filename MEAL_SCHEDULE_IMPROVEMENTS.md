# Meal Schedule Management Improvements

## Overview

Enhanced the meal scheduling system to include direct vendor assignment in the `MealSchedule` table for improved delivery operations management.

## Database Schema Changes

### MealSchedule Table Updates

- **Added `vendorId`**: Direct reference to vendor for each meal schedule
- **Added `deliveryPartnerId`**: Assignment of delivery partners to specific schedules
- **Added indexes**: For efficient querying by vendor and delivery partner

### Migration Details

- File: `20250805060942_add_vendor_and_delivery_partner_to_meal_schedule`
- Safely migrated existing data by populating `vendorId` from associated orders
- Added foreign key constraints for data integrity

## Controller Enhancements

### Updated Functions

1. **`createMealSchedules`**: Now includes `vendorId` when creating schedules
2. **`getTodayMealSchedules`**: Enhanced to include vendor and delivery partner information
3. **`getUserMealSchedules`**: Optimized to fetch vendor info directly from schedules

### New Functions

#### Vendor Operations

- **`getVendorMealSchedules`**: Get schedules for a specific vendor with delivery details
- **`bulkUpdateScheduleStatus`**: Update multiple schedules at once
- **`getVendorScheduleStats`**: Dashboard statistics for vendors

#### Delivery Partner Operations

- **`getDeliveryPartnerSchedules`**: Get assigned schedules for delivery partners
- **`assignDeliveryPartner`**: Assign delivery partners to meal schedules

## Benefits

### Performance Improvements

- Direct vendor queries without JOIN operations
- Indexed queries for faster delivery operations
- Optimized data fetching for vendor dashboards

### Operational Benefits

- Clear vendor assignment for each meal schedule
- Delivery partner management at schedule level
- Better tracking and reporting capabilities
- Bulk operations for efficiency

### Data Integrity

- Foreign key constraints ensure data consistency
- Proper indexes for query performance
- Maintained backward compatibility

## API Endpoints

### Vendor Endpoints

```
GET /vendor/schedules - Get vendor's meal schedules
PATCH /vendor/schedules/bulk-update - Bulk update schedule statuses
GET /vendor/schedule-stats - Get schedule statistics
```

### Delivery Partner Endpoints

```
GET /delivery-partner/schedules - Get assigned schedules
PATCH /schedules/:scheduleId/assign-delivery-partner - Assign delivery partner
```

### Enhanced Existing Endpoints

- `GET /orders/schedules/today` - Now includes vendor and delivery partner info
- `GET /orders/schedules` - Optimized vendor data fetching
- `PATCH /orders/schedules/:scheduleId/status` - Enhanced for delivery operations

## Usage Examples

### For Vendors

```javascript
// Get today's schedules for preparation
GET /vendor/schedules?startDate=2025-08-05&endDate=2025-08-05&status=SCHEDULED

// Bulk mark meals as prepared
PATCH /vendor/schedules/bulk-update
{
  "scheduleIds": [1, 2, 3],
  "status": "PREPARED",
  "notes": "All meals prepared and ready for pickup"
}

// Get daily statistics
GET /vendor/schedule-stats?date=2025-08-05
```

### For Delivery Partners

```javascript
// Get assigned deliveries
GET /delivery-partner/schedules?startDate=2025-08-05&status=PREPARED

// Update delivery status
PATCH /orders/schedules/123/status
{
  "status": "OUT_FOR_DELIVERY",
  "notes": "Out for delivery at 12:30 PM"
}
```

## Next Steps

1. Update route files to include new endpoints
2. Add authentication middleware for vendor and delivery partner routes
3. Implement real-time notifications for status updates
4. Add delivery tracking features
5. Implement delivery partner auto-assignment algorithms
