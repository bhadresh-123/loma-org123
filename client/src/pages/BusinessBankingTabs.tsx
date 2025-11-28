            <Tabs defaultValue="overview">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview & Analytics</TabsTrigger>
                <TabsTrigger value="transactions">Financial Activity</TabsTrigger>
                <TabsTrigger value="invoicing">Client Invoicing</TabsTrigger>
                <TabsTrigger value="cards">Cards & Settings</TabsTrigger>
              </TabsList>
              
              {/* Overview & Analytics Tab */}
              <TabsContent value="overview">
                {!financialMetrics ? (
                  <div className="text-center py-10">
                    <LineChartIcon className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                    <h3 className="font-medium text-lg">No Financial Data Available</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Financial metrics will appear here once you start accepting payments and recording expenses.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Weekly summary cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Earned this week */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Earned This Week
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center">
                            <div className="mr-2 rounded-full bg-green-100 p-2">
                              <DollarIcon className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <div className="text-2xl font-bold">
                                {formatCurrency(financialMetrics.earnedThisWeek)}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(getWeekDates().monday.getTime() / 1000)} - {formatDate(getWeekDates().sunday.getTime() / 1000)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      
                      {/* Monthly revenue */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Monthly Revenue
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center">
                            <div className="mr-2 rounded-full bg-blue-100 p-2">
                              <CalendarIcon className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-2xl font-bold">
                                {formatCurrency(financialMetrics.monthlyRevenue)}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Current month progress
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Pending payouts */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Pending Payouts
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center">
                            <div className="mr-2 rounded-full bg-yellow-100 p-2">
                              <ClockIcon className="h-4 w-4 text-yellow-600" />
                            </div>
                            <div>
                              <div className="text-2xl font-bold">
                                {formatCurrency((connectAccount?.balance?.pending || 0) / 100)}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Processing to bank account
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Active sessions */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Active Sessions
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center">
                            <div className="mr-2 rounded-full bg-purple-100 p-2">
                              <UsersIcon className="h-4 w-4 text-purple-600" />
                            </div>
                            <div>
                              <div className="text-2xl font-bold">
                                {financialMetrics.activeSessions}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Sessions this month
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
                          <CardTitle className="text-base">Balance Trend</CardTitle>
                          <CardDescription>
                            Available vs Pending balance over time
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={financialMetrics.balanceTrend}>
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

                      {/* Revenue by Source */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Revenue Sources</CardTitle>
                          <CardDescription>
                            Breakdown of income by payment type
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={financialMetrics.revenueBySource}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                                  outerRadius={80}
                                  dataKey="value"
                                >
                                  {financialMetrics.revenueBySource.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'][index % 4]} />
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
                          <CardTitle className="text-base">Monthly Income Trend</CardTitle>
                          <CardDescription>
                            Revenue growth over the last 6 months
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={financialMetrics.monthlyIncome}>
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
                  </div>
                )}
              </TabsContent>
              
              {/* Financial Activity Tab (combines transactions and payouts) */}
              <TabsContent value="transactions">
                <div className="grid grid-cols-1 gap-6">
                  {/* Account Balance Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Account Balance</CardTitle>
                      <CardDescription>
                        Current available and pending funds in your business account
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col space-y-2 p-6 border rounded-lg">
                          <h3 className="text-sm font-medium text-muted-foreground">Available Balance</h3>
                          <div className="text-3xl font-bold">{formatCurrency((connectAccount?.balance?.available || 0) / 100)}</div>
                          <p className="text-xs text-muted-foreground">Ready for transfer to your bank account</p>
                        </div>
                        <div className="flex flex-col space-y-2 p-6 border rounded-lg">
                          <h3 className="text-sm font-medium text-muted-foreground">Pending Balance</h3>
                          <div className="text-3xl font-bold">{formatCurrency((connectAccount?.balance?.pending || 0) / 100)}</div>
                          <p className="text-xs text-muted-foreground">Processing, will be available soon</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Transaction History */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Transactions</CardTitle>
                      <CardDescription>
                        Recent activity in your business account
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {connectAccount.recentTransactions.length === 0 ? (
                        <div className="text-center py-10">
                          <Clock className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                          <h3 className="font-medium text-lg">No Transactions Yet</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Transaction history will appear here once you start receiving payments.
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-hidden rounded-md border">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-muted/50 border-b">
                                <th className="h-10 px-4 text-left font-medium">Type/Description</th>
                                <th className="h-10 px-4 text-left font-medium">Date</th>
                                <th className="h-10 px-4 text-right font-medium">Amount</th>
                                <th className="h-10 px-4 text-right font-medium">Fee</th>
                              </tr>
                            </thead>
                            <tbody>
                              {connectAccount.recentTransactions.map((transaction: StripeTransaction, index: number) => (
                                <tr key={transaction.id} className={index % 2 ? 'bg-muted/20' : ''}>
                                  <td className="p-4 align-middle">
                                    <div className="font-medium">{transaction.description || transaction.type}</div>
                                  </td>
                                  <td className="p-4 align-middle text-muted-foreground">
                                    {formatDate(transaction.created)}
                                  </td>
                                  <td className="p-4 align-middle text-right font-medium">
                                    {formatCurrency(transaction.net / 100)}
                                  </td>
                                  <td className="p-4 align-middle text-right text-muted-foreground">
                                    {formatCurrency(transaction.fee / 100)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Pending Payouts */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Pending Payouts</CardTitle>
                      <CardDescription>
                        Funds scheduled to be transferred to your bank account
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {connectAccount.pendingPayouts.length === 0 ? (
                        <div className="text-center py-10">
                          <CreditCard className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                          <h3 className="font-medium text-lg">No Pending Payouts</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Payouts will appear here when you have funds scheduled for transfer.
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-hidden rounded-md border">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-muted/50 border-b">
                                <th className="h-10 px-4 text-left font-medium">Description</th>
                                <th className="h-10 px-4 text-left font-medium">Expected Date</th>
                                <th className="h-10 px-4 text-center font-medium">Status</th>
                                <th className="h-10 px-4 text-right font-medium">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {connectAccount.pendingPayouts.map((payout: StripePayout, index: number) => (
                                <tr key={payout.id} className={index % 2 ? 'bg-muted/20' : ''}>
                                  <td className="p-4 align-middle">
                                    <div className="font-medium">{payout.description || 'Payout'}</div>
                                  </td>
                                  <td className="p-4 align-middle text-muted-foreground">
                                    {formatDate(payout.arrival_date)}
                                  </td>
                                  <td className="p-4 align-middle text-center">
                                    <span className="text-xs px-2 py-1 rounded-full inline-block" 
                                      style={{ 
                                        backgroundColor: payout.status === 'paid' ? '#dcfce7' : 
                                                       payout.status === 'pending' ? '#dbeafe' : '#fef9c3',
                                        color: payout.status === 'paid' ? '#166534' : 
                                             payout.status === 'pending' ? '#1e40af' : '#854d0e'
                                      }}>
                                      {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                                    </span>
                                  </td>
                                  <td className="p-4 align-middle text-right font-medium">
                                    {formatCurrency(payout.amount / 100)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              {/* Client Invoicing Tab (combines connected invoices and session invoicing) */}
              <TabsContent value="invoicing">
                <div className="grid grid-cols-1 gap-6">
                  {/* Session Invoicing */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Session Invoicing</CardTitle>
                        <CardDescription>
                          Generate invoices for client sessions
                        </CardDescription>
                      </div>
                      {selectedSessions.length > 0 && (
                        <Button onClick={() => setShowInvoicePreview(true)}>
                          <DocumentTextIcon className="mr-2 h-4 w-4" />
                          Send Invoice ({selectedSessions.length})
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      {isLoadingSessionInvoicing ? (
                        <div className="flex items-center justify-center py-10">
                          <Loader2 className="h-8 w-8 animate-spin mr-2" />
                          <p>Loading session invoicing data...</p>
                        </div>
                      ) : sessionInvoiceError ? (
                        <Alert variant="destructive" className="mb-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Error</AlertTitle>
                          <AlertDescription>
                            {sessionInvoiceError.message || 'Failed to load session invoicing data'}
                          </AlertDescription>
                        </Alert>
                      ) : !sessionInvoicingData ? (
                        <div className="text-center py-10">
                          <Receipt className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                          <h3 className="font-medium text-lg">No Session Data Available</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Complete some sessions to begin generating invoices.
                          </p>
                        </div>
                      ) : (
                        <div>
                          <div className="mb-4">
                            <Select
                              value={clientFilterSessions}
                              onValueChange={(value) => setClientFilterSessions(value)}
                            >
                              <SelectTrigger className="w-64">
                                <SelectValue placeholder="Filter by client" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Clients</SelectItem>
                                {clientsData?.map((client: any) => (
                                  <SelectItem key={client.id} value={client.id.toString()}>
                                    {client.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <h3 className="font-medium">Uninvoiced Sessions</h3>
                            <div className="overflow-hidden rounded-md border">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-muted/50 border-b">
                                    <th className="w-10 p-2">
                                      <span className="sr-only">Select</span>
                                    </th>
                                    <th className="h-10 px-4 text-left font-medium">Client</th>
                                    <th className="h-10 px-4 text-left font-medium">Date</th>
                                    <th className="h-10 px-4 text-left font-medium">Type</th>
                                    <th className="h-10 px-4 text-right font-medium">Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {renderFilteredSessions(sessionInvoicingData.uninvoicedSessions, clientFilterSessions)}
                                </tbody>
                              </table>
                            </div>
                          </div>
                          
                          <div className="mt-8 space-y-2">
                            <h3 className="font-medium">Invoiced Sessions</h3>
                            <div className="overflow-hidden rounded-md border">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-muted/50 border-b">
                                    <th className="h-10 px-4 text-left font-medium">Client</th>
                                    <th className="h-10 px-4 text-left font-medium">Date</th>
                                    <th className="h-10 px-4 text-left font-medium">Type</th>
                                    <th className="h-10 px-4 text-right font-medium">Amount</th>
                                    <th className="h-10 px-4 text-center font-medium">Invoice</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {renderFilteredSessions(sessionInvoicingData.invoicedSessions, clientFilterSessions)}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Connected Invoices */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Connected Invoices</CardTitle>
                      <CardDescription>
                        Invoices paid through your business banking account
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {!connectAccount.connectInvoices || connectAccount.connectInvoices.length === 0 ? (
                        <div className="text-center py-10">
                          <DocumentTextIcon className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                          <h3 className="font-medium text-lg">No Connected Invoices Yet</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Invoices will appear here once clients pay invoices connected to your business account.
                          </p>
                        </div>
                      ) : (
                        <div>
                          <div className="mb-4">
                            <div className="flex items-center space-x-4">
                              <div className="w-64">
                                <Select
                                  value={clientFilter}
                                  onValueChange={(value) => setClientFilter(value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Filter by client" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All Clients</SelectItem>
                                    {clientsData?.map((client: any) => (
                                      <SelectItem key={client.id} value={client.id.toString()}>
                                        {client.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="w-64">
                                <Select
                                  value={invoiceStatusFilter}
                                  onValueChange={(value) => setInvoiceStatusFilter(value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Filter by status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="paid">Paid</SelectItem>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="draft">Draft</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                          <div className="overflow-hidden rounded-md border">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-muted/50 border-b">
                                  <th className="h-10 px-4 text-left font-medium">Invoice</th>
                                  <th className="h-10 px-4 text-left font-medium">Client</th>
                                  <th className="h-10 px-4 text-left font-medium">Date</th>
                                  <th className="h-10 px-4 text-center font-medium">Status</th>
                                  <th className="h-10 px-4 text-right font-medium">Amount</th>
                                  <th className="h-10 px-4 text-center font-medium">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {connectAccount.connectInvoices
                                  .filter(invoice => 
                                    (clientFilter === 'all' || invoice.patientId?.toString() === clientFilter) &&
                                    (invoiceStatusFilter === 'all' || invoice.status === invoiceStatusFilter)
                                  )
                                  .map((invoice: any, index: number) => (
                                    <tr key={invoice.id} className={index % 2 ? 'bg-muted/20' : ''}>
                                      <td className="p-4 align-middle">
                                        <div className="font-medium">#{invoice.invoiceNumber}</div>
                                      </td>
                                      <td className="p-4 align-middle text-muted-foreground">
                                        {invoice.clientName}
                                      </td>
                                      <td className="p-4 align-middle text-muted-foreground">
                                        {new Date(invoice.createdAt).toLocaleDateString()}
                                      </td>
                                      <td className="p-4 align-middle text-center">
                                        <span className="text-xs px-2 py-1 rounded-full inline-block" 
                                          style={{ 
                                            backgroundColor: invoice.status === 'paid' ? '#dcfce7' : 
                                                            invoice.status === 'sent' ? '#dbeafe' : '#fef9c3',
                                            color: invoice.status === 'paid' ? '#166534' : 
                                                  invoice.status === 'sent' ? '#1e40af' : '#854d0e'
                                          }}>
                                          {invoice.status === 'draft' ? 'Draft' : 
                                          invoice.status === 'sent' ? 'Sent' : 
                                          invoice.status === 'paid' ? 'Paid' : invoice.status}
                                        </span>
                                      </td>
                                      <td className="p-4 align-middle text-right font-medium">
                                        {formatCurrency(parseFloat(invoice.total))}
                                      </td>
                                      <td className="p-4 align-middle text-center">
                                        {invoice.stripeHostedUrl && (
                                          <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => window.open(invoice.stripeHostedUrl, '_blank')}
                                          >
                                            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              {/* Cards & Settings Tab */}
              <TabsContent value="cards">
                <div className="grid grid-cols-1 gap-6">
                  {/* Business Cards */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Business Cards</CardTitle>
                        <CardDescription>
                          Manage and issue cards for your business expenses
                        </CardDescription>
                      </div>
                      <Button onClick={() => setIsCreatingNewCard(true)} disabled={isCreatingNewCard}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Card
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {isCreatingNewCard ? (
                        <div className="space-y-4">
                          <h3 className="font-medium text-lg">Issue a new card</h3>
                          <form onSubmit={handleCreateCard} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label htmlFor="cardholderName" className="text-sm font-medium">
                                  Cardholder Name*
                                </label>
                                <input
                                  id="cardholderName"
                                  name="cardholderName"
                                  value={cardFormValues.cardholderName}
                                  onChange={handleCardFormChange}
                                  className="w-full p-2 border rounded-md"
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <label htmlFor="cardholderEmail" className="text-sm font-medium">
                                  Cardholder Email*
                                </label>
                                <input
                                  id="cardholderEmail"
                                  name="cardholderEmail"
                                  type="email"
                                  value={cardFormValues.cardholderEmail}
                                  onChange={handleCardFormChange}
                                  className="w-full p-2 border rounded-md"
                                  required
                                />
                              </div>
                            </div>
                            
                            <div className="flex justify-end space-x-2">
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setIsCreatingNewCard(false)}
                              >
                                Cancel
                              </Button>
                              <Button 
                                type="submit" 
                                disabled={isCreatingVirtualCard || isCreatingPhysicalCard}
                              >
                                {isCreatingVirtualCard || isCreatingPhysicalCard ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                  </>
                                ) : (
                                  <>
                                    Create Card
                                  </>
                                )}
                              </Button>
                            </div>
                          </form>
                        </div>
                      ) : isLoadingCards ? (
                        <div className="flex items-center justify-center py-20">
                          <Loader2 className="h-8 w-8 animate-spin mr-2" />
                          <p>Loading your cards...</p>
                        </div>
                      ) : cardsError ? (
                        <div className="text-center py-10">
                          <AlertCircle className="mx-auto h-10 w-10 text-destructive mb-2" />
                          <h3 className="font-medium text-lg">Unable to Load Cards</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {cardsError && cardsError.message.includes("not set up to use Issuing") 
                              ? "Your Stripe account is not set up for Issuing. Please visit the Stripe dashboard to enable this feature."
                              : "There was an error loading your cards. Please try again later."}
                          </p>
                        </div>
                      ) : cards.length === 0 ? (
                        <div className="text-center py-10">
                          <CardIcon className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                          <h3 className="font-medium text-lg">No Cards Yet</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Click 'New Card' to create your first business card.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm">Show canceled cards</span>
                              <Switch
                                checked={showCanceledCards}
                                onCheckedChange={setShowCanceledCards}
                                aria-label="Show canceled cards"
                              />
                            </div>
                          </div>
                          {cards
                            .filter(card => showCanceledCards || card.status !== 'canceled')
                            .map((card) => (
                            <div key={card.id} className="border rounded-lg p-4">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="flex items-center space-x-2 mb-1">
                                    <CardIcon className="h-5 w-5 text-primary" />
                                    <span className="font-medium">{card.cardholderName}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Account Settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Account Settings</CardTitle>
                      <CardDescription>
                        Manage your business banking account settings
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-4 border rounded-lg">
                          <div>
                            <h3 className="font-medium">Stripe Dashboard</h3>
                            <p className="text-sm text-muted-foreground">
                              Access your full Stripe Connect account dashboard
                            </p>
                          </div>
                          <Button 
                            variant="outline"
                            onClick={() => getDashboardLink()}
                            disabled={isGettingDashboardLink}
                          >
                            {isGettingDashboardLink ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-2" />
                            )}
                            Open Dashboard
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>