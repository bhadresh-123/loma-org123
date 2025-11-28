import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CalendarIcon, ClockIcon, DocumentTextIcon, CreditCardIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { UsersIcon, Bars3Icon, CheckIcon, UserIcon, WalletIcon, BanknotesIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePrimaryOrganization } from "@/hooks/use-organizations";
import Logo from "./Logo";

const navigation = [
  { name: "Dashboard", href: "/", icon: ChartBarIcon },
  { name: "Clients", href: "/clients", icon: UsersIcon },
  { name: "Calendar", href: "/calendar", icon: CalendarIcon },
  { name: "Sessions", href: "/sessions", icon: ClockIcon },
  { name: "Tasks", href: "/tasks", icon: CheckIcon },
  { name: "Documents", href: "/documents", icon: DocumentTextIcon },
  { name: "Billing", href: "/billing", icon: CreditCardIcon },
  { name: "Financials", href: "/business-banking", icon: WalletIcon },
  { name: "Cards", href: "/card-management", icon: CreditCardIcon },
  { name: "Profile", href: "/profile", icon: UserIcon },
];

export default function Sidebar() {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const { membership } = usePrimaryOrganization();
  
  const canManageStaff = membership?.role === 'business_owner' || membership?.canManageStaff;

  useEffect(() => {
    setOpen(false);
  }, [location]);

  const NavContent = () => (
    <>
      <div className="px-3 py-4">
        <div className="mb-8 px-3 flex justify-center">
          <Logo size="small" />
        </div>
        <nav className="space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "w-full justify-start h-10 px-3 font-medium text-foreground hover:bg-muted rounded-md mx-2",
                    isActive && "bg-primary/10 text-primary"
                  )}
                >
                  <item.icon className="mr-3 h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{item.name}</span>
                </Button>
              </Link>
            );
          })}
          
          {/* Practice Management - Only show if user can manage staff */}
          {canManageStaff && (
            <Link href="/practice-management">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "w-full justify-start h-10 px-3 font-medium text-foreground hover:bg-muted rounded-md mx-2",
                  location === "/practice-management" && "bg-primary/10 text-primary"
                )}
              >
                <UserGroupIcon className="mr-3 h-4 w-4 flex-shrink-0" />
                <span className="truncate">Practice</span>
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden fixed top-4 left-4 z-50"
            >
              <Bars3Icon className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-56 p-0">
            <NavContent />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <div className="hidden md:flex h-screen w-56 flex-col border-r bg-card shadow-sm">
      <NavContent />
    </div>
  );
}