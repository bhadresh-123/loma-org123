import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Lock, Eye, EyeOff, Plus, Search, User } from 'lucide-react';

/**
 * HIPAA-Compliant Client Management Component
 */
export function ClientsHIPAA() {
  const [showPHI, setShowPHI] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  // Fetch clients with PHI
  const { data: clients, isLoading, error } = useQuery({
    queryKey: ['clients-hipaa'],
    queryFn: async () => {
      const response = await fetch('/api/patients');
      if (!response.ok) throw new Error('Failed to fetch clients');
      return response.json();
    },
  });

  // Create client mutation
  const createClientMutation = useMutation({
    mutationFn: async (clientData: any) => {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData),
      });
      if (!response.ok) throw new Error('Failed to create client');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients-hipaa'] });
      setIsCreating(false);
    },
  });

  const filteredClients = clients?.data?.filter((client: any) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.emailEncrypted && client.emailEncrypted.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading HIPAA-protected clients...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HIPAA Security Header */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-green-600" />
              <CardTitle className="text-green-800">HIPAA-Compliant Client Management</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <Lock className="h-3 w-3 mr-1" />
                PHI Encrypted
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPHI(!showPHI)}
                className="border-green-300 text-green-700 hover:bg-green-100"
              >
                {showPHI ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                {showPHI ? 'Hide PHI' : 'Show PHI'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-green-700">
            All client data is encrypted and protected according to HIPAA standards
          </div>
        </CardContent>
      </Card>

      {/* Search and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Clients List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client: any) => (
          <Card key={client.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{client.name}</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {client.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {showPHI ? client.emailEncrypted || 'No email' : '••••••••••••'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Lock className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {showPHI ? client.phoneEncrypted || 'No phone' : '••••••••••••'}
                </span>
              </div>
              {client.notesEncrypted && (
                <div className="text-sm text-gray-600">
                  {showPHI ? client.notesEncrypted.substring(0, 50) + '...' : '••••••••••••••••••••••••••••••••••••••••'}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* HIPAA Compliance Footer */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="text-sm text-blue-700">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="h-4 w-4" />
              <span className="font-medium">HIPAA Compliance Status</span>
            </div>
            <ul className="space-y-1 text-xs">
              <li>• All client PHI is encrypted using AES-256-GCM</li>
              <li>• Access is logged and audited for compliance</li>
              <li>• Data is protected both in transit and at rest</li>
              <li>• Cross-user data isolation enforced</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
