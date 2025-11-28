import React from 'react';
import { NotificationSettings } from '@/components/NotificationSettings';

export function NotificationSettingsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Notification Preferences</h1>
      </div>
      
      <div className="max-w-2xl">
        <p className="text-muted-foreground mb-6">
          Control which notifications you receive and how they're delivered. PracGenius
          can notify you about upcoming sessions, automated tasks, and more.
        </p>
        
        <NotificationSettings />
      </div>
    </div>
  );
}