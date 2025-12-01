# Production Dockerfile for Gateway
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package file
COPY package.json ./

# Install only production dependencies
RUN npm install --only=production

# Copy source code
COPY src ./src

# Expose gateway port
EXPOSE 5921

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5921/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the application
CMD ["npm", "start"]
