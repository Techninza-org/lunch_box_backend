# Delete Address API Test

## Endpoint
```
DELETE /api/users/delete-address/:addressId
```

## Authentication
Requires user authentication via JWT Bearer token.

## Request Parameters
- `addressId` (URL parameter): The ID of the address to delete

## Response Format

### Success Response (200)
```json
{
  "success": true,
  "message": "Address deleted successfully.",
  "data": {
    "deletedAddressId": 123
  }
}
```

### Error Responses

#### 400 - Bad Request
```json
{
  "success": false,
  "message": "Valid address ID is required"
}
```

#### 400 - Cannot Delete Only Address
```json
{
  "success": false,
  "message": "Cannot delete the only address. Please add another address first."
}
```

#### 404 - Address Not Found
```json
{
  "success": false,
  "message": "Address not found or doesn't belong to user"
}
```

## Test Commands

### PowerShell Test Commands

1. **Login and get token:**
```powershell
$loginResponse = Invoke-RestMethod -Uri "http://localhost:4000/api/public/user-login" -Method POST -ContentType "application/json" -Body '{"email":"john@example.com","password":"password123"}'
$userToken = $loginResponse.token
```

2. **Get user addresses to find an address ID:**
```powershell
$addresses = Invoke-RestMethod -Uri "http://localhost:4000/api/users/get-addresses" -Method GET -Headers @{Authorization="Bearer $userToken"}
$addresses.data
```

3. **Delete an address:**
```powershell
# Replace 123 with actual address ID
Invoke-RestMethod -Uri "http://localhost:4000/api/users/delete-address/123" -Method DELETE -Headers @{Authorization="Bearer $userToken"}
```

### cURL Test Commands

1. **Delete an address:**
```bash
curl -X DELETE "http://localhost:4000/api/users/delete-address/123" \
  -H "Authorization: Bearer <your_jwt_token>"
```

## Business Logic

1. **Validation:** 
   - Checks if user is authenticated
   - Validates address ID parameter
   - Verifies address exists and belongs to the user

2. **Deletion Protection:**
   - Prevents deletion if this is the user's only address
   - User must have at least one address

3. **Default Address Handling:**
   - If the deleted address was the default address, automatically sets the oldest remaining address as the new default

4. **Transaction Safety:**
   - Uses Prisma transaction to ensure data consistency
   - Rollback protection if any operation fails

## Error Scenarios

- **Invalid address ID**: Returns 400 error
- **Address doesn't exist**: Returns 404 error  
- **Address belongs to another user**: Returns 404 error
- **Trying to delete the only address**: Returns 400 error
- **Database errors**: Returns 500 error

## Integration with Existing APIs

This API works alongside the existing address management APIs:

- `POST /api/users/add-address` - Add new address
- `GET /api/users/get-addresses` - Get all user addresses  
- `GET /api/users/set-default-address/:addressId` - Set default address
- `DELETE /api/users/delete-address/:addressId` - **NEW** Delete address

## Notes

- The API maintains referential integrity by preventing deletion of the last address
- Automatic default address reassignment ensures users always have a default address
- The API follows the same response format as other address APIs in the system