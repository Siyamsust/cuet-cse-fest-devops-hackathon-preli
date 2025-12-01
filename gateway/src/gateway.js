const express = require('express');
const axios = require('axios');

const app = express();

// Read port and backend URL from environment variables
const gatewayPort = process.env.GATEWAY_PORT || 5921;
const backendUrl = process.env.BACKEND_URL || 'http://backend:3847';

// JSON parsing middleware
app.use(express.json());

// Request logger middleware
app.use((req, _res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

/**
 * Proxy request handler
 * Forwards requests from gateway to backend service
 */
async function proxyRequest(req, res, next) {
  const startTime = Date.now();
  const targetPath = req.url;
  const targetUrl = `${backendUrl}${targetPath}`;

  try {
    console.log(`[${req.method}] ${req.url} -> ${targetUrl}`);

    // Prepare headers for backend
    const headers = {};

    // Set Content-Type if there's a body
    if (req.body && Object.keys(req.body).length > 0) {
      headers['Content-Type'] = req.headers['content-type'] || 'application/json';
    }

    // Forward x-forwarded headers for proper tracking
    headers['X-Forwarded-For'] = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    headers['X-Forwarded-Proto'] = req.protocol;

    // Forward request to backend service
    const response = await axios({
      method: req.method,
      url: targetUrl,
      params: req.query,
      data: req.body,
      headers,
      timeout: 30000, // 30 second timeout
      validateStatus: () => true, // Don't throw on any status
      maxContentLength: 50 * 1024 * 1024, // 50MB max
      maxBodyLength: 50 * 1024 * 1024,
    });

    // Log response metrics
    const duration = Date.now() - startTime;
    console.log(`[${req.method}] ${req.url} <- ${response.status} (${duration}ms)`);

    // Forward response with same status and headers
    res.status(response.status);

    // Forward specific response headers
    const headersToForward = ['content-type', 'content-length'];
    headersToForward.forEach((header) => {
      if (response.headers[header]) {
        res.setHeader(header, response.headers[header]);
      }
    });

    // Send response data
    res.json(response.data);
  } catch (error) {
    // Log error details
    console.error('Proxy error:', {
      message: error.message,
      code: error.code,
      url: targetUrl,
    });

    // Handle specific axios errors
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        console.error(`Connection refused to ${targetUrl}`);
        res.status(503).json({
          error: 'Backend service unavailable',
          message: 'The backend service is currently unavailable. Please try again later.',
        });
        return;
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        console.error(`Timeout connecting to ${targetUrl}`);
        res.status(504).json({
          error: 'Backend service timeout',
          message: 'The backend service did not respond in time. Please try again later.',
        });
        return;
      } else if (error.response) {
        // Forward error response from backend
        res.status(error.response.status).json(error.response.data);
        return;
      }
    }

    // Generic error handling
    if (!res.headersSent) {
      res.status(502).json({ 
        error: 'Bad Gateway',
        message: 'Failed to proxy request to backend service'
      });
    }
  }
}

// Proxy all /api requests to backend
app.all('/api/*', proxyRequest);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'gateway'
  });
});

// Server startup
app.listen(gatewayPort, () => {
  console.log(`[${new Date().toISOString()}] Gateway listening on port ${gatewayPort}`);
  console.log(`[${new Date().toISOString()}] Backend URL: ${backendUrl}`);
});
