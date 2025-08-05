# Order API Testing Commands

This document provides comprehensive testing commands for the Order Management System.

## Prerequisites

1. **User Authentication**: Get a user token by logging in:

```powershell
$loginResponse = Invoke-RestMethod -Uri "http://localhost:4000/api/public/user/login" -Method POST -ContentType "application/json" -Body '{"email":"john@example.com","password":"password123"}'
$userToken = $loginResponse.token
```

2. **Add Items to Cart**: Ensure cart has items before creating orders:

```powershell
# Add a meal to cart
Invoke-RestMethod -Uri "http://localhost:4000/api/users/cart/add" -Method POST -Headers @{Authorization="Bearer $userToken"} -ContentType "application/json" -Body '{"mealId":1,"quantity":2,"deliveryDate":"2025-08-05T12:00:00.000Z"}'
```

3. **Add User Address**: Ensure user has a delivery address:

```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/users/address" -Method POST -Headers @{Authorization="Bearer $userToken"} -ContentType "application/json" -Body '{"address":"123 Main Street, Apt 4B","city":"Mumbai","state":"Maharashtra","zipCode":"400001","phoneNumber":"+91-9876543210","addressType":"HOME","isDefault":true}'
```

## Order API Test Commands

### 1. Create One-Time Order

```powershell
# Create a one-time order with cash on delivery
$oneTimeOrder = Invoke-RestMethod -Uri "http://localhost:4000/api/orders" -Method POST -Headers @{Authorization="Bearer $userToken"} -ContentType "application/json" -Body '{
  "orderType": "ONETIME",
  "paymentType": "CASH_ON_DELIVERY",
  "deliveryAddressId": 1,
  "orderNotes": "Please ring the bell twice"
}'

Write-Host "One-time Order Created:" -ForegroundColor Green
$oneTimeOrder | ConvertTo-Json -Depth 5
```

### 2. Create Weekly Subscription Order

```powershell
# Create a weekly subscription order with online payment
$weeklyOrder = Invoke-RestMethod -Uri "http://localhost:4000/api/orders" -Method POST -Headers @{Authorization="Bearer $userToken"} -ContentType "application/json" -Body '{
  "orderType": "WEEKLY",
  "paymentType": "RAZORPAY",
  "paymentId": "pay_weekly_123456",
  "deliveryAddressId": 1,
  "subscriptionStartDate": "2025-08-05T00:00:00.000Z",
  "orderNotes": "Weekly lunch subscription for office"
}'

Write-Host "Weekly Subscription Order Created:" -ForegroundColor Green
$weeklyOrder | ConvertTo-Json -Depth 5
```

### 3. Create Monthly Subscription Order

```powershell
# Create a monthly subscription order
$monthlyOrder = Invoke-RestMethod -Uri "http://localhost:4000/api/orders" -Method POST -Headers @{Authorization="Bearer $userToken"} -ContentType "application/json" -Body '{
  "orderType": "MONTHLY",
  "paymentType": "UPI",
  "paymentId": "upi_monthly_789012",
  "deliveryAddressId": 1,
  "subscriptionStartDate": "2025-08-05T00:00:00.000Z",
  "orderNotes": "Monthly dinner subscription for family"
}'

Write-Host "Monthly Subscription Order Created:" -ForegroundColor Green
$monthlyOrder | ConvertTo-Json -Depth 5
```

### 4. Get All User Orders

```powershell
# Get all orders with pagination
$allOrders = Invoke-RestMethod -Uri "http://localhost:4000/api/orders?page=1&limit=10" -Method GET -Headers @{Authorization="Bearer $userToken"}

Write-Host "All User Orders:" -ForegroundColor Cyan
$allOrders | ConvertTo-Json -Depth 4
```

### 5. Get Orders by Status

```powershell
# Get pending orders
$pendingOrders = Invoke-RestMethod -Uri "http://localhost:4000/api/orders?status=PENDING" -Method GET -Headers @{Authorization="Bearer $userToken"}

Write-Host "Pending Orders:" -ForegroundColor Yellow
$pendingOrders | ConvertTo-Json -Depth 4
```

### 6. Get Orders by Type

```powershell
# Get subscription orders
$subscriptionOrders = Invoke-RestMethod -Uri "http://localhost:4000/api/orders?orderType=WEEKLY" -Method GET -Headers @{Authorization="Bearer $userToken"}

Write-Host "Weekly Subscription Orders:" -ForegroundColor Magenta
$subscriptionOrders | ConvertTo-Json -Depth 4
```

