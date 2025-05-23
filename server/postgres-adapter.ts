import { neon } from '@neondatabase/serverless';
import { IStorage } from './storage';
import {
  Client,
  InsertClient,
  Visit,
  InsertVisit,
  ClientSearchParams,
  VisitSearchParams
} from "@shared/schema";

// Connect to the database using the environment variable
const sql = neon(process.env.DATABASE_URL!);

export class PostgresStorage implements IStorage {
  // Client methods
  async getClient(id: number): Promise<Client | undefined> {
    try {
      const result = await sql`SELECT * FROM clients WHERE id = ${id}`;
      return result.length > 0 ? this.mapRowToClient(result[0]) : undefined;
    } catch (error) {
      console.error('Error getting client:', error);
      throw error;
    }
  }

  async getClients(params?: ClientSearchParams): Promise<{ clients: Client[], total: number }> {
    try {
      // Base query
      let query = `SELECT * FROM clients`;
      let conditions = [];
      let countQuery = `SELECT COUNT(*) FROM clients`;
      
      // Add search filter
      if (params?.search) {
        const searchCondition = `(
          first_name ILIKE '%${params.search}%' OR 
          last_name ILIKE '%${params.search}%' OR 
          email ILIKE '%${params.search}%' OR 
          phone ILIKE '%${params.search}%'
        )`;
        conditions.push(searchCondition);
      }
      
      // Add status filter
      if (params?.status && params.status !== 'all') {
        conditions.push(`status = '${params.status}'`);
      }
      
      // Add WHERE clause if there are conditions
      if (conditions.length > 0) {
        const whereClause = `WHERE ${conditions.join(' AND ')}`;
        query += ` ${whereClause}`;
        countQuery += ` ${whereClause}`;
      }
      
      // Add sorting
      if (params?.sortBy) {
        const column = this.mapClientColumnName(params.sortBy);
        const direction = params.sortDirection === 'desc' ? 'DESC' : 'ASC';
        query += ` ORDER BY ${column} ${direction}`;
      } else {
        query += ` ORDER BY last_name ASC`;
      }
      
      // Add pagination
      if (params?.page !== undefined && params?.limit) {
        const offset = (params.page - 1) * params.limit;
        query += ` LIMIT ${params.limit} OFFSET ${offset}`;
      }
      
      // Execute queries using neon's tagged template literal syntax
      const countResult = await sql`${countQuery}`;
      const result = await sql`${query}`;
      
      const total = parseInt(countResult[0]?.count || '0');
      const clients = result.map(row => this.mapRowToClient(row));
      
      return { clients, total };
    } catch (error) {
      console.error('Error getting clients:', error);
      return { clients: [], total: 0 };
    }
  }

