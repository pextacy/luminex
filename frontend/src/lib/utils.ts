import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format ETH/STT amount
export function formatAmount(weiAmount: string, decimals: number = 4): string {
  const amount = parseFloat(weiAmount) / 1e18;
  if (amount === 0) return '0';
  if (amount < 0.0001) return '<0.0001';
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

// Format amount with currency
export function formatCurrency(amount: string, currency: string = 'STT'): string {
  return `${formatAmount(amount)} ${currency}`;
}

// Format USD amount
export function formatUsd(amount: string): string {
  const num = parseFloat(amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

// Shorten address
export function shortenAddress(address: string, chars: number = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

// Calculate progress percentage
export function calculateProgress(current: string, target: string): number {
  const currentNum = parseFloat(current);
  const targetNum = parseFloat(target);
  if (targetNum === 0) return 0;
  return Math.min((currentNum / targetNum) * 100, 100);
}

// Alias for calculateProgress (used interchangeably)
export function getProgressPercentage(current: string, target: string): number {
  return calculateProgress(current, target);
}

// Format date relative
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// Format date
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Format number with commas
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

// Format compact number
export function formatCompactNumber(num: number): string {
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toString();
}

// Validate Ethereum address
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Generate random ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Debounce function
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Sleep function
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Parse error message
export function parseError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unknown error occurred';
}

// Copy to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// Get category color
export function getCategoryColor(categoryId: string): string {
  const colors: Record<string, string> = {
    EARTHQUAKE: '#ef4444',
    FLOOD: '#3b82f6',
    MEDICAL: '#22c55e',
    EDUCATION: '#a855f7',
    EMERGENCY: '#f97316',
    OTHER: '#6b7280',
  };
  return colors[categoryId] || colors.OTHER;
}

// Get category icon
export function getCategoryIcon(categoryId: string): string {
  const icons: Record<string, string> = {
    EARTHQUAKE: '🏚️',
    FLOOD: '🌊',
    MEDICAL: '🏥',
    EDUCATION: '📚',
    EMERGENCY: '🚨',
    OTHER: '💝',
  };
  return icons[categoryId] || icons.OTHER;
}
