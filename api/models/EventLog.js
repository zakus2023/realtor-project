import mongoose from "mongoose";

const eventLogSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['user.created', 'user.updated', 'user.deleted', 'webhook_verification']
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

const EventLog = mongoose.model("EventLog", eventLogSchema);
export default EventLog;