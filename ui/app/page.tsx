"use client";

import { useState } from "react";
import CreateVaultForm from "@/components/CreateVaultForm";
import OwnerDashboard from "@/components/OwnerDashboard";
import BeneficiaryView from "@/components/BeneficiaryView";
import WalletConnect from "@/components/WalletConnect";
import { useWallet } from "@/lib/WalletContext";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"create" | "owner" | "beneficiary">("create");
  const [vaultAddress, setVaultAddress] = useState<string>("");
  const { isConnected } = useWallet();

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className="relative overflow-hidden mb-12">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center relative">
          <div className="inline-block mb-4">
            <div className="flex items-center gap-3 px-6 py-2 rounded-full" style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)' }}></div>
              <span className="text-sm font-medium" style={{ color: '#8B5CF6' }}>Built on Monad Testnet</span>
            </div>
          </div>
          <h1 className="text-6xl font-bold mb-6" style={{ color: '#8B5CF6' }}>
            Digital Inheritance Vault
          </h1>
          <p className="text-xl max-w-2xl mx-auto leading-relaxed mb-4" style={{ color: '#6B7280' }}>
            Secure your legacy with time-locked smart contract delegations
          </p>
          <p className="text-lg font-medium">
            <span style={{ color: '#8B5CF6', fontWeight: 600 }}>MetaMask Smart Accounts</span> <span style={{ color: '#6B7280' }}>×</span> <span style={{ color: '#06B6D4', fontWeight: 600 }}>Monad</span>
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-8">

      {/* Security Warning Banner */}
      <div className="mb-8 p-6 rounded-xl border-2" style={{ backgroundColor: 'rgba(255, 152, 0, 0.05)', borderColor: 'rgba(255, 152, 0, 0.3)' }}>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <svg className="w-8 h-8" style={{ color: '#FF9800' }} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold mb-2" style={{ color: '#F57C00' }}>⚠️ Testnet Demo - Security Notice</h3>
            <p className="text-sm leading-relaxed mb-3" style={{ color: '#E65100' }}>
              This is a <strong>hackathon demo</strong> for educational purposes. Private keys are stored <strong>unencrypted</strong> in your browser.
              Only use <strong>testnet keys with no real value</strong>. Never enter mainnet keys or keys holding real funds.
            </p>
            <p className="text-sm leading-relaxed mb-3" style={{ color: '#E65100' }}>
              <strong>⚡ Serverless Limitation:</strong> Vault data is stored in temporary memory and will be lost when the serverless function restarts (cold starts).
              For persistent storage, run locally or use a database backend.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(255, 152, 0, 0.2)', color: '#E65100' }}>
                🔓 Unencrypted Storage
              </span>
              <span className="text-xs px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(255, 152, 0, 0.2)', color: '#E65100' }}>
                🧪 Testnet Only
              </span>
              <span className="text-xs px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(255, 152, 0, 0.2)', color: '#E65100' }}>
                🚫 Not Production Ready
              </span>
              <span className="text-xs px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(255, 152, 0, 0.2)', color: '#E65100' }}>
                ⚡ Temporary Storage
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Connection */}
      {!isConnected && <WalletConnect />}

      {isConnected && (
        <>
      {/* Tab Navigation */}
      <div className="card mb-8">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab("create")}
            className={`tab-button flex-1 ${activeTab === "create" ? "active" : ""}`}
          >
            Create Vault
          </button>
          <button
            onClick={() => setActiveTab("owner")}
            className={`tab-button flex-1 ${activeTab === "owner" ? "active" : ""}`}
          >
            Owner Dashboard
          </button>
          <button
            onClick={() => setActiveTab("beneficiary")}
            className={`tab-button flex-1 ${activeTab === "beneficiary" ? "active" : ""}`}
          >
            Beneficiary View
          </button>
        </div>

        <div className="text-sm" style={{ color: 'var(--vault-text-dim)' }}>
          {activeTab === "create" && (
            <p>Create a new vault and add beneficiaries with time-locked delegations</p>
          )}
          {activeTab === "owner" && (
            <p>Check in to reset timer and view vault status</p>
          )}
          {activeTab === "beneficiary" && (
            <p>View your allocation and claim inheritance after deadline</p>
          )}
        </div>
      </div>

      {/* Content */}
      <div>
        {activeTab === "create" && (
          <CreateVaultForm onVaultCreated={setVaultAddress} />
        )}
        {activeTab === "owner" && (
          <OwnerDashboard />
        )}
        {activeTab === "beneficiary" && (
          <BeneficiaryView />
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#8B5CF6] to-[#06B6D4] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold">How It Works</h3>
          </div>
          <p className="text-sm" style={{ color: 'var(--vault-text-dim)' }}>
            Owner creates a vault with time-locked funds. Must check in periodically or beneficiaries can claim.
          </p>
        </div>
        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#8B5CF6] to-[#06B6D4] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold">Check-In Period</h3>
          </div>
          <p className="text-sm" style={{ color: 'var(--vault-text-dim)' }}>
            Flexible periods from 5 minutes (testing) to 12 months (production).
          </p>
        </div>
        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#8B5CF6] to-[#06B6D4] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold">Security</h3>
          </div>
          <p className="text-sm" style={{ color: 'var(--vault-text-dim)' }}>
            Multi-caveat delegations with timestamp, one-time claim, and amount limits.
          </p>
        </div>
      </div>
      </>
      )}
      </div>
    </div>
  );
}
