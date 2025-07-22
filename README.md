# Massachusetts Real Estate Backend API

A comprehensive backend API for Massachusetts real estate listings with IDX (Internet Data Exchange) integration. This API provides endpoints for searching properties, market analytics, and real estate data management specifically for the Massachusetts market.

## Features

- 🏠 **IDX Integration** - Direct connection to MLS data via IDX Broker API
- 🔍 **Advanced Search** - Filter by price, location, property type, and more
- 📊 **Market Analytics** - Price trends, market statistics, and distribution analysis
- ⚡ **Caching** - Intelligent caching for improved performance
- 🛡️ **Security** - Rate limiting, CORS protection, and security headers
- 📍 **Massachusetts Focus** - Optimized for Massachusetts real estate market
- 🚀 **High Performance** - Compression, request optimization, and error handling

## Quick Start

### Prerequisites

- Node.js 16+ and npm 8+
- IDX Broker account and API credentials
- Massachusetts MLS access (through IDX provider)

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd brandon-re
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your IDX credentials:
   ```env
   IDX_API_KEY=your_idx_api_key_here
   IDX_PARTNER_KEY=your_idx_partner_key_here
   PORT=3001
   ```

3. **Start the server:**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

4. **Verify installation:**
   ```bash
   curl http://localhost:3001/api/health
   ```

## API Endpoints

### Listings

#### Get All Listings
```http
GET /api/listings
```

**Query Parameters:**
- `page` (number) - Page number (default: 1)
- `limit` (number) - Items per page (default: 20)
- `city` (string) - Massachusetts city name
- `minPrice` (number) - Minimum price
- `maxPrice` (number) - Maximum price
- `propertyType` (string) - Property type (sfr, cnd, twn, etc.)
- `bedrooms` (number) - Number of bedrooms
- `bathrooms` (number) - Number of bathrooms
- `sqftMin` (number) - Minimum square footage
- `sqftMax` (number) - Maximum square footage

**Example:**
```bash
curl "http://localhost:3001/api/listings?city=Boston&minPrice=500000&maxPrice=1000000&bedrooms=3"
```

#### Get Single Listing
```http
GET /api/listings/:mlsId
```

**Example:**
```bash
curl "http://localhost:3001/api/listings/12345678"
```

#### Advanced Search
```http
POST /api/listings/search
```

**Request Body:**
```json
{
  "city": "Cambridge",
  "minPrice": 600000,
  "maxPrice": 1200000,
  "bedrooms": 2,
  "bathrooms": 2,
  "propertyType": "cnd",
  "hasPool": true,
  "waterfront": false,
  "keywords": "downtown"
}
```

#### Get Featured Listings
```http
GET /api/listings/featured/all
```

#### Get Nearby Listings
```http
GET /api/listings/nearby/:latitude/:longitude
```

**Query Parameters:**
- `radius` (number) - Search radius in miles (default: 5)

**Example:**
```bash
curl "http://localhost:3001/api/listings/nearby/42.3601/-71.0589?radius=10"
```

### Market Data

#### Get Market Statistics
```http
GET /api/market/stats
```

**Query Parameters:**
- `city` (string) - Specific city (optional)

#### Get Massachusetts Cities
```http
GET /api/market/cities
```

#### Get Property Types
```http
GET /api/market/property-types
```

#### Get Market Trends
```http
GET /api/market/trends
```

**Query Parameters:**
- `city` (string) - Specific city
- `propertyType` (string) - Property type
- `period` (number) - Days back for analysis (default: 90)

#### Get Price Distribution
```http
GET /api/market/price-distribution
```

### Administration

#### Health Check
```http
GET /api/admin/health
```

#### Cache Management
```http
GET /api/admin/cache/stats
POST /api/admin/cache/clear
POST /api/admin/cache/refresh/:type
```

#### Test IDX Connection
```http
GET /api/admin/test/idx-connection
```

## Response Format

All API responses follow this structure:

```json
{
  "success": true,
  "data": {},
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 200,
    "hasNext": true,
    "hasPrev": false
  },
  "message": "Optional message"
}
```

## Error Handling

Error responses include:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (development only)"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (invalid API key)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error
- `503` - Service Unavailable (IDX API issues)

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3001 |
| `NODE_ENV` | Environment | development |
| `IDX_API_URL` | IDX API base URL | https://api.idxbroker.com |
| `IDX_API_KEY` | IDX API access key | Required |
| `IDX_PARTNER_KEY` | IDX partner key | Required |
| `CORS_ORIGIN` | Allowed CORS origin | http://localhost:3000 |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | 900000 (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 |

### Property Types

- `sfr` - Single Family Residential
- `cnd` - Condominium
- `twn` - Townhouse
- `mfr` - Multi-Family Residential
- `lnd` - Land
- `com` - Commercial
- `rnl` - Rental

### Massachusetts Cities

Supported major cities include:
- Boston, Cambridge, Somerville
- Worcester, Springfield, Lowell
- Newton, Brookline, Quincy
- And 40+ additional cities

## Performance

### Caching Strategy

- **Listings Cache**: 5 minutes TTL
- **Cities Cache**: 1 hour TTL
- **Market Stats Cache**: 30 minutes TTL

### Rate Limiting

- **General API**: 100 requests per 15 minutes
- **Search Endpoints**: 50 requests per 15 minutes

## Development

### Scripts

```bash
npm run dev      # Start development server with nodemon
npm start        # Start production server
npm test         # Run tests
npm run lint     # Run ESLint
```

### Project Structure

```
├── server.js              # Main application entry
├── middleware/            # Custom middleware
│   └── index.js
├── routes/               # API route handlers
│   ├── listings.js
│   ├── market.js
│   └── admin.js
├── services/             # Business logic
│   └── idxService.js
├── utils/                # Helper functions
│   └── helpers.js
├── package.json
├── .env.example
└── README.md
```

## IDX Integration

### Getting IDX Credentials

1. Sign up with an IDX Broker provider
2. Get MLS access for Massachusetts
3. Obtain API key and partner key from IDX dashboard
4. Configure webhook endpoints (optional)

### Supported IDX Endpoints

- `/clients/search` - Property search
- `/clients/listing/{id}` - Single listing
- `/clients/featured` - Featured listings
- `/clients/cities` - Available cities
- `/clients/sold` - Sold properties
- `/clients/marketstatistics` - Market data

## Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure production IDX credentials
- [ ] Set up SSL/HTTPS
- [ ] Configure reverse proxy (nginx)
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Set up CI/CD pipeline

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## Support

For issues and questions:

1. Check the API documentation
2. Verify IDX credentials and MLS access
3. Review server logs for errors
4. Test IDX connection via admin endpoints

## License

MIT License - see LICENSE file for details.

---

**Built for Massachusetts Real Estate Market** 🏠🦞