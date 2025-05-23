import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClientSchema, insertVisitSchema, Client, Visit } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import path from "path";
import { fileURLToPath } from 'url';

// Handle ES modules path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function registerRoutes(app: Express): Promise<Server> {
  // Clients API endpoints
  app.get("/api/clients", async (req: Request, res: Response) => {
    try {
      const { search, status, sortBy, sortDirection, page, limit } = req.query;
      
      const result = await storage.getClients({
        search: search as string,
        status: status as string,
        sortBy: sortBy ? (sortBy as keyof Client) : undefined,
        sortDirection: sortDirection as 'asc' | 'desc',
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }
      
      const client = await storage.getClient(id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", async (req: Request, res: Response) => {
    try {
      const clientData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(clientData);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  app.patch("/api/clients/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }
      
      const clientData = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(id, clientData);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.json(client);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  // Route for client photo upload
  app.post("/api/clients/:id/photo", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }
      
      // Check if client exists
      const client = await storage.getClient(id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Check if file was uploaded
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const photo = req.files.photo;
      if (Array.isArray(photo)) {
        return res.status(400).json({ message: "Multiple files not supported" });
      }
      
      // Validate file type
      const fileTypes = /jpeg|jpg|png|gif/;
      const mimeType = fileTypes.test(photo.mimetype);
      const extName = fileTypes.test(path.extname(photo.name).toLowerCase());
      
      if (!mimeType || !extName) {
        return res.status(400).json({ 
          message: "Invalid file type. Only JPG, PNG, and GIF files are allowed." 
        });
      }
      
      // Generate a unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(photo.name);
      const fileName = `client-${id}-${uniqueSuffix}${extension}`;
      const uploadPath = path.join(__dirname, '../uploads/clients', fileName);
      
      // Move the file to the uploads directory
      await photo.mv(uploadPath);
      
      // Update client with photo URL
      const photoUrl = `/uploads/clients/${fileName}`;
      const updatedClient = await storage.updateClient(id, { photoUrl });
      
      if (!updatedClient) {
        return res.status(500).json({ message: "Failed to update client with photo" });
      }
      
      res.json({ 
        message: "Photo uploaded successfully", 
        photoUrl, 
        client: updatedClient 
      });
    } catch (error) {
      console.error("Error uploading client photo:", error);
      res.status(500).json({ message: "Failed to upload photo" });
    }
  });
  
  app.delete("/api/clients/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid client ID" });
      }
      
      const result = await storage.deleteClient(id);
      if (!result) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Visits API endpoints
  app.get("/api/visits", async (req: Request, res: Response) => {
    try {
      const { clientId, search, sortBy, sortDirection, page, limit } = req.query;
      
      const result = await storage.getVisits({
        clientId: clientId ? parseInt(clientId as string) : undefined,
        search: search as string,
        sortBy: sortBy ? (sortBy as keyof Visit) : undefined,
        sortDirection: sortDirection as 'asc' | 'desc',
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching visits:", error);
      res.status(500).json({ message: "Failed to fetch visits" });
    }
  });

  app.get("/api/visits/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid visit ID" });
      }
      
      const visit = await storage.getVisit(id);
      if (!visit) {
        return res.status(404).json({ message: "Visit not found" });
      }
      
      res.json(visit);
    } catch (error) {
      console.error("Error fetching visit:", error);
      res.status(500).json({ message: "Failed to fetch visit" });
    }
  });

  app.post("/api/visits", async (req: Request, res: Response) => {
    try {
      // Log the received data for debugging
      console.log("Visit data received:", req.body);
      
      // Attempt to convert date string to Date object if needed
      let processedData = { ...req.body };
      if (processedData.date && typeof processedData.date === 'string') {
        // Extract the date portion only and use Pacific time (UTC-7/8)
        const dateStr = processedData.date.split('T')[0];
        
        // Create date in Pacific time by setting to noon Pacific (add 7/8 hours to get to UTC)
        // This ensures the date stays the same regardless of timezone conversions
        const pacificDate = new Date(`${dateStr}T19:00:00Z`); // UTC+0 equivalent to noon PST
        processedData.date = pacificDate;
      }
      
      // Customize validation to only require date and clientId
      const { clientId, date, ...optionalFields } = processedData;
      const visitData = {
        clientId,
        date,
        service: optionalFields.service || null,
        formula: optionalFields.formula || null,
        price: optionalFields.price || null,
        notes: optionalFields.notes || null
      };
      
      // Verify that the client exists
      const client = await storage.getClient(visitData.clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      const visit = await storage.createVisit(visitData);
      res.status(201).json(visit);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error creating visit:", error);
      res.status(500).json({ message: "Failed to create visit" });
    }
  });

  app.patch("/api/visits/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid visit ID" });
      }
      
      // Log the received data for debugging
      console.log("Visit update data received:", req.body);
      
      // Process the date field to ensure it's a valid Date object
      let processedData = { ...req.body };
      if (processedData.date && typeof processedData.date === 'string') {
        try {
          const dateObj = new Date(processedData.date);
          if (!isNaN(dateObj.getTime())) {
            processedData.date = dateObj;
          }
        } catch (e) {
          console.error("Error parsing date:", e);
        }
      }
      
      const visitData = insertVisitSchema.partial().parse(processedData);
      
      // If clientId is provided, verify that the client exists
      if (visitData.clientId) {
        const client = await storage.getClient(visitData.clientId);
        if (!client) {
          return res.status(404).json({ message: "Client not found" });
        }
      }
      
      const visit = await storage.updateVisit(id, visitData);
      
      if (!visit) {
        return res.status(404).json({ message: "Visit not found" });
      }
      
      res.json(visit);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error updating visit:", error);
      res.status(500).json({ message: "Failed to update visit" });
    }
  });

  app.delete("/api/visits/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid visit ID" });
      }
      
      const result = await storage.deleteVisit(id);
      if (!result) {
        return res.status(404).json({ message: "Visit not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting visit:", error);
      res.status(500).json({ message: "Failed to delete visit" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
