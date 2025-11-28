import React from 'react';
import { CalendarIcon, CheckCircleIcon, DocumentTextIcon, ReceiptPercentIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Session } from '@/types/schema';
import { Button } from '@/components/ui/button';

type SessionAction = 'reschedule' | 'complete' | 'notes' | 'invoice' | 'no-show';

interface SessionOptionsMenuProps {
  session: Session;
  onAction: (action: SessionAction) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SessionOptionsMenu({ 
  session, 
  onAction, 
  open, 
  onOpenChange 
}: SessionOptionsMenuProps) {
  // Let's create a standalone menu without using popover content
  // This will be displayed as a floating element
  
  if (!open) return null;
  
  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
      <div className="bg-white rounded-lg shadow-lg border p-2 w-64">
        <div className="flex flex-col space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start py-3 hover:bg-muted"
            onClick={() => {
              onAction('reschedule');
              onOpenChange(false); // We'll close the menu for all actions
            }}
          >
            <CalendarIcon className="mr-3 h-5 w-5" />
            <span className="text-base">Reschedule</span>
          </Button>
          
          <Button
            variant="ghost"
            className="w-full justify-start py-3 hover:bg-muted"
            onClick={() => {
              onAction('complete');
              onOpenChange(false);
            }}
          >
            <CheckCircleIcon className="mr-3 h-5 w-5" />
            <span className="text-base">Complete Session</span>
          </Button>
          
          <Button
            variant="ghost"
            className="w-full justify-start py-3 hover:bg-muted"
            onClick={() => {
              onAction('notes');
              onOpenChange(false);
            }}
          >
            <DocumentTextIcon className="mr-3 h-5 w-5" />
            <span className="text-base">Add Note</span>
          </Button>
          
          <Button
            variant="ghost"
            className="w-full justify-start py-3 hover:bg-muted"
            onClick={() => {
              onAction('invoice');
              onOpenChange(false);
            }}
          >
            <ReceiptPercentIcon className="mr-3 h-5 w-5" />
            <span className="text-base">Invoice Client</span>
          </Button>
          
          <Button
            variant="ghost"
            className="w-full justify-start py-3 hover:bg-muted"
            onClick={() => {
              onAction('no-show');
              onOpenChange(false);
            }}
          >
            <XCircleIcon className="mr-3 h-5 w-5" />
            <span className="text-base">No-show</span>
          </Button>
        </div>
      </div>
      
      {/* Backdrop for closing the menu when clicking outside */}
      <div 
        className="fixed inset-0 bg-black/20" 
        style={{ zIndex: -1 }}
        onClick={() => onOpenChange(false)}
      />
    </div>
  );
}

export default SessionOptionsMenu;