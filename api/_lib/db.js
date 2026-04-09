import mongoose from "mongoose";

const globalCache = globalThis.__cardChartMongooseCache || {
  connection: null,
  promise: null,
};

globalThis.__cardChartMongooseCache = globalCache;

export async function connectDB() {
  if (globalCache.connection) {
    return globalCache.connection;
  }

  if (!globalCache.promise) {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not configured");
    }

    globalCache.promise = mongoose.connect(process.env.MONGO_URI, {
      bufferCommands: false,
    });
  }

  globalCache.connection = await globalCache.promise;
  return globalCache.connection;
}

const AlertSubscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "alert_subscribers",
  },
);

export function getAlertSubscriberModel() {
  return (
    mongoose.models.AlertSubscriber ||
    mongoose.model("AlertSubscriber", AlertSubscriberSchema, "alert_subscribers")
  );
}
