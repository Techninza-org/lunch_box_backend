# Lunch Box Backend API Documentation

## Base URL

```
http://localhost:4000
```

## Authentication

Most APIs require authentication using Bearer tokens in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Public APIs (No Authentication Required)

### 1. User Registration

```bash
curl -X POST http://localhost:4000/api/public/user-register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

### 2. User Login

```bash
curl -X POST http://localhost:4000/api/public/user-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### 3. Vendor Registration

```bash
curl -X POST http://localhost:4000/api/public/vendor-register \
  -H "Content-Type: multipart/form-data" \
  -F "name=Restaurant Owner" \
  -F "email=vendor@example.com" \
  -F "password=password123" \
  -F "phoneNumber=9876543210" \
  -F "businessName=Tasty Tiffins" \
  -F "description=Best home-style meals" \
  -F "address=123 Main Street" \
  -F "city=Mumbai" \
  -F "state=Maharashtra" \
  -F "logo=@/path/to/logo.jpg"
```

### 4. Vendor Login

```bash
curl -X POST http://localhost:4000/api/public/vendor-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "vendor@example.com",
    "password": "password123"
  }'
```

### 5. Admin Registration

```bash
curl -X POST http://localhost:4000/api/public/admin-register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

### 6. Admin Login

```bash
curl -X POST http://localhost:4000/api/public/admin-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

## User APIs (Requires User Authentication)

### 1. Add User Current Location

```bash
curl -X POST http://localhost:4000/api/users/add-current-location \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <user_token>" \
  -d '{
    "latitude": 19.0760,
    "longitude": 72.8777
  }'
```

### 2. Get Home Page Data (Banners + Approved Vendors)

```bash
curl -X GET http://localhost:4000/api/users/home \
  -H "Authorization: Bearer <user_token>"
```

### 3. Get All Restaurants by User Location

```bash
curl -X GET http://localhost:4000/api/users/get-all-restaurants-by-user-location \
  -H "Authorization: Bearer <user_token>"
```

### 4. Get Restaurant Details by ID (Complete Menu)

```bash
curl -X GET http://localhost:4000/api/users/get-restaurant-by-id/1 \
  -H "Authorization: Bearer <user_token>"
```

### 5. Get Meals by Vendor and Type

```bash
# Get all lunch meals from vendor 1
curl -X GET http://localhost:4000/api/users/meals/vendor/1/type/Lunch \
  -H "Authorization: Bearer <user_token>"

# Get all dinner meals from vendor 1
curl -X GET http://localhost:4000/api/users/meals/vendor/1/type/Dinner \
  -H "Authorization: Bearer <user_token>"

# Get all breakfast meals from vendor 1
curl -X GET http://localhost:4000/api/users/meals/vendor/1/type/Breakfast \
  -H "Authorization: Bearer <user_token>"

# Get all evening meals from vendor 1
curl -X GET http://localhost:4000/api/users/meals/vendor/1/type/Evening \
  -H "Authorization: Bearer <user_token>"
```

### 6. Search Meals with Filters

```bash
# Basic search
curl -X GET "http://localhost:4000/api/users/meals/search?query=thali" \
  -H "Authorization: Bearer <user_token>"

# Advanced search with filters
curl -X GET "http://localhost:4000/api/users/meals/search?query=dal&type=Lunch&cuisine=NorthIndian&isVeg=true&priceMin=50&priceMax=200&vendorId=1" \
  -H "Authorization: Bearer <user_token>"

# Search by cuisine type
curl -X GET "http://localhost:4000/api/users/meals/search?query=rice&cuisine=SouthIndian" \
  -H "Authorization: Bearer <user_token>"

# Search vegetarian meals only
curl -X GET "http://localhost:4000/api/users/meals/search?query=paneer&isVeg=true" \
  -H "Authorization: Bearer <user_token>"
```

### 7. Get Meal Details by ID

