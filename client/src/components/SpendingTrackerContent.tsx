import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CreditCardIcon, CalendarIcon, MagnifyingGlassIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from '@/components/OptimizedCharts';
import { SimplePieChart } from '@/components/SimplePieChart';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

interface Card {
  id: string;
  cardholderName: string;
  last4: string;
  brand: string;
  transactions: Array<{
    id: string;
    amount: string;
    description: string;
    category: string;
    subcategory?: string;
    taxDeductible?: boolean;
    createdAt: string;
    cardId: string;
  }>;
}

// Tax Deductible Toggle Component
const TaxDeductibleToggle = ({ transaction }: { transaction: any }) => {
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

export default function SpendingTrackerContent() {
  const [selectedCard, setSelectedCard] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch cards with transactions
  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['cards'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/stripe-issuing/cards');
        
        // Handle the case where Stripe is not configured
        if (!response.success && (response.error === 'STRIPE_NOT_CONFIGURED' || response.error === 'STRIPE_ISSUING_NOT_ENABLED')) {
          return [];
        }
        
        return response.cards || [];
      } catch (error) {
        console.error('Error fetching cards:', error);
        return [];
      }
    },
  });

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Process transactions data
  const allTransactions = Array.isArray(cards) ? cards.flatMap((card: Card) => 
    (card.transactions || []).map(tx => ({
      ...tx,
      cardName: card.cardholderName,
      cardLast4: card.last4,
      cardBrand: card.brand,
    }))
  ) : [];

  // Filter transactions based on selected card, date range, and search
  const filteredTransactions = Array.isArray(allTransactions) ? allTransactions.filter(tx => {
    const matchesCard = selectedCard === 'all' || tx.cardId.toString() === selectedCard;
    const txDate = new Date(tx.createdAt);
    const matchesDateRange = txDate >= dateRange.from && txDate <= dateRange.to;
    const matchesSearch = searchTerm === '' || 
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.cardName.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCard && matchesDateRange && matchesSearch;
  }) : [];

  // Calculate spending metrics
  const totalSpending = filteredTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
  const averageTransaction = filteredTransactions.length > 0 ? totalSpending / filteredTransactions.length : 0;
  const transactionCount = filteredTransactions.length;
  
  // Calculate tax deductible vs non-deductible spending
  const taxDeductibleSpending = filteredTransactions.reduce((sum, tx) => {
    return sum + (tx.taxDeductible ? parseFloat(tx.amount) : 0);
  }, 0);

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
    formattedDate: new Date(date).toLocaleDateString(),
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Group transactions by category for pie chart
  const categorySpending = filteredTransactions.reduce((acc: any, tx) => {
    const category = tx.category || 'Other';
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category] += parseFloat(tx.amount);
    return acc;
  }, {});

  const categoryData = Object.entries(categorySpending).map(([category, amount]) => ({
    category,
    amount: amount as number,
    percentage: ((amount as number) / totalSpending * 100).toFixed(1),
  })).sort((a, b) => b.amount - a.amount);

  // Monthly comparison
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const lastMonthTransactions = Array.isArray(allTransactions) ? allTransactions.filter(tx => {
    const txDate = new Date(tx.createdAt);
    return txDate.getMonth() === (currentMonth === 0 ? 11 : currentMonth - 1) &&
           txDate.getFullYear() === (currentMonth === 0 ? currentYear - 1 : currentYear);
  }) : [];
  const lastMonthSpending = lastMonthTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
  const spendingChange = lastMonthSpending > 0 ? ((totalSpending - lastMonthSpending) / lastMonthSpending * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Spending Tracker</h2>
          <p className="text-muted-foreground">Monitor and analyze your business expenses</p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Card</label>
          <Select value={selectedCard} onValueChange={setSelectedCard}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cards</SelectItem>
              {cards.map((card: Card) => (
                <SelectItem key={card.id} value={card.id}>
                  {card.cardholderName} (*{card.last4})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Date Range</label>
          <SimpleDateRangePicker dateRange={dateRange} onDateChange={setDateRange} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Search</label>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

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
            <p className="text-xs text-muted-foreground">average per transaction</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Cards</CardTitle>
            <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Array.isArray(cards) ? cards.filter((c: Card) => c.brand).length : 0}</div>
            <p className="text-xs text-muted-foreground">cards with activity</p>
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
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="formattedDate" />
                    <YAxis tickFormatter={(value) => `$${value}`} />
                    <Tooltip
                      formatter={(value) => [formatCurrency(value as number), 'Spending']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Line type="monotone" dataKey="amount" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            
            <Card>
              <CardHeader>
                <CardTitle>Spending Visualization</CardTitle>
                <CardDescription>Visual breakdown of your expenses</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <SimplePieChart data={categoryData} />
              </CardContent>
            </Card>
          </div>
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
                      <TableHead>Card</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Category</TableHead>
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
                              {new Date(transaction.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>{transaction.description}</TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {transaction.cardName} (*{transaction.cardLast4})
                              </span>
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(parseFloat(transaction.amount))}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                                  {transaction.category || 'Other'}
                                </span>
                                {transaction.subcategory && transaction.subcategory !== 'Other' && (
                                  <span className="text-xs text-muted-foreground mt-1">
                                    {transaction.subcategory}
                                  </span>
                                )}
                              </div>
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