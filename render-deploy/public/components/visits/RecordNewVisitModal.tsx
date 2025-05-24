import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { VisitForm } from "@/components/visits/VisitForm";
import { Client } from "@shared/schema";

interface RecordNewVisitModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecordNewVisitModal({ isOpen, onOpenChange }: RecordNewVisitModalProps) {
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isClientSelectMode, setIsClientSelectMode] = useState(true);

  // Fetch clients for selection
  const { data: clientsData, isLoading: isClientsLoading } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const response = await fetch('/api/clients');
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      return response.json();
    },
    enabled: isOpen // Only fetch when modal is open
  });

  const handleVisitSuccess = () => {
    onOpenChange(false);
    setIsClientSelectMode(true);
    setSelectedClientId(null);
    setSearchTerm("");
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['/api/visits'] });
    queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
  };

  const handleClose = () => {
    onOpenChange(false);
    setIsClientSelectMode(true);
    setSelectedClientId(null);
    setSearchTerm("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isClientSelectMode ? "Select a Client" : (() => {
              const selectedClient = clientsData?.clients?.find(
                (client: Client) => client.id === selectedClientId
              );
              return selectedClient 
                ? `New visit for ${selectedClient.firstName} ${selectedClient.lastName}` 
                : "Record New Visit";
            })()}
          </DialogTitle>
        </DialogHeader>
        
        {isClientSelectMode ? (
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
              {isClientsLoading ? (
                <div className="p-4 text-center">Loading clients...</div>
              ) : clientsData?.clients?.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No clients found. Add a client first.
                </div>
              ) : (
                clientsData?.clients
                  .filter((client: Client) => 
                    `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
                    client.phone.includes(searchTerm)
                  )
                  .map((client: Client) => (
                    <div 
                      key={client.id} 
                      className="flex items-center p-3 border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedClientId(client.id);
                        setIsClientSelectMode(false);
                      }}
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
              )}
              
              {!isClientsLoading && clientsData?.clients?.filter((client: Client) => 
                `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
                client.phone.includes(searchTerm)
              ).length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  No clients found matching your search.
                </div>
              )}
            </div>
          </div>
        ) : (
          selectedClientId && (
            <VisitForm 
              clientId={selectedClientId} 
              onClose={handleClose}
              onSuccess={handleVisitSuccess}
            />
          )
        )}
      </DialogContent>
    </Dialog>
  );
}