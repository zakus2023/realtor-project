import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  clerkId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  image: String,
  bookings: [{
    bookingId: {
      type: String,
      required: true,
      unique: true
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true
    },
    visitDate: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled'],
      default: 'active'
    },
    metadata: {
      bookedAt: {
        type: Date,
        default: Date.now
      },
      cancelledAt: Date
    }
  }]
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
export default User;