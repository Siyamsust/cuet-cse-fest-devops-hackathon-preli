import dotenv from "dotenv";

dotenv.config();

export const envConfig = {
  port: parseInt(process.env.BACKEND_PORT || "3847", 10),
  mongo: {
    uri: process.env.MONGO_URI || "mongodb://localhost:27017/ecommerce",
    dbName: process.env.MONGO_DATABASE || "ecommerce",
  },
} as const;
