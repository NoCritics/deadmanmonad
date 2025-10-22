"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/lib/WalletContext";
import CountdownTimer from "./CountdownTimer";

export default function OwnerDashboard() {
  const { privateKey } = useWallet();
  const [vaultAddress, setVaultAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [vaultData, setVaultData] = useState<any>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  const loadVault = async () => {
    if (!vaultAddress) return;

    setLoading(true);
    try {
      console.log("Loading vault:", vaultAddress);

      // Call real backend API
      const response = await fetch(`/api/vault/status?address=${vaultAddress}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to load vault");
      }

      const vaultStatus = data.status;

      // Format check-in period display
      const checkInPeriodDisplay = `${vaultStatus.config.checkInPeriod} ${vaultStatus.config.checkInPeriodUnit}`;

      // Format balance from wei to MON
      const balanceMON = (BigInt(vaultStatus.config.totalValue) / BigInt(1e18)).toString() +
        '.' +
        (BigInt(vaultStatus.config.totalValue) % BigInt(1e18)).toString().padStart(18, '0').slice(0, 4);

      const formattedData = {
        address: vaultAddress,
        balance: balanceMON,
        checkInPeriod: checkInPeriodDisplay,
        lastCheckIn: vaultStatus.config.lastCheckIn,
        nextDeadline: vaultStatus.config.nextDeadline,
        status: vaultStatus.status,
        beneficiaries: vaultStatus.beneficiaries.map((b: any) => ({
          name: b.name,
          address: b.address,
          allocation: (BigInt(b.allocation) / BigInt(1e18)).toString() + '.' +
            (BigInt(b.allocation) % BigInt(1e18)).toString().padStart(18, '0').slice(0, 4),
          percentage: Number((BigInt(b.allocation) * 100n) / BigInt(vaultStatus.config.totalValue)),
          claimed: b.claimed || false,
        })),
        checkInHistory: vaultStatus.checkIns.map((checkIn: any) => ({
          date: new Date(checkIn.timestamp * 1000).toLocaleDateString(),
          tx: checkIn.txHash || 'N/A',
        })),
      };

      setVaultData(formattedData);
    } catch (error) {
      console.error("Error loading vault:", error);
      alert("Failed to load vault: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!privateKey) {
      alert("Please connect your wallet first");
      return;
    }

    setCheckingIn(true);
    try {
      console.log("Checking in to vault:", vaultAddress);

      // Call real backend API
      const response = await fetch('/api/vault/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vaultAddress,
          ownerPrivateKey: privateKey,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to check in");
      }

      console.log("✅ Check-in successful:", data.checkInRecord);
      alert("✅ Check-in successful! Timer has been reset.");

      // Reload vault data to show updated deadline
      await loadVault();
    } catch (error) {
      console.error("Error checking in:", error);
      alert("Failed to check in: " + (error as Error).message);
    } finally {
      setCheckingIn(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Load Vault */}
      <div className="card">
        <h2 className="text-2xl font-bold mb-6 vault-gradient-text">Load Your Vault</h2>
        <div className="flex gap-4">
          <input
            type="text"
            value={vaultAddress}
            onChange={(e) => setVaultAddress(e.target.value)}
            className="input-field flex-1 font-mono"
            placeholder="0x... (Vault Address)"
          />
          <button
            onClick={loadVault}
            disabled={loading || !vaultAddress}
            className="btn-primary relative"
          >
            {loading && <div className="spinner absolute left-4" />}
            {loading ? "Loading..." : "Load Vault"}
          </button>
        </div>
      </div>

      {vaultData && (
        <>
          {/* Vault Status */}
          <div className="card">
            <h2 className="text-2xl font-bold mb-6 vault-gradient-text">Vault Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-semibold mb-2" style={{ color: 'var(--vault-text-dim)' }}>Vault Address</p>
                <p className="font-mono text-sm break-all" style={{ color: 'var(--vault-text)' }}>{vaultData.address}</p>
              </div>
              <div>
                <p className="text-sm font-semibold mb-2" style={{ color: 'var(--vault-text-dim)' }}>Balance</p>
                <p className="font-bold text-2xl" style={{ color: 'var(--vault-cyan)' }}>{vaultData.balance} MON</p>
              </div>
              <div>
                <p className="text-sm font-semibold mb-2" style={{ color: 'var(--vault-text-dim)' }}>Check-In Period</p>
                <p className="font-semibold text-lg" style={{ color: 'var(--vault-text)' }}>{vaultData.checkInPeriod}</p>
              </div>
              <div>
                <p className="text-sm font-semibold mb-2" style={{ color: 'var(--vault-text-dim)' }}>Status</p>
                <p className="font-semibold text-lg capitalize flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ backgroundColor: vaultData.status === 'active' ? 'var(--vault-success)' : '#FFA500' }}
                  ></span>
                  <span style={{ color: vaultData.status === 'active' ? 'var(--vault-success)' : '#FFA500' }}>
                    {vaultData.status}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Countdown Timer */}
          <div className="card relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#8B5CF6]/10 to-[#06B6D4]/10 pointer-events-none"></div>
            <div className="relative">
              <h2 className="text-2xl font-bold mb-6 vault-gradient-text">Time Until Deadline</h2>
              <CountdownTimer deadline={vaultData.nextDeadline} />
              <div className="mt-6">
                <button
                  onClick={handleCheckIn}
                  disabled={checkingIn}
                  className="btn-primary w-full relative"
                >
                  {checkingIn && <div className="spinner absolute left-4" />}
                  {checkingIn ? "Checking In..." : "Check In Now"}
                </button>
                <p className="text-xs text-center mt-3" style={{ color: 'var(--vault-text-dim)' }}>
                  Check in to reset the timer and prevent beneficiary claims
                </p>
              </div>
            </div>
          </div>

          {/* Beneficiaries */}
          <div className="card">
            <h2 className="text-2xl font-bold mb-6 vault-gradient-text">Beneficiaries</h2>
            <div className="space-y-4">
              {vaultData.beneficiaries.map((beneficiary: any, index: number) => (
                <div key={index} className="beneficiary-card">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{beneficiary.name}</h3>
                      <p className="text-xs font-mono mt-2" style={{ color: 'var(--vault-text-dim)' }}>
                        {beneficiary.address}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-2xl" style={{ color: 'var(--vault-purple)' }}>{beneficiary.percentage}%</p>
                      <p className="text-sm font-medium mt-1" style={{ color: 'var(--vault-cyan)' }}>
                        {beneficiary.allocation} MON
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    {beneficiary.claimed ? (
                      <span className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--vault-success)' }}>
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Claimed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--vault-darker)', color: 'var(--vault-text-dim)', border: '1px solid var(--vault-border)' }}>
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Check-In History */}
          <div className="card">
            <h2 className="text-2xl font-bold mb-6 vault-gradient-text">Check-In History</h2>
            {vaultData.checkInHistory.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--vault-text-dim)' }}>No check-ins yet</p>
            ) : (
              <div className="space-y-3">
                {vaultData.checkInHistory.map((checkIn: any, index: number) => (
                  <div key={index} className="pl-5 py-3 relative" style={{ borderLeft: '3px solid var(--vault-purple)' }}>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--vault-purple)' }}></div>
                    <p className="font-semibold text-sm mb-1" style={{ color: 'var(--vault-text)' }}>{checkIn.date}</p>
                    <p className="text-xs font-mono" style={{ color: 'var(--vault-text-dim)' }}>
                      TX: {checkIn.tx}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {!vaultData && !loading && (
        <div className="card text-center py-16">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#8B5CF6]/20 to-[#06B6D4]/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12" style={{ color: 'var(--vault-purple)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold mb-3 vault-gradient-text">No Vault Loaded</h3>
          <p style={{ color: 'var(--vault-text-dim)' }}>
            Enter your vault address above to view and manage it
          </p>
        </div>
      )}
    </div>
  );
}