### 7. Get Order Details

```powershell
# Get specific order details (replace 1 with actual order ID)
$orderDetails = Invoke-RestMethod -Uri "http://localhost:4000/api/orders/1" -Method GET -Headers @{Authorization="Bearer $userToken"}

Write-Host "Order Details:" -ForegroundColor Blue
$orderDetails | ConvertTo-Json -Depth 5
```

### 8. Cancel Order

```powershell
# Cancel an order (replace 1 with actual order ID)
$cancelResponse = Invoke-RestMethod -Uri "http://localhost:4000/api/orders/1/cancel" -Method PATCH -Headers @{Authorization="Bearer $userToken"} -ContentType "application/json" -Body '{
  "cancelReason": "Change of plans, no longer need the subscription"
}'

Write-Host "Order Cancellation:" -ForegroundColor Red
$cancelResponse
```

### 9. Get User Meal Schedules

```powershell
# Get all meal schedules
$allSchedules = Invoke-RestMethod -Uri "http://localhost:4000/api/orders/schedules" -Method GET -Headers @{Authorization="Bearer $userToken"}

Write-Host "All Meal Schedules:" -ForegroundColor Green
$allSchedules | ConvertTo-Json -Depth 4
```

### 10. Get Filtered Meal Schedules

```powershell
# Get schedules for a specific date range
$dateRangeSchedules = Invoke-RestMethod -Uri "http://localhost:4000/api/orders/schedules?startDate=2025-08-05&endDate=2025-08-12&status=SCHEDULED" -Method GET -Headers @{Authorization="Bearer $userToken"}

Write-Host "Date Range Schedules:" -ForegroundColor Cyan
$dateRangeSchedules | ConvertTo-Json -Depth 4
```

### 11. Get Today's Schedules (Cron Job Endpoint)

```powershell
# Get today's meal schedules (no authentication required)
$todaySchedules = Invoke-RestMethod -Uri "http://localhost:4000/api/orders/schedules/today" -Method GET

Write-Host "Today's Meal Schedules (for Cron):" -ForegroundColor Yellow
$todaySchedules | ConvertTo-Json -Depth 5
```

### 12. Update Meal Schedule Status

```powershell
# Update schedule status (replace 1 with actual schedule ID)
$statusUpdate = Invoke-RestMethod -Uri "http://localhost:4000/api/orders/schedules/1/status" -Method PATCH -ContentType "application/json" -Body '{
  "status": "DELIVERED",
  "actualDeliveryTime": "2025-08-04T13:30:00.000Z",
  "notes": "Delivered successfully to customer at main gate"
}'

Write-Host "Schedule Status Updated:" -ForegroundColor Green
$statusUpdate
```

## Complete Test Workflow

```powershell
# Complete workflow to test all order functionality

Write-Host "=== TESTING ORDER MANAGEMENT SYSTEM ===" -ForegroundColor White -BackgroundColor DarkBlue

# 1. Login and get token
Write-Host "`n1. User Login..." -ForegroundColor Yellow
$loginResponse = Invoke-RestMethod -Uri "http://localhost:4000/api/public/user/login" -Method POST -ContentType "application/json" -Body '{"email":"john@example.com","password":"password123"}'
$userToken = $loginResponse.token
Write-Host "✓ Login successful" -ForegroundColor Green

# 2. Add items to cart
Write-Host "`n2. Adding items to cart..." -ForegroundColor Yellow
try {
    $cartAdd = Invoke-RestMethod -Uri "http://localhost:4000/api/users/cart/add" -Method POST -Headers @{Authorization="Bearer $userToken"} -ContentType "application/json" -Body '{"mealId":1,"quantity":2}'
    Write-Host "✓ Items added to cart" -ForegroundColor Green
} catch {
    Write-Host "⚠ Cart add failed (may already exist): $($_.Exception.Message)" -ForegroundColor Yellow
}

# 3. Get cart to verify
Write-Host "`n3. Checking cart..." -ForegroundColor Yellow
$cart = Invoke-RestMethod -Uri "http://localhost:4000/api/users/cart" -Method GET -Headers @{Authorization="Bearer $userToken"}
Write-Host "✓ Cart has $($cart.data.summary.totalItems) items" -ForegroundColor Green

