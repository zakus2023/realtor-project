import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    image: String,
    bookedVisit: [
      {
        id: {
          // Changed from bookingId to match controller
          type: String,
          required: true,
          unique: true,
        },
        propertyId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Residency",
          required: true,
        },
        date: {
          // Added to match controller's formattedDate
          type: String,
          required: true,
        },
        time: {
          // Added to match controller's formattedTime
          type: String,
          required: true,
        },
        visitStatus: {
          // Added for controller's visitStatus
          type: String,
          enum: ["pending", "completed", "cancelled"],
          default: "pending",
        },
        bookingStatus: {
          // Renamed from status
          type: String,
          enum: ["active", "expired", "cancelled"],
          default: "active",
        },
        payment: {
          // Added payment subdocument
          method: {
            type: String,
            required: true,
          },
          status: {
            type: String,
            required: true,
          },
          reference: String,
          details: mongoose.Schema.Types.Mixed,
          fee: Number,
          currency: String,
        },
        metadata: {
          // Expanded metadata
          bookedAt: {
            type: Date,
            default: Date.now,
          },
          cancelledAt: Date,
          userAgent: String,
          ipAddress: String,
        },
      },
    ],
    favResidenciesID: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Residency'
    }],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
