import multer from 'multer';
import path from 'path';

/**
 * Multer Middleware for Image Upload
 * Handles file validation, size limits, and type restrictions
 */

// Allowed image MIME types
const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif'
];

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

// File size limits
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file
const MAX_FILES = 10; // Maximum number of files

/**
 * File filter function to validate uploaded files
 * @param {Object} req - Express request object
 * @param {Object} file - Multer file object
 * @param {Function} cb - Callback function
 */
function fileFilter(_req, file, cb) {
    try {
        // Check MIME type
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            const error = new Error(`Invalid file type. Only ${ALLOWED_MIME_TYPES.join(', ')} are allowed.`);
            error.code = 'INVALID_FILE_TYPE';
            return cb(error, false);
        }

        // Check file extension
        const fileExtension = path.extname(file.originalname).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
            const error = new Error(`Invalid file extension. Only ${ALLOWED_EXTENSIONS.join(', ')} are allowed.`);
            error.code = 'INVALID_FILE_EXTENSION';
            return cb(error, false);
        }

        // Validate filename (basic security check)
        if (!file.originalname || file.originalname.length > 255) {
            const error = new Error('Invalid filename');
            error.code = 'INVALID_FILENAME';
            return cb(error, false);
        }

        // Check for potentially dangerous filenames
        const dangerousPatterns = [
            /\.\./,  // Directory traversal
            /[<>:"|?*]/,  // Invalid characters
            /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i  // Reserved names on Windows
        ];

        if (dangerousPatterns.some(pattern => pattern.test(file.originalname))) {
            const error = new Error('Filename contains invalid characters');
            error.code = 'DANGEROUS_FILENAME';
            return cb(error, false);
        }

        console.log(`File validation passed: ${file.originalname} (${file.mimetype})`);
        cb(null, true);
    } catch (error) {
        console.error('Error in file filter:', error);
        cb(error, false);
    }
}

/**
 * Configure multer storage (using memory storage for Cloudinary upload)
 */
const storage = multer.memoryStorage();

/**
 * Multer configuration
 */
const upload = multer({
    storage: storage,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: MAX_FILES,
        fields: 10, // Maximum number of non-file fields
        fieldNameSize: 100, // Maximum field name size
        fieldSize: 1024 * 1024, // Maximum field value size (1MB)
        headerPairs: 2000 // Maximum number of header key-value pairs
    },
    fileFilter: fileFilter,
    preservePath: false // Don't preserve the full path of files
});

/**
 * Error handler for multer errors
 * @param {Error} error - Multer error
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export function handleMulterError(error, _req, res, next) {
    if (error instanceof multer.MulterError) {
        console.error('Multer Error:', error);

        let message = 'File upload error';
        let statusCode = 400;

        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                message = `File too large. Maximum size allowed is ${MAX_FILE_SIZE / (1024 * 1024)}MB per file.`;
                statusCode = 413;
                break;
            case 'LIMIT_FILE_COUNT':
                message = `Too many files. Maximum ${MAX_FILES} files allowed.`;
                break;
            case 'LIMIT_FIELD_COUNT':
                message = 'Too many fields in the request.';
                break;
            case 'LIMIT_FIELD_KEY':
                message = 'Field name too long.';
                break;
            case 'LIMIT_FIELD_VALUE':
                message = 'Field value too long.';
                break;
            case 'LIMIT_UNEXPECTED_FILE':
                message = 'Unexpected file field. Only "images" field is allowed for file uploads.';
                break;
            default:
                message = error.message || 'File upload error';
        }

        return res.status(statusCode).json({
            success: false,
            error: {
                message,
                code: error.code,
                statusCode,
                timestamp: new Date().toISOString()
            }
        });
    }

    // Handle custom file filter errors
    if (error.code && ['INVALID_FILE_TYPE', 'INVALID_FILE_EXTENSION', 'INVALID_FILENAME', 'DANGEROUS_FILENAME'].includes(error.code)) {
        console.error('File Filter Error:', error);
        return res.status(400).json({
            success: false,
            error: {
                message: error.message,
                code: error.code,
                statusCode: 400,
                timestamp: new Date().toISOString()
            }
        });
    }

    // Pass other errors to the global error handler
    next(error);
}

/**
 * Middleware to validate that at least one file is uploaded (optional)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export function requireFiles(req, res, next) {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({
            success: false,
            error: {
                message: 'At least one image file is required',
                statusCode: 400,
                timestamp: new Date().toISOString()
            }
        });
    }
    next();
}

/**
 * Middleware to log file upload information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export function logFileUpload(req, _res, next) {
    if (req.files && req.files.length > 0) {
        console.log(`File upload: ${req.files.length} files received`);
        req.files.forEach((file, index) => {
            console.log(`  File ${index + 1}: ${file.originalname} (${file.mimetype}, ${(file.size / 1024).toFixed(2)}KB)`);
        });
    }
    next();
}

// Export the configured upload middleware
export default upload;
