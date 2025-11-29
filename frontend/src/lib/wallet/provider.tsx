'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { BrowserProvider, formatEther, parseEther, Contract } from 'ethers';
import { SOMNIA_CHAIN, VAULT_ADDRESS, SOMNIA_CHAIN_ID } from '@/lib/config';
import type { WalletState } from '@/lib/types';

// Vault ABI (minimal for donations)
const VAULT_ABI = [
  'function donate(uint256 campaignId, string message) payable',
  'function getCampaign(uint256 campaignId) view returns (address owner, uint256 targetAmount, uint256 currentAmount, uint256 donorCount, bool isActive, bool isCompleted)',
  'event DonationReceived(uint256 indexed campaignId, address indexed donor, uint256 amount, string message)',
];

interface WalletContextValue extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  donate: (campaignOnChainId: string, amount: string, message?: string) => Promise<string>;
  switchToSomnia: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    isConnecting: false,
    address: null,
    balance: null,
    chainId: null,
    error: null,
  });

  // Check if already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window === 'undefined' || !window.ethereum) return;
      
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[];
        if (accounts.length > 0) {
          const provider = new BrowserProvider(window.ethereum);
          const network = await provider.getNetwork();
          const balance = await provider.getBalance(accounts[0]);
          
          setState({
            isConnected: true,
            isConnecting: false,
            address: accounts[0],
            balance: formatEther(balance),
            chainId: Number(network.chainId),
            error: null,
          });
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    };

    checkConnection();
  }, []);

  // Listen for account/network changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setState({
          isConnected: false,
          isConnecting: false,
          address: null,
          balance: null,
          chainId: null,
          error: null,
        });
      } else {
        setState(prev => ({ ...prev, address: accounts[0] }));
        // Refresh balance
        refreshBalance(accounts[0]);
      }
    };

    const handleChainChanged = (chainId: string) => {
      setState(prev => ({ ...prev, chainId: parseInt(chainId, 16) }));
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  const refreshBalance = async (address: string) => {
    if (!window.ethereum) return;
    try {
      const provider = new BrowserProvider(window.ethereum);
      const balance = await provider.getBalance(address);
      setState(prev => ({ ...prev, balance: formatEther(balance) }));
    } catch (error) {
      console.error('Error refreshing balance:', error);
    }
  };

  const connect = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setState(prev => ({ ...prev, error: 'Please install MetaMask or another Web3 wallet' }));
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      }) as string[];
      
      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const provider = new BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const balance = await provider.getBalance(accounts[0]);

      setState({
        isConnected: true,
        isConnecting: false,
        address: accounts[0],
        balance: formatEther(balance),
        chainId: Number(network.chainId),
        error: null,
      });

      // Switch to Somnia if not on it
      if (Number(network.chainId) !== SOMNIA_CHAIN_ID) {
        await switchToSomnia();
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Failed to connect wallet',
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      isConnected: false,
      isConnecting: false,
      address: null,
      balance: null,
      chainId: null,
      error: null,
    });
  }, []);

  const switchToSomnia = useCallback(async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SOMNIA_CHAIN.chainId }],
      });
    } catch (switchError: unknown) {
      // Chain not added, try to add it
      if ((switchError as { code?: number })?.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [SOMNIA_CHAIN],
          });
        } catch (addError) {
          console.error('Error adding Somnia chain:', addError);
          throw addError;
        }
      } else {
        throw switchError;
      }
    }
  }, []);

  const donate = useCallback(async (campaignOnChainId: string, amount: string, message: string = '') => {
    if (!window.ethereum || !state.address) {
      throw new Error('Wallet not connected');
    }

    // Ensure we're on Somnia
    if (state.chainId !== SOMNIA_CHAIN_ID) {
      await switchToSomnia();
    }

    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    const contract = new Contract(VAULT_ADDRESS, VAULT_ABI, signer);
    
    const tx = await contract.donate(campaignOnChainId, message, {
      value: parseEther(amount),
    });

    // Wait for transaction confirmation
    const receipt = await tx.wait();
    
    // Refresh balance after donation
    await refreshBalance(state.address);

    return receipt.hash;
  }, [state.address, state.chainId, switchToSomnia]);

  return (
    <WalletContext.Provider
      value={{
        ...state,
        connect,
        disconnect,
        donate,
        switchToSomnia,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

// Add ethereum types to window
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}