```bash
curl -X GET http://localhost:4000/api/users/meals/123 \
  -H "Authorization: Bearer <user_token>"
```

## Vendor APIs (Requires Vendor Authentication)

### 1. Add New Meal (SINGLE Type)

```bash
curl -X POST http://localhost:4000/api/vendor/add-meal \
  -H "Authorization: Bearer <vendor_token>" \
  -F "vendorId=1" \
  -F "title=Classic Dal Rice" \
  -F "description=Traditional dal with steamed rice and pickle" \
  -F "type=Lunch" \
  -F "configType=SINGLE" \
  -F "cuisine=NorthIndian" \
  -F "isVeg=true" \
  -F "energyKcal=450" \
  -F "proteinGram=15.5" \
  -F "fatGram=8.2" \
  -F "carbsGram=72.1" \
  -F "basePrice=89.99" \
  -F "isWeekly=false" \
  -F "availableDays=MON,TUE,WED,THU,FRI" \
  -F 'dietaryTags=["High Protein", "Low Fat"]' \
  -F 'ingredients=["Dal", "Rice", "Turmeric", "Ghee"]' \
  -F "mainImage=@/path/to/meal-image.jpg" \
  -F "gallery_0=@/path/to/gallery1.jpg" \
  -F "gallery_1=@/path/to/gallery2.jpg"
```

### 2. Add New Meal (CUSTOMIZABLE Type)

```bash
curl -X POST http://localhost:4000/api/vendor/add-meal \
  -H "Authorization: Bearer <vendor_token>" \
  -F "vendorId=1" \
  -F "title=Build Your Thali" \
  -F "description=Customize your own thali with various options" \
  -F "type=Lunch" \
  -F "configType=CUSTOMIZABLE" \
  -F "cuisine=NorthIndian" \
  -F "isVeg=true" \
  -F "basePrice=120.00" \
  -F "isWeekly=false" \
  -F "availableDays=MON,TUE,WED,THU,FRI,SAT" \
  -F 'dietaryTags=["Customizable", "Fresh"]' \
  -F 'ingredients=["Rice", "Dal", "Vegetables", "Roti"]' \
  -F 'optionGroups=[
    {
      "title": "Choose Your Rice",
      "isRequired": true,
      "minSelect": 1,
      "maxSelect": 1,
      "options": [
        {"name": "Steamed Rice", "price": 0, "isDefault": true},
        {"name": "Jeera Rice", "price": 15, "isDefault": false},
        {"name": "Biryani Rice", "price": 25, "isDefault": false}
      ]
    },
    {
      "title": "Choose Your Dal",
      "isRequired": true,
      "minSelect": 1,
      "maxSelect": 2,
      "options": [
        {"name": "Yellow Dal", "price": 0, "isDefault": true},
        {"name": "Dal Makhani", "price": 20, "isDefault": false},
        {"name": "Mixed Dal", "price": 10, "isDefault": false}
      ]
    }
  ]' \
  -F "mainImage=@/path/to/thali-image.jpg" \
  -F "option_0_0=@/path/to/steamed-rice.jpg" \
  -F "option_0_1=@/path/to/jeera-rice.jpg" \
  -F "option_1_0=@/path/to/yellow-dal.jpg"
```

### 3. Get All Meals by Vendor

```bash
curl -X GET http://localhost:4000/api/vendor/get-meals \
  -H "Authorization: Bearer <vendor_token>"
```

### 4. Get Meal by ID (Vendor)

```bash
curl -X GET http://localhost:4000/api/vendor/get-meals/123 \
  -H "Authorization: Bearer <vendor_token>"
```

### 5. Update Meal

```bash
curl -X PATCH http://localhost:4000/api/vendor/update-meal/123 \
  -H "Authorization: Bearer <vendor_token>" \
  -F "title=Updated Meal Title" \
  -F "description=Updated description" \
  -F "basePrice=95.99" \
  -F "isAvailable=true" \
  -F "mainImage=@/path/to/new-image.jpg"
```

