import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreditCardIcon, PlusIcon, PauseIcon, PlayIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import StripeIssuingSetupGuide from '@/components/StripeIssuingSetupGuide';
import { StripeIssuingNotice } from '@/components/StripeIssuingNotice';
import { Checkbox } from '@/components/ui/checkbox';

// Form schemas
const cardSchema = z.object({
  type: z.enum(['virtual', 'physical']),
  cardholderName: z.string().min(1, 'Cardholder name is required'),
  spendingLimit: z.number().min(1, 'Spending limit must be at least $1'),
  currency: z.string().default('usd'),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions to create a card",
  }),
  metadata: z.object({
    department: z.string().optional(),
    purpose: z.string().optional(),
  }).optional(),
});

type CardFormData = z.infer<typeof cardSchema>;

interface Card {
  id: number;
  stripeCardId: string;
  cardholderName: string;
  last4: string;
  brand: string;
  expMonth: number;
  expYear: number;
  status: string;
  type: string;
  cardLimit: string;
  currency: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

interface CardDetailsProps {
  card: Card;
  onStatusChange: (cardId: number, newStatus: string) => void;
}

const CardDetailsDialog = ({ card, onStatusChange }: CardDetailsProps) => {
  const [showSensitiveInfo, setShowSensitiveInfo] = useState(false);
  const { toast } = useToast();

  const handleStatusChange = async (newStatus: string) => {
    try {
      await onStatusChange(card.id, newStatus);
      toast({
        title: "Card Status Updated",
        description: `Card has been ${newStatus}d successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update card status.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <EyeIcon className="h-4 w-4 mr-1" />
          View Details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Card Details</DialogTitle>
          <DialogDescription>
            Manage your {card.type} card settings and view transaction history.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {/* Card Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Card Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {card.brand.toUpperCase()} •••• {card.last4}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Expires {card.expMonth.toString().padStart(2, '0')}/{card.expYear}
                </div>
                <div>
                  <Badge variant={card.status === 'active' ? 'default' : 'secondary'}>
                    {card.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Spending Limit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(parseFloat(card.cardLimit))}
                </div>
                <div className="text-sm text-muted-foreground">
                  {card.currency.toUpperCase()} limit
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Card Actions */}
          <div className="flex space-x-2">
            {card.status === 'active' ? (
              <Button 
                variant="outline" 
                onClick={() => handleStatusChange('inactive')}
                className="flex items-center space-x-2"
              >
                <PauseIcon className="h-4 w-4" />
                <span>Pause Card</span>
              </Button>
            ) : (
              <Button 
                variant="outline" 
                onClick={() => handleStatusChange('active')}
                className="flex items-center space-x-2"
              >
                <PlayIcon className="h-4 w-4" />
                <span>Activate Card</span>
              </Button>
            )}
            <Button 
              variant="outline"
              onClick={() => handleStatusChange('canceled')}
              className="flex items-center space-x-2 text-destructive"
            >
              <TrashIcon className="h-4 w-4" />
              <span>Cancel Card</span>
            </Button>
          </div>

          {/* Metadata */}
          {card.metadata && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {card.metadata.department && (
                  <div>
                    <span className="text-sm font-medium">Department: </span>
                    <span className="text-sm text-muted-foreground">{card.metadata.department}</span>
                  </div>
                )}
                {card.metadata.purpose && (
                  <div>
                    <span className="text-sm font-medium">Purpose: </span>
                    <span className="text-sm text-muted-foreground">{card.metadata.purpose}</span>
                  </div>
                )}
                <div>
                  <span className="text-sm font-medium">Created: </span>
                  <span className="text-sm text-muted-foreground">{formatDate(new Date(card.createdAt))}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const CreateCardDialog = () => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const form = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      type: 'virtual',
      cardholderName: '',
      spendingLimit: 1000,
      currency: 'usd',
      acceptTerms: false,
      metadata: {
        department: '',
        purpose: '',
      },
    },
  });

  const createCardMutation = useMutation({
    mutationFn: async (data: CardFormData) => {
      const endpoint = data.type === 'virtual' 
        ? '/stripe-issuing/create-virtual-card' 
        : '/stripe-issuing/create-physical-card';
      
      const response = await apiRequest(endpoint, {
        method: 'POST',
        body: {
          cardholderName: data.cardholderName,
          cardholderEmail: user?.email || 'user@example.com', // Use actual user email
          cardLimit: data.spendingLimit,
          currency: data.currency,
          metadata: {
            department: data.metadata?.department,
            purpose: data.metadata?.purpose,
          },
        },
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      setOpen(false);
      form.reset();
      toast({
        title: "Card Created",
        description: "Your new card has been created successfully.",
      });
    },
    onError: (error: unknown) => {
      const errorMessage = error.message || "Failed to create card.";
      
      // Check for specific error types and provide helpful guidance
      if (errorMessage.includes('Business banking account is required')) {
        toast({
          title: "Business Banking Required",
          description: "Please set up your business banking account in the Financials tab before issuing cards.",
          variant: "destructive",
        });
      } else if (errorMessage.includes('not set up to use Issuing')) {
        toast({
          title: "Stripe Issuing Not Enabled",
          description: "Card issuing must be activated in your Stripe Dashboard. Visit Stripe Dashboard > Issuing to get started.",
          variant: "destructive",
        });
      } else if (errorMessage.includes('card_issuing can only be requested')) {
        toast({
          title: "Platform Not Onboarded",
          description: "Your platform needs to be onboarded for Stripe Issuing. Contact support to enable this feature.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
  });

  const onSubmit = (data: CardFormData) => {
    createCardMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="h-4 w-4 mr-2" />
          Create New Card
        </Button>
      </DialogTrigger>
      <DialogContent className="!grid-cols-none !grid-rows-none max-h-[85vh] h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Create New Card</DialogTitle>
          <DialogDescription>
            Issue a new virtual or physical card for your business expenses.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Card Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select card type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="virtual">Virtual Card</SelectItem>
                      <SelectItem value="physical">Physical Card</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Virtual cards are instant and perfect for online purchases.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cardholderName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cardholder Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter cardholder name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="spendingLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Spending Limit</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="1000"
                      value={field.value || ''}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        field.onChange(isNaN(value) ? 0 : value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Set a spending limit for this card in USD.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="metadata.department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Marketing, Operations, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="metadata.purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purpose (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Travel expenses, software subscriptions, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="acceptTerms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      I accept the Terms and Conditions
                    </FormLabel>
                    <FormDescription>
                      You agree to Stripe's terms of service and acknowledge that this card will be issued through your business banking account.
                    </FormDescription>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            </form>
          </Form>
        </div>
        <div className="flex justify-end space-x-2 p-6 pt-0 border-t">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={createCardMutation.isPending} onClick={form.handleSubmit(onSubmit)}>
            {createCardMutation.isPending ? 'Creating...' : 'Create Card'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default function CardManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [setupMessage, setSetupMessage] = useState<string>('');

  // Fetch cards
  const { data: cards = [], isLoading, error } = useQuery({
    queryKey: ['cards'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/stripe-issuing/cards');
        
        // Handle the case where Stripe is not configured
        if (!response.success && response.error === 'STRIPE_NOT_CONFIGURED') {
          setSetupMessage(response.message || 'Sign up for Loma business banking to access cards');
          setShowSetupGuide(true);
          return [];
        }
        
        // Handle the case where Stripe Issuing is not enabled
        if (!response.success && response.error === 'STRIPE_ISSUING_NOT_ENABLED') {
          setSetupMessage(response.message || 'Sign up for Loma business banking to access cards');
          setShowSetupGuide(true);
          return [];
        }
        
        return response.cards || [];
      } catch (error: unknown) {
        // Check if this is a Stripe Issuing setup error from error message
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('not set up to use Issuing') || 
            errorMessage.includes('card_issuing can only be requested') ||
            errorMessage.includes('STRIPE_NOT_CONFIGURED') ||
            errorMessage.includes('STRIPE_ISSUING_NOT_ENABLED')) {
          setSetupMessage('Sign up for Loma business banking to access cards');
          setShowSetupGuide(true);
          return [];
        }
        // For any other error (including 500s), show setup guide as fallback
        // This handles cases where the error response format might vary
        console.error('Error fetching cards:', error);
        setSetupMessage('Sign up for Loma business banking to access cards');
        setShowSetupGuide(true);
        return [];
      }
    },
  });

  // Update card status mutation
  const updateCardStatusMutation = useMutation({
    mutationFn: async ({ cardId, status }: { cardId: number; status: string }) => {
      const response = await apiRequest(`/stripe-issuing/cards/${cardId}/update-status`, {
        method: 'POST',
        body: { status },
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
    },
  });

  const handleStatusChange = async (cardId: number, newStatus: string) => {
    await updateCardStatusMutation.mutateAsync({ cardId, status: newStatus });
  };

  // Backfill transactions mutation
  const backfillTransactionsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/stripe/backfill-transactions', {
        method: 'POST',
        body: {},
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Backfill Completed",
        description: `Successfully processed ${data.totalProcessed} transactions. ${data.totalNew} new transactions added.`,
      });
      // Invalidate transactions query to refresh the spending tracker
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error: unknown) => {
      toast({
        title: "Backfill Failed",
        description: error.message || "Failed to backfill transactions. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleBackfillTransactions = () => {
    backfillTransactionsMutation.mutate();
  };

  // Calculate statistics
  const activeCards = cards.filter((card: Card) => card.status === 'active').length;
  const totalSpendingLimit = cards.reduce((sum: number, card: Card) => sum + parseFloat(card.cardLimit), 0);
  const virtualCards = cards.filter((card: Card) => card.type === 'virtual').length;
  const physicalCards = cards.filter((card: Card) => card.type === 'physical').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error && !showSetupGuide) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-4">Error loading cards</div>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['cards'] })}>
          Try Again
        </Button>
      </div>
    );
  }

  // Show setup guide if Stripe Issuing is not configured
  if (showSetupGuide) {
    return <StripeIssuingNotice onDismiss={() => setShowSetupGuide(false)} message={setupMessage} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Card Management</h1>
          <p className="text-muted-foreground">Issue and manage your business cards</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={handleBackfillTransactions}
            disabled={backfillTransactionsMutation.isPending}
          >
            {backfillTransactionsMutation.isPending ? 'Backfilling...' : 'Backfill Transactions'}
          </Button>
          <CreateCardDialog />
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Cards</CardTitle>
            <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCards}</div>
            <p className="text-xs text-muted-foreground">of {cards.length} total cards</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spending Limit</CardTitle>
            <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpendingLimit)}</div>
            <p className="text-xs text-muted-foreground">across all cards</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Virtual Cards</CardTitle>
            <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{virtualCards}</div>
            <p className="text-xs text-muted-foreground">instant access</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Physical Cards</CardTitle>
            <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{physicalCards}</div>
            <p className="text-xs text-muted-foreground">shipped cards</p>
          </CardContent>
        </Card>
      </div>

      {/* Cards Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Cards</CardTitle>
          <CardDescription>
            Manage all your business cards in one place
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Card</TableHead>
                  <TableHead>Cardholder</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Spending Limit</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cards.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-muted-foreground">
                        <CreditCardIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No cards found</p>
                        <p className="text-sm">Create your first card to get started</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  cards.map((card: Card) => (
                    <TableRow key={card.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {card.brand.toUpperCase()} •••• {card.last4}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{card.cardholderName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {card.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={card.status === 'active' ? 'default' : 'secondary'}>
                          {card.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(parseFloat(card.cardLimit))}</TableCell>
                      <TableCell>{formatDate(new Date(card.createdAt))}</TableCell>
                      <TableCell>
                        <CardDetailsDialog card={card} onStatusChange={handleStatusChange} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}