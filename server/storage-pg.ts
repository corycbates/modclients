import { db } from './db';
import { eq, like, desc, asc } from 'drizzle-orm';
import {
  clients,
  visits,
  type Client,
  type InsertClient,
  type Visit,
  type InsertVisit,
  type ClientSearchParams,
  type VisitSearchParams
} from "@shared/schema";

export class PgStorage {
  // Client methods
  async getClient(id: number): Promise<Client | undefined> {
    const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    return result[0];
  }

  async getClients(params?: ClientSearchParams): Promise<{ clients: Client[], total: number }> {
    let query = db.select().from(clients);
    
    // Apply filters
    if (params?.search) {
      const searchTerm = `%${params.search}%`;
      query = query.where(
        like(clients.firstName, searchTerm) || 
        like(clients.lastName, searchTerm) || 
        like(clients.email, searchTerm) || 
        like(clients.phone, searchTerm)
      );
    }
    
    if (params?.status) {
      query = query.where(eq(clients.status, params.status));
    }
    
    // Get total count before pagination
    const countResult = await db.select({ count: db.fn.count() }).from(clients);
    const total = Number(countResult[0].count);
    
    // Apply sorting
    if (params?.sortBy) {
      const column = clients[params.sortBy as keyof typeof clients];
      if (column) {
        if (params.sortDirection === 'desc') {
          query = query.orderBy(desc(column));
        } else {
          query = query.orderBy(asc(column));
        }
      }
    } else {
      // Default sort by lastName
      query = query.orderBy(asc(clients.lastName));
    }
    
    // Apply pagination
    if (params?.page !== undefined && params?.limit) {
      const offset = (params.page - 1) * params.limit;
      query = query.limit(params.limit).offset(offset);
    }
    
    const result = await query;
    return { clients: result, total };
  }

  async createClient(clientData: InsertClient): Promise<Client> {
    const result = await db.insert(clients).values(clientData).returning();
    return result[0];
  }

  async updateClient(id: number, clientData: Partial<InsertClient>): Promise<Client | undefined> {
    const result = await db.update(clients)
      .set(clientData)
      .where(eq(clients.id, id))
      .returning();
    
    return result[0];
  }

  async deleteClient(id: number): Promise<boolean> {
    const result = await db.delete(clients).where(eq(clients.id, id)).returning();
    return result.length > 0;
  }

  // Visit methods
  async getVisit(id: number): Promise<Visit | undefined> {
    const result = await db.select().from(visits).where(eq(visits.id, id)).limit(1);
    return result[0];
  }

  async getVisits(params?: VisitSearchParams): Promise<{ visits: Visit[], total: number }> {
    let query = db.select().from(visits);
    
    // Apply filters
    if (params?.clientId) {
      query = query.where(eq(visits.clientId, params.clientId));
    }
    
    if (params?.search) {
      const searchTerm = `%${params.search}%`;
      query = query.where(
        like(visits.formula, searchTerm) || 
        like(visits.notes, searchTerm)
      );
    }
    
    // Get total count before pagination
    const countResult = await db.select({ count: db.fn.count() }).from(visits);
    const total = Number(countResult[0].count);
    
    // Apply sorting
    if (params?.sortBy) {
      const column = visits[params.sortBy as keyof typeof visits];
      if (column) {
        if (params.sortDirection === 'desc') {
          query = query.orderBy(desc(column));
        } else {
          query = query.orderBy(asc(column));
        }
      }
    } else {
      // Default sort by date descending
      query = query.orderBy(desc(visits.date));
    }
    
    // Apply pagination
    if (params?.page !== undefined && params?.limit) {
      const offset = (params.page - 1) * params.limit;
      query = query.limit(params.limit).offset(offset);
    }
    
    const result = await query;
    return { visits: result, total };
  }

  async createVisit(visitData: InsertVisit): Promise<Visit> {
    const result = await db.insert(visits).values(visitData).returning();
    return result[0];
  }

  async updateVisit(id: number, visitData: Partial<InsertVisit>): Promise<Visit | undefined> {
    const result = await db.update(visits)
      .set(visitData)
      .where(eq(visits.id, id))
      .returning();
    
    return result[0];
  }

  async deleteVisit(id: number): Promise<boolean> {
    const result = await db.delete(visits).where(eq(visits.id, id)).returning();
    return result.length > 0;
  }
}