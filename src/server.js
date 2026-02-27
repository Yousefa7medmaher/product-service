import 'dotenv/config';
import express from 'express';
import { connectDB } from '../config/db.config.js';
import { connectRedis } from '../config/redis.config.js';
import cors from 'cors';
import productRoutes from '../routes/product.route.js';
import errorHandler from '../middleware/errorHandler.js';
import mongoose from 'mongoose';
import { redisClient } from '../config/redis.config.js';
/**
 * Products Service - E-commerce Microservice
 *
 * Features:
 * - Full CRUD operations for products
 * - Image upload with Cloudinary integration
 * - Redis caching for improved performance
 * - MongoDB with Mongoose ODM
 * - Production-ready error handling
 * - ES Modules support
 */

// Environment configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 4000;
const API_VERSION = 'v1';
let isReady = false;
console.log('=================================');
console.log('🚀 PRODUCTS SERVICE STARTING...');
console.log('=================================');
console.log(`Environment: ${NODE_ENV}`);
console.log(`Port: ${PORT}`);
console.log(`API Version: ${API_VERSION}`);
console.log('=================================');

/**
 * Initialize database connections
 */
async function initializeConnections() {
    try {
        console.log('📡 Initializing connections...');

        // Connect to MongoDB
        await connectDB();

        // Connect to Redis
        await connectRedis();
        isReady = true ; 
        console.log('✅ All connections established successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize connections:', error);
        return false;
    }
}

/**
 * Configure Express application
 */
function configureApp() {
    const app = express();

    // Trust proxy for accurate IP addresses (important for production)
    app.set('trust proxy', 1);

    // Security middleware
    app.use(cors({
        origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Body parsing middleware
    app.use(express.json({
        limit: '10mb', // Increase limit for base64 images if needed
        strict: true
    }));
    app.use(express.urlencoded({
        extended: true,
        limit: '10mb'
    }));

    // Request logging middleware (development only)
    if (NODE_ENV === 'development') {
        app.use((req, _res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
            next();
        });
    }

    // Health check endpoint
    app.get('/health', (_req, res) => {
        res.status(200).json({
            success: true,
            message: 'Products Service is healthy',
            timestamp: new Date().toISOString(),
            environment: NODE_ENV,
            version: API_VERSION
        });
    });
    app.get('/ready', async (_req, res) => {
        try {
            const mongoReady = mongoose.connection.readyState === 1;
            const redisReady = redisClient.isOpen === true;

            if (!isReady || !mongoReady || !redisReady) {
                return res.status(503).json({
                    status: 'not_ready',
                    mongo: mongoReady,
                    redis: redisReady
                });
            }

            return res.status(200).json({
                status: 'ready'
            });
        } catch (error) {
            return res.status(503).json({
                status: 'not_ready',
                error: error.message
            });
        }
    });
    // API info endpoint
    app.get('/api', (_req, res) => {
        res.status(200).json({
            success: true,
            message: 'Products Service API',
            version: API_VERSION,
            endpoints: {
                products: '/api/products',
                health: '/health'
            },
            documentation: 'https://api-docs.example.com' // Replace with actual docs URL
        });
    });

    // API routes
    app.use('/api/products', productRoutes);

    // 404 handler for undefined routes
    // app.all('*', notFoundHandler);

    // Global error handling middleware (must be last)
    app.use(errorHandler);

    return app;
}

/**
 * Graceful shutdown handler
 */
function setupGracefulShutdown(server) {
    const shutdown = (signal) => {
        console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
        isReady = false; 
        server.close((err) => {
            if (err) {
                console.error('❌ Error during server shutdown:', err);
                process.exit(1);
            }

            console.log('✅ HTTP server closed');

            // Close database connections
            import('mongoose').then(mongoose => {
                if (mongoose.connection.readyState !== 0) {
                    mongoose.connection.close(() => {
                        console.log('✅ MongoDB connection closed');
                        process.exit(0);
                    });
                } else {
                    console.log('✅ MongoDB connection already closed');
                    process.exit(0);
                }
            }).catch(() => {
                console.log('✅ Shutdown complete');
                process.exit(0);
            });
        });

        // Force shutdown after 30 seconds
        setTimeout(() => {
            console.error('❌ Forced shutdown after timeout');
            process.exit(1);
        }, 30000);
    };

    // Listen for termination signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
        console.error('❌ Uncaught Exception:', error);
        shutdown('UNCAUGHT_EXCEPTION');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
        console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
        shutdown('UNHANDLED_REJECTION');
    });
}

/**
 * Start the server
 */
async function startServer() {
    try {
        // Initialize connections first
        const connectionsReady = await initializeConnections();
        if (!connectionsReady) {
            console.error('❌ Failed to start server due to connection issues');
            process.exit(1);
        }

        // Configure Express app
        const app = configureApp();

        // Start HTTP server
        const server = app.listen(PORT, () => {
            console.log('=================================');
            console.log('🎉 PRODUCTS SERVICE READY!');
            console.log('=================================');
            console.log(`🌐 Server running on: http://localhost:${PORT}`);
            console.log(`📋 Health check: http://localhost:${PORT}/health`);
            console.log(`📚 API info: http://localhost:${PORT}/api`);
            console.log(`🛍️  Products API: http://localhost:${PORT}/api/products`);
            console.log('=================================');

            if (NODE_ENV === 'development') {
                console.log('🔧 Development mode - detailed logging enabled');
                console.log('=================================');
            }
        });

        // Setup graceful shutdown
        setupGracefulShutdown(server);

        return server;
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer().catch((error) => {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
});
