import { useState } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { queryClient } from "@/lib/queryClient";
import { VisitForm } from "@/components/visits/VisitForm";
import { Client } from "@shared/schema";

interface RecordVisitModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
}

export function RecordVisitModal({ isOpen, onOpenChange, clients }: RecordVisitModalProps) {
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isClientSelectMode, setIsClientSelectMode] = useState(true);

  const handleVisitSuccess = () => {
    onOpenChange(false);
    queryClient.invalidateQueries({ queryKey: ['/api/visits'] });
  };

  const resetModal = () => {
    setIsClientSelectMode(true);
    setSelectedClientId(null);
    setSearchTerm("");
  };

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      resetModal();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isClientSelectMode ? "Select a Client" : "Record New Visit"}
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
              {clients
                .filter((client) => 
                  `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
                  client.phone.includes(searchTerm)
                )
                .map((client) => (
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
              }
              
              {clients.filter(client => 
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
              onClose={() => onOpenChange(false)}
              onSuccess={handleVisitSuccess}
            />
          )
        )}
      </DialogContent>
    </Dialog>
  );
}