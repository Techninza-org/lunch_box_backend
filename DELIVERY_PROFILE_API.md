# Delivery Partner Profile API

## GET /api/delivery/get-profile

This API endpoint allows authenticated delivery partners to retrieve their complete profile information including personal details, bank information, and wallet balance.

### Endpoint Details
- **URL**: `/api/delivery/get-profile`
- **Method**: `GET`
- **Authentication**: Required (Bearer Token)
- **Role**: DELIVERY_PARTNER

### Request Headers
```
Authorization: Bearer <delivery_partner_jwt_token>
Content-Type: application/json
```

### Request Example
```bash
curl -X GET http://localhost:4000/api/delivery/get-profile \
  -H "Authorization: Bearer <delivery_partner_token>" \
  -H "Content-Type: application/json"
```

### Response

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "id": 1,
    "name": "John Delivery",
    "email": "john.delivery@example.com",
    "phoneNumber": "+1234567890",
    "phoneNumber2": "+0987654321",
    "profileImage": "uploads/delivery-partners/profile-123.jpg",
    "address": "123 Main Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "zipCode": "400001",
    "latitude": 19.0760,
    "longitude": 72.8777,
    "isActive": true,
    "isVerified": true,
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T15:45:00.000Z",
    "DeliveryBankDetail": {
      "id": 1,
      "accountHolder": "John Delivery",
      "accountNumber": "1234567890123456",
      "ifscCode": "SBIN0001234",
      "bankName": "State Bank of India",
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z"
    },
    "DeliveryWallet": {
      "id": 1,
      "balance": 2500.50,
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T16:20:00.000Z"
    }
  }
}
```

#### Error Responses

**401 Unauthorized**
```json
{
  "error": "Unauthorized: Delivery partner ID missing"
}
```

**404 Not Found**
```json
{
  "error": "Delivery partner not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal server error"
}
```

### Response Fields Description

#### Main Profile Fields
- `id`: Unique delivery partner identifier
- `name`: Full name of the delivery partner
- `email`: Email address (unique)
- `phoneNumber`: Primary phone number (unique)
- `phoneNumber2`: Secondary phone number (optional)
- `profileImage`: URL/path to profile image
- `address`: Residential address
- `city`: City name
- `state`: State/province
- `zipCode`: Postal code
- `latitude`: GPS latitude coordinate
- `longitude`: GPS longitude coordinate
- `isActive`: Account active status
- `isVerified`: Verification status by admin
- `createdAt`: Account creation timestamp
- `updatedAt`: Last profile update timestamp

#### Bank Details (`DeliveryBankDetail`)
- `id`: Bank detail record ID
- `accountHolder`: Account holder name
- `accountNumber`: Bank account number
- `ifscCode`: Bank IFSC code
- `bankName`: Name of the bank
- `createdAt`: Bank detail creation timestamp
- `updatedAt`: Last bank detail update timestamp

**Note**: Bank details will be `null` if not yet provided by the delivery partner.

#### Wallet Information (`DeliveryWallet`)
- `id`: Wallet record ID
- `balance`: Current wallet balance in currency units
- `createdAt`: Wallet creation timestamp
- `updatedAt`: Last wallet transaction timestamp

### Usage Notes

1. **Authentication Required**: This endpoint requires a valid JWT token for a delivery partner.
2. **Complete Profile**: Returns comprehensive profile information including related bank and wallet data.
3. **Privacy**: Sensitive information like password is excluded from the response.
4. **Optional Fields**: Some fields like `phoneNumber2`, `address`, `profileImage` may be null if not provided.
5. **Related Data**: Bank details and wallet information are included via database relations.

### Integration Example

```javascript
// Frontend JavaScript example
const getDeliveryProfile = async () => {
  try {
    const token = localStorage.getItem('deliveryPartnerToken');
    const response = await fetch('/api/delivery/get-profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Profile data:', data.data);
      return data.data;
    } else {
      throw new Error(data.error || 'Failed to fetch profile');
    }
  } catch (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }
};
```