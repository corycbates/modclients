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

export interface IStorage {
  // Client methods
  getClient(id: number): Promise<Client | undefined>;
  getClients(params?: ClientSearchParams): Promise<{ clients: Client[], total: number }>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<boolean>;
  
  // Visit methods
  getVisit(id: number): Promise<Visit | undefined>;
  getVisits(params?: VisitSearchParams): Promise<{ visits: Visit[], total: number }>;
  createVisit(visit: InsertVisit): Promise<Visit>;
  updateVisit(id: number, visit: Partial<InsertVisit>): Promise<Visit | undefined>;
  deleteVisit(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private clients: Map<number, Client>;
  private visits: Map<number, Visit>;
  private clientIdCounter: number;
  private visitIdCounter: number;

  constructor() {
    this.clients = new Map();
    this.visits = new Map();
    this.clientIdCounter = 6; // Start after our sample data
    this.visitIdCounter = 10; // Start after our sample data
    
    // Add sample client data
    this.clients.set(1, {
      id: 1,
      firstName: 'Sarah',
      lastName: 'Johnson',
      phone: '555-123-4567',
      email: 'sarah.j@example.com',
      address: '123 Main Street',
      city: 'Springfield',
      zip: '12345',
      notes: 'Regular client, prefers appointments on Tuesdays',
      status: 'active',
      createdAt: new Date()
    });
    
    this.clients.set(2, {
      id: 2,
      firstName: 'Michael',
      lastName: 'Williams',
      phone: '555-234-5678',
      email: 'mwilliams@example.com',
      address: '456 Oak Avenue',
      city: 'Riverdale',
      zip: '23456',
      notes: 'Allergic to certain products, check notes before appointment',
      status: 'active',
      createdAt: new Date()
    });
    
    this.clients.set(3, {
      id: 3,
      firstName: 'Jessica',
      lastName: 'Brown',
      phone: '555-345-6789',
      email: 'jess.brown@example.com',
      address: '789 Pine Road',
      city: 'Maplewood',
      zip: '34567',
      notes: 'Referred by Sarah Johnson',
      status: 'active',
      createdAt: new Date()
    });
    
    this.clients.set(4, {
      id: 4,
      firstName: 'David',
      lastName: 'Miller',
      phone: '555-456-7890',
      email: 'dmiller@example.com',
      address: '101 Cedar Lane',
      city: 'Oakville',
      zip: '45678',
      notes: 'New client, first visit scheduled for next week',
      status: 'active',
      createdAt: new Date()
    });
    
    this.clients.set(5, {
      id: 5,
      firstName: 'Emily',
      lastName: 'Davis',
      phone: '555-567-8901',
      email: 'emily.d@example.com',
      address: '202 Elm Street',
      city: 'Brookside',
      zip: '56789',
      notes: 'Prefers morning appointments',
      status: 'inactive',
      createdAt: new Date()
    });
    
    // Add sample visit data
    this.visits.set(1, {
      id: 1,
      clientId: 1,
      date: new Date('2023-01-15'),
      formula: 'Basic Treatment',
      price: '75.00',
      notes: 'First visit, client was very satisfied',
      createdAt: new Date()
    });
    
    this.visits.set(2, {
      id: 2,
      clientId: 1,
      date: new Date('2023-02-20'),
      formula: 'Premium Package',
      price: '120.00',
      notes: 'Added deep conditioning treatment',
      createdAt: new Date()
    });
    
    this.visits.set(3, {
      id: 3,
      clientId: 1,
      date: new Date('2023-03-25'),
      formula: 'Color and Style',
      price: '150.00',
      notes: 'Changed to auburn color',
      createdAt: new Date()
    });
    
    this.visits.set(4, {
      id: 4,
      clientId: 2,
      date: new Date('2023-02-05'),
      formula: 'Consultation',
      price: '50.00',
      notes: 'Discussed treatment options and products',
      createdAt: new Date()
    });
    
    this.visits.set(5, {
      id: 5,
      clientId: 2,
      date: new Date('2023-03-10'),
      formula: 'Custom Formula #A12',
      price: '95.00',
      notes: 'Used hypoallergenic products',
      createdAt: new Date()
    });
    
    this.visits.set(6, {
      id: 6,
      clientId: 3,
      date: new Date('2023-02-18'),
      formula: 'Basic Treatment',
      price: '75.00',
      notes: 'New client referral discount applied',
      createdAt: new Date()
    });
    
    this.visits.set(7, {
      id: 7,
      clientId: 3,
      date: new Date('2023-04-01'),
      formula: 'Special Occasion Style',
      price: '130.00',
      notes: 'Styling for wedding attendance',
      createdAt: new Date()
    });
    
    this.visits.set(8, {
      id: 8,
      clientId: 4,
      date: new Date('2023-04-05'),
      formula: 'Initial Consultation',
      price: '40.00',
      notes: 'Assessment and treatment plan',
      createdAt: new Date()
    });
    
    this.visits.set(9, {
      id: 9,
      clientId: 5,
      date: new Date('2022-11-20'),
      formula: 'Premium Package',
      price: '120.00',
      notes: 'Last visit before becoming inactive',
      createdAt: new Date()
    });
  }

  // Client methods
  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async getClients(params?: ClientSearchParams): Promise<{ clients: Client[], total: number }> {
    let filteredClients = Array.from(this.clients.values());
    
    if (params?.search) {
      const searchTerm = params.search.toLowerCase();
      filteredClients = filteredClients.filter(client => 
        client.firstName.toLowerCase().includes(searchTerm) ||
        client.lastName.toLowerCase().includes(searchTerm) ||
        client.email?.toLowerCase().includes(searchTerm) ||
        client.phone.includes(searchTerm)
      );
    }
    
    if (params?.status) {
      filteredClients = filteredClients.filter(client => 
        client.status === params.status
      );
    }
    
    const total = filteredClients.length;
    
    if (params?.sortBy) {
      const sortDirection = params.sortDirection === 'desc' ? -1 : 1;
      filteredClients.sort((a, b) => {
        const aValue = a[params.sortBy!];
        const bValue = b[params.sortBy!];
        
        if (aValue === null) return sortDirection;
        if (bValue === null) return -sortDirection;
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection * aValue.localeCompare(bValue);
        }
        
        return sortDirection * ((aValue < bValue) ? -1 : (aValue > bValue) ? 1 : 0);
      });
    } else {
      // Default sort by lastName
      filteredClients.sort((a, b) => a.lastName.localeCompare(b.lastName));
    }
    
    // Pagination
    if (params?.page !== undefined && params?.limit) {
      const start = (params.page - 1) * params.limit;
      const end = start + params.limit;
      filteredClients = filteredClients.slice(start, end);
    }
    
    return { clients: filteredClients, total };
  }

