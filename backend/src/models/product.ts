import mongoose, { Schema, Document } from "mongoose";
import { Product } from "../types";

// Define the ProductDocument interface properly
export interface ProductDocument extends Document, Product {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Create schema with proper type definitions
const ProductSchema = new Schema<ProductDocument>(
  {
    // name field is unique and trimmed to prevent duplicates
    name: { 
      type: String, 
      required: true, 
      trim: true,
      unique: true,
      minlength: 1,
      maxlength: 255
    },
    // price uses Number type (Decimal128 causes type issues)
    // Alternative: Use mongoose-decimal128 or simply use Number
    price: { 
      type: Number, 
      required: true, 
      min: 0,
      get: (value: number) => parseFloat(value.toFixed(2)) // Round to 2 decimals
    },
  },
  { 
    timestamps: true,
    toJSON: { getters: true }, // Apply getters when converting to JSON
    toObject: { getters: true }
  }
);

// Create and export model with proper typing
export const ProductModel = mongoose.model<ProductDocument>(
  "Product",
  ProductSchema,
  "products" // Explicitly specify collection name in lowercase
);