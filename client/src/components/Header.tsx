
import { Button } from "@/components/ui/button";
// // import { NotificationDropdown } from "@/components/NotificationDropdown"; // File not found
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { UserIcon } from '@heroicons/react/24/outline';

export function Header() {
  const { logout } = useUser();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    await logout();
    setLocation('/auth-page');
  };

  return (
    <header className="flex items-center justify-end h-16 px-6 border-b">
      <div className="flex items-center space-x-2">

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <UserIcon className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleLogout}>
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
