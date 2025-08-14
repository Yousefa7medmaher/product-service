import mongoose from 'mongoose';

/**
 * Product Schema for E-commerce Microservice
 *
 * Fields:
 * - title: Product name/title (required)
 * - description: Product description (required)
 * - price: Product price in cents/smallest currency unit (required)
 * - images: Array of image URLs from Cloudinary
 * - createdAt: Timestamp when product was created
 * - updatedAt: Timestamp when product was last updated
 */
const productSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Product title is required'],
        trim: true,
        minlength: [2, 'Title must be at least 2 characters long'],
        maxlength: [200, 'Title cannot exceed 200 characters'],
        index: true // For better search performance
    },
    description: {
        type: String,
        required: [true, 'Product description is required'],
        trim: true,
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    price: {
        type: Number,
        required: [true, 'Product price is required'],
        min: [0, 'Price cannot be negative'],
        validate: {
            validator: function(value) {
                return Number.isFinite(value) && value >= 0;
            },
            message: 'Price must be a valid positive number'
        }
    },
    images: {
        type: [String], // Array of image URLs from Cloudinary
        default: [],
        validate: {
            validator: function(images) {
                return images.length <= 10; // Maximum 10 images per product
            },
            message: 'Cannot have more than 10 images per product'
        }
    }
}, {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
    versionKey: false, // Disable __v field
    toJSON: {
        transform: function(_doc, ret) {
            // Clean up the response object
            ret.id = ret._id;
            delete ret._id;
            return ret;
        }
    }
});

// Indexes for better query performance
productSchema.index({ title: 'text', description: 'text' }); // Text search
productSchema.index({ price: 1 }); // Price range queries
productSchema.index({ createdAt: -1 }); // Sort by creation date

// Pre-save middleware to ensure data consistency
productSchema.pre('save', function(next) {
    // Ensure images array doesn't contain empty strings or invalid URLs
    if (this.images && this.images.length > 0) {
        this.images = this.images.filter(url => url && typeof url === 'string' && url.trim().length > 0);
    }
    next();
});

// Static methods for common queries
productSchema.statics.findByPriceRange = function(minPrice, maxPrice) {
    return this.find({
        price: { $gte: minPrice, $lte: maxPrice }
    }).sort({ createdAt: -1 });
};

productSchema.statics.searchByTitle = function(searchTerm) {
    return this.find({
        $text: { $search: searchTerm }
    }).sort({ score: { $meta: 'textScore' } });
};

// Instance methods
productSchema.methods.addImage = function(imageUrl) {
    if (this.images.length >= 10) {
        throw new Error('Cannot add more than 10 images per product');
    }
    this.images.push(imageUrl);
    return this.save();
};

productSchema.methods.removeImage = function(imageUrl) {
    this.images = this.images.filter(url => url !== imageUrl);
    return this.save();
};

const Product = mongoose.model('Product', productSchema);

export default Product;
