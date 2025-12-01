import mongoose from 'mongoose';

// Use interface instead of type for better extensibility
export interface Product {
  // _id should be ObjectId type for mongoose documents
  _id?: mongoose.Types.ObjectId;
  // name is required in schema
  name: string;
  // price is required in schema
  price: number;
  // Timestamps are always present (not optional)
  createdAt?: Date;
  updatedAt?: Date;
}

// Optional: Branded type for currency to prevent accidental misuse
export type Money = number & { readonly __brand: 'Money' };

export const createMoney = (value: number): Money => {
  if (value < 0) throw new Error('Money cannot be negative');
  return value as Money;
};