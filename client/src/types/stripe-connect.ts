// Stripe Connect types for frontend

export interface StripeConnectAccount {
  accountId: string;
  onboardingComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  defaultCurrency: string;
  balance: StripeBalance;
  recentTransactions: StripeTransaction[];
  connectInvoices: ConnectInvoice[];
  pendingPayouts: StripePayout[];
}

export interface ConnectInvoice {
  id: number;
  invoiceNumber: string;
  status: string;
  subtotal: string;
  total: string;
  dueDate: string;
  stripeInvoiceId: string | null;
  stripeHostedUrl: string | null;
  patientId: number;
  clientName: string;
  createdAt: string;
}

export interface StripeBalance {
  available: number;
  pending: number;
  lastUpdated: string;
}

export interface StripeTransaction {
  id: string;
  amount: number;
  available_on: number;
  created: number;
  currency: string;
  description: string | null;
  fee: number;
  net: number;
  status: string;
  type: string;
}

export interface StripePayout {
  id: string;
  amount: number;
  arrival_date: number;
  created: number;
  currency: string;
  description: string | null;
  status: string;
}

export interface CreateConnectAccountResponse {
  success: boolean;
  accountId: string;
  accountLinkUrl: string;
  error?: string;
}

export interface GetConnectAccountResponse {
  success: boolean;
  hasAccount: boolean;
  accountId?: string;
  onboardingComplete?: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  defaultCurrency?: string;
  balance?: StripeBalance;
  recentTransactions?: StripeTransaction[];
  connectInvoices?: ConnectInvoice[];
  pendingPayouts?: StripePayout[];
  error?: string;
}

export interface CreateAccountLinkResponse {
  success: boolean;
  url: string;
  error?: string;
}

export interface GetDashboardLinkResponse {
  success: boolean;
  url: string;
  error?: string;
}