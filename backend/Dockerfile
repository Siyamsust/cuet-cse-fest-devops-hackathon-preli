# Production Dockerfile for Backend
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package file
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src
COPY tsconfig.json ./

# Build TypeScript to JavaScript
RUN npm run build

# Production stage
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package file
COPY package.json ./

# Install only production dependencies
RUN npm install --only=production

# Copy compiled code from builder
COPY --from=builder /app/dist ./dist

# Expose backend port
EXPOSE 3847

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3847/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the application
CMD ["npm", "start"]
