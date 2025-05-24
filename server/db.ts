import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { clients, visits } from '@shared/schema';

// Connect to Postgres database
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export const db = drizzle(pool, { schema: { clients, visits } });

// Initialize tables
export async function initDb() {
  try {
    // Check if tables exist, create them if they don't
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
    
    // Check if there's any data, if not, add sample data
    const clientCount = await pool.query('SELECT COUNT(*) FROM clients');
    if (parseInt(clientCount.rows[0].count) === 0) {
      // Add sample clients
      await pool.query(`
        INSERT INTO clients (first_name, last_name, phone, email, address, city, zip, status)
        VALUES 
          ('Sarah', 'Johnson', '555-123-4567', 'sarah.j@example.com', '123 Main St', 'Springfield', '12345', 'active'),
          ('Michael', 'Williams', '555-987-6543', 'mike.w@example.com', '456 Oak Ave', 'Riverdale', '67890', 'active'),
          ('Emily', 'Davis', '555-555-5555', 'emily.d@example.com', '789 Pine Rd', 'Lakeside', '45678', 'inactive');
      `);
      
      // Add sample visits
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
      console.log("Sample data added to the database");
    }
    
    console.log('Database tables initialized');
  } catch (error) {
    console.error('Error initializing database tables:', error);
    throw error;
  }
}