import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Users, Calendar, BarChart, PlusCircle, UserPlus, Plus, Search
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Client, Visit } from "@shared/schema";
import { useState } from "react";
import { queryClient } from "@/lib/queryClient";
import { VisitForm } from "@/components/visits/VisitForm";
import { ClientForm } from "@/components/clients/ClientForm";

export default function Dashboard() {
  // State for the record visit modal
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [clientSelectMode, setClientSelectMode] = useState(true);
  
  // Fetch recent clients for dashboard
  const { data: clientsData, isLoading: isClientsLoading } = useQuery({
    queryKey: ['/api/clients', '', '', 'createdAt', 'desc', 1, 5],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.append('sortBy', 'createdAt');
      queryParams.append('sortDirection', 'desc');
      queryParams.append('page', '1');
      queryParams.append('limit', '5');

      const response = await fetch(`/api/clients?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      return response.json();
    }
  });

  // Fetch all clients for the modal search
  const { data: allClientsData } = useQuery({
    queryKey: ['/api/clients/all'],
    queryFn: async () => {
      const response = await fetch('/api/clients');
      if (!response.ok) {
        throw new Error('Failed to fetch all clients');
      }
      return response.json();
    },
    enabled: showVisitModal // Only fetch when modal is open
  });

  // Fetch recent visits
  const { data: visitsData, isLoading: isVisitsLoading } = useQuery({
    queryKey: ['/api/visits', '', 'createdAt', 'desc', 1, 5],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.append('sortBy', 'createdAt');
      queryParams.append('sortDirection', 'desc');
      queryParams.append('page', '1');
      queryParams.append('limit', '5');

      const response = await fetch(`/api/visits?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch visits');
      }
      return response.json();
    }
  });

  // Open the modal to select a client
  const handleOpenVisitModal = () => {
    setShowVisitModal(true);
    setClientSelectMode(true);
    setSelectedClientId(null);
    setSearchTerm("");
  };

  // Handle closing the modal
  const handleCloseVisitModal = () => {
    setShowVisitModal(false);
    setClientSelectMode(true);
    setSelectedClientId(null);
    setSearchTerm("");
  };

  // Handle selecting a client
  const handleSelectClient = (clientId: number) => {
    setSelectedClientId(clientId);
    setClientSelectMode(false);
  };

  // Handle visit creation success
  const handleVisitSuccess = () => {
    setShowVisitModal(false);
    setClientSelectMode(true);
    setSelectedClientId(null);
    // Refresh all dashboard data
    queryClient.invalidateQueries({ queryKey: ['/api/visits'] });
    queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
  };

  return (
    <div className="flex-1 bg-gray-50 pt-6 md:p-8">
      <div className="container mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome to your client management system</p>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Total Clients
              </CardTitle>
              <Users className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isClientsLoading ? "..." : clientsData?.total || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {clientsData?.clients?.filter((c: Client) => c.status === "active").length || 0} active
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Recent Visits
              </CardTitle>
              <Calendar className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isVisitsLoading ? "..." : visitsData?.total || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                This month: {
                  visitsData?.visits?.filter((v: Visit) => {
                    const visitDate = new Date(v.date);
                    const today = new Date();
                    return visitDate.getMonth() === today.getMonth() && 
                           visitDate.getFullYear() === today.getFullYear();
                  }).length || 0
                }
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Clients</CardTitle>
                <Link href="/clients">
                  <Button variant="ghost" size="sm" className="text-primary-600">
                    View All
                  </Button>
                </Link>
              </div>
              <CardDescription>Recently added clients</CardDescription>
            </CardHeader>
            <CardContent>
              {isClientsLoading ? (
                <div className="text-center py-4">Loading clients...</div>
              ) : clientsData?.clients?.length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  No clients found. Add your first client to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {clientsData?.clients?.slice(0, 5).map((client: Client) => (
                    <Link href={`/clients/${client.id}`} key={client.id}>
                      <div className="flex items-center p-2 hover:bg-gray-50 rounded-md cursor-pointer">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border border-gray-300">
                          {client.photoUrl ? (
                            <img 
                              src={client.photoUrl} 
                              alt={`${client.firstName} ${client.lastName}`} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-sm font-semibold text-gray-500">
                              {client.firstName.charAt(0)}{client.lastName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <span className="text-sm font-medium text-gray-900">
                            {client.firstName} {client.lastName}
                          </span>
                          <div className="text-xs text-gray-500">Added {formatDate(client.createdAt)}</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setShowClientModal(true)}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add New Client
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Visits</CardTitle>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="text-primary-600">
                    View All
                  </Button>
                </div>
              </div>
              <CardDescription>Latest client visits</CardDescription>
            </CardHeader>
            <CardContent>
              {isVisitsLoading ? (
                <div className="text-center py-4">Loading visits...</div>
              ) : visitsData?.visits?.length === 0 ? (
                <div className="text-center text-gray-500 py-4">
                  No visits recorded yet. Add a visit to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {visitsData?.visits?.slice(0, 5).map((visit: Visit) => {
                    // Find client for this visit
                    const client = clientsData?.clients?.find((c: Client) => c.id === visit.clientId);
                    
                    return (
                    <Link href={`/clients/${visit.clientId}`} key={visit.id}>
                      <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md cursor-pointer">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border border-gray-300">
                            {client && client.photoUrl ? (
                              <img 
                                src={client.photoUrl} 
                                alt={`${client.firstName} ${client.lastName}`} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-sm font-semibold text-gray-500">
                                {client ? `${client.firstName.charAt(0)}${client.lastName.charAt(0)}` : '??'}
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <span className="text-sm font-medium text-gray-900">
                              {client ? `${client.firstName} ${client.lastName}` : `Client #${visit.clientId}`}
                            </span>
                            <div className="text-xs text-gray-500">
                              {visit.service || visit.formula || ''}
                            </div>
                            <div className="text-xs text-gray-500">{formatDate(visit.date)}</div>
                          </div>
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(visit.price)}
                        </div>
                      </div>
                    </Link>
                    );
                  })}
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleOpenVisitModal}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Record New Visit
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Record New Visit Modal */}
      <Dialog open={showVisitModal} onOpenChange={setShowVisitModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {clientSelectMode 
                ? "Select a Client" 
                : selectedClientId && allClientsData?.clients 
                  ? (() => {
                      const selectedClient = allClientsData.clients.find(
                        (c: Client) => c.id === selectedClientId
                      );
                      return selectedClient 
                        ? `New visit for ${selectedClient.firstName} ${selectedClient.lastName}` 
                        : "Record New Visit";
                    })()
                  : "Record New Visit"
              }
            </DialogTitle>
          </DialogHeader>
          
          {clientSelectMode ? (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2"
                />
              </div>
              
              <div className="max-h-[300px] overflow-y-auto border rounded-md">
                {!allClientsData ? (
                  <div className="p-4 text-center">Loading clients...</div>
                ) : allClientsData.clients.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No clients found. Add a client first.
                  </div>
                ) : (
                  <>
                    {allClientsData.clients
                      .filter((client: Client) => 
                        `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        client.phone.includes(searchTerm)
                      )
                      .map((client: Client) => (
                        <div 
                          key={client.id} 
                          className="flex items-center p-3 border-b hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleSelectClient(client.id)}
                        >
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border border-gray-300">
                            <div className="text-sm font-semibold text-gray-500">
                              {client.firstName.charAt(0)}{client.lastName.charAt(0)}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {client.firstName} {client.lastName}
                            </div>
                            <div className="text-xs text-gray-500">{client.phone}</div>
                          </div>
                        </div>
                      ))
                    }
                    
                    {allClientsData.clients.filter((client: Client) => 
                      `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      client.phone.includes(searchTerm)
                    ).length === 0 && (
                      <div className="p-4 text-center text-gray-500">
                        No clients found matching your search.
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            selectedClientId && (
              <div className="space-y-6">
                <form 
                  className="space-y-6"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const date = formData.get('date') as string;
                    const service = formData.get('service') as string;
                    const formula = formData.get('formula') as string;
                    const price = formData.get('price') as string;
                    const notes = formData.get('notes') as string;
                    
                    try {
                      const response = await fetch('/api/visits', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          clientId: selectedClientId,
                          date: new Date(date).toISOString(),
                          service: service || null,
                          formula: formula || null,
                          price: price || null,
                          notes: notes || null
                        })
                      });
                      
                      if (!response.ok) {
                        const error = await response.json();
                        alert(`Error: ${error.message || 'Failed to create visit'}`);
                        return;
                      }
                      
                      handleVisitSuccess();
                    } catch (error) {
                      console.error('Error creating visit:', error);
                      alert(`Error creating visit: ${error}`);
                    }
                  }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
                      <input 
                        type="date" 
                        name="date"
                        defaultValue={new Date().toISOString().split('T')[0]}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                          type="text"
                          name="price"
                          defaultValue="0"
                          className="block w-full rounded-md border-0 py-1.5 pl-7 pr-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                      <input 
                        type="text" 
                        name="service"
                        placeholder="e.g. Hair Coloring, Styling"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Formula</label>
                      <input 
                        type="text" 
                        name="formula"
                        placeholder="Product formula used"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <textarea 
                        name="notes"
                        placeholder="Notes about this visit"
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      ></textarea>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowVisitModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600"
                    >
                      Save Visit
                    </button>
                  </div>
                </form>
              </div>
            )
          )}
          

        </DialogContent>
      </Dialog>

      {/* Add Client Modal */}
      <Dialog open={showClientModal} onOpenChange={setShowClientModal}>
        <DialogContent className="sm:max-w-2xl">
          <ClientForm
            onClose={() => setShowClientModal(false)}
            onSuccess={() => {
              setShowClientModal(false);
              queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}