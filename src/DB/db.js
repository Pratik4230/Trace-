import "dotenv/config";
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    return await mongoose.connect(process.env.MONGODB_URL);
  } catch (error) {
    console.log("MongoDB connection error : ", error);
  }
};

export default connectDB;