# 4. Create one-time order
Write-Host "`n4. Creating one-time order..." -ForegroundColor Yellow
try {
    $oneTimeOrder = Invoke-RestMethod -Uri "http://localhost:4000/api/orders" -Method POST -Headers @{Authorization="Bearer $userToken"} -ContentType "application/json" -Body '{
      "orderType": "ONETIME",
      "paymentType": "CASH_ON_DELIVERY",
      "deliveryAddressId": 1,
      "orderNotes": "Test one-time order"
    }'
    Write-Host "✓ One-time order created with ID: $($oneTimeOrder.data.id)" -ForegroundColor Green
} catch {
    Write-Host "✗ One-time order failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Add more items for subscription test
Write-Host "`n5. Adding more items for subscription test..." -ForegroundColor Yellow
try {
    $cartAdd2 = Invoke-RestMethod -Uri "http://localhost:4000/api/users/cart/add" -Method POST -Headers @{Authorization="Bearer $userToken"} -ContentType "application/json" -Body '{"mealId":1,"quantity":1}'
    Write-Host "✓ More items added to cart" -ForegroundColor Green
} catch {
    Write-Host "⚠ Cart add failed: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 6. Create weekly subscription
Write-Host "`n6. Creating weekly subscription..." -ForegroundColor Yellow
try {
    $weeklyOrder = Invoke-RestMethod -Uri "http://localhost:4000/api/orders" -Method POST -Headers @{Authorization="Bearer $userToken"} -ContentType "application/json" -Body '{
      "orderType": "WEEKLY",
      "paymentType": "RAZORPAY",
      "paymentId": "pay_test_weekly_123",
      "deliveryAddressId": 1,
      "subscriptionStartDate": "2025-08-05T00:00:00.000Z",
      "orderNotes": "Test weekly subscription"
    }'
    Write-Host "✓ Weekly subscription created with ID: $($weeklyOrder.data.id)" -ForegroundColor Green
    Write-Host "  - Total meals in subscription: $($weeklyOrder.data.totalMealsInSubscription)" -ForegroundColor Cyan
} catch {
    Write-Host "✗ Weekly subscription failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 7. Get all orders
Write-Host "`n7. Retrieving all orders..." -ForegroundColor Yellow
$allOrders = Invoke-RestMethod -Uri "http://localhost:4000/api/orders" -Method GET -Headers @{Authorization="Bearer $userToken"}
Write-Host "✓ Found $($allOrders.data.orders.Count) orders" -ForegroundColor Green

# 8. Get meal schedules
Write-Host "`n8. Retrieving meal schedules..." -ForegroundColor Yellow
$schedules = Invoke-RestMethod -Uri "http://localhost:4000/api/orders/schedules" -Method GET -Headers @{Authorization="Bearer $userToken"}
Write-Host "✓ Found $($schedules.data.Count) meal schedules" -ForegroundColor Green

# 9. Get today's schedules
Write-Host "`n9. Getting today's schedules (cron endpoint)..." -ForegroundColor Yellow
$todaySchedules = Invoke-RestMethod -Uri "http://localhost:4000/api/orders/schedules/today" -Method GET
Write-Host "✓ Found $($todaySchedules.data.totalSchedules) schedules for today" -ForegroundColor Green

Write-Host "`n=== ORDER MANAGEMENT TESTING COMPLETE ===" -ForegroundColor White -BackgroundColor DarkGreen
```

## Expected Responses Summary

### Order Creation Success Indicators:

- ✅ Status 201 with order details
- ✅ Cart automatically cleared after order
- ✅ Meal schedules created based on order type
- ✅ Subscription dates calculated correctly

### Subscription Meal Calculations:

- **ONETIME**: 1 × cart quantity = total meals
- **WEEKLY**: 7 × cart quantity = total meals
- **MONTHLY**: 30 × cart quantity = total meals

### Error Scenarios:

- Empty cart: 400 error
- Invalid address: 404 error
- Mixed vendor items: 400 error
- Invalid order type: 400 error

## Notes

1. **Cart Clearing**: Cart is automatically cleared after successful order creation
2. **Address Requirement**: User must have at least one saved address
3. **Vendor Consistency**: All cart items must be from the same vendor
4. **Schedule Creation**: Meal schedules are created automatically based on order type
5. **Date Handling**: All dates should be in ISO format with timezone
6. **Cron Integration**: The `/schedules/today` endpoint requires no authentication for automated systems
