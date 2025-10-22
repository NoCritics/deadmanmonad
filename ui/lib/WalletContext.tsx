"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { privateKeyToAccount } from 'viem/accounts';
import type { Hex } from 'viem';

interface WalletContextType {
  privateKey: Hex | null;
  address: string | null;
  setPrivateKey: (key: Hex) => void;
  disconnect: () => void;
  isConnected: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [privateKey, setPrivateKeyState] = useState<Hex | null>(null);
  const [address, setAddress] = useState<string | null>(null);

  const setPrivateKey = (key: Hex) => {
    try {
      const account = privateKeyToAccount(key);
      setPrivateKeyState(key);
      setAddress(account.address);

      // Store in localStorage for convenience (DEMO ONLY - NOT SECURE FOR PRODUCTION)
      if (typeof window !== 'undefined') {
        localStorage.setItem('demo_private_key', key);
      }
    } catch (error) {
      console.error('Invalid private key:', error);
      alert('Invalid private key format');
    }
  };

  const disconnect = () => {
    setPrivateKeyState(null);
    setAddress(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('demo_private_key');
    }
  };

  // Auto-load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('demo_private_key');
      if (stored) {
        try {
          const account = privateKeyToAccount(stored as Hex);
          setPrivateKeyState(stored as Hex);
          setAddress(account.address);
        } catch (error) {
          localStorage.removeItem('demo_private_key');
        }
      }
    }
  }, []);

  return (
    <WalletContext.Provider
      value={{
        privateKey,
        address,
        setPrivateKey,
        disconnect,
        isConnected: !!privateKey,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
