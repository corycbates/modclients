import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Calendar, BarChart, Settings, User, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
  mobileMenuOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ className, mobileMenuOpen, onClose }: SidebarProps) {
  const [location] = useLocation();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [sidebarVisible, setSidebarVisible] = useState(!isMobile);

  useEffect(() => {
    setSidebarVisible(!isMobile || mobileMenuOpen);
  }, [isMobile, mobileMenuOpen]);

  useEffect(() => {
    if (isMobile && mobileMenuOpen) {
      onClose();
    }
  }, [location, isMobile, mobileMenuOpen, onClose]);

  const navItems = [
    { 
      href: "/dashboard", 
      icon: <LayoutDashboard className="mr-3 h-5 w-5" />, 
      label: "Dashboard" 
    },
    { 
      href: "/clients", 
      icon: <Users className="mr-3 h-5 w-5" />, 
      label: "Clients" 
    },
    { 
      href: "/appointments", 
      icon: <Calendar className="mr-3 h-5 w-5" />, 
      label: "Appointments" 
    },
    { 
      href: "/reports", 
      icon: <BarChart className="mr-3 h-5 w-5" />, 
      label: "Reports" 
    },
    { 
      href: "/settings", 
      icon: <Settings className="mr-3 h-5 w-5" />, 
      label: "Settings" 
    }
  ];

  const baseStyles = "bg-white border-r border-gray-200 w-full md:w-64 fixed md:sticky top-0 h-screen md:h-auto z-40 transition-transform duration-300";
  const mobileStyles = isMobile && !sidebarVisible ? "-translate-x-full" : "translate-x-0";

  return (
    <aside className={cn(baseStyles, mobileStyles, className)}>
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800">Mod Clients</h1>
        <p className="text-sm text-gray-500 mt-1">Client Management System</p>
      </div>
      
      <nav className="p-4 space-y-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 100px)" }}>
        {navItems.map((item) => {
          const isActive = location === item.href || 
            (item.href !== "/dashboard" && location.startsWith(item.href));
          
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              onClick={() => isMobile && onClose()}
            >
              <div className={cn(
                "flex items-center px-4 py-3 rounded-lg group",
                isActive 
                  ? "bg-primary-50 text-primary-600"
                  : "text-gray-600 hover:bg-primary-50 hover:text-primary-600"
              )}>
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
      
      <div className="absolute bottom-0 w-full border-t border-gray-200 p-4">
        <Link href="/account">
          <div className="flex items-center text-gray-600 hover:text-primary-600">
            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mr-3">
              <span className="font-medium text-sm">JD</span>
            </div>
            <div>
              <p className="text-sm font-medium">John Doe</p>
              <p className="text-xs text-gray-500">Admin</p>
            </div>
          </div>
        </Link>
      </div>
    </aside>
  );
}