### 6. Update Meal Status (Toggle Available/Unavailable)

```bash
curl -X PUT http://localhost:4000/api/vendor/update-status/123 \
  -H "Authorization: Bearer <vendor_token>"
```

### 7. Soft Delete Meal

```bash
curl -X DELETE http://localhost:4000/api/vendor/soft-delete/123 \
  -H "Authorization: Bearer <vendor_token>"
```

## Admin APIs (Requires Admin Authentication)

### 1. Add Banner

```bash
curl -X POST http://localhost:4000/api/admin/add-banner \
  -H "Authorization: Bearer <admin_token>" \
  -F "title=Summer Special Offer" \
  -F "description=Get 20% off on all meals this summer" \
  -F "image=@/path/to/banner.jpg"
```

### 2. Get All Banners

```bash
curl -X GET http://localhost:4000/api/admin/banners \
  -H "Authorization: Bearer <admin_token>"
```

### 3. Get Banner by ID

```bash
curl -X GET http://localhost:4000/api/admin/banners/1 \
  -H "Authorization: Bearer <admin_token>"
```

### 4. Update Banner

```bash
curl -X PUT http://localhost:4000/api/admin/banners/1 \
  -H "Authorization: Bearer <admin_token>" \
  -F "title=Updated Banner Title" \
  -F "description=Updated banner description" \
  -F "image=@/path/to/new-banner.jpg"
```

### 5. Delete Banner

```bash
curl -X DELETE http://localhost:4000/api/admin/banners/1 \
  -H "Authorization: Bearer <admin_token>"
```

## Meal Types Available

- `Breakfast`
- `Lunch`
- `Dinner`
- `Evening`

## Meal Config Types

- `SINGLE` - Pre-defined meal with fixed items
- `CUSTOMIZABLE` - Meal with selectable options

## Cuisine Types Available

- `Marathi`
- `NorthIndian`
- `SouthIndian`
- `Gujarati`
- `Bengali`
- `Continental`

## Response Structure

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "message": "Success message"
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error message"
}
```

## Notes

1. **File Uploads**: When uploading files, use `multipart/form-data` content type
2. **Authentication**: Store the JWT token received during login and include it in subsequent requests
3. **Meal Customization**: For customizable meals, option images should follow the naming pattern `option_{groupIndex}_{optionIndex}`
4. **Image Paths**: Uploaded images are accessible at `/uploads/{folder}/{filename}`
5. **Search Filters**: All search parameters are optional except the `query` parameter
6. **Price Ranges**: Use `priceMin` and `priceMax` for filtering meals by price
7. **Meal Types**: Use exact case-sensitive values for meal types (Breakfast, Lunch, Dinner, Evening)

## Example Complete Restaurant Data Response

When you call `GET /api/users/get-restaurant-by-id/1`, you'll get:

```json
{
  "success": true,
  "data": {
    "vendorInfo": {
      "id": 1,
      "name": "Restaurant Owner",
      "businessName": "Tasty Tiffins",
      "logo": "/uploads/vendors/logo.jpg",
      "address": "123 Main Street",
      "city": "Mumbai",
      "breakfastStart": "08:00",
      "breakfastEnd": "10:00",
      "lunchStart": "12:00",
      "lunchEnd": "15:00"
    },
    "menu": {
      "Breakfast": [
        {
          "id": 1,
          "title": "Poha",
          "configType": "SINGLE",
          "basePrice": 45.00,
          "isVeg": true,
          "ingredients": [...]
        }
      ],
      "Lunch": [
        {
          "id": 2,
          "title": "Custom Thali",
          "configType": "CUSTOMIZABLE",
          "basePrice": 120.00,
          "customizationOptions": [...]
        }
      ],
      "Dinner": [...],
      "Evening": [...]
    },
    "totalItems": 15
  }
}
```

This structure provides complete restaurant information with menu items categorized by meal type, showing both simple and customizable options with all necessary details for display and ordering.
