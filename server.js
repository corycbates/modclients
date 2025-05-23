// Simple wrapper to start the actual server
import('./server/index.js').catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});