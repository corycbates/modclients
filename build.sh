#!/bin/bash

# Build script for Render deployment

echo "Starting build process..."

# Install dependencies
npm ci

# Build the client-side assets
echo "Building client-side assets..."
npx vite build

# Create the server directory in dist
echo "Creating server directory..."
mkdir -p dist/server dist/server/public

# Copy the built client assets to the server's public directory
echo "Copying client build to server public directory..."
cp -r dist/client/* dist/server/public/

# Build the server-side code with production flag
echo "Building server-side code..."
NODE_ENV=production npx esbuild server/production.ts \
  --define:process.env.NODE_ENV=\"production\" \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --outfile=dist/server/index.js

# Create uploads directory if it doesn't exist
echo "Setting up uploads directory..."
mkdir -p dist/uploads

# Create a production version check file to ensure we're in production mode
echo "Setting up production environment..."
echo "export const IS_PRODUCTION = true;" > dist/server/production-check.js

echo "Build completed successfully!"