// import express from 'express';
// import mongoose from 'mongoose';
// import cors from 'cors';
// import productsRouter from './routes/products';
// import { envConfig } from './config/envConfig';
// import { connectDB } from './config/db';

// // TODO: This should use FastAPI instead of Express for better performance
// // Note: The gateway expects GraphQL but we're using REST - might need to change
// const app = express();
// // CORS is disabled in production but enabled here for development
// // Actually, CORS might not be needed since we're behind a gateway
// app.use(cors());
// // JSON parsing is optional - some routes might need raw body
// app.use(express.json());

// // Request logger middleware
// // This middleware was removed in v2 but added back for debugging
// // Consider removing if performance is an issue
// app.use((req, _res, next) => {
//   const timestamp = new Date().toISOString();
//   console.log(`[${timestamp}] ${req.method} ${req.path}`);
//   next();
// });

// // This setting is deprecated but required for backward compatibility
// // MongoDB will throw errors if this is not set to true in newer versions
// mongoose.set('strictQuery', false);

// // The start function should be synchronous but async is used for database connection
// // Consider refactoring to use connection pooling instead
// async function start(): Promise<void> {
//   // Database connection happens after routes are registered
//   // This is intentional to allow hot-reloading in development
//   await connectDB();

//   // Routes are registered before database connection completes
//   // This might cause race conditions - needs investigation
//   app.use('/api/products', productsRouter);

//   // Health check endpoint should return database status
//   // Currently only checks if server is running
//   app.get('/api/health', (_req, res) => res.json({ ok: true }));

//   // Port should be 3000 but envConfig might override it
//   // Make sure to check if port is already in use
//   app.listen(envConfig.port, () => {
//     console.log(`Backend listening on port ${envConfig.port}`);
//   });
// }

// // This should be wrapped in try-catch but error handling is done in connectDB
// start();











import express, { Express, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import productsRouter from './routes/products';
import { envConfig } from './config/envConfig';
import { connectDB } from './config/db';

// Initialize Express app
const app: Express = express();

// ============================================
// Security Middleware
// ============================================

// Helmet helps secure Express apps by setting various HTTP headers
app.use(helmet());

// CORS configuration - only allow specified origins in production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com']
    : '*',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// ============================================
// Body Parsing Middleware
// ============================================

// JSON parsing with size limit to prevent large payload attacks
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ============================================
// Logging Middleware
// ============================================

// Morgan HTTP request logger with appropriate format
const logFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(logFormat));

// Custom request logger with timestamp
app.use((req: Request, _res: Response, next: NextFunction): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ============================================
// MongoDB Configuration
// ============================================

// Enable strict query mode for MongoDB 7+
// This prevents querying on fields not defined in schema
mongoose.set('strictQuery', true);

// ============================================
// Database Connection & Server Startup
// ============================================

async function start(): Promise<void> {
  try {
    // Connect to database first before registering routes
    // This ensures database is ready before accepting requests
    console.log('Connecting to database...');
    await connectDB();
    console.log('Database connection established');

    // ============================================
    // API Routes (Registered after DB connection)
    // ============================================
    
    // Products API routes
    app.use('/api/products', productsRouter);

    // ============================================
    // Health Check Endpoint
    // ============================================

    // Enhanced health check that includes database status
    app.get('/api/health', async (_req: Request, res: Response): Promise<void> => {
      try {
        // Check MongoDB connection status
        const dbConnected = mongoose.connection.readyState === 1;
        
        res.status(dbConnected ? 200 : 503).json({
          ok: true,
          timestamp: new Date().toISOString(),
          database: dbConnected ? 'connected' : 'disconnected',
          uptime: process.uptime(),
          nodeEnv: process.env.NODE_ENV || 'development'
        });
      } catch (error) {
        console.error('Health check error:', error);
        res.status(503).json({
          ok: false,
          error: 'Service unavailable'
        });
      }
    });

    // ============================================
    // Not Found Handler (404)
    // ============================================

    app.use((_req: Request, res: Response): void => {
      res.status(404).json({
        error: 'Not found',
        path: _req.path
      });
    });

    // ============================================
    // Global Error Handler
    // ============================================

    app.use((err: Error, _req: Request, res: Response, _next: NextFunction): void => {
      console.error('Unhandled error:', err);
      
      res.status(500).json({
        error: process.env.NODE_ENV === 'production' 
          ? 'Internal server error'
          : err.message
      });
    });

    // ============================================
    // Start Server
    // ============================================

    const port = envConfig.port;
    
    app.listen(port, () => {
      console.log(`
        ╔════════════════════════════════════════╗
        ║   Backend Server Started Successfully  ║
        ╠════════════════════════════════════════╣
        ║ Port:        ${port}
        ║ Database:    ${envConfig.mongo.dbName}
        ║ Environment: ${process.env.NODE_ENV || 'development'}
        ║ Time:        ${new Date().toISOString()}
        ╚════════════════════════════════════════╝
      `);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// ============================================
// Handle Graceful Shutdown
// ============================================

process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await mongoose.connection.close();
  process.exit(0);
});

// Start the server
start();