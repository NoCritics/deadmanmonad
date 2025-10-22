"use client";

import { useState } from 'react';
import { useWallet } from '@/lib/WalletContext';

export default function WalletConnect() {
  const { address, isConnected, setPrivateKey, disconnect } = useWallet();
  const [keyInput, setKeyInput] = useState('');

  const handleConnect = () => {
    if (keyInput.trim()) {
      const key = keyInput.trim().startsWith('0x') ? keyInput.trim() : `0x${keyInput.trim()}`;
      setPrivateKey(key as any);
      setKeyInput('');
    }
  };

  if (isConnected) {
    return (
      <div className="card mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#06B6D4] flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--vault-text-dim)' }}>Connected Wallet</p>
              <p className="font-mono text-sm font-semibold mt-1" style={{ color: 'var(--vault-text)' }}>{address}</p>
            </div>
          </div>
          <button onClick={disconnect} className="btn-secondary text-sm">
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card mb-8 max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#06B6D4] flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold vault-gradient-text mb-2">Connect Wallet</h3>
        <p className="text-sm" style={{ color: 'var(--vault-text-dim)' }}>
          Enter your private key to create and manage vaults
        </p>
      </div>

      <div className="space-y-4">
        <div className="p-4 rounded-lg border-2" style={{ backgroundColor: 'rgba(255, 152, 0, 0.1)', borderColor: 'rgba(255, 152, 0, 0.3)' }}>
          <div className="flex items-start gap-2 mb-2">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#FF9800' }} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold mb-1" style={{ color: '#F57C00' }}>⚠️ TESTNET ONLY - Security Warning</p>
              <p className="text-xs leading-relaxed" style={{ color: '#E65100' }}>
                Private keys are stored <strong>unencrypted</strong> in your browser's localStorage.
                Only use <strong>testnet keys</strong> with no real value. Never enter mainnet keys or keys with real funds.
              </p>
            </div>
          </div>
        </div>

        <input
          type="password"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          className="input-field"
          placeholder="0x... (Testnet Private Key Only)"
          onKeyPress={(e) => e.key === 'Enter' && handleConnect()}
        />
        <button onClick={handleConnect} className="btn-primary w-full" disabled={!keyInput.trim()}>
          Connect Testnet Wallet
        </button>
        <p className="text-xs text-center" style={{ color: 'var(--vault-text-dim)' }}>
          Your key is stored locally in browser storage (not on any server)
        </p>
      </div>
    </div>
  );
}
