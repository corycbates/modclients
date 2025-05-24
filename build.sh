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
mkdir -p dist/server

# Build the server-side code
echo "Building server-side code..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist/server

# Copy any necessary assets
echo "Copying static assets..."
cp -r uploads dist/uploads 2>/dev/null || mkdir -p dist/uploads

echo "Build completed successfully!"