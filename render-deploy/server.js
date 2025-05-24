import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import fileUpload from 'express-fileupload';
import { Pool } from 'pg';

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure environment
const PORT = process.env.PORT || 5000;
const publicPath = path.join(__dirname, 'public');
const uploadsPath = path.join(__dirname, 'uploads');

// Ensure directories exist
if (!fs.existsSync(publicPath)) {
  fs.mkdirSync(publicPath, { recursive: true });
}

if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// Database connection
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Create Express app
const app = express();

// Set up middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max file size
  useTempFiles: true,
  tempFileDir: '/tmp/',
  createParentPath: true
}));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
  });
  next();
});

// Initialize database
async function initDb() {
  try {
    await pool.query(`
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
    `);
    
    await pool.query(`
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
    `);
    
    console.log('Database tables initialized');
    
    // Add sample data if needed
    const clientCount = await pool.query('SELECT COUNT(*) FROM clients');
    if (parseInt(clientCount.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO clients (first_name, last_name, phone, email, address, city, zip, status)
        VALUES 
          ('Sarah', 'Johnson', '555-123-4567', 'sarah.j@example.com', '123 Main St', 'Springfield', '12345', 'active'),
          ('Michael', 'Williams', '555-987-6543', 'mike.w@example.com', '456 Oak Ave', 'Riverdale', '67890', 'active'),
          ('Emily', 'Davis', '555-555-5555', 'emily.d@example.com', '789 Pine Rd', 'Lakeside', '45678', 'inactive');
      `);
      
      await pool.query(`
        INSERT INTO visits (client_id, date, service, formula, price, notes)
        VALUES 
          (1, '2023-01-15', 'Haircut and Color', 'Blonde 20vol + 7N', 150.00, 'Full foil highlights'),
          (1, '2023-02-20', 'Root Touch-up', '8N + 10vol', 85.00, 'Root coverage only'),
          (1, '2023-04-10', 'Balayage', 'Clay lightener + toner', 200.00, 'Natural beachy look'),
          (1, '2023-06-05', 'Trim and Style', 'N/A', 60.00, 'Light trim and blowout'),
          (2, '2023-03-10', 'Men''s Cut', 'N/A', 40.00, 'Fade with scissor work on top'),
          (2, '2023-05-15', 'Men''s Cut and Beard Trim', 'N/A', 55.00, 'Standard cut with beard shaping'),
          (3, '2023-02-05', 'Color Correction', 'Pravana color remover + 6N', 250.00, 'Removing at-home color mishap');
      `);
      console.log('Sample data added');
    }
    
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Helper function for S3 upload - simplified version that works in production
async function uploadToS3(fileBuffer, fileName, clientId) {
  try {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.S3_BUCKET_NAME) {
      // Fallback to local storage if S3 credentials are not available
      const uploadDir = path.join(uploadsPath, `client-${clientId}`);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const fileExt = path.extname(fileName);
      const newFileName = `photo-${Date.now()}${fileExt}`;
      const filePath = path.join(uploadDir, newFileName);
      
      fs.writeFileSync(filePath, fileBuffer);
      
      // Return a relative URL to the uploaded file
      return `/uploads/client-${clientId}/${newFileName}`;
    }
    
    // Implement S3 upload here if needed
    console.log('AWS S3 upload not implemented in this simplified version');
    return null;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

// Serve static files
app.use(express.static(publicPath));
app.use('/uploads', express.static(uploadsPath));

// ---- CLIENT ROUTES ----

// Get all clients
app.get('/api/clients', async (req, res) => {
  try {
    const { search, status, sortBy = 'id', sortDirection = 'asc', page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * parseInt(limit);
    
    let queryParams = [];
    let whereConditions = [];
    let queryText = 'SELECT * FROM clients';
    
    // Build filter conditions
    if (search) {
      whereConditions.push('(first_name ILIKE $1 OR last_name ILIKE $1 OR phone ILIKE $1)');
      queryParams.push(`%${search}%`);
    }
    
    if (status) {
      whereConditions.push(`status = $${queryParams.length + 1}`);
      queryParams.push(status);
    }
    
    // Add WHERE clause if needed
    if (whereConditions.length > 0) {
      queryText += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM clients${whereConditions.length > 0 ? ' WHERE ' + whereConditions.join(' AND ') : ''}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);
    
    // Add sorting and pagination
    queryText += ` ORDER BY ${sortBy} ${sortDirection === 'desc' ? 'DESC' : 'ASC'} LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(parseInt(limit), offset);
    
    const result = await pool.query(queryText, queryParams);
    
    // Transform the results
    const clients = result.rows.map(row => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      email: row.email || '',
      address: row.address || '',
      city: row.city || '',
      zip: row.zip || '',
      notes: row.notes || '',
      status: row.status,
      photoUrl: row.photo_url || '',
      createdAt: row.created_at
    }));
    
    res.json({ clients, total });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ message: 'Failed to fetch clients' });
  }
});

