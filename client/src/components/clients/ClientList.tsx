import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { 
  Search, Plus, ArrowUpDown, MoreHorizontal, Edit, 
  UserPlus, Eye, Trash2, ChevronLeft, ChevronRight
} from "lucide-react";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientForm } from "./ClientForm";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Client } from "@shared/schema";
import { formatDate, getInitials, getStatusColor } from "@/lib/utils";

export function ClientList() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState<string>("lastName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isEditClientOpen, setIsEditClientOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Fetch clients
  const { data, isLoading, isError } = useQuery({
    queryKey: ['/api/clients', search, status, sortBy, sortDirection, page, limit],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (status) queryParams.append('status', status);
      if (sortBy) queryParams.append('sortBy', sortBy);
      if (sortDirection) queryParams.append('sortDirection', sortDirection);
      queryParams.append('page', page.toString());
      queryParams.append('limit', limit.toString());

      const response = await fetch(`/api/clients?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      return response.json();
    }
  });

  // Delete client mutation
  const deleteClientMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: "Client deleted",
        description: "The client has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting client",
        description: error.message || "Failed to delete client",
        variant: "destructive",
      });
    }
  });

  // Handle sort
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("asc");
    }
  };

  // Handle delete client
  const handleDeleteClient = (id: number) => {
    if (window.confirm("Are you sure you want to delete this client?")) {
      deleteClientMutation.mutate(id);
    }
  };

  // Handle edit client
  const handleEditClient = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedClient(client);
    setIsEditClientOpen(true);
  };

  // Handle view client
  const handleViewClient = (id: number) => {
    navigate(`/clients/${id}`);
  };

  // Render colors for status badge
  const renderStatusBadge = (status: string) => {
    const { bg, text } = getStatusColor(status);
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bg} ${text}`}>
        {status || "Unknown"}
      </span>
    );
  };

  return (
    <div className="flex-1 bg-gray-50 pt-6 md:p-8">
      <div className="container mx-auto max-w-6xl">
        <header className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Clients</h1>
              <p className="text-gray-500 mt-1">Manage your client database</p>
            </div>
            <div className="mt-4 md:mt-0">
              <Button
                onClick={() => setIsAddClientOpen(true)}
                className="bg-primary-500 hover:bg-primary-600 text-white"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Add New Client
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="col-span-1 md:col-span-5">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search clients..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2"
                />
              </div>
            </div>
            <div className="col-span-1 md:col-span-3 md:flex md:justify-end md:pr-2">
              <Button
                onClick={() => setIsAddClientOpen(true)}
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Add Client
              </Button>
            </div>
            <div className="col-span-1 md:col-span-4">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>

        {/* Client List Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-8 text-center">Loading clients...</div>
            ) : isError ? (
              <div className="p-8 text-center text-red-500">Error loading clients</div>
            ) : data?.clients?.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No clients found. Add your first client to get started.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("lastName")}
                        className="flex items-center text-xs font-semibold text-gray-500 uppercase"
                      >
                        Name
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("phone")}
                        className="flex items-center text-xs font-semibold text-gray-500 uppercase"
                      >
                        Phone
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("createdAt")}
                        className="flex items-center text-xs font-semibold text-gray-500 uppercase"
                      >
                        Last Visit
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("status")}
                        className="flex items-center text-xs font-semibold text-gray-500 uppercase"
                      >
                        Status
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.clients.map((client: Client) => (
                    <TableRow
                      key={client.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleViewClient(client.id)}
                    >
                      <TableCell>
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border border-gray-300">
                            {client.photoUrl ? (
                              <img 
                                src={client.photoUrl} 
                                alt={`${client.firstName} ${client.lastName}`} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-sm font-semibold text-gray-500">
                                {getInitials(client.firstName, client.lastName)}
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {client.firstName} {client.lastName}
                            </div>
                            <div className="text-sm text-gray-500 hidden md:block">
                              {client.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-900">{client.phone}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="text-sm text-gray-900">
                          {formatDate(client.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {renderStatusBadge(client.status || "active")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleEditClient(client, e)}
                          className="text-primary-500 hover:text-primary-700 mr-3"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleViewClient(client.id);
                            }}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleEditClient(client, e);
                            }}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Client
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClient(client.id);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Client
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          
          {/* Pagination */}
          {data && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{((page - 1) * limit) + 1}</span> to{" "}
                    <span className="font-medium">
                      {Math.min(page * limit, data.total)}
                    </span>{" "}
                    of <span className="font-medium">{data.total}</span> clients
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md"
                    >
                      <span className="sr-only">Previous</span>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    {/* Page numbers - simplified for clarity */}
                    {Array.from({ length: Math.min(5, Math.ceil(data.total / limit)) }).map((_, i) => (
                      <Button
                        key={i}
                        variant={page === i + 1 ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => setPage(i + 1)}
                        className="relative inline-flex items-center px-4 py-2"
                      >
                        {i + 1}
                      </Button>
                    ))}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.min(Math.ceil(data.total / limit), page + 1))}
                      disabled={page === Math.ceil(data.total / limit)}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md"
                    >
                      <span className="sr-only">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </nav>
                </div>
              </div>
              
              <div className="flex sm:hidden justify-between w-full">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(Math.ceil(data.total / limit), page + 1))}
                  disabled={page === Math.ceil(data.total / limit)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Client Modal */}
      <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
        <DialogContent className="sm:max-w-2xl">
          <ClientForm
            onClose={() => setIsAddClientOpen(false)}
            onSuccess={() => {
              setIsAddClientOpen(false);
              queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Client Modal */}
      <Dialog open={isEditClientOpen} onOpenChange={setIsEditClientOpen}>
        <DialogContent className="sm:max-w-2xl">
          {selectedClient && (
            <ClientForm
              client={selectedClient}
              onClose={() => setIsEditClientOpen(false)}
              onSuccess={() => {
                setIsEditClientOpen(false);
                queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
