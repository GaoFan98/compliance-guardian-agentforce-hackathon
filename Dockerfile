FROM node:18-slim

WORKDIR /app

# Copy package files and install dependencies first
# This creates a separate layer for dependencies to leverage cache
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Create logs directory with proper permissions
RUN mkdir -p logs && chmod 777 logs

EXPOSE 3000

CMD ["node", "src/index.js"] 