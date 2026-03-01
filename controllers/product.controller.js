import productService from '../services/productService.js';
import cache from '../utils/cache.js';
import response from '../utils/response.util.js';

/**
 * Product Controller - Handles HTTP requests for product operations
 * Includes Redis caching for improved performance
 */

/**
 * Generate cache key for products list with query parameters
 * @param {Object} query - Query parameters
 * @returns {string} Cache key
 */
function generateProductsCacheKey(query = {}) {
    const { limit = 50, skip = 0, sort = 'createdAt:-1' } = query;
    return `products:${limit}:${skip}:${sort}`;
}

/**
 * Invalidate related cache entries
 * @param {string} productId - Product ID to invalidate cache for
 */
async function invalidateProductCache(productId) {
    try {
        // Delete specific product cache
        await cache.del(`product:${productId}`);

        // Delete products list cache (we could be more sophisticated here)
        const keys = await cache.getKeys('products:*');
        if (keys && keys.length > 0) {
            await Promise.all(keys.map(key => cache.del(key)));
        }
    } catch (error) {
        console.error('Error invalidating cache:', error);
        // Don't throw error as cache invalidation failure shouldn't break the request
    }
}

const ProductController = {
    /**
     * Create a new product
     * POST /api/products
     */
    async createProduct(req, res, next) {
        try {
            console.log('Creating new product...');

            const product = await productService.createProduct(req.body, req.files);

            // Invalidate products list cache
            await invalidateProductCache();

            console.log(`Product created successfully: ${product.id}`);
            return response.success(res, product, 201);
        } catch (error) {
            console.error('Error in createProduct controller:', error);

            // Handle specific validation errors
            if (error.name === 'ValidationError') {
                return response.error(res, `Validation Error: ${error.message}`, 400);
            }

            // Handle specific business logic errors
            if (error.message.includes('required fields') ||
                error.message.includes('positive number') ||
                error.message.includes('Maximum 10 images')) {
                return response.error(res, error.message, 400);
            }

            next(error);
        }
    },

    /**
     * Get all products with optional filtering and pagination
     * GET /api/products
     */
    async getProducts(req, res, next) {
        try {
            console.log('Fetching products...');

            // Extract query parameters
            const {
                limit = 50,
                skip = 0,
                sort = 'createdAt:-1',
                search,
                minPrice,
                maxPrice
            } = req.query;

            // Generate cache key based on query parameters
            const cacheKey = generateProductsCacheKey(req.query);

            // Try to get from cache first
            const cached = await cache.get(cacheKey);
            if (cached) {
                console.log('Returning cached products');
                return response.success(res, JSON.parse(cached));
            }

            let products;

            // Handle different query types
            if (search) {
                products = await productService.searchProducts(search, { limit, skip });
            } else if (minPrice !== undefined || maxPrice !== undefined) {
                const min = minPrice ? Number(minPrice) : 0;
                const max = maxPrice ? Number(maxPrice) : Number.MAX_SAFE_INTEGER;
                products = await productService.getProductsByPriceRange(min, max, { limit, skip });
            } else {
                // Parse sort parameter
                const sortObj = {};
                const [field, order] = sort.split(':');
                sortObj[field] = order === 'desc' || order === '-1' ? -1 : 1;

                products = await productService.getProducts({
                    limit: Number(limit),
                    skip: Number(skip),
                    sort: sortObj
                });
            }

            // Cache the results
            await cache.set(cacheKey, JSON.stringify(products), 300); // 5 minutes TTL

            console.log(`Fetched ${products.length} products`);
            return response.success(res, products);
        } catch (error) {
            console.error('Error in getProducts controller:', error);
            next(error);
        }
    },

    /**
     * Get single product by ID
     * GET /api/products/:id
     */
    async getProductById(req, res, next) {
        try {
            const { id } = req.params;
            console.log(`Fetching product by ID: ${id}`);

            // Try cache first
            const cacheKey = `product:${id}`;
            const cached = await cache.get(cacheKey);
            if (cached) {
                console.log('Returning cached product');
                return response.success(res, JSON.parse(cached));
            }

            const product = await productService.getProductById(id);

            if (!product) {
                console.log(`Product not found: ${id}`);
                return response.notFound(res, 'Product not found');
            }

            // Cache the product
            await cache.set(cacheKey, JSON.stringify(product), 600); // 10 minutes TTL

            console.log(`Product fetched successfully: ${id}`);
            return response.success(res, product);
        } catch (error) {
            console.error('Error in getProductById controller:', error);

            // Handle invalid ID format
            if (error.message === 'Invalid product ID format') {
                return response.error(res, 'Invalid product ID format', 400);
            }

            next(error);
        }
    },

    /**
     * Update product
     * PUT /api/products/:id
     */
    async updateProduct(req, res, next) {
        try {
            const { id } = req.params;
            console.log(`Updating product: ${id}`);

            const product = await productService.updateProduct(id, req.body, req.files);

            if (!product) {
                console.log(`Product not found for update: ${id}`);
                return response.notFound(res, 'Product not found');
            }

            // Invalidate cache
            await invalidateProductCache(id);

            console.log(`Product updated successfully: ${id}`);
            return response.success(res, product);
        } catch (error) {
            console.error('Error in updateProduct controller:', error);

            // Handle specific validation errors
            if (error.name === 'ValidationError') {
                return response.error(res, `Validation Error: ${error.message}`, 400);
            }

            // Handle specific business logic errors
            if (error.message === 'Invalid product ID format' ||
                error.message.includes('positive number') ||
                error.message.includes('Maximum 10 images')) {
                return response.error(res, error.message, 400);
            }

            next(error);
        }
    },

    /**
     * Delete product
     * DELETE /api/products/:id
     */
    async deleteProduct(req, res, next) {
        try {
            const { id } = req.params;
            console.log(`Deleting product: ${id}`);

            const deleted = await productService.deleteProduct(id);

            if (!deleted) {
                console.log(`Product not found for deletion: ${id}`);
                return response.notFound(res, 'Product not found');
            }

            // Invalidate cache
            await invalidateProductCache(id);

            console.log(`Product deleted successfully: ${id}`);
            return response.success(res, {
                message: 'Product deleted successfully',
                deletedProduct: deleted
            });
        } catch (error) {
            console.error('Error in deleteProduct controller:', error);

            // Handle invalid ID format
            if (error.message === 'Invalid product ID format') {
                return response.error(res, 'Invalid product ID format', 400);
            }

            next(error);
        }
    },

    /**
     * Search products
     * GET /api/products/search?q=searchTerm
     */
    async searchProducts(req, res, next) {
        try {
            const { q: searchTerm, limit = 20, skip = 0 } = req.query;

            if (!searchTerm || searchTerm.trim().length === 0) {
                return response.error(res, 'Search term is required', 400);
            }

            console.log(`Searching products for: ${searchTerm}`);

            const cacheKey = `search:${searchTerm}:${limit}:${skip}`;
            const cached = await cache.get(cacheKey);
            if (cached) {
                console.log('Returning cached search results');
                return response.success(res, JSON.parse(cached));
            }

            const products = await productService.searchProducts(searchTerm, { limit, skip });

            // Cache search results for shorter time
            await cache.set(cacheKey, JSON.stringify(products), 180); // 3 minutes TTL

            console.log(`Found ${products.length} products for search: ${searchTerm}`);
            return response.success(res, products);
        } catch (error) {
            console.error('Error in searchProducts controller:', error);
            next(error);
        }
    },
    /**
     * Increase stock of a product
     * PATCH /api/products/:id/increase-stock
     * Body: { quantity: number }
     */

    async increaseStock(req, res, next) {
        try {
            const { id } = req.params;
            const { quantity } = req.body;

            if (!quantity || isNaN(quantity) || quantity <= 0) {
                return response.error(res, 'Quantity must be a positive number', 400);
            }

            const product = await productService.increaseStock(id, Number(quantity));

            if (!product) {
                return response.notFound(res, 'Product not found');
            }

            // Invalidate cache for this product
            await invalidateProductCache(id);

            return response.success(res, product, 200);
        } catch (error) {
            console.error('Error increasing stock:', error);
            if (error.message === 'Invalid product ID') {
                return response.error(res, 'Invalid product ID', 400);
            }
            next(error);
        }
    },

    /**
     * Decrease stock of a product
     * PATCH /api/products/:id/decrease-stock
     * Body: { quantity: number }
     */
    async decreaseStock(req, res, next) {
        try {
            const { id } = req.params;
            const { quantity } = req.body;

            if (!quantity || isNaN(quantity) || quantity <= 0) {
                return response.error(res, 'Quantity must be a positive number', 400);
            }

            const product = await productService.decreaseStock(id, Number(quantity));

            if (!product) {
                return response.notFound(res, 'Product not found');
            }

            // Invalidate cache for this product
            await invalidateProductCache(id);

            return response.success(res, product, 200);
        } catch (error) {
            console.error('Error decreasing stock:', error);
            if (error.message === 'Invalid product ID') {
                return response.error(res, 'Invalid product ID', 400);
            }
            if (error.message === 'Insufficient stock') {
                return response.error(res, 'Insufficient stock', 400);
            }
            next(error);
        }
    }
    
};



export default ProductController;
