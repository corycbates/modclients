import { useState } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { ThemeProvider } from "@/context/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layouts/Sidebar";
import { MobileHeader } from "@/components/layouts/MobileHeader";
import Dashboard from "@/pages/dashboard";
import ClientsPage from "@/pages/clients/index";
import ClientDetailPage from "@/pages/clients/[id]";
import NotFound from "@/pages/not-found";

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <div className="min-h-screen flex flex-col md:flex-row">
            <MobileHeader 
              title="Mod Clients" 
              onOpenMenu={() => setMobileMenuOpen(true)}
              onSearch={() => console.log("Search")}
            />
            
            <Sidebar 
              mobileMenuOpen={mobileMenuOpen} 
              onClose={() => setMobileMenuOpen(false)}
            />
            
            <main className="flex-1 flex flex-col min-h-screen">
              <Switch>
                <Route path="/dashboard" component={Dashboard} />
                <Route path="/clients" component={ClientsPage} />
                <Route path="/clients/:id" component={ClientDetailPage} />
                <Route path="/" component={Dashboard} />
                <Route component={NotFound} />
              </Switch>
            </main>
          </div>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
