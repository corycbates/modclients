import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import fileUpload from 'express-fileupload';
import { Pool } from 'pg';
import { createServer } from 'http';
import { drizzle } from 'drizzle-orm/node-postgres';
import { clients, visits } from './shared/schema.js';

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure environment
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 5000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProd ? { rejectUnauthorized: false } : false
});

const db = drizzle(pool, { schema: { clients, visits } });

// Initialize database tables
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

// Serve static files
const publicPath = isProd 
  ? path.join(__dirname, 'dist/client') 
  : path.join(__dirname, 'client/dist');

app.use(express.static(publicPath));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes

// Client routes
app.get('/api/clients', async (req, res) => {
  try {
    const { search, status, sortBy = 'id', sortDirection = 'asc', page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = db.select().from(clients);
    
    // Apply filters
    if (search) {
      query = query.where(sql`first_name ILIKE ${`%${search}%`} OR last_name ILIKE ${`%${search}%`} OR phone ILIKE ${`%${search}%`}`);
    }
    
    if (status) {
      query = query.where(sql`status = ${status}`);
    }
    
    // Get total count before pagination
    const totalResult = await db.select({ count: sql`COUNT(*)` }).from(clients);
    const total = parseInt(totalResult[0].count);
    
    // Apply sorting and pagination
    query = query.orderBy(sql`${sortBy} ${sortDirection === 'desc' ? 'DESC' : 'ASC'}`);
    query = query.limit(limit).offset(offset);
    
    const results = await query;
    
    // Map results to expected format
    const clientsList = results.map(row => ({
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
    
    res.json({ clients: clientsList, total });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ message: 'Failed to fetch clients' });
  }
});

app.get('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [client] = await db.select().from(clients).where(sql`id = ${id}`);
    
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }
    
    // Map to expected format
    const mappedClient = {
      id: client.id,
      firstName: client.first_name,
      lastName: client.last_name,
      phone: client.phone,
      email: client.email || '',
      address: client.address || '',
      city: client.city || '',
      zip: client.zip || '',
      notes: client.notes || '',
      status: client.status,
      photoUrl: client.photo_url || '',
      createdAt: client.created_at
    };
    
    res.json(mappedClient);
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ message: 'Failed to fetch client' });
  }
});

app.post('/api/clients', async (req, res) => {
  try {
    const { firstName, lastName, phone, email, address, city, zip, notes, status } = req.body;
    
    const [client] = await db.insert(clients).values({
      first_name: firstName,
      last_name: lastName,
      phone: phone,
      email: email,
      address: address,
      city: city,
      zip: zip,
      notes: notes,
      status: status || 'active'
    }).returning();
    
    // Map to expected format
    const mappedClient = {
      id: client.id,
      firstName: client.first_name,
      lastName: client.last_name,
      phone: client.phone,
      email: client.email || '',
      address: client.address || '',
      city: client.city || '',
      zip: client.zip || '',
      notes: client.notes || '',
      status: client.status,
      photoUrl: client.photo_url || '',
      createdAt: client.created_at
    };
    
    res.status(201).json(mappedClient);
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ message: 'Failed to create client' });
  }
});

app.patch('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, email, address, city, zip, notes, status, photoUrl } = req.body;
    
    // Map to database column names
    const updateData = {};
    if (firstName !== undefined) updateData.first_name = firstName;
    if (lastName !== undefined) updateData.last_name = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (zip !== undefined) updateData.zip = zip;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;
    if (photoUrl !== undefined) updateData.photo_url = photoUrl;
    
    const [client] = await db.update(clients)
      .set(updateData)
      .where(sql`id = ${id}`)
      .returning();
    
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }
    
    // Map to expected format
    const mappedClient = {
      id: client.id,
      firstName: client.first_name,
      lastName: client.last_name,
      phone: client.phone,
      email: client.email || '',
      address: client.address || '',
      city: client.city || '',
      zip: client.zip || '',
      notes: client.notes || '',
      status: client.status,
      photoUrl: client.photo_url || '',
      createdAt: client.created_at
    };
    
    res.json(mappedClient);
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ message: 'Failed to update client' });
  }
});

app.delete('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(clients).where(sql`id = ${id}`);
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ message: 'Failed to delete client' });
  }
});

