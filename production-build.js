import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const renderDeployDir = path.join(__dirname, 'render-deploy');
const clientDir = path.join(__dirname, 'client');
const clientBuildDir = path.join(clientDir, 'dist');
const renderPublicDir = path.join(renderDeployDir, 'public');

// Make sure render-deploy/public directory exists
if (!fs.existsSync(renderPublicDir)) {
  fs.mkdirSync(renderPublicDir, { recursive: true });
}

// Build the client
console.log('Building client application...');
exec('cd client && npm run build', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error building client: ${error}`);
    console.error(stderr);
    process.exit(1);
  }
  
  console.log(stdout);
  console.log('Client build completed.');
  
  // Check if client build directory exists
  if (!fs.existsSync(clientBuildDir)) {
    console.error(`Client build directory not found: ${clientBuildDir}`);
    process.exit(1);
  }
  
  // Copy client build files to render-deploy/public
  console.log(`Copying build files to ${renderPublicDir}...`);
  
  // Read all files from client build directory
  const copyFiles = (srcDir, destDir) => {
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    const entries = fs.readdirSync(srcDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name);
      
      if (entry.isDirectory()) {
        copyFiles(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  };
  
  try {
    copyFiles(clientBuildDir, renderPublicDir);
    console.log('Files copied successfully.');
    console.log('Production build for Render is ready!');
  } catch (err) {
    console.error(`Error copying files: ${err}`);
    process.exit(1);
  }
});