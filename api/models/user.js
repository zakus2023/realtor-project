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
    address: String,
    telephone: String,
    bookedVisit: [
      {
        id: {
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
          type: String,
          required: true,
        },
        time: {
          type: String,
          required: true,
        },
        visitStatus: {
          type: String,
          enum: ["pending", "completed", "cancelled"],
          default: "pending",
        },
        bookingStatus: {
          type: String,
          enum: ["active", "expired", "cancelled"],
          default: "active",
        },
        payment: {
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
    ownedResidencies: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Residency'
    }]
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

userSchema.virtual('profile').get(function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    image: this.image,
    residencyCount: this.ownedResidencies ? this.ownedResidencies.length : 0
  };
});

const User = mongoose.model("User", userSchema);
export default User;