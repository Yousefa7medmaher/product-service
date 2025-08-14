/**
 * Centralized Error Handler Middleware
 * Handles all errors in the application with proper HTTP status codes
 * and detailed error responses for development/production environments
 */

/**
 * Get appropriate HTTP status code based on error type
 * @param {Error} error - The error object
 * @returns {number} HTTP status code
 */
function getStatusCode(error) {
    // MongoDB/Mongoose errors
    if (error.name === 'ValidationError') return 400;
    if (error.name === 'CastError') return 400;
    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        if (error.code === 11000) return 409; // Duplicate key error
        return 500;
    }

    // Multer errors (file upload)
    if (error.code === 'LIMIT_FILE_SIZE') return 413; // Payload too large
    if (error.code === 'LIMIT_FILE_COUNT') return 400;
    if (error.code === 'LIMIT_UNEXPECTED_FILE') return 400;

    // JWT errors (if using authentication)
    if (error.name === 'JsonWebTokenError') return 401;
    if (error.name === 'TokenExpiredError') return 401;

    // Custom application errors
    if (error.statusCode) return error.statusCode;
    if (error.status) return error.status;

    // Default to 500 for unknown errors
    return 500;
}

/**
 * Format error message based on error type
 * @param {Error} error - The error object
 * @returns {string} Formatted error message
 */
function getErrorMessage(error) {
    // MongoDB/Mongoose validation errors
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => err.message);
        return `Validation Error: ${messages.join(', ')}`;
    }

    // MongoDB cast errors (invalid ObjectId, etc.)
    if (error.name === 'CastError') {
        return `Invalid ${error.path}: ${error.value}`;
    }

    // MongoDB duplicate key errors
    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return `${field} already exists`;
        }
    }

    // Multer file upload errors
    if (error.code === 'LIMIT_FILE_SIZE') {
        return 'File size too large. Maximum size allowed is 5MB per file.';
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
        return 'Too many files. Maximum 5 files allowed.';
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return 'Unexpected file field. Only "images" field is allowed.';
    }

    // JWT errors
    if (error.name === 'JsonWebTokenError') {
        return 'Invalid token';
    }
    if (error.name === 'TokenExpiredError') {
        return 'Token expired';
    }

    // Return original message or default
    return error.message || 'Internal Server Error';
}

/**
 * Main error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export default function errorHandler(err, req, res, next) {
    // Log error details
    console.error('=== ERROR HANDLER ===');
    console.error('Time:', new Date().toISOString());
    console.error('Method:', req.method);
    console.error('URL:', req.originalUrl);
    console.error('IP:', req.ip);
    console.error('User Agent:', req.get('User-Agent'));
    console.error('Error Name:', err.name);
    console.error('Error Message:', err.message);
    console.error('Stack Trace:', err.stack);
    console.error('=====================');

    // Don't send error if response was already sent
    if (res.headersSent) {
        return next(err);
    }

    const statusCode = getStatusCode(err);
    const message = getErrorMessage(err);

    // Prepare error response
    const errorResponse = {
        success: false,
        error: {
            message,
            statusCode,
            timestamp: new Date().toISOString(),
            path: req.originalUrl,
            method: req.method
        }
    };

    // Add additional error details in development environment
    if (process.env.NODE_ENV === 'development') {
        errorResponse.error.stack = err.stack;
        errorResponse.error.name = err.name;

        // Add validation details for ValidationError
        if (err.name === 'ValidationError') {
            errorResponse.error.validationErrors = Object.values(err.errors).map(error => ({
                field: error.path,
                message: error.message,
                value: error.value
            }));
        }

        // Add MongoDB error details
        if (err.name === 'MongoError' || err.name === 'MongoServerError') {
            errorResponse.error.mongoError = {
                code: err.code,
                codeName: err.codeName
            };
        }
    }

    // Send error response
    res.status(statusCode).json(errorResponse);
}

/**
 * 404 Not Found handler
 * Should be used after all routes are defined
 */
export function notFoundHandler(req, res) {
    const errorResponse = {
        success: false,
        error: {
            message: `Route ${req.originalUrl} not found`,
            statusCode: 404,
            timestamp: new Date().toISOString(),
            path: req.originalUrl,
            method: req.method
        }
    };

    console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json(errorResponse);
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors automatically
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 */
export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}