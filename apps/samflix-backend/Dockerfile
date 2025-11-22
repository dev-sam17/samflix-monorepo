# Use Node.js LTS as the base image
FROM node:22-slim

# Set noninteractive mode to avoid prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install openssl properly
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Create app directory
WORKDIR /app

# Set GITHUB_TOKEN environment variable
ARG GITHUB_TOKEN

# Install dependencies first (for better caching)
RUN echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" >> ~/.npmrc
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install

# Copy source code
COPY . .

# Build TypeScript code
RUN pnpm build

# Expose the port the app runs on
EXPOSE 3000

# Command to run the app
CMD ["pnpm", "start"]
