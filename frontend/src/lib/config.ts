// API configuration
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws';

// Blockchain configuration
export const SOMNIA_RPC_URL = process.env.NEXT_PUBLIC_SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network';
export const SOMNIA_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_SOMNIA_CHAIN_ID || '50311', 10);
export const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_ADDRESS || '';

// Chain configuration for wallet
export const SOMNIA_CHAIN = {
  chainId: `0x${SOMNIA_CHAIN_ID.toString(16)}`,
  chainName: 'Somnia Devnet',
  nativeCurrency: {
    name: 'STT',
    symbol: 'STT',
    decimals: 18,
  },
  rpcUrls: [SOMNIA_RPC_URL],
  blockExplorerUrls: ['https://somnia-devnet.socialscan.io'],
};

// Category configuration
export const CATEGORIES = [
  { id: 'EARTHQUAKE', name: 'Earthquake Relief', slug: 'earthquake', color: '#ef4444', icon: '🏚️' },
  { id: 'FLOOD', name: 'Flood Relief', slug: 'flood', color: '#3b82f6', icon: '🌊' },
  { id: 'MEDICAL', name: 'Medical Aid', slug: 'medical', color: '#22c55e', icon: '🏥' },
  { id: 'EDUCATION', name: 'Education', slug: 'education', color: '#a855f7', icon: '📚' },
  { id: 'EMERGENCY', name: 'Emergency Relief', slug: 'emergency', color: '#f97316', icon: '🚨' },
  { id: 'OTHER', name: 'Other Causes', slug: 'other', color: '#6b7280', icon: '💝' },
] as const;

// Donation presets
export const DONATION_PRESETS = [
  { amount: '0.01', label: '0.01 STT' },
  { amount: '0.1', label: '0.1 STT' },
  { amount: '1', label: '1 STT' },
  { amount: '5', label: '5 STT' },
  { amount: '10', label: '10 STT' },
];

// Animation durations
export const ANIMATION = {
  fast: 150,
  normal: 300,
  slow: 500,
};

// Pagination defaults
export const PAGINATION = {
  defaultLimit: 12,
  maxLimit: 100,
};
