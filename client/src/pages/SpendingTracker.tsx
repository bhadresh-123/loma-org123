import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarIcon, CreditCardIcon, ArrowTrendingDownIcon, ArrowTrendingUpIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { StripeIssuingNotice } from '@/components/StripeIssuingNotice';

// Actual SVG pie chart implementation
const SimplePieChart = ({ data, colors }: { data: unknown[], colors: string[] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-muted/20 rounded-lg">
        <div className="text-center">
          <div className="text-sm text-muted-foreground">No data available</div>
        </div>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + Math.abs(item.amount), 0);
  const centerX = 120;
  const centerY = 120;
  const radius = 80;
  
  // Calculate angles for each slice
  let currentAngle = 0;
  const slices = data.map((item, index) => {
    const percentage = Math.abs(item.amount) / total;
    const angle = percentage * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;
    
    // Calculate SVG path for pie slice
    const x1 = centerX + radius * Math.cos(startAngle);
    const y1 = centerY + radius * Math.sin(startAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);
    
    const largeArcFlag = angle > Math.PI ? 1 : 0;
    
    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');
    
    return {
      ...item,
      pathData,
      color: colors[index % colors.length],
      percentage: (percentage * 100).toFixed(1)
    };
  });
  
  return (
    <div className="h-64 p-4">
      <div className="text-center mb-4">
        <div className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</div>
        <div className="text-sm text-gray-500">Total Spending</div>
      </div>
      
      <div className="flex items-center justify-center">
        <svg width="240" height="240" viewBox="0 0 240 240">
          {slices.map((slice, index) => (
            <path
              key={index}
              d={slice.pathData}
              fill={slice.color}
              stroke="white"
              strokeWidth="2"
              opacity="0.8"
            />
          ))}
        </svg>
      </div>
    </div>
  );
};

