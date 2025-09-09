FROM node:18-alpine

WORKDIR /usr/src/app

# Install system dependencies
RUN apk add --no-cache curl

# Install NestJS CLI globally
RUN npm install -g @nestjs/cli

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code (excluding node_modules via .dockerignore)
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Create dist directory and set ownership
RUN mkdir -p /usr/src/app/dist && chown nestjs:nodejs /usr/src/app/dist

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

# Switch to non-root user
USER nestjs

# Build the application first
RUN npm run build

# Start the app in production mode
CMD ["npm", "run", "start:prod"]
