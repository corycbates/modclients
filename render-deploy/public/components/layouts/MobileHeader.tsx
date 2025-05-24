import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileHeaderProps {
  title: string;
  onOpenMenu: () => void;
}

export function MobileHeader({ title, onOpenMenu }: MobileHeaderProps) {
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
      </div>
    </header>
  );
}
