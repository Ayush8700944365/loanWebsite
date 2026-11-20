import mongoose from "mongoose";

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing in environment variables");
    }

    const connection = await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.MONGO_DB_NAME || "loanCRM",
      serverSelectionTimeoutMS: 10000,
    });

    console.log(`MongoDB Connected: ${connection.connection.host}`);
    console.log(`Database Name: ${connection.connection.name}`);
  } catch (error) {
    console.error("MongoDB Connection Failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;