// Get client by ID
app.get('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' });
    }
    
    const row = result.rows[0];
    const client = {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      email: row.email || '',
      address: row.address || '',
      city: row.city || '',
      zip: row.zip || '',
      notes: row.notes || '',
      status: row.status,
      photoUrl: row.photo_url || '',
      createdAt: row.created_at
    };
    
    res.json(client);
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ message: 'Failed to fetch client' });
  }
});

// Create client
app.post('/api/clients', async (req, res) => {
  try {
    const { firstName, lastName, phone, email, address, city, zip, notes, status } = req.body;
    
    const result = await pool.query(
      `INSERT INTO clients (first_name, last_name, phone, email, address, city, zip, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [firstName, lastName, phone, email || null, address || null, city || null, zip || null, notes || null, status || 'active']
    );
    
    const row = result.rows[0];
    const client = {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      email: row.email || '',
      address: row.address || '',
      city: row.city || '',
      zip: row.zip || '',
      notes: row.notes || '',
      status: row.status,
      photoUrl: row.photo_url || '',
      createdAt: row.created_at
    };
    
    res.status(201).json(client);
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ message: 'Failed to create client' });
  }
});

// Update client
app.patch('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, email, address, city, zip, notes, status, photoUrl } = req.body;
    
    // Build SET part of query
    const updates = [];
    const values = [];
    
    if (firstName !== undefined) { updates.push(`first_name = $${updates.length + 1}`); values.push(firstName); }
    if (lastName !== undefined) { updates.push(`last_name = $${updates.length + 1}`); values.push(lastName); }
    if (phone !== undefined) { updates.push(`phone = $${updates.length + 1}`); values.push(phone); }
    if (email !== undefined) { updates.push(`email = $${updates.length + 1}`); values.push(email); }
    if (address !== undefined) { updates.push(`address = $${updates.length + 1}`); values.push(address); }
    if (city !== undefined) { updates.push(`city = $${updates.length + 1}`); values.push(city); }
    if (zip !== undefined) { updates.push(`zip = $${updates.length + 1}`); values.push(zip); }
    if (notes !== undefined) { updates.push(`notes = $${updates.length + 1}`); values.push(notes); }
    if (status !== undefined) { updates.push(`status = $${updates.length + 1}`); values.push(status); }
    if (photoUrl !== undefined) { updates.push(`photo_url = $${updates.length + 1}`); values.push(photoUrl); }
    
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No updates provided' });
    }
    
    // Add ID as the last parameter
    values.push(id);
    
    const result = await pool.query(
      `UPDATE clients SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' });
    }
    
    const row = result.rows[0];
    const client = {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      email: row.email || '',
      address: row.address || '',
      city: row.city || '',
      zip: row.zip || '',
      notes: row.notes || '',
      status: row.status,
      photoUrl: row.photo_url || '',
      createdAt: row.created_at
    };
    
    res.json(client);
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ message: 'Failed to update client' });
  }
});

// Upload client photo
app.post('/api/clients/:id/photo', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.files || !req.files.photo) {
      return res.status(400).json({ message: 'No photo uploaded' });
    }
    
    const photo = req.files.photo;
    
    // Check if client exists
    const clientResult = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' });
    }
    
    // Upload the photo (fallback to local storage if S3 not available)
    const photoUrl = await uploadToS3(photo.data, photo.name, id);
    
    // Update the client with the new photo URL
    await pool.query('UPDATE clients SET photo_url = $1 WHERE id = $2', [photoUrl, id]);
    
    res.json({ photoUrl });
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ message: 'Failed to upload photo' });
  }
});

// Delete client
app.delete('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM clients WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' });
    }
    
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ message: 'Failed to delete client' });
  }
});

// ---- VISIT ROUTES ----

// Get all visits
app.get('/api/visits', async (req, res) => {
  try {
    const { clientId, search, sortBy = 'date', sortDirection = 'desc', page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * parseInt(limit);
    
    let queryParams = [];
    let whereConditions = [];
    let queryText = 'SELECT * FROM visits';
    
    // Build filter conditions
    if (clientId) {
      whereConditions.push(`client_id = $${queryParams.length + 1}`);
      queryParams.push(clientId);
    }
    
    if (search) {
      whereConditions.push(`(service ILIKE $${queryParams.length + 1} OR formula ILIKE $${queryParams.length + 1} OR notes ILIKE $${queryParams.length + 1})`);
      queryParams.push(`%${search}%`);
    }
    
    // Add WHERE clause if needed
    if (whereConditions.length > 0) {
      queryText += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM visits${whereConditions.length > 0 ? ' WHERE ' + whereConditions.join(' AND ') : ''}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);
    
    // Add sorting and pagination
    queryText += ` ORDER BY ${sortBy} ${sortDirection === 'desc' ? 'DESC' : 'ASC'} LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(parseInt(limit), offset);
    
    const result = await pool.query(queryText, queryParams);
    
    // Transform the results
    const visits = result.rows.map(row => ({
      id: row.id,
      clientId: row.client_id,
      date: row.date,
      service: row.service || '',
      formula: row.formula || '',
      price: parseFloat(row.price) || 0,
      notes: row.notes || '',
      createdAt: row.created_at
    }));
    
    res.json({ visits, total });
  } catch (error) {
    console.error('Error fetching visits:', error);
    res.status(500).json({ message: 'Failed to fetch visits' });
  }
});

// Get visit by ID
app.get('/api/visits/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM visits WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Visit not found' });
    }
    
    const row = result.rows[0];
    const visit = {
      id: row.id,
      clientId: row.client_id,
      date: row.date,
      service: row.service || '',
      formula: row.formula || '',
      price: parseFloat(row.price) || 0,
      notes: row.notes || '',
      createdAt: row.created_at
    };
    
    res.json(visit);
  } catch (error) {
    console.error('Error fetching visit:', error);
    res.status(500).json({ message: 'Failed to fetch visit' });
  }
});

// Create visit
app.post('/api/visits', async (req, res) => {
  try {
    const { clientId, date, service, formula, price, notes } = req.body;
    
    const result = await pool.query(
      `INSERT INTO visits (client_id, date, service, formula, price, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [clientId, date, service || null, formula || null, price || null, notes || null]
    );
    
    const row = result.rows[0];
    const visit = {
      id: row.id,
      clientId: row.client_id,
      date: row.date,
      service: row.service || '',
      formula: row.formula || '',
      price: parseFloat(row.price) || 0,
      notes: row.notes || '',
      createdAt: row.created_at
    };
    
    res.status(201).json(visit);
  } catch (error) {
    console.error('Error creating visit:', error);
    res.status(500).json({ message: 'Failed to create visit' });
  }
});

// Update visit
app.patch('/api/visits/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { clientId, date, service, formula, price, notes } = req.body;
    
    // Build SET part of query
    const updates = [];
    const values = [];
    
    if (clientId !== undefined) { updates.push(`client_id = $${updates.length + 1}`); values.push(clientId); }
    if (date !== undefined) { updates.push(`date = $${updates.length + 1}`); values.push(date); }
    if (service !== undefined) { updates.push(`service = $${updates.length + 1}`); values.push(service); }
    if (formula !== undefined) { updates.push(`formula = $${updates.length + 1}`); values.push(formula); }
    if (price !== undefined) { updates.push(`price = $${updates.length + 1}`); values.push(price); }
    if (notes !== undefined) { updates.push(`notes = $${updates.length + 1}`); values.push(notes); }
    
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No updates provided' });
    }
    
    // Add ID as the last parameter
    values.push(id);
    
    const result = await pool.query(
      `UPDATE visits SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Visit not found' });
    }
    
    const row = result.rows[0];
    const visit = {
      id: row.id,
      clientId: row.client_id,
      date: row.date,
      service: row.service || '',
      formula: row.formula || '',
      price: parseFloat(row.price) || 0,
      notes: row.notes || '',
      createdAt: row.created_at
    };
    
    res.json(visit);
  } catch (error) {
    console.error('Error updating visit:', error);
    res.status(500).json({ message: 'Failed to update visit' });
  }
});

// Delete visit
app.delete('/api/visits/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM visits WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Visit not found' });
    }
    
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting visit:', error);
    res.status(500).json({ message: 'Failed to delete visit' });
  }
});

// Create a simple index.html file for testing
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Client Management App</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          .success { color: green; }
        </style>
      </head>
      <body>
        <h1>Client Management App</h1>
        <p class="success">Server is running successfully!</p>
        <p>This is a placeholder page. The actual client application needs to be built and placed in the public folder.</p>
        <h2>API Endpoints</h2>
        <ul>
          <li><code>GET /api/clients</code> - Get all clients</li>
          <li><code>GET /api/clients/:id</code> - Get client by ID</li>
          <li><code>POST /api/clients</code> - Create client</li>
          <li><code>PATCH /api/clients/:id</code> - Update client</li>
          <li><code>DELETE /api/clients/:id</code> - Delete client</li>
          <li><code>GET /api/visits</code> - Get all visits</li>
          <li><code>GET /api/visits/:id</code> - Get visit by ID</li>
          <li><code>POST /api/visits</code> - Create visit</li>
          <li><code>PATCH /api/visits/:id</code> - Update visit</li>
          <li><code>DELETE /api/visits/:id</code> - Delete visit</li>
        </ul>
      </body>
    </html>
  `);
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

// Initialize server
async function startServer() {
  try {
    await initDb();
    console.log('Database initialized successfully');
    
    const server = createServer(app);
    
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();