  async createClient(clientData: InsertClient): Promise<Client> {
    const id = this.clientIdCounter++;
    const createdAt = new Date();
    const client: Client = { 
      id, 
      ...clientData, 
      email: clientData.email || null,
      address: clientData.address || null,
      city: clientData.city || null,
      zip: clientData.zip || null,
      notes: clientData.notes || null,
      status: clientData.status || "active",
      createdAt 
    };
    this.clients.set(id, client);
    return client;
  }

  async updateClient(id: number, clientData: Partial<InsertClient>): Promise<Client | undefined> {
    const existingClient = this.clients.get(id);
    if (!existingClient) return undefined;
    
    const updatedClient = { ...existingClient, ...clientData };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }

  async deleteClient(id: number): Promise<boolean> {
    // Find all visits for this client and delete them
    const clientVisits = Array.from(this.visits.values()).filter(v => v.clientId === id);
    clientVisits.forEach(visit => this.visits.delete(visit.id));
    
    return this.clients.delete(id);
  }

  // Visit methods
  async getVisit(id: number): Promise<Visit | undefined> {
    return this.visits.get(id);
  }

  async getVisits(params?: VisitSearchParams): Promise<{ visits: Visit[], total: number }> {
    let filteredVisits = Array.from(this.visits.values());
    
    if (params?.clientId) {
      filteredVisits = filteredVisits.filter(visit => 
        visit.clientId === params.clientId
      );
    }
    
    if (params?.search) {
      const searchTerm = params.search.toLowerCase();
      filteredVisits = filteredVisits.filter(visit => 
        visit.formula.toLowerCase().includes(searchTerm) ||
        visit.notes?.toLowerCase().includes(searchTerm)
      );
    }
    
    const total = filteredVisits.length;
    
    if (params?.sortBy) {
      const sortDirection = params.sortDirection === 'desc' ? -1 : 1;
      filteredVisits.sort((a, b) => {
        const aValue = a[params.sortBy!];
        const bValue = b[params.sortBy!];
        
        if (aValue === null) return sortDirection;
        if (bValue === null) return -sortDirection;
        
        if (aValue instanceof Date && bValue instanceof Date) {
          return sortDirection * (aValue.getTime() - bValue.getTime());
        }
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection * aValue.localeCompare(bValue);
        }
        
        return sortDirection * ((aValue < bValue) ? -1 : (aValue > bValue) ? 1 : 0);
      });
    } else {
      // Default sort by date descending
      filteredVisits.sort((a, b) => {
        if (a.date instanceof Date && b.date instanceof Date) {
          return b.date.getTime() - a.date.getTime();
        }
        return 0;
      });
    }
    
    // Pagination
    if (params?.page !== undefined && params?.limit) {
      const start = (params.page - 1) * params.limit;
      const end = start + params.limit;
      filteredVisits = filteredVisits.slice(start, end);
    }
    
    return { visits: filteredVisits, total };
  }

  async createVisit(visitData: InsertVisit): Promise<Visit> {
    const id = this.visitIdCounter++;
    const createdAt = new Date();
    const visit: Visit = { 
      id, 
      clientId: visitData.clientId,
      date: visitData.date,
      service: visitData.service || null,
      formula: visitData.formula || "",
      price: visitData.price || "0",
      notes: visitData.notes || null,
      createdAt 
    };
    this.visits.set(id, visit);
    return visit;
  }

  async updateVisit(id: number, visitData: Partial<InsertVisit>): Promise<Visit | undefined> {
    const existingVisit = this.visits.get(id);
    if (!existingVisit) return undefined;
    
    const updatedVisit = { ...existingVisit, ...visitData };
    this.visits.set(id, updatedVisit);
    return updatedVisit;
  }

  async deleteVisit(id: number): Promise<boolean> {
    return this.visits.delete(id);
  }
}

// Import in-memory storage for now since there's an issue with the PostgreSQL adapter
// We'll use in-memory storage to demonstrate functionality while the PostgreSQL integration is being fixed
export const storage = new MemStorage();
