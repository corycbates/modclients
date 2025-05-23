import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  ArrowLeft, Phone, Mail, Edit, Plus, Search, 
  ArrowUpDown, Eye, MoreHorizontal, Trash2,
  CheckCircle, CalendarCheck, Camera, Upload
} from "lucide-react";
import { 
  Card, CardContent, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { VisitForm } from "../visits/VisitForm";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ClientForm } from "./ClientForm";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Client, Visit } from "@shared/schema";
import { formatDate, formatCurrency } from "@/lib/utils";
import { VisitList } from "../visits/VisitList";

interface ClientDetailProps {
  id: string;
}

export function ClientDetail({ id }: ClientDetailProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const parsedId = parseInt(id);
  const [isEditClientOpen, setIsEditClientOpen] = useState(false);
  const [isAddVisitOpen, setIsAddVisitOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch client details
  const { data: client, isLoading: isClientLoading, isError: isClientError } = useQuery({
    queryKey: [`/api/clients/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch client details');
      }
      return response.json();
    }
  });

  // Fetch client visits
  const { data: visitsData, isLoading: isVisitsLoading, isError: isVisitsError } = useQuery({
    queryKey: [`/api/visits`, { clientId: parsedId }],
    queryFn: async () => {
      const response = await fetch(`/api/visits?clientId=${parsedId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch client visits');
      }
      return response.json();
    }
  });

  // Handle view visit details
  const [isViewVisitOpen, setIsViewVisitOpen] = useState(false);
  const handleViewVisit = (visit: Visit) => {
    setSelectedVisit(visit);
    setIsViewVisitOpen(true);
  };

  // Handle back button
  const handleBack = () => {
    navigate('/clients');
  };
  
  // Photo upload mutation
  const photoUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('photo', file);
      
      const response = await fetch(`/api/clients/${id}/photo`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload photo');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setIsUploading(false);
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${id}`] });
      toast({
        title: "Photo uploaded",
        description: "The client photo has been uploaded successfully.",
      });
    },
    onError: (error: Error) => {
      setIsUploading(false);
      toast({
        title: "Error uploading photo",
        description: error.message || "Failed to upload photo",
        variant: "destructive",
      });
    }
  });
  
  // Handle photo upload
  const handlePhotoUpload = () => {
    fileInputRef.current?.click();
  };
  
  // Handle file change
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image less than 5MB",
        variant: "destructive",
      });
      return;
    }
    
    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select a JPG, PNG, or GIF image",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    photoUploadMutation.mutate(file);
  };

  if (isClientLoading) {
    return <div className="p-8 text-center">Loading client details...</div>;
  }

  if (isClientError || !client) {
    return (
      <div className="p-8 text-center text-red-500">
        Error loading client details. 
        <Button variant="link" onClick={handleBack}>
          Go back to client list
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 pt-6 md:p-8">
      <div className="container mx-auto max-w-5xl">
        <header className="mb-8">
          <div className="flex items-center mb-4">
            <Button variant="ghost" size="icon" onClick={handleBack} className="text-gray-600 hover:text-primary-600 mr-4">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-gray-800">
              {client.firstName} {client.lastName}
            </h1>
          </div>
          <div className="flex flex-wrap md:flex-nowrap gap-4 md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
                <CheckCircle className="mr-1 h-3 w-3" /> {client.status || "Active"}
              </Badge>
              <Badge variant="outline" className="bg-primary-100 text-primary-800 hover:bg-primary-100">
                <CalendarCheck className="mr-1 h-3 w-3" /> {visitsData?.total || 0} Visits
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="text-gray-600 border-gray-300">
                <Phone className="mr-2 h-4 w-4" />
                Call
              </Button>
              {client.email && (
                <Button variant="outline" className="text-gray-600 border-gray-300">
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </Button>
              )}
              <Button 
                onClick={() => setIsAddVisitOpen(true)} 
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                Add visit
              </Button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6">
          {/* Client Profile Info - Full Width */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Client Information</CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsEditClientOpen(true)}
                className="text-primary-500 hover:text-primary-700"
              >
                <Edit className="mr-1 h-4 w-4" /> Edit
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:gap-10">
                {/* Client Photo/Avatar Section */}
                <div className="flex flex-col items-center mb-6 md:mb-0">
                  <div className="w-28 h-28 rounded-full bg-gray-200 mb-3 flex items-center justify-center overflow-hidden border border-gray-300">
                    {client.photoUrl ? (
                      <img 
                        src={client.photoUrl} 
                        alt={`${client.firstName} ${client.lastName}`} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-4xl font-semibold text-gray-400">
                        {client.firstName.charAt(0)}{client.lastName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs mt-1"
                    onClick={handlePhotoUpload}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>Uploading...</>
                    ) : client.photoUrl ? (
                      <>Change Photo</>
                    ) : (
                      <>Add Photo</>
                    )}
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/jpeg,image/png,image/gif"
                    className="hidden"
                  />
                </div>

                {/* Client Details */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Phone</label>
                    <div className="text-gray-800">{client.phone}</div>
                  </div>
                  
                  {client.email && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                      <div className="text-gray-800">{client.email}</div>
                    </div>
                  )}
                  
                  {(client.address || client.city || client.zip) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Address</label>
                      <div className="text-gray-800">
                        {client.address && <>{client.address}<br /></>}
                        {client.city && <>{client.city} </>}
                        {client.zip && <>{client.zip}</>}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Client Since</label>
                    <div className="text-gray-800">{formatDate(client.createdAt)}</div>
                  </div>
                </div>
              </div>

              {/* Notes Section - Inside Client Information */}
              <div className="mt-5 border-t pt-5">
                <label className="block text-sm font-medium text-gray-500 mb-2">Notes</label>
                <div className="text-gray-600 text-sm">
                  {client.notes || "No notes available."}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Visit History - Full Width */}
          <div>
            <Card>
              <CardHeader className="border-b border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-lg">Visit History</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button 
                      onClick={() => setIsAddVisitOpen(true)} 
                      size="sm"
                      variant="default"
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      Add visit
                    </Button>
                    <div className="relative w-56">
                      <Search className="absolute left-3 top-2 h-4 w-4 text-gray-400" />
                      <Input 
                        type="text" 
                        placeholder="Search visits..." 
                        className="pl-9 py-1 h-9 text-sm w-full"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <VisitList 
                  clientId={parsedId}
                  onViewVisit={handleViewVisit}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Client Modal */}
      <Dialog open={isEditClientOpen} onOpenChange={setIsEditClientOpen}>
        <DialogContent className="sm:max-w-2xl">
          <ClientForm
            client={client}
            onClose={() => setIsEditClientOpen(false)}
            onSuccess={() => {
              setIsEditClientOpen(false);
              queryClient.invalidateQueries({ queryKey: [`/api/clients/${id}`] });
              toast({
                title: "Client updated",
                description: "The client information has been updated successfully.",
              });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Add Visit Modal */}
      <Dialog open={isAddVisitOpen} onOpenChange={setIsAddVisitOpen}>
        <DialogContent className="sm:max-w-2xl">
          <VisitForm
            clientId={parsedId}
            onClose={() => setIsAddVisitOpen(false)}
            onSuccess={() => {
              setIsAddVisitOpen(false);
              queryClient.invalidateQueries({ queryKey: [`/api/visits`, { clientId: parsedId }] });
              toast({
                title: "Visit added",
                description: "The visit has been added successfully.",
              });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* View Visit Details Modal */}
      <Dialog open={isViewVisitOpen} onOpenChange={setIsViewVisitOpen}>
        <DialogContent className="sm:max-w-2xl">
          {selectedVisit && (
            <div>
              <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  {formatDate(selectedVisit.date)} - Visit Details
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Formula</label>
                      <div className="text-gray-800">{selectedVisit.formula}</div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Price</label>
                      <div className="text-gray-800">{formatCurrency(selectedVisit.price)}</div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Visit Notes</label>
                  <div className="text-gray-800 text-sm max-h-60 overflow-y-auto">
                    {selectedVisit.notes || "No notes for this visit."}
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsViewVisitOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}