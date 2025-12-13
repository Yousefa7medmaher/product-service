import express from 'express';
import productController from '../controllers/product.controller.js';
import upload, { logFileUpload } from '../middleware/multer.middleware.js';
import { authenticateRole } from '../middleware/auth.middleware.js';

const router = express.Router();

// Search products (must be before /:id route to avoid conflicts)
router.get('/search', productController.searchProducts);

// Create product with image upload - protected (admin only)
router.post('/',
    authenticateRole(['admin']),
    upload.array('images', 10),
    logFileUpload,
    productController.createProduct
);

// Get all products with optional filtering and pagination - public
router.get('/', productController.getProducts);

// Get single product by ID - public
router.get('/:id', productController.getProductById);

// Update product with optional new images - protected (admin only)
router.put('/:id',
    authenticateRole(['admin']),
    upload.array('images', 10),
    logFileUpload,
    productController.updateProduct
);

// Delete product - protected (admin only)
router.delete('/:id',
    authenticateRole(['admin']),
    productController.deleteProduct
);


// **Stock management routes** - protected (admin only)
router.patch('/:id/increase-stock',
    authenticateRole(['admin']),
    productController.increaseStock
);

router.patch('/:id/decrease-stock',
    authenticateRole(['admin']),
    productController.decreaseStock
);


export default router;
