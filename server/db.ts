import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { clients, visits } from '@shared/schema';

// Connect to Postgres database
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql as unknown as NeonQueryFunction<any, any>);

// Initialize tables
export async function initDb() {
  try {
    // Check if tables exist, create them if they don't
    await sql`
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS visits (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        date TIMESTAMP NOT NULL,
        formula TEXT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    console.log('Database tables initialized');
  } catch (error) {
    console.error('Error initializing database tables:', error);
    throw error;
  }
}