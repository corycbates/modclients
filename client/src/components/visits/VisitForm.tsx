import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { insertVisitSchema, Visit } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Create a schema for the form fields
const visitFormSchema = z.object({
  clientId: z.number(),
  // Only date is required
  date: z.string().min(1, "Date is required"),
  service: z.string().optional().nullable(),
  formula: z.string().optional().nullable(),
  price: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

interface VisitFormProps {
  visitData?: Visit;
  clientId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function VisitForm({ visitData, clientId, onClose, onSuccess }: VisitFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!visitData;

  // Parse date for form
  const formattedDate = visitData?.date 
    ? new Date(visitData.date).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  // Get default values for service and formula
  const defaultService = visitData?.service ?? "";
  const defaultFormula = visitData?.formula ?? "";

  // Format date for display in the input field
  const formatDateForInput = (dateStr?: string | Date) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  };

  // Initialize form with visit data or empty values
  const form = useForm<z.infer<typeof visitFormSchema>>({
    resolver: zodResolver(visitFormSchema),
    defaultValues: {
      clientId,
      date: formatDateForInput(visitData?.date),
      service: defaultService,
      formula: defaultFormula,
      price: visitData?.price?.toString() || "0",
      notes: visitData?.notes || "",
    },
  });

  // Create or update visit mutation
  const visitMutation = useMutation({
    mutationFn: async (formData: z.infer<typeof visitFormSchema>) => {
      // Prepare the date correctly - create a Date object from the string
      const dateObj = new Date(formData.date);
      
      // Create the API payload with the date as an ISO string
      const apiPayload = {
        clientId: formData.clientId,
        date: dateObj.toISOString(), // Convert to ISO string for API
        service: formData.service || null,
        formula: formData.formula || null,
        price: formData.price || null,
        notes: formData.notes || null
      };
      
      if (isEditing && visitData) {
        return apiRequest("PATCH", `/api/visits/${visitData.id}`, apiPayload);
      } else {
        return apiRequest("POST", "/api/visits", apiPayload);
      }
    },
    onSuccess: () => {
      toast({
        title: isEditing ? "Visit updated" : "Visit created",
        description: isEditing 
          ? "The visit has been updated successfully."
          : "The visit has been created successfully.",
      });
      setIsSubmitting(false);
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: `Error ${isEditing ? "updating" : "creating"} visit`,
        description: error.message || `Failed to ${isEditing ? "update" : "create"} visit.`,
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Form submission handler
  function onSubmit(data: z.infer<typeof visitFormSchema>) {
    setIsSubmitting(true);
    visitMutation.mutate(data);
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
        <h2 className="text-xl font-bold text-gray-800">
          {isEditing ? "Edit Visit" : "Add New Visit"}
        </h2>
      </div>

      <Form {...form}>
        <form onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit((data) => {
              console.log("Submitting form data:", data);
              console.log("Date type:", typeof data.date);
              console.log("Price type:", typeof data.price);
              visitMutation.mutate(data);
            })();
          }} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field}
                      value={field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div>
                      <Input 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        className="pl-8" 
                        {...field}
                        value={field.value || ''}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="service"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Hair Coloring, Styling" value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="formula"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Formula</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Product formula used" value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="col-span-1 md:col-span-2">
                  <FormLabel>Visit Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Notes about this visit" 
                      className="resize-none" 
                      rows={4}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="default"
              className="bg-blue-500 hover:bg-blue-600 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : isEditing ? "Update Visit" : "Save Visit"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
