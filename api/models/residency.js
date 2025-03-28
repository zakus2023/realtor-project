import mongoose from "mongoose";

const residencySchema = new mongoose.Schema({
  // ========== BASIC PROPERTY INFO ==========
  title: { 
    type: String, 
    required: [true, 'Property title is required'],
    maxlength: [120, 'Title cannot exceed 120 characters']
  },
  description: {
    type: String,
    required: [true, 'Property description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Property price is required'],
    min: [0, 'Price cannot be negative']
  },

  // ========== LOCATION DETAILS ==========
  address: { type: String, required: true },
  city: { type: String, required: true },
  Region: { type: String, required: true },
  country: { type: String, required: true },
  gpsCode: { type: String, index: true },

  // ========== PROPERTY STATUS ==========
  propertyStatus: {
    type: String,
    enum: ['available', 'sold', 'rented'],
    required: true
  },
  status: {
    type: String,
    enum: ["review", "published", "unpublished"],
    default: "review"
  },
  propertyType: {
    type: String,
    required: true,
    enum: ['house', 'room', 'apartment', 'store', 'office', 'land']
  },
  tenureType: {
    type: String,
    enum: ['rent', 'sale', 'none'],
    default: 'none'
  },

  // ========== FACILITIES ==========
  facilities: {
    beds: {
      type: Number,
      default: 1,
      min: 0
    },
    baths: {
      type: Number,
      default: 1,
      min: 0
    },
    kitchen: {
      type: Number,
      default: 1,
      min: 0
    },
    parking: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // ========== MEDIA & DOCUMENTS ==========
  images: [{ type: String, required: true }],
  documentations: [{ type: String }],

  // ========== OWNERSHIP & HISTORY ==========
  userEmail: {
    type: String,
    required: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email format']
  },
  statusHistory: [{
    status: { 
      type: String, 
      enum: ["review", "published", "unpublished"]
    },
    changedAt: { type: Date, default: Date.now },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }]
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ========== INDEXES ==========
residencySchema.index({
  city: 1,
  Region: 1,
  price: 1,
  propertyType: 1
});

residencySchema.index({ status: 1, createdAt: -1 });

// ========== VIRTUAL FIELDS ==========
residencySchema.virtual('subscribers', {
  ref: 'Subscription',
  localField: 'propertyType',
  foreignField: 'preferences.propertyTypes',
  match: {
    'preferences.priceRange.min': { $lte: '$price' },
    'preferences.priceRange.max': { $gte: '$price' }
  }
});

// ========== QUERY HELPERS ==========
residencySchema.query.byLocation = function(city, region) {
  return this.where({ city, Region: region });
};

residencySchema.query.publishedAfter = function(date) {
  return this.where({
    'statusHistory.status': 'published',
    'statusHistory.changedAt': { $gte: date }
  });
};

residencySchema.query.activeListings = function() {
  return this.where({ status: 'published' });
};

// ========== HISTORY TRACKING ==========
residencySchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      changedBy: this._updatedBy
    });
  }
  next();
});

const Residency = mongoose.model('Residency', residencySchema);
export default Residency;