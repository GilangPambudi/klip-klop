FROM node:20-bullseye-slim

# Install system dependencies: ffmpeg, python3, and build tools
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
RUN chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

# Copy package files first for caching
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Build Tailwind CSS
RUN npm run build

# Expose the port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
