import { pgTable, text, serial, integer, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Client table schema
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  zip: text("zip"),
  notes: text("notes"),
  status: text("status").default("active"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Visit table schema
export const visits = pgTable("visits", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  date: timestamp("date").notNull(),
  service: text("service"),
  formula: text("formula"),
  price: numeric("price", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Create insert schemas
export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
});

export const insertVisitSchema = createInsertSchema(visits).omit({
  id: true,
  createdAt: true,
});

// Create select types
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type Visit = typeof visits.$inferSelect;
export type InsertVisit = z.infer<typeof insertVisitSchema>;

// Custom search params type for clients
export type ClientSearchParams = {
  search?: string;
  status?: string;
  sortBy?: keyof Client;
  sortDirection?: 'asc' | 'desc';
  page?: number;
  limit?: number;
};

// Custom search params type for visits
export type VisitSearchParams = {
  clientId?: number;
  search?: string;
  sortBy?: keyof Visit;
  sortDirection?: 'asc' | 'desc';
  page?: number;
  limit?: number;
};
