import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  ArrowUpDown, Edit, Eye, MoreHorizontal, Trash2 
} from "lucide-react";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { VisitForm } from "./VisitForm";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Visit } from "@shared/schema";
import { formatDate, formatCurrency } from "@/lib/utils";

interface VisitListProps {
  clientId: number;
  onViewVisit: (visit: Visit) => void;
}

export function VisitList({ clientId, onViewVisit }: VisitListProps) {
  const { toast } = useToast();
  const [sortBy, setSortBy] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [isEditVisitOpen, setIsEditVisitOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [isAddVisitOpen, setIsAddVisitOpen] = useState(false);

  // Fetch visits
  const { data, isLoading, isError } = useQuery({
    queryKey: ['/api/visits', { clientId, sortBy, sortDirection }],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.append('clientId', clientId.toString());
      if (sortBy) queryParams.append('sortBy', sortBy);
      if (sortDirection) queryParams.append('sortDirection', sortDirection);

      const response = await fetch(`/api/visits?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch visits');
      }
      return response.json();
    }
  });

  // Delete visit mutation
  const deleteVisitMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/visits/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/visits', { clientId }] });
      toast({
        title: "Visit deleted",
        description: "The visit has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting visit",
        description: error.message || "Failed to delete visit",
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
      setSortDirection("desc");
    }
  };

  // Handle delete visit
  const handleDeleteVisit = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this visit?")) {
      deleteVisitMutation.mutate(id);
    }
  };

  // Handle edit visit
  const handleEditVisit = (visit: Visit, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedVisit(visit);
    setIsEditVisitOpen(true);
  };

  if (isLoading) {
    return <div className="p-4 text-center text-gray-500">Loading visits...</div>;
  }

  if (isError) {
    return <div className="p-4 text-center text-red-500">Error loading visits</div>;
  }

  if (!data?.visits?.length) {
    return (
      <div className="p-8 text-center text-gray-500">
        No visits recorded yet. Add a visit to get started.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("date")}
                  className="flex items-center text-xs font-semibold text-gray-500 uppercase"
                >
                  Date
                  <ArrowUpDown className="ml-1 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("service")}
                  className="flex items-center text-xs font-semibold text-gray-500 uppercase"
                >
                  Service
                  <ArrowUpDown className="ml-1 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("formula")}
                  className="flex items-center text-xs font-semibold text-gray-500 uppercase"
                >
                  Formula
                  <ArrowUpDown className="ml-1 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("price")}
                  className="flex items-center text-xs font-semibold text-gray-500 uppercase"
                >
                  Price
                  <ArrowUpDown className="ml-1 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.visits.map((visit: Visit) => (
              <TableRow
                key={visit.id}
                className="hover:bg-gray-50 group"
                onClick={() => onViewVisit(visit)}
              >
                <TableCell className="text-gray-700">
                  {formatDate(visit.date)}
                </TableCell>
                <TableCell className="text-gray-700">
                  {visit.service || 'Hair Service'}
                </TableCell>
                <TableCell className="text-gray-700">
                  {visit.formula}
                </TableCell>
                <TableCell className="text-gray-700">
                  {formatCurrency(visit.price)}
                </TableCell>
                <TableCell className="text-gray-700">
                  {visit.notes && visit.notes.length > 30 
                    ? `${visit.notes.substring(0, 30)}...` 
                    : visit.notes}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewVisit(visit);
                    }}
                    className="text-primary-500 hover:text-primary-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleEditVisit(visit, e)}
                    className="text-primary-500 hover:text-primary-700 opacity-0 group-hover:opacity-100 transition-opacity mr-1"
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
                        onViewVisit(visit);
                      }}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleEditVisit(visit, e)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Visit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={(e) => handleDeleteVisit(visit.id, e)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Visit
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Visit Modal */}
      <Dialog open={isEditVisitOpen} onOpenChange={setIsEditVisitOpen}>
        <DialogContent className="sm:max-w-2xl">
          {selectedVisit && (
            <VisitForm
              visitData={selectedVisit}
              clientId={clientId}
              onClose={() => setIsEditVisitOpen(false)}
              onSuccess={() => {
                setIsEditVisitOpen(false);
                queryClient.invalidateQueries({ queryKey: ['/api/visits', { clientId }] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Add Visit Modal */}
      <Dialog open={isAddVisitOpen} onOpenChange={setIsAddVisitOpen}>
        <DialogContent className="sm:max-w-2xl">
          <VisitForm
            clientId={clientId}
            onClose={() => setIsAddVisitOpen(false)}
            onSuccess={() => {
              setIsAddVisitOpen(false);
              queryClient.invalidateQueries({ queryKey: ['/api/visits', { clientId }] });
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
