import Product from '../models/product.model.js';
import cloudinary from '../config/cloudinary.config.js';
import mongoose from 'mongoose';

/**
 * Product Service - Handles all business logic for products
 * Includes Cloudinary image upload integration and proper error handling
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
                            { width: 1000, height: 1000, crop: 'limit' },
                            { quality: 'auto' },
                            { format: 'auto' }
                        ]
                    },
                    (error, result) => {
                        if (error) reject(new Error(`Image upload failed: ${error.message}`));
                        else resolve(result.secure_url);
                    }
                );
                uploadStream.end(file.buffer);
            });
        });

        const imageUrls = await Promise.all(uploadPromises);
        return imageUrls.filter(url => url);
    } catch (error) {
        console.error('Error uploading images to Cloudinary:', error);
        throw new Error('Failed to upload images. Please try again.');
    }
}

async function deleteImagesFromCloudinary(imageUrls) {
    if (!imageUrls || imageUrls.length === 0) return;

    try {
        const deletePromises = imageUrls.map(async (url) => {
            const publicId = url.split('/').slice(-2).join('/').split('.')[0];
            return cloudinary.uploader.destroy(publicId);
        });
        await Promise.all(deletePromises);
    } catch (error) {
        console.error('Error deleting images from Cloudinary:', error);
    }
}

function isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
}

const productService = {
    // Create product
    async createProduct(data, files) {
        try {
            if (!data.title || !data.description || data.price === undefined) {
                throw new Error('Title, description, and price are required fields');
            }
            if (typeof data.price !== 'number' || data.price < 0) throw new Error('Price must be positive');

            const imageUrls = files && files.length > 0 ? await uploadImagesToCloudinary(files) : [];

            const productData = {
                ...data,
                images: imageUrls,
                price: Number(data.price),
                stock: data.stock !== undefined ? Number(data.stock) : 0
            };

            const product = new Product(productData);
            return await product.save();
        } catch (error) {
            console.error('Error creating product:', error);
            if (files && files.length > 0) deleteImagesFromCloudinary(await uploadImagesToCloudinary(files)).catch(console.error);
            throw error;
        }
    },

    async getProducts(options = {}) {
        const { limit = 50, skip = 0, sort = { createdAt: -1 }, filter = {} } = options;
        return Product.find(filter).sort(sort).limit(Number(limit)).skip(Number(skip)).lean();
    },

    async getProductById(id) {
        if (!isValidObjectId(id)) throw new Error('Invalid product ID format');
        return Product.findById(id).lean();
    },

    async updateProduct(id, data, files) {
        if (!isValidObjectId(id)) throw new Error('Invalid product ID format');
        const existingProduct = await Product.findById(id);
        if (!existingProduct) return null;

        const updateData = { ...data };
        if (data.price !== undefined) {
            if (typeof data.price !== 'number' || data.price < 0) throw new Error('Price must be positive');
            updateData.price = Number(data.price);
        }
        if (data.stock !== undefined) {
            if (!Number.isInteger(data.stock) || data.stock < 0) throw new Error('Stock must be a non-negative integer');
            updateData.stock = Number(data.stock);
        }

        if (files && files.length > 0) {
            if (files.length > 10) throw new Error('Maximum 10 images allowed per product');
            const newImageUrls = await uploadImagesToCloudinary(files);
            const oldImages = existingProduct.images || [];
            updateData.images = newImageUrls;
            if (oldImages.length > 0) deleteImagesFromCloudinary(oldImages).catch(console.error);
        }

        return Product.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    },

    async deleteProduct(id) {
        if (!isValidObjectId(id)) throw new Error('Invalid product ID format');
        const product = await Product.findByIdAndDelete(id);
        if (product && product.images && product.images.length > 0) deleteImagesFromCloudinary(product.images).catch(console.error);
        return product;
    },

    async searchProducts(searchTerm, options = {}) {
        const { limit = 20, skip = 0 } = options;
        return Product.find({ $text: { $search: searchTerm } })
            .sort({ score: { $meta: 'textScore' } })
            .limit(Number(limit))
            .skip(Number(skip))
            .lean();
    },

    async getProductsByPriceRange(minPrice, maxPrice, options = {}) {
        const { limit = 20, skip = 0 } = options;
        return Product.findByPriceRange(minPrice, maxPrice).limit(Number(limit)).skip(Number(skip)).lean();
    },

    // **Stock management**
    async increaseStock(productId, quantity) {
        if (!isValidObjectId(productId)) throw new Error('Invalid product ID');
        if (quantity <= 0) throw new Error('Quantity must be positive');

        const product = await Product.findById(productId);
        if (!product) throw new Error('Product not found');

        product.stock += quantity;
        return product.save();
    },

    async decreaseStock(productId, quantity) {
        if (!isValidObjectId(productId)) throw new Error('Invalid product ID');
        if (quantity <= 0) throw new Error('Quantity must be positive');

        const product = await Product.findById(productId);
        if (!product) throw new Error('Product not found');
        if (quantity > product.stock) throw new Error('Insufficient stock');

        product.stock -= quantity;
        return product.save();
    }
};

export default productService;
