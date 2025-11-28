// Stripe Issuing types for frontend

export interface StripeCard {
  id: number;
  userId: number;
  stripeCardId: string;
  cardholderName: string;
  last4: string | null;
  brand: string | null;
  expMonth: number | null;
  expYear: number | null;
  status: string;
  type: 'virtual' | 'physical';
  cardLimit: string | null;
  currency: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string | null;
  transactions?: CardTransaction[];
}

export interface CardTransaction {
  id: number;
  userId: number;
  cardId: number;
  stripeTransactionId: string;
  amount: string;
  currency: string;
  description: string | null;
  type: string | null;
  metadata: {
    merchantName?: string | null;
    merchantCategory?: string | null;
    timestamp?: string | null;
    processingDate?: string | null;
  };
  createdAt: string;
}

export interface CardDetails {
  number: string;
  cvc: string;
  expMonth: number;
  expYear: number;
}

export interface StripeCardWithDetails extends StripeCard {
  details?: CardDetails;
}

// API Response Types
export interface CreateCardResponse {
  success: boolean;
  card: StripeCard;
  error?: string;
}

export interface GetCardsResponse {
  success: boolean;
  cards: StripeCard[];
  error?: string;
}

export interface GetCardResponse {
  success: boolean;
  card: StripeCard;
  error?: string;
}

export interface GetCardDetailsResponse {
  success: boolean;
  card: StripeCardWithDetails;
  error?: string;
}

export interface UpdateCardStatusResponse {
  success: boolean;
  card: StripeCard;
  error?: string;
}