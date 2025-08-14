# Products Service - E-commerce Microservice

A complete, production-ready Node.js microservice for managing products in an e-commerce system. Built with Express, MongoDB, Redis, and Cloudinary integration.

## 🚀 Features

- **Full CRUD Operations**: Create, Read, Update, Delete products
- **Image Upload**: Cloudinary integration for image storage and optimization
- **Redis Caching**: High-performance caching for improved response times
- **MongoDB Integration**: Robust data persistence with Mongoose ODM
- **ES Modules**: Modern JavaScript with import/export syntax
- **Production Ready**: Comprehensive error handling, logging, and graceful shutdown
- **Search Functionality**: Full-text search across product titles and descriptions
- **Input Validation**: Robust validation for all inputs and file uploads
- **Clean Architecture**: Separation of concerns with controllers, services, models

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or MongoDB Atlas)
- Redis (local or Redis Cloud)
- Cloudinary account for image uploads

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd products-service
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your environment variables in `.env`:
   ```env
   NODE_ENV=development
   PORT=3000
   MONGO_URI=mongodb://localhost:27017/products-service
   REDIS_URL=redis://127.0.0.1:6379
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

4. **Start the service**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Health Check
```http
GET /health
```

### Products Endpoints

#### Create Product
```http
POST /api/products
Content-Type: multipart/form-data

Form Data:
- title: string (required)
- description: string (required)
- price: number (required)
- images: file[] (optional, max 10 files, 5MB each)
```

#### Get All Products
```http
GET /api/products?limit=50&skip=0&sort=createdAt:-1
```

Query Parameters:
- `limit`: Number of products to return (default: 50)
- `skip`: Number of products to skip (default: 0)
- `sort`: Sort field and order (default: createdAt:-1)
- `minPrice`: Minimum price filter
- `maxPrice`: Maximum price filter

#### Get Product by ID
```http
GET /api/products/:id
```

#### Search Products
```http
GET /api/products/search?q=searchTerm&limit=20&skip=0
```

#### Update Product
```http
PUT /api/products/:id
Content-Type: multipart/form-data

Form Data:
- title: string (optional)
- description: string (optional)
- price: number (optional)
- images: file[] (optional, replaces existing images)
```

#### Delete Product
```http
DELETE /api/products/:id
```

## 🏗️ Architecture

```
src/
├── server.js              # Application entry point
├── config/
│   ├── db.config.js       # MongoDB configuration
│   ├── redis.config.js    # Redis configuration
│   └── cloudinary.config.js # Cloudinary configuration
├── models/
│   └── product.model.js   # Product data model
├── services/
│   └── productService.js  # Business logic layer
├── controllers/
│   └── product.controller.js # HTTP request handlers
├── routes/
│   └── product.route.js   # API route definitions
├── middleware/
│   ├── errorHandler.js    # Global error handling
│   └── multer.middleware.js # File upload handling
└── utils/
    ├── cache.js           # Redis cache utilities
    └── response.util.js   # Response formatting
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3000` |
| `MONGO_URI` | MongoDB connection string | Required |
| `REDIS_URL` | Redis connection string | `redis://127.0.0.1:6379` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Required |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Required |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Required |

## 🚦 Testing

### Manual Testing with cURL

1. **Health Check**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Create Product**
   ```bash
   curl -X POST http://localhost:3000/api/products \
     -H "Content-Type: application/json" \
     -d '{"title":"Test Product","description":"A test product","price":29.99}'
   ```

3. **Get All Products**
   ```bash
   curl http://localhost:3000/api/products
   ```

4. **Search Products**
   ```bash
   curl "http://localhost:3000/api/products/search?q=test"
   ```

## 🔒 Security Features

- Input validation and sanitization
- File type and size restrictions
- Dangerous filename detection
- CORS configuration
- Error message sanitization in production
- Graceful error handling

## 📊 Performance Features

- Redis caching with configurable TTL
- Database query optimization with indexes
- Lean queries for better performance
- Connection pooling
- Graceful shutdown handling

## 🐳 Docker Support

A Dockerfile is included for containerization:

```bash
docker build -t products-service .
docker run -p 3000:3000 --env-file .env products-service
```

## 📝 Logging

The service includes comprehensive logging:
- Request/response logging in development
- Error logging with stack traces
- Connection status logging
- Performance metrics logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 👨‍💻 Author

Yousef Ahmed Elazaly

---

**Note**: This is a production-ready microservice with comprehensive error handling, caching, and security features. Make sure to configure all environment variables properly before deployment.
