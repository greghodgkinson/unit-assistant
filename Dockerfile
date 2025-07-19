# Use Node.js 18 Alpine as base image
FROM node:18-alpine as builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the frontend application
RUN npm run build

# Production stage
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files for production dependencies
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built frontend assets from builder stage
COPY --from=builder /app/dist ./dist

# Copy server file
COPY server.js ./

# Copy storage directory if it exists
COPY storage ./storage

# Create storage directory if it doesn't exist
RUN mkdir -p storage

# Expose port 3001 (the server port)
EXPOSE 3001

# Start the Express server (which serves both API and static files)
CMD ["node", "server.js"]