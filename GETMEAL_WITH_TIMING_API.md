# Enhanced getMealById API with Vendor Timing Information

## Endpoint
```
GET /api/users/meals/:id
```

## Authentication
Requires user authentication via JWT Bearer token.

## Request Parameters
- `id` (URL parameter): The ID of the meal to retrieve

## Enhanced Response Format

The API now returns vendor timing information based on the meal type. The response includes all original meal data plus a new `timing` field.

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "id": 123,
    "title": "Delicious Dal Rice",
    "description": "Traditional dal with steamed rice",
    "type": "Lunch",  // This determines which timing is returned
    "basePrice": 89.99,
    "isVeg": true,
    "energyKcal": 450,
    "proteinGram": 15.5,
    "fatGram": 8.2,
    "carbsGram": 72.1,
    "vendor": {
      "id": 1,
      "name": "Mumbai Tiffin Service",
      "businessName": "Mumbai Tiffin Co.",
      "logo": "/uploads/logos/vendor1.png",
      "address": "Shop 15, Food Court Plaza",
      "city": "Mumbai",
      "state": "Maharashtra",
      "breakfastStart": "07:00",
      "breakfastEnd": "10:00",
      "lunchStart": "12:00",
      "lunchEnd": "15:00",
      "eveningStart": "16:00",
      "eveningEnd": "18:00",
      "dinnerStart": "19:00",
      "dinnerEnd": "22:00"
    },
    "mealImages": [...],
    "mealOptionGroups": [...],
    "availableDays": [...],
    "dietaryTags": [...],
    "ingredients": [...],
    "timing": {
      "start": "12:00",  // Based on meal type "Lunch"
      "end": "15:00"     // Based on meal type "Lunch"
    }
  }
}
```

## Timing Logic

The `timing` field is dynamically generated based on the meal's `type` field:

| Meal Type | Timing Fields Used |
|-----------|-------------------|
| `Breakfast` | `breakfastStart` → `breakfastEnd` |
| `Lunch` | `lunchStart` → `lunchEnd` |
| `Evening` | `eveningStart` → `eveningEnd` |
| `Dinner` | `dinnerStart` → `dinnerEnd` |

### Example Timing Responses by Meal Type:

#### Breakfast Meal
```json
{
  "timing": {
    "start": "07:00",
    "end": "10:00"
  }
}
```

#### Lunch Meal
```json
{
  "timing": {
    "start": "12:00", 
    "end": "15:00"
  }
}
```

#### Evening Meal
```json
{
  "timing": {
    "start": "16:00",
    "end": "18:00"
  }
}
```

#### Dinner Meal
```json
{
  "timing": {
    "start": "19:00",
    "end": "22:00"
  }
}
```

#### No Timing Available
If vendor doesn't have timing information for the meal type:
```json
{
  "timing": null
}
```

## Error Responses

### 400 - Bad Request
```json
{
  "success": false,
  "message": "Meal ID is required"
}
```

### 404 - Meal Not Found
```json
{
  "success": false,
  "message": "Meal not found"
}
```

### 500 - Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Test Commands

### PowerShell
```powershell
# Login and get token
$loginResponse = Invoke-RestMethod -Uri "http://localhost:4000/api/public/user-login" -Method POST -ContentType "application/json" -Body '{"email":"john@example.com","password":"password123"}'
$userToken = $loginResponse.token

# Get meal by ID with timing information
Invoke-RestMethod -Uri "http://localhost:4000/api/users/meals/123" -Method GET -Headers @{Authorization="Bearer $userToken"}
```

### cURL
```bash
curl -X GET "http://localhost:4000/api/users/meals/123" \
  -H "Authorization: Bearer <your_jwt_token>"
```

## Key Enhancements

1. **Dynamic Timing**: Returns vendor timing specific to the meal type
2. **Full Vendor Data**: Includes all vendor timing fields in the response
3. **Null Safety**: Handles cases where timing information is not available
4. **Backward Compatible**: Maintains all existing response fields
5. **Type-Based Logic**: Uses meal type enum to determine appropriate timing

## Use Cases

- **Frontend Display**: Show when the meal is available for ordering
- **Order Validation**: Validate if orders can be placed within vendor timing
- **User Experience**: Display service hours to users before ordering
- **Business Logic**: Support time-based ordering restrictions

## Integration Notes

- The timing information is added as a new top-level field in the response
- All existing API consumers will continue to work unchanged
- The timing field provides a convenient way to access relevant vendor hours
- Frontend can use this timing for display or validation purposes