// Visit routes
app.get('/api/visits', async (req, res) => {
  try {
    const { clientId, search, sortBy = 'date', sortDirection = 'desc', page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = db.select().from(visits);
    
    // Apply filters
    if (clientId) {
      query = query.where(sql`client_id = ${clientId}`);
    }
    
    if (search) {
      query = query.where(sql`service ILIKE ${`%${search}%`} OR formula ILIKE ${`%${search}%`} OR notes ILIKE ${`%${search}%`}`);
    }
    
    // Get total count before pagination
    const totalResult = await db.select({ count: sql`COUNT(*)` }).from(visits);
    const total = parseInt(totalResult[0].count);
    
    // Apply sorting and pagination
    query = query.orderBy(sql`${sortBy} ${sortDirection === 'desc' ? 'DESC' : 'ASC'}`);
    query = query.limit(limit).offset(offset);
    
    const results = await query;
    
    // Map results to expected format
    const visitsList = results.map(row => ({
      id: row.id,
      clientId: row.client_id,
      date: row.date,
      service: row.service || '',
      formula: row.formula || '',
      price: row.price || 0,
      notes: row.notes || '',
      createdAt: row.created_at
    }));
    
    res.json({ visits: visitsList, total });
  } catch (error) {
    console.error('Error fetching visits:', error);
    res.status(500).json({ message: 'Failed to fetch visits' });
  }
});

app.get('/api/visits/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [visit] = await db.select().from(visits).where(sql`id = ${id}`);
    
    if (!visit) {
      return res.status(404).json({ message: 'Visit not found' });
    }
    
    // Map to expected format
    const mappedVisit = {
      id: visit.id,
      clientId: visit.client_id,
      date: visit.date,
      service: visit.service || '',
      formula: visit.formula || '',
      price: visit.price || 0,
      notes: visit.notes || '',
      createdAt: visit.created_at
    };
    
    res.json(mappedVisit);
  } catch (error) {
    console.error('Error fetching visit:', error);
    res.status(500).json({ message: 'Failed to fetch visit' });
  }
});

app.post('/api/visits', async (req, res) => {
  try {
    const { clientId, date, service, formula, price, notes } = req.body;
    
    const [visit] = await db.insert(visits).values({
      client_id: clientId,
      date: date,
      service: service,
      formula: formula,
      price: price,
      notes: notes
    }).returning();
    
    // Map to expected format
    const mappedVisit = {
      id: visit.id,
      clientId: visit.client_id,
      date: visit.date,
      service: visit.service || '',
      formula: visit.formula || '',
      price: visit.price || 0,
      notes: visit.notes || '',
      createdAt: visit.created_at
    };
    
    res.status(201).json(mappedVisit);
  } catch (error) {
    console.error('Error creating visit:', error);
    res.status(500).json({ message: 'Failed to create visit' });
  }
});

app.patch('/api/visits/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { clientId, date, service, formula, price, notes } = req.body;
    
    // Map to database column names
    const updateData = {};
    if (clientId !== undefined) updateData.client_id = clientId;
    if (date !== undefined) updateData.date = date;
    if (service !== undefined) updateData.service = service;
    if (formula !== undefined) updateData.formula = formula;
    if (price !== undefined) updateData.price = price;
    if (notes !== undefined) updateData.notes = notes;
    
    const [visit] = await db.update(visits)
      .set(updateData)
      .where(sql`id = ${id}`)
      .returning();
    
    if (!visit) {
      return res.status(404).json({ message: 'Visit not found' });
    }
    
    // Map to expected format
    const mappedVisit = {
      id: visit.id,
      clientId: visit.client_id,
      date: visit.date,
      service: visit.service || '',
      formula: visit.formula || '',
      price: visit.price || 0,
      notes: visit.notes || '',
      createdAt: visit.created_at
    };
    
    res.json(mappedVisit);
  } catch (error) {
    console.error('Error updating visit:', error);
    res.status(500).json({ message: 'Failed to update visit' });
  }
});

app.delete('/api/visits/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(visits).where(sql`id = ${id}`);
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting visit:', error);
    res.status(500).json({ message: 'Failed to delete visit' });
  }
});

// SPA fallback - serve index.html for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
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