import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CurrencyDollarIcon, ClockIcon, CalendarIcon, UsersIcon, BanknotesIcon, ChartBarIcon, ArrowTrendingUpIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from '@/components/OptimizedCharts';
import SpendingTrackerContent from './SpendingTrackerContent';
import { apiRequest } from '@/lib/api';

interface BusinessBankingTabsProps {
  connectAccount: {
    accountId: string;
    onboardingComplete: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    defaultCurrency: string;
    balance: {
      available: number;
      pending: number;
      lastUpdated: string;
    };
    recentTransactions: unknown[];
    pendingPayouts: unknown[];
  };
}

export default function BusinessBankingTabs({ connectAccount }: BusinessBankingTabsProps) {
  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Query to fetch session data for income funnel
  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const response = await fetch('/api/clinical-sessions');
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Query to fetch spending data
  const { data: cards = [] } = useQuery({
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

  // Calculate spending metrics
  const allTransactions = Array.isArray(cards) ? cards.flatMap((card: any) => card.transactions || []) : [];
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const thisMonthTransactions = Array.isArray(allTransactions) ? allTransactions.filter((tx: any) => {
    const txDate = new Date(tx.createdAt);
    return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
  }) : [];
  const spendingThisMonth = thisMonthTransactions.reduce((sum: number, tx: any) => sum + parseFloat(tx.amount), 0);

  // Calculate session metrics
  const thisMonthSessions = Array.isArray(sessions) ? sessions.filter((session: any) => {
    const sessionDate = new Date(session.date);
    return sessionDate.getMonth() === currentMonth && sessionDate.getFullYear() === currentYear;
  }) : [];
  const completedSessions = thisMonthSessions.filter((session: any) => session.status === 'completed').length;
  const invoicedSessions = thisMonthSessions.filter((session: any) => session.invoiceId).length;
  const paidSessions = thisMonthSessions.filter((session: any) => session.paymentStatus === 'paid').length;

  // Current month income (mock data - replace with actual calculation)
  const incomeThisMonth = 1240.00;
  const netThisMonth = incomeThisMonth - spendingThisMonth;

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="banking">Banking</TabsTrigger>
        <TabsTrigger value="spending">Spending</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Available Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <div className="mr-2 rounded-full bg-green-100 p-2">
                  <CurrencyDollarIcon className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(connectAccount.balance.available / 100)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Available Balance
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Income This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <div className="mr-2 rounded-full bg-blue-100 p-2">
                  <CalendarIcon className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(incomeThisMonth)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This month so far
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Spending This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <div className="mr-2 rounded-full bg-red-100 p-2">
                  <CreditCardIcon className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(spendingThisMonth)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This month so far
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Net This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <div className="mr-2 rounded-full bg-purple-100 p-2">
                  <BanknotesIcon className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(netThisMonth)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Income - Spending
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Income Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <UsersIcon className="h-5 w-5 mr-2" />
              Monthly Income Funnel
            </CardTitle>
            <CardDescription>
              Session completion and payment tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{completedSessions}</div>
                <p className="text-sm text-muted-foreground">Sessions Completed</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">{invoicedSessions}</div>
                <p className="text-sm text-muted-foreground">Sessions Invoiced</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{paidSessions}</div>
                <p className="text-sm text-muted-foreground">Sessions Paid</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="banking" className="space-y-6">
        {/* Banking Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Available Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <div className="mr-2 rounded-full bg-green-100 p-2">
                  <CurrencyDollarIcon className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(connectAccount.balance.available / 100)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ready for payout
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <div className="mr-2 rounded-full bg-yellow-100 p-2">
                  <ClockIcon className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(connectAccount.balance.pending / 100)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Processing payout
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Balance Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <ChartBarIcon className="h-5 w-5 mr-2" />
                Balance Trend
              </CardTitle>
              <CardDescription>
                Available vs Pending balance over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[
                    { date: 'Jul 1', available: 0, pending: 0 },
                    { date: 'Jul 3', available: 12000, pending: 8000 },
                    { date: 'Jul 5', available: 8000, pending: 15000 },
                    { date: 'Jul 7', available: 5000, pending: 17448 },
                    { date: 'Jul 10', available: 0, pending: 17448 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value / 100), '']}
                      labelStyle={{ color: '#666' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="available" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      name="Available Balance"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="pending" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      name="Pending Balance"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Sources */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <BanknotesIcon className="h-5 w-5 mr-2" />
                Revenue Sources
              </CardTitle>
              <CardDescription>
                Income breakdown by payment type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Private Pay', value: 120.00 },
                        { name: 'Insurance', value: 54.48 },
                        { name: 'Sliding Scale', value: 0.00 },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {[
                        { name: 'Private Pay', value: 120.00 },
                        { name: 'Insurance', value: 54.48 },
                        { name: 'Sliding Scale', value: 0.00 },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#22c55e', '#3b82f6', '#f59e0b'][index % 3]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Income Trend */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <ArrowTrendingUpIcon className="h-5 w-5 mr-2" />
                Monthly Income Trend
              </CardTitle>
              <CardDescription>
                Revenue growth over recent months
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { month: 'Mar', income: 980.00 },
                    { month: 'Apr', income: 1120.00 },
                    { month: 'May', income: 1340.00 },
                    { month: 'Jun', income: 1180.00 },
                    { month: 'Jul', income: 1240.00 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="spending" className="space-y-6">
        <SpendingTrackerContent />
      </TabsContent>
    </Tabs>
  );
}