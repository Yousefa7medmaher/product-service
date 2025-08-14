import Product from '../models/product.model.js';
import cloudinary from '../config/cloudinary.config.js';
import mongoose from 'mongoose';

/**
 * Product Service - Handles all business logic for products
 * Includes Cloudinary image upload integration and proper error handling
 */

/**
 * Upload multiple images to Cloudinary
 * @param {Array} files - Array of multer file objects
 * @param {string} folder - Cloudinary folder name (optional)
 * @returns {Promise<Array>} Array of image URLs
 */
async function uploadImagesToCloudinary(files, folder = 'products') {
    if (!files || files.length === 0) return [];

    try {
        const uploadPromises = files.map(file => {
            return new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        resource_type: 'image',
                        folder: folder,
                        transformation: [
                            { width: 1000, height: 1000, crop: 'limit' }, // Limit max size
                            { quality: 'auto' }, // Auto optimize quality
                            { format: 'auto' } // Auto format (WebP when supported)
                        ]
                    },
                    (error, result) => {
                        if (error) {
                            console.error('Cloudinary upload error:', error);
                            reject(new Error(`Image upload failed: ${error.message}`));
                        } else {
                            resolve(result.secure_url);
                        }
                    }
                );
                uploadStream.end(file.buffer);
            });
        });

        const imageUrls = await Promise.all(uploadPromises);
        return imageUrls.filter(url => url); // Filter out any null/undefined URLs
    } catch (error) {
        console.error('Error uploading images to Cloudinary:', error);
        throw new Error('Failed to upload images. Please try again.');
    }
}

/**
 * Delete images from Cloudinary by extracting public_id from URL
 * @param {Array} imageUrls - Array of Cloudinary image URLs
 */
async function deleteImagesFromCloudinary(imageUrls) {
    if (!imageUrls || imageUrls.length === 0) return;

    try {
        const deletePromises = imageUrls.map(async (url) => {
            // Extract public_id from Cloudinary URL
            const publicId = url.split('/').slice(-2).join('/').split('.')[0];
            return cloudinary.uploader.destroy(publicId);
        });

        await Promise.all(deletePromises);
    } catch (error) {
        console.error('Error deleting images from Cloudinary:', error);
        // Don't throw error here as it's cleanup operation
    }
}

/**
 * Validate MongoDB ObjectId
 * @param {string} id - The ID to validate
 * @returns {boolean} True if valid ObjectId
 */
function isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
}

const productService = {
    /**
     * Create a new product with optional image uploads
     * @param {Object} data - Product data
     * @param {Array} files - Array of image files from multer
     * @returns {Promise<Object>} Created product
     */
    async createProduct(data, files) {
        try {
            // Validate required fields
            if (!data.title || !data.description || data.price === undefined) {
                throw new Error('Title, description, and price are required fields');
            }

            // Validate price
            if (typeof data.price !== 'number' || data.price < 0) {
                throw new Error('Price must be a positive number');
            }

            // Upload images to Cloudinary if provided
            let imageUrls = [];
            if (files && files.length > 0) {
                if (files.length > 10) {
                    throw new Error('Maximum 10 images allowed per product');
                }
                imageUrls = await uploadImagesToCloudinary(files);
            }

            // Create product with uploaded image URLs
            const productData = {
                ...data,
                images: imageUrls,
                price: Number(data.price) // Ensure price is a number
            };

            const product = new Product(productData);
            const savedProduct = await product.save();

            console.log(`Product created successfully: ${savedProduct.id}`);
            return savedProduct;
        } catch (error) {
            console.error('Error creating product:', error);

            // If product creation fails after images are uploaded, clean up images
            if (files && files.length > 0) {
                // This is a best-effort cleanup, don't await or throw if it fails
                uploadImagesToCloudinary(files).then(urls => {
                    if (urls.length > 0) {
                        deleteImagesFromCloudinary(urls).catch(console.error);
                    }
                }).catch(console.error);
            }

            throw error;
        }
    },

    /**
     * Get all products with optional filtering and pagination
     * @param {Object} options - Query options (limit, skip, sort, filter)
     * @returns {Promise<Array>} Array of products
     */
    async getProducts(options = {}) {
        try {
            const {
                limit = 50,
                skip = 0,
                sort = { createdAt: -1 },
                filter = {}
            } = options;

            const products = await Product
                .find(filter)
                .sort(sort)
                .limit(Number(limit))
                .skip(Number(skip))
                .lean(); // Use lean() for better performance when not modifying documents

            return products;
        } catch (error) {
            console.error('Error fetching products:', error);
            throw new Error('Failed to fetch products');
        }
    },

    /**
     * Get a single product by ID
     * @param {string} id - Product ID
     * @returns {Promise<Object|null>} Product or null if not found
     */
    async getProductById(id) {
        try {
            if (!isValidObjectId(id)) {
                throw new Error('Invalid product ID format');
            }

            const product = await Product.findById(id).lean();
            return product;
        } catch (error) {
            console.error('Error fetching product by ID:', error);
            if (error.message === 'Invalid product ID format') {
                throw error;
            }
            throw new Error('Failed to fetch product');
        }
    },

    /**
     * Update a product with optional new images
     * @param {string} id - Product ID
     * @param {Object} data - Updated product data
     * @param {Array} files - New image files (optional)
     * @returns {Promise<Object|null>} Updated product or null if not found
     */
    async updateProduct(id, data, files) {
        try {
            if (!isValidObjectId(id)) {
                throw new Error('Invalid product ID format');
            }

            // Find existing product
            const existingProduct = await Product.findById(id);
            if (!existingProduct) {
                return null;
            }

            // Prepare update data
            const updateData = { ...data };

            // Validate price if provided
            if (data.price !== undefined) {
                if (typeof data.price !== 'number' || data.price < 0) {
                    throw new Error('Price must be a positive number');
                }
                updateData.price = Number(data.price);
            }

            // Handle image updates
            if (files && files.length > 0) {
                if (files.length > 10) {
                    throw new Error('Maximum 10 images allowed per product');
                }

                // Upload new images
                const newImageUrls = await uploadImagesToCloudinary(files);

                // Store old images for cleanup
                const oldImages = existingProduct.images || [];

                // Update with new images
                updateData.images = newImageUrls;

                // Clean up old images from Cloudinary (async, don't wait)
                if (oldImages.length > 0) {
                    deleteImagesFromCloudinary(oldImages).catch(console.error);
                }
            }

            const updatedProduct = await Product.findByIdAndUpdate(
                id,
                updateData,
                {
                    new: true, // Return updated document
                    runValidators: true // Run schema validators
                }
            );

            console.log(`Product updated successfully: ${updatedProduct.id}`);
            return updatedProduct;
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    },

    /**
     * Delete a product and its associated images
     * @param {string} id - Product ID
     * @returns {Promise<Object|null>} Deleted product or null if not found
     */
    async deleteProduct(id) {
        try {
            if (!isValidObjectId(id)) {
                throw new Error('Invalid product ID format');
            }

            const product = await Product.findByIdAndDelete(id);

            if (!product) {
                return null;
            }

            // Clean up images from Cloudinary (async, don't wait)
            if (product.images && product.images.length > 0) {
                deleteImagesFromCloudinary(product.images).catch(console.error);
            }

            console.log(`Product deleted successfully: ${product.id}`);
            return product;
        } catch (error) {
            console.error('Error deleting product:', error);
            throw error;
        }
    },

    /**
     * Search products by title or description
     * @param {string} searchTerm - Search term
     * @param {Object} options - Search options
     * @returns {Promise<Array>} Array of matching products
     */
    async searchProducts(searchTerm, options = {}) {
        try {
            const { limit = 20, skip = 0 } = options;

            const products = await Product
                .find({
                    $text: { $search: searchTerm }
                })
                .sort({ score: { $meta: 'textScore' } })
                .limit(Number(limit))
                .skip(Number(skip))
                .lean();

            return products;
        } catch (error) {
            console.error('Error searching products:', error);
            throw new Error('Failed to search products');
        }
    },

    /**
     * Get products by price range
     * @param {number} minPrice - Minimum price
     * @param {number} maxPrice - Maximum price
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Array of products in price range
     */
    async getProductsByPriceRange(minPrice, maxPrice, options = {}) {
        try {
            const { limit = 20, skip = 0 } = options;

            const products = await Product.findByPriceRange(minPrice, maxPrice)
                .limit(Number(limit))
                .skip(Number(skip))
                .lean();

            return products;
        } catch (error) {
            console.error('Error fetching products by price range:', error);
            throw new Error('Failed to fetch products by price range');
        }
    }
};

export default productService;
