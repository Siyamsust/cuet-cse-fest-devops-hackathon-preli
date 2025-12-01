import express, { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import mongoose from 'mongoose';
import { ProductModel, ProductDocument } from '../models/product';

const router = express.Router();

// Joi validation schemas
const createProductSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(255)
    .required()
    .messages({
      'string.empty': 'Name cannot be empty',
      'string.min': 'Name must be at least 1 character',
      'string.max': 'Name must not exceed 255 characters',
      'any.required': 'Name is required'
    }),
  price: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.base': 'Price must be a number',
      'number.min': 'Price must be non-negative',
      'any.required': 'Price is required'
    })
});

const updateProductSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(255)
    .messages({
      'string.empty': 'Name cannot be empty',
      'string.min': 'Name must be at least 1 character',
      'string.max': 'Name must not exceed 255 characters'
    }),
  price: Joi.number()
    .min(0)
    .messages({
      'number.base': 'Price must be a number',
      'number.min': 'Price must be non-negative'
    })
});

// Validation middleware - FIXED: Returns void on all paths
const validateRequest = (schema: Joi.Schema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const messages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      res.status(400).json({ 
        error: 'Validation failed',
        details: messages 
      });
      return;
    }

    req.body = value; // Update body with trimmed/cleaned values
    next();
  };
};

// Create a product
router.post(
  '/', 
  validateRequest(createProductSchema), 
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, price } = req.body;
      
      const product = new ProductModel({ 
        name, 
        price 
      });

      const saved: ProductDocument = await product.save();
      
      console.log('Product created:', saved._id);
      res.status(201).json(saved);
      
    } catch (err) {
      handleProductError(err, res, 'POST /api/products');
    }
  }
);

// Update a product
router.put(
  '/:id', 
  validateRequest(updateProductSchema), 
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, price } = req.body;

      if (!isValidObjectId(id)) {
        res.status(400).json({ error: 'Invalid product ID' });
        return;
      }

      const updated = await ProductModel.findByIdAndUpdate(
        id,
        { ...(name && { name }), ...(price !== undefined && { price }) },
        { new: true, runValidators: true }
      );

      if (!updated) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      console.log('Product updated:', updated._id);
      res.status(200).json(updated);
      
    } catch (err) {
      handleProductError(err, res, 'PUT /api/products/:id');
    }
  }
);

// List products with pagination
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      Math.max(1, parseInt(req.query.limit as string) || 10),
      100
    );
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      ProductModel.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      ProductModel.countDocuments()
    ]);

    res.json({
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (err) {
    handleProductError(err, res, 'GET /api/products');
  }
});

// Get a single product by ID
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ error: 'Invalid product ID' });
      return;
    }

    const product = await ProductModel.findById(id).lean();

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json(product);
    
  } catch (err) {
    handleProductError(err, res, 'GET /api/products/:id');
  }
});

// Delete a product
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ error: 'Invalid product ID' });
      return;
    }

    const deleted = await ProductModel.findByIdAndDelete(id);

    if (!deleted) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    console.log('Product deleted:', deleted._id);
    res.status(200).json({ message: 'Product deleted successfully' });
    
  } catch (err) {
    handleProductError(err, res, 'DELETE /api/products/:id');
  }
});

// Helper function: Validate MongoDB ObjectId
function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

// Helper function: Error handling - FIXED: Returns void
function handleProductError(err: any, res: Response, endpoint: string): void {
  console.error(`${endpoint} error:`, err);

  if (err.name === 'ValidationError') {
    res.status(400).json({ 
      error: 'Validation failed',
      details: Object.values(err.errors).map((e: any) => e.message)
    });
    return;
  }

  if (err.code === 11000) {
    res.status(409).json({ 
      error: 'Product with this name already exists' 
    });
    return;
  }

  if (err.name === 'CastError') {
    res.status(400).json({ 
      error: 'Invalid data format' 
    });
    return;
  }

  res.status(500).json({ 
    error: 'Internal server error' 
  });
}

export { router as productRouter };
export default router;