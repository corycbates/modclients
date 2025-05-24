#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure we're in production mode
process.env.NODE_ENV = 'production';

console.log('Starting production build...');

// Make sure the dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Make sure the dist/server directory exists
if (!fs.existsSync('dist/server')) {
  fs.mkdirSync('dist/server', { recursive: true });
}

// Make sure the dist/server/public directory exists
if (!fs.existsSync('dist/server/public')) {
  fs.mkdirSync('dist/server/public', { recursive: true });
}

// Build the client-side assets
console.log('Building client assets...');
try {
  execSync('npx vite build', { stdio: 'inherit' });
} catch (error) {
  console.error('Error building client assets:', error);
  process.exit(1);
}

// Copy the client build to the server/public directory
console.log('Copying client build to server/public...');
try {
  const clientBuildDir = path.join(__dirname, 'dist', 'client');
  const serverPublicDir = path.join(__dirname, 'dist', 'server', 'public');
  
  // Read all files in the client build directory
  const files = fs.readdirSync(clientBuildDir);
  
  // Copy each file to the server/public directory
  files.forEach(file => {
    const srcPath = path.join(clientBuildDir, file);
    const destPath = path.join(serverPublicDir, file);
    
    if (fs.statSync(srcPath).isDirectory()) {
      // If it's a directory, copy it recursively
      execSync(`cp -r "${srcPath}" "${destPath}"`, { stdio: 'inherit' });
    } else {
      // If it's a file, copy it
      fs.copyFileSync(srcPath, destPath);
    }
  });
} catch (error) {
  console.error('Error copying client build:', error);
  process.exit(1);
}

// Create a simple server.js file for production
console.log('Creating production server...');
const serverCode = `
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import fileUpload from 'express-fileupload';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

// Set up paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.join(__dirname, 'public');
const uploadsPath = path.join(__dirname, '../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// Set up database connection
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const db = drizzle(pool, { schema });

// Initialize database
async function initDb() {
  try {
    await pool.query(\`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        address TEXT,
        city TEXT,
        zip TEXT,
        notes TEXT,
        status TEXT DEFAULT 'active',
        photo_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    \`);
    
    await pool.query(\`
      CREATE TABLE IF NOT EXISTS visits (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        date TIMESTAMP NOT NULL,
        service TEXT,
        formula TEXT,
        price DECIMAL(10, 2),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    \`);
    
    console.log('Database tables initialized');
    
    // Check if there's any data
    const clientCount = await pool.query('SELECT COUNT(*) FROM clients');
    if (parseInt(clientCount.rows[0].count) === 0) {
      console.log('Adding sample data...');
      // Add sample data here if needed
    }
    
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Create Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 },
  useTempFiles: true,
  tempFileDir: '/tmp/',
  createParentPath: true
}));

// Log requests
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(\`\${req.method} \${req.path} \${res.statusCode} \${duration}ms\`);
  });
  next();
});

// API routes
import { registerRoutes } from './routes.js';

// Static files
app.use('/uploads', express.static(uploadsPath));
app.use(express.static(publicPath));

// Start server
async function startServer() {
  try {
    await initDb();
    console.log('Database initialized successfully');
    
    const server = await registerRoutes(app);
    
    // Error handler
    app.use((err, _req, res, _next) => {
      console.error(err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || 'Internal Server Error';
      res.status(status).json({ message });
    });
    
    // SPA fallback
    app.get('*', (req, res) => {
      res.sendFile(path.join(publicPath, 'index.html'));
    });
    
    const port = process.env.PORT || 5000;
    server.listen(port, '0.0.0.0', () => {
      console.log(\`Production server running on port \${port}\`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
`;

try {
  fs.writeFileSync('dist/server/index.js', serverCode);
} catch (error) {
  console.error('Error creating production server:', error);
  process.exit(1);
}

// Copy schema.js for the production server
console.log('Copying schema...');
try {
  // Read the schema file
  const schemaContent = fs.readFileSync('shared/schema.ts', 'utf8');
  
  // Modify imports to work with ESM
  const modifiedSchema = schemaContent
    .replace(/import {([^}]+)} from "drizzle-orm\/pg-core";/, 'import {$1} from "drizzle-orm/pg-core";')
    .replace(/import {([^}]+)} from "drizzle-zod";/, 'import {$1} from "drizzle-zod";')
    .replace(/import {([^}]+)} from "zod";/, 'import {$1} from "zod";');
  
  // Write the modified schema to the dist directory
  fs.writeFileSync('dist/server/schema.js', modifiedSchema);
} catch (error) {
  console.error('Error copying schema:', error);
  process.exit(1);
}

// Copy routes.js for the production server
console.log('Copying routes...');
try {
  // Read the routes file
  const routesContent = fs.readFileSync('server/routes.ts', 'utf8');
  
  // Modify imports to work with ESM
  const modifiedRoutes = routesContent
    .replace(/import ([^;]+) from "([^"]+)";/g, 'import $1 from "$2";')
    .replace(/import {([^}]+)} from "([^"]+)";/g, 'import {$1} from "$2";')
    .replace(/@shared\/schema/g, './schema.js')
    .replace(/\.\/s3-service/g, './s3-service.js');
  
  // Write the modified routes to the dist directory
  fs.writeFileSync('dist/server/routes.js', modifiedRoutes);
} catch (error) {
  console.error('Error copying routes:', error);
  process.exit(1);
}

// Copy s3-service.js for the production server
console.log('Copying S3 service...');
try {
  // Read the S3 service file
  const s3Content = fs.readFileSync('server/s3-service.ts', 'utf8');
  
  // Modify imports to work with ESM
  const modifiedS3 = s3Content
    .replace(/import {([^}]+)} from "([^"]+)";/g, 'import {$1} from "$2";')
    .replace(/import ([^;]+) from "([^"]+)";/g, 'import $1 from "$2";');
  
  // Write the modified S3 service to the dist directory
  fs.writeFileSync('dist/server/s3-service.js', modifiedS3);
} catch (error) {
  console.error('Error copying S3 service:', error);
  process.exit(1);
}

// Create uploads directory
console.log('Creating uploads directory...');
if (!fs.existsSync('dist/uploads')) {
  fs.mkdirSync('dist/uploads', { recursive: true });
}

console.log('Build completed successfully!');