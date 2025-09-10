# Lunch Box Backend

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables:
   Copy `.env.example` to `.env` and update the values:
   ```
   PORT = 4000
   DATABASE_URL="mysql://root:pass@localhost:3306/tiffen_box"
   JWT_SECRET="Aniket@LunchBox@2025"
   GOOGLE_MAPS_API_KEY="your_google_maps_api_key_here"
   ```
4. Run database migrations:
   ```
   npx prisma migrate dev
   ```
5. Start the server:
   ```
   npm start
   ```

## API Documentation

API documentation is available via Swagger at `/api-docs` when the server is running.

## Environment Variables

- `PORT`: Server port (default: 4000)
- `DATABASE_URL`: MySQL database connection string
- `JWT_SECRET`: Secret key for JWT token generation
- `GOOGLE_MAPS_API_KEY`: API key for Google Maps Distance Matrix API

## Dependencies

- Node.js v18+
- MySQL database
- Google Maps API key (for distance calculation)