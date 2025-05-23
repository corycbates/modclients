import { Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileHeaderProps {
  title: string;
  onOpenMenu: () => void;
  onSearch?: () => void;
}

export function MobileHeader({ title, onOpenMenu, onSearch }: MobileHeaderProps) {
  return (
    <header className="bg-white shadow md:hidden sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onOpenMenu} 
            className="mr-2 text-gray-600 hover:text-primary-600"
          >
            <Menu className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
        </div>
        {onSearch && (
          <div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onSearch} 
              className="p-2 text-primary-500 hover:text-primary-700"
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