  async createClient(client: InsertClient): Promise<Client> {
    try {
      const result = await sql`
        INSERT INTO clients (
          first_name, last_name, phone, email, address, city, zip, notes, status
        ) VALUES (
          ${client.firstName}, ${client.lastName}, ${client.phone}, 
          ${client.email || null}, ${client.address || null}, 
          ${client.city || null}, ${client.zip || null}, 
          ${client.notes || null}, ${client.status || 'active'}
        ) RETURNING *
      `;
      
      return this.mapRowToClient(result[0]);
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  }

  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined> {
    try {
      // Check if client exists
      const exists = await this.getClient(id);
      if (!exists) return undefined;
      
      // Prepare update values
      const updates = [];
      const values: any[] = [];
      let paramCounter = 1;
      
      if (client.firstName !== undefined) {
        updates.push(`first_name = $${paramCounter}`);
        values.push(client.firstName);
        paramCounter++;
      }
      
      if (client.lastName !== undefined) {
        updates.push(`last_name = $${paramCounter}`);
        values.push(client.lastName);
        paramCounter++;
      }
      
      if (client.phone !== undefined) {
        updates.push(`phone = $${paramCounter}`);
        values.push(client.phone);
        paramCounter++;
      }
      
      if (client.email !== undefined) {
        updates.push(`email = $${paramCounter}`);
        values.push(client.email);
        paramCounter++;
      }
      
      if (client.address !== undefined) {
        updates.push(`address = $${paramCounter}`);
        values.push(client.address);
        paramCounter++;
      }
      
      if (client.city !== undefined) {
        updates.push(`city = $${paramCounter}`);
        values.push(client.city);
        paramCounter++;
      }
      
      if (client.zip !== undefined) {
        updates.push(`zip = $${paramCounter}`);
        values.push(client.zip);
        paramCounter++;
      }
      
      if (client.notes !== undefined) {
        updates.push(`notes = $${paramCounter}`);
        values.push(client.notes);
        paramCounter++;
      }
      
      if (client.status !== undefined) {
        updates.push(`status = $${paramCounter}`);
        values.push(client.status);
        paramCounter++;
      }
      
      // If no updates, return the existing client
      if (updates.length === 0) {
        return exists;
      }
      
      // Execute update
      values.push(id);
      const updateQuery = `
        UPDATE clients
        SET ${updates.join(', ')}
        WHERE id = $${paramCounter}
        RETURNING *
      `;
      
      const result = await sql.query(updateQuery, values);
      
      return this.mapRowToClient(result.rows[0]);
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  }

  async deleteClient(id: number): Promise<boolean> {
    try {
      const result = await sql`
        DELETE FROM clients WHERE id = ${id} RETURNING id
      `;
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting client:', error);
      return false;
    }
  }

  // Visit methods
  async getVisit(id: number): Promise<Visit | undefined> {
    try {
      const result = await sql`SELECT * FROM visits WHERE id = ${id}`;
      return result.length > 0 ? this.mapRowToVisit(result[0]) : undefined;
    } catch (error) {
      console.error('Error getting visit:', error);
      throw error;
    }
  }

  async getVisits(params?: VisitSearchParams): Promise<{ visits: Visit[], total: number }> {
    try {
      // Base query
      let query = `SELECT * FROM visits`;
      let conditions = [];
      let countQuery = `SELECT COUNT(*) FROM visits`;
      
      // Add client filter
      if (params?.clientId) {
        conditions.push(`client_id = ${params.clientId}`);
      }
      
      // Add search filter
      if (params?.search) {
        const searchCondition = `(
          formula ILIKE '%${params.search}%' OR 
          notes ILIKE '%${params.search}%'
        )`;
        conditions.push(searchCondition);
      }
      
      // Add WHERE clause if there are conditions
      if (conditions.length > 0) {
        const whereClause = `WHERE ${conditions.join(' AND ')}`;
        query += ` ${whereClause}`;
        countQuery += ` ${whereClause}`;
      }
      
      // Add sorting
      if (params?.sortBy) {
        const column = this.mapVisitColumnName(params.sortBy);
        const direction = params.sortDirection === 'desc' ? 'DESC' : 'ASC';
        query += ` ORDER BY ${column} ${direction}`;
      } else {
        query += ` ORDER BY date DESC`;
      }
      
      // Add pagination
      if (params?.page !== undefined && params?.limit) {
        const offset = (params.page - 1) * params.limit;
        query += ` LIMIT ${params.limit} OFFSET ${offset}`;
      }
      
      // Execute queries
      const countResult = await sql.query(countQuery);
      const result = await sql.query(query);
      
      const total = parseInt(countResult.rows[0].count);
      const visits = result.rows.map(row => this.mapRowToVisit(row));
      
      return { visits, total };
    } catch (error) {
      console.error('Error getting visits:', error);
      return { visits: [], total: 0 };
    }
  }

  async createVisit(visit: InsertVisit): Promise<Visit> {
    try {
      const result = await sql`
        INSERT INTO visits (
          client_id, date, formula, price, notes
        ) VALUES (
          ${visit.clientId}, ${visit.date}, ${visit.formula}, 
          ${visit.price}, ${visit.notes || null}
        ) RETURNING *
      `;
      
      return this.mapRowToVisit(result[0]);
    } catch (error) {
      console.error('Error creating visit:', error);
      throw error;
    }
  }

  async updateVisit(id: number, visit: Partial<InsertVisit>): Promise<Visit | undefined> {
    try {
      // Check if visit exists
      const exists = await this.getVisit(id);
      if (!exists) return undefined;
      
      // Prepare update values
      const updates = [];
      const values: any[] = [];
      let paramCounter = 1;
      
      if (visit.clientId !== undefined) {
        updates.push(`client_id = $${paramCounter}`);
        values.push(visit.clientId);
        paramCounter++;
      }
      
      if (visit.date !== undefined) {
        updates.push(`date = $${paramCounter}`);
        values.push(visit.date);
        paramCounter++;
      }
      
      if (visit.formula !== undefined) {
        updates.push(`formula = $${paramCounter}`);
        values.push(visit.formula);
        paramCounter++;
      }
      
      if (visit.price !== undefined) {
        updates.push(`price = $${paramCounter}`);
        values.push(visit.price);
        paramCounter++;
      }
      
      if (visit.notes !== undefined) {
        updates.push(`notes = $${paramCounter}`);
        values.push(visit.notes);
        paramCounter++;
      }
      
      // If no updates, return the existing visit
      if (updates.length === 0) {
        return exists;
      }
      
      // Execute update
      values.push(id);
      const updateQuery = `
        UPDATE visits
        SET ${updates.join(', ')}
        WHERE id = $${paramCounter}
        RETURNING *
      `;
      
      const result = await sql.query(updateQuery, values);
      
      return this.mapRowToVisit(result.rows[0]);
    } catch (error) {
      console.error('Error updating visit:', error);
      throw error;
    }
  }

  async deleteVisit(id: number): Promise<boolean> {
    try {
      const result = await sql`
        DELETE FROM visits WHERE id = ${id} RETURNING id
      `;
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting visit:', error);
      return false;
    }
  }

  // Helper methods to map database rows to our types
  private mapRowToClient(row: any): Client {
    return {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      email: row.email,
      address: row.address,
      city: row.city,
      zip: row.zip,
      notes: row.notes,
      status: row.status,
      createdAt: row.created_at
    };
  }

  private mapRowToVisit(row: any): Visit {
    return {
      id: row.id,
      clientId: row.client_id,
      date: row.date,
      formula: row.formula,
      price: row.price,
      notes: row.notes,
      createdAt: row.created_at
    };
  }

  private mapClientColumnName(column: keyof Client): string {
    const columnMap: Record<keyof Client, string> = {
      id: 'id',
      firstName: 'first_name',
      lastName: 'last_name',
      phone: 'phone',
      email: 'email',
      address: 'address',
      city: 'city',
      zip: 'zip',
      notes: 'notes',
      status: 'status',
      createdAt: 'created_at'
    };
    return columnMap[column] || 'last_name';
  }

  private mapVisitColumnName(column: keyof Visit): string {
    const columnMap: Record<keyof Visit, string> = {
      id: 'id',
      clientId: 'client_id',
      date: 'date',
      formula: 'formula',
      price: 'price',
      notes: 'notes',
      createdAt: 'created_at'
    };
    return columnMap[column] || 'date';
  }
}