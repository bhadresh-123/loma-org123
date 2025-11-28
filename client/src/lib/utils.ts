import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow as fDistanceToNow } from "@/utils/dateFnsCompat"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatDistanceToNow(date: Date): string {
  return fDistanceToNow(date, { addSuffix: true });
}

export function formatDate(date: Date): string {
  return format(date, 'MMM dd, yyyy');
}
export const THERAPIST_IDENTITIES = [
  'Male',
  'Female',
  'LGBTQ+',
  'BIPOC',
  'Multicultural',
  'Religious',
  'Secular',
  'Veteran'
];
