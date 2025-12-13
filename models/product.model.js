import mongoose from 'mongoose';

/**
 * Product Schema for E-commerce Microservice
 *
 * Fields:
 * - title: Product name/title (required)
 * - description: Product description (required)
 * - price: Product price in cents/smallest currency unit (required)
 * - images: Array of image URLs from Cloudinary
 * - stock: Number of items available (required, default 0)
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
        index: true
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
        type: [String],
        default: [],
        validate: {
            validator: function(images) {
                return images.length <= 10;
            },
            message: 'Cannot have more than 10 images per product'
        }
    },
    stock: {
        type: Number,
        required: true,
        min: [0, 'Stock cannot be negative'],
        default: 0,
        validate: {
            validator: Number.isInteger,
            message: 'Stock must be an integer'
        }
    }
}, {
    timestamps: true,
    versionKey: false,
    toJSON: {
        transform: function(_doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            return ret;
        }
    }
});

// Indexes for better query performance
productSchema.index({ title: 'text', description: 'text' }); 
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });

// Pre-save middleware
productSchema.pre('save', function(next) {
    if (this.images && this.images.length > 0) {
        this.images = this.images.filter(url => url && typeof url === 'string' && url.trim().length > 0);
    }
    next();
});

// Static methods
productSchema.statics.findByPriceRange = function(minPrice, maxPrice) {
    return this.find({ price: { $gte: minPrice, $lte: maxPrice } }).sort({ createdAt: -1 });
};

productSchema.statics.searchByTitle = function(searchTerm) {
    return this.find({ $text: { $search: searchTerm } }).sort({ score: { $meta: 'textScore' } });
};

// Instance methods
productSchema.methods.addImage = function(imageUrl) {
    if (this.images.length >= 10) throw new Error('Cannot add more than 10 images per product');
    this.images.push(imageUrl);
    return this.save();
};

productSchema.methods.removeImage = function(imageUrl) {
    this.images = this.images.filter(url => url !== imageUrl);
    return this.save();
};

// **Stock management methods**
productSchema.methods.increaseStock = function(quantity) {
    if (quantity <= 0) throw new Error('Quantity must be positive');
    this.stock += quantity;
    return this.save();
};

productSchema.methods.decreaseStock = function(quantity) {
    if (quantity <= 0) throw new Error('Quantity must be positive');
    if (quantity > this.stock) throw new Error('Insufficient stock');
    this.stock -= quantity;
    return this.save();
};

const Product = mongoose.model('Product', productSchema);

export default Product;
