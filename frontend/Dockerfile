FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies (using install instead of ci for missing lock file)
RUN npm install

# Copy source code (excluding node_modules via .dockerignore)
COPY . .

# Expose port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
