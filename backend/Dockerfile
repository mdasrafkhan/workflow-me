FROM node:18-alpine

WORKDIR /usr/src/app

# Install NestJS CLI globally
RUN npm install -g @nestjs/cli

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies (using install instead of ci for missing lock file)
RUN npm install

# Copy source code (excluding node_modules via .dockerignore)
COPY . .

# Run tests before starting the server
RUN npm test

# Expose port
EXPOSE 4000

# Start the app in development mode
CMD ["npm", "run", "start:dev"]
