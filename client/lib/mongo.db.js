import mongoose from "mongoose";

const MONGO_URI = process.env.NEXT_PUBLIC_MONGO_URI;

if (!MONGO_URI) {
  throw new Error("MONGO_URI is not defined in environment variables");
}

let cached = (global).mongoose;

if (!cached) {
  cached = (global).mongoose = {
    conn: null,
    promise: null,
  };
}

export const connect = async () => {
  if (cached.conn) return cached.conn;

  cached.promise =
    cached.promise ||
    mongoose.connect(MONGO_URI, {
      dbName: "Fin360DB",
      bufferCommands: false,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });

  cached.conn = await cached.promise;
  return cached.conn;
};