const SimpleLineChart = ({ data }: { data: unknown[] }) => {
  if (data.length === 0) return <div className="text-center text-muted-foreground py-8">No data to display</div>;
  
  const maxValue = Math.max(...data.map(d => Math.abs(d.amount)));
  const minValue = Math.min(...data.map(d => Math.abs(d.amount)));
  
  return (
    <div className="w-full h-64 bg-gray-50 rounded-lg p-4">
      <div className="text-sm text-muted-foreground mb-2">Daily Spending Trend</div>
      <div className="relative h-48">
        <svg width="100%" height="100%" viewBox="0 0 400 200">
          {data.map((point, index) => {
            const x = (index / (data.length - 1)) * 380 + 10;
            const y = 190 - ((Math.abs(point.amount) - minValue) / (maxValue - minValue)) * 180;
            
            return (
              <g key={index}>
                <circle cx={x} cy={y} r="3" fill="#8884d8" />
                {index > 0 && (
                  <line
                    x1={(index - 1) / (data.length - 1) * 380 + 10}
                    y1={190 - ((Math.abs(data[index - 1].amount) - minValue) / (maxValue - minValue)) * 180}
                    x2={x}
                    y2={y}
                    stroke="#8884d8"
                    strokeWidth="2"
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

interface Card {
  id: number;
  cardholderName: string;
  last4: string;
  brand: string;
  status: string;
  type: string;
  cardLimit: string;
  transactions?: Transaction[];
}

interface Transaction {
  id: number;
  cardId: number;
  stripeTransactionId: string;
  amount: string;
  currency: string;
  description: string;
  type: string;
  category?: string;
  subcategory?: string;
  taxDeductible?: boolean;
  metadata?: any;
  createdAt: string;
}

// Chart colors
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

// Tax Deductible Toggle Component
const TaxDeductibleToggle = ({ transaction }: { transaction: Transaction }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const updateTaxDeductible = useMutation({
    mutationFn: async (taxDeductible: boolean) => {
      return apiRequest(`/stripe/transaction/${transaction.id}/tax-deductible`, {
        method: 'PATCH',
        body: { taxDeductible }
      });
    },
    onSuccess: () => {
      // Invalidate and refetch card data
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      toast({
        title: "Success",
        description: "Tax deductible status updated successfully",
      });
    },
    onError: (error) => {
      console.error('Error updating tax deductible status:', error);
      toast({
        title: "Error",
        description: "Failed to update tax deductible status",
        variant: "destructive",
      });
    }
  });

  const handleToggle = () => {
    updateTaxDeductible.mutate(!transaction.taxDeductible);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      disabled={updateTaxDeductible.isPending}
      className="h-6 px-2"
    >
      <Badge 
        variant={transaction.taxDeductible ? "default" : "secondary"}
        className="text-xs cursor-pointer"
      >
        {updateTaxDeductible.isPending ? "..." : (transaction.taxDeductible ? "Yes" : "No")}
      </Badge>
    </Button>
  );
};

// Simplified date range picker without external dependencies
const SimpleDateRangePicker = ({ dateRange, onDateChange }: { 
  dateRange: { from: Date; to: Date }, 
  onDateChange: (range: { from: Date; to: Date }) => void 
}) => {
  return (
    <div className="flex space-x-2">
      <Input
        type="date"
        value={dateRange.from.toISOString().split('T')[0]}
        onChange={(e) => onDateChange({
          ...dateRange,
          from: new Date(e.target.value)
        })}
        className="w-full"
      />
      <span className="text-sm text-muted-foreground py-2">to</span>
      <Input
        type="date"
        value={dateRange.to.toISOString().split('T')[0]}
        onChange={(e) => onDateChange({
          ...dateRange,
          to: new Date(e.target.value)
        })}
        className="w-full"
      />
    </div>
  );
};

export default function SpendingTracker() {
  const [selectedCard, setSelectedCard] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().getFullYear() - 1, 0, 1), // Start from January last year to include all transactions
    to: new Date(),
  });
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [setupMessage, setSetupMessage] = useState<string>('');

  // Fetch cards with transactions
  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['cards'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/stripe-issuing/cards');
        
        // Handle the case where Stripe is not configured
        if (!response.success && (response.error === 'STRIPE_NOT_CONFIGURED' || response.error === 'STRIPE_ISSUING_NOT_ENABLED')) {
          setSetupMessage(response.message || 'Sign up for Loma business banking to access spending data');
          setShowSetupGuide(true);
          return [];
        }
        
        return response.cards || [];
      } catch (error: unknown) {
        // Check if this is a Stripe Issuing setup error
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('not set up to use Issuing') || 
            errorMessage.includes('card_issuing can only be requested') ||
            errorMessage.includes('STRIPE_NOT_CONFIGURED') ||
            errorMessage.includes('STRIPE_ISSUING_NOT_ENABLED')) {
          setSetupMessage('Sign up for Loma business banking to access spending data');
          setShowSetupGuide(true);
          return [];
        }
        // For other errors, show setup guide as fallback
        console.error('Error fetching cards:', error);
        setSetupMessage('Sign up for Loma business banking to access spending data');
        setShowSetupGuide(true);
        return [];
      }
    },
  });

  // Process transactions data
  const allTransactions = cards.flatMap((card: Card) => 
    (card.transactions || []).map(tx => ({
      ...tx,
      cardName: card.cardholderName,
      cardLast4: card.last4,
      cardBrand: card.brand,
    }))
  );

  // Filter transactions based on selected card, date range, and search
  const filteredTransactions = allTransactions.filter(tx => {
    const matchesCard = selectedCard === 'all' || tx.cardId.toString() === selectedCard;
    const txDate = new Date(tx.createdAt);
    const matchesDateRange = txDate >= dateRange.from && txDate <= dateRange.to;
    const matchesSearch = searchTerm === '' || 
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.cardName.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCard && matchesDateRange && matchesSearch;
  });

  // Calculate spending metrics
  const totalSpending = filteredTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
  const averageTransaction = filteredTransactions.length > 0 ? totalSpending / filteredTransactions.length : 0;
  const transactionCount = filteredTransactions.length;

  // Group transactions by date for trend chart
  const dailySpending = filteredTransactions.reduce((acc: any, tx) => {
    const date = new Date(tx.createdAt).toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = 0;
    }
    acc[date] += parseFloat(tx.amount);
    return acc;
  }, {});

  const trendData = Object.entries(dailySpending).map(([date, amount]) => ({
    date,
    amount: amount as number,
    formattedDate: formatDate(new Date(date)),
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Group transactions by category (using database-stored categories)
  const categorySpending = filteredTransactions.reduce((acc: any, tx) => {
    const category = tx.category || 'Other';
    
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category] += Math.abs(parseFloat(tx.amount)); // Use absolute values for pie chart
    return acc;
  }, {});

  // Calculate tax deductible vs non-deductible spending
  const taxDeductibleSpending = filteredTransactions.reduce((sum, tx) => {
    return sum + (tx.taxDeductible ? parseFloat(tx.amount) : 0);
  }, 0);
  
  const nonDeductibleSpending = totalSpending - taxDeductibleSpending;

  const categoryData = Object.entries(categorySpending).map(([category, amount]) => ({
    category,
    amount: amount as number,
    percentage: ((amount as number) / Math.abs(totalSpending) * 100).toFixed(1),
  })).sort((a, b) => b.amount - a.amount);

  // Debug logging
  console.log('Debug - cards:', cards);
  console.log('Debug - allTransactions:', allTransactions);
  console.log('Debug - filteredTransactions:', filteredTransactions);
  console.log('Debug - categorySpending:', categorySpending);
  console.log('Debug - categoryData:', categoryData);
  console.log('Debug - totalSpending:', totalSpending);

  // Monthly comparison
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const lastMonthTransactions = allTransactions.filter(tx => {
    const txDate = new Date(tx.createdAt);
    return txDate.getMonth() === (currentMonth === 0 ? 11 : currentMonth - 1) &&
           txDate.getFullYear() === (currentMonth === 0 ? currentYear - 1 : currentYear);
  });
  const lastMonthSpending = lastMonthTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
  const spendingChange = lastMonthSpending > 0 ? ((totalSpending - lastMonthSpending) / lastMonthSpending * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
          <h1 className="text-3xl font-bold">Spending Tracker</h1>
          <p className="text-muted-foreground">Monitor and analyze your business expenses</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="card-select">Card</Label>
              <Select value={selectedCard} onValueChange={setSelectedCard}>
                <SelectTrigger id="card-select">
                  <SelectValue placeholder="Select card" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cards</SelectItem>
                  {cards.map((card: Card) => (
                    <SelectItem key={card.id} value={card.id.toString()}>
                      {card.cardholderName} ({card.brand} •••• {card.last4})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="date-range">Date Range</Label>
              <SimpleDateRangePicker 
                dateRange={dateRange} 
                onDateChange={setDateRange}
              />
            </div>
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedCard('all');
                  setDateRange({
                    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    to: new Date(),
                  });
                  setSearchTerm('');
                }}
              >
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Spending Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spending</CardTitle>
            <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpending)}</div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              {spendingChange > 0 ? (
                <ArrowTrendingUpIcon className="h-3 w-3 text-red-500" />
              ) : (
                <ArrowTrendingDownIcon className="h-3 w-3 text-green-500" />
              )}
              <span className={spendingChange > 0 ? 'text-red-500' : 'text-green-500'}>
                {Math.abs(spendingChange).toFixed(1)}% from last month
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactionCount}</div>
            <p className="text-xs text-muted-foreground">transactions in period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Transaction</CardTitle>
            <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(averageTransaction)}</div>
            <p className="text-xs text-muted-foreground">per transaction</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Cards</CardTitle>
            <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cards.filter((c: Card) => c.status === 'active').length}</div>
            <p className="text-xs text-muted-foreground">of {cards.length} total cards</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tax Deductible</CardTitle>
            <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(taxDeductibleSpending)}</div>
            <p className="text-xs text-muted-foreground">
              {Math.abs(taxDeductibleSpending) > 0 ? 
                `${((Math.abs(taxDeductibleSpending) / Math.abs(totalSpending)) * 100).toFixed(0)}% of total` : 
                'No deductible expenses'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Spending Trends</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Spending Trend</CardTitle>
              <CardDescription>Your spending pattern over time</CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleLineChart data={trendData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
              <CardDescription>Detailed spending by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categoryData.map((category, index) => (
                  <div key={category.category} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm font-medium">{category.category}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">{formatCurrency(category.amount)}</div>
                      <div className="text-xs text-muted-foreground">{category.percentage}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>
                {filteredTransactions.length} transactions totaling {formatCurrency(totalSpending)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Card</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Tax Deductible</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="text-muted-foreground">
                            No transactions found for the selected criteria
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransactions
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              {formatDate(new Date(transaction.createdAt))}
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs truncate" title={transaction.description}>
                                {transaction.description}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <Badge variant="outline" className="text-xs mb-1">
                                  {transaction.category || 'Other'}
                                </Badge>
                                {transaction.subcategory && transaction.subcategory !== 'Other' && (
                                  <span className="text-xs text-muted-foreground">
                                    {transaction.subcategory}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm">
                                  {transaction.cardName}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {transaction.cardBrand} •••• {transaction.cardLast4}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(parseFloat(transaction.amount))}
                            </TableCell>
                            <TableCell>
                              <TaxDeductibleToggle transaction={transaction} />
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}