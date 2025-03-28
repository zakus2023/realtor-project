import mongoose from "mongoose"; // Import Mongoose to define and interact with MongoDB schemas

// Define the Subscription schema (structure for the subscription collection in MongoDB)
const subscriptionSchema = new mongoose.Schema({
  // Email field: Required, must be unique, and must match a valid email format
  email: { 
    type: String, 
    required: true, 
    unique: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please use a valid email address']
  },

  // Source of the subscription (where it came from). Default is "website_form"
  source: {
    type: String,
    default: "website_form",
    enum: ["website_form", "api", "admin_portal", "campaign"] // Restricts values to this list
  },

  // Date when the confirmation email was sent. Defaults to the current date/time.
  confirmationSentAt: {
    type: Date,
    required: true,
    default: Date.now
  },

  // Date when the user unsubscribed (if applicable)
  unsubscribedAt: Date,

  // Reason for unsubscribing (if the user unsubscribed)
  unsubscribeSource: {
    type: String,
    enum: ["user_request", "admin_action", "bounce", "complaint"] // Restricts values to this list
  },

  // Metadata object to store additional details such as the user's IP address and browser info
  metadata: {
    ipAddress: String, // Stores the user's IP address
    userAgent: String  // Stores information about the user's browser/device
  }
}, { 
  timestamps: true, // Automatically adds `createdAt` and `updatedAt` timestamps
  toJSON: { virtuals: true }, // Ensures virtual fields are included in JSON output
  toObject: { virtuals: true }  // Ensures virtual fields are included when converting to an object
});

// Virtual property: This does not get saved in the database but can be accessed like a normal field.
// It checks if the user has unsubscribed and returns 'unsubscribed' or 'active' accordingly.
subscriptionSchema.virtual('status').get(function() {
  return this.unsubscribedAt ? 'unsubscribed' : 'active';
});

// Indexes: Improve database performance for queries on these fields
subscriptionSchema.index({ email: 1 }); // Speeds up searches by email
subscriptionSchema.index({ unsubscribedAt: 1 }); // Speeds up searches for unsubscribed users
subscriptionSchema.index({ createdAt: 1 }); // Speeds up searches based on creation date

// Export the model so it can be used in other parts of the application
export default mongoose.model('Subscription', subscriptionSchema);
