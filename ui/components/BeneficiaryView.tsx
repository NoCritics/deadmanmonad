"use client";

import { useState } from "react";
import { useWallet } from "@/lib/WalletContext";
import CountdownTimer from "./CountdownTimer";

export default function BeneficiaryView() {
  const { privateKey, address, disconnect } = useWallet();
  const [vaultAddress, setVaultAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [beneficiaryData, setBeneficiaryData] = useState<any>(null);
  const [claiming, setClaiming] = useState(false);

  const loadBeneficiaryInfo = async () => {
    if (!vaultAddress || !address) return;

    setLoading(true);
    try {
      console.log("Loading beneficiary info:", { vaultAddress, beneficiaryAddress: address });

      // Call real backend API
      const response = await fetch(`/api/vault/status?address=${vaultAddress}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to load vault");
      }

      const vaultStatus = data.status;

      // Find this beneficiary in the list
      const beneficiary = vaultStatus.beneficiaries.find(
        (b: any) => b.address.toLowerCase() === address.toLowerCase()
      );

      if (!beneficiary) {
        throw new Error("You are not a beneficiary of this vault");
      }

      // Format balance from wei to MON
      const allocationMON = (BigInt(beneficiary.allocation) / BigInt(1e18)).toString() +
        '.' +
        (BigInt(beneficiary.allocation) % BigInt(1e18)).toString().padStart(18, '0').slice(0, 4);

      const vaultBalanceMON = (BigInt(vaultStatus.config.totalValue) / BigInt(1e18)).toString() +
        '.' +
        (BigInt(vaultStatus.config.totalValue) % BigInt(1e18)).toString().padStart(18, '0').slice(0, 4);

      // Check if can claim now (deadline passed)
      const now = Math.floor(Date.now() / 1000);
      const canClaimNow = now > vaultStatus.config.nextDeadline;

      const formattedData = {
        isEligible: true,
        name: beneficiary.name,
        allocation: allocationMON,
        percentage: Number((BigInt(beneficiary.allocation) * 100n) / BigInt(vaultStatus.config.totalValue)),
        hasClaimed: beneficiary.claimed || false,
        canClaimNow: canClaimNow && !beneficiary.claimed,
        deadline: vaultStatus.config.nextDeadline,
        vaultBalance: vaultBalanceMON,
        vaultStatus: vaultStatus.status,
      };

      setBeneficiaryData(formattedData);
    } catch (error) {
      console.error("Error loading beneficiary info:", error);
      alert("Failed to load beneficiary information: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!privateKey) {
      alert("Please connect your wallet first");
      return;
    }

    setClaiming(true);
    try {
      console.log("Claiming inheritance:", { vaultAddress, beneficiaryAddress: address });

      // Call real backend API
      const response = await fetch('/api/vault/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vaultAddress,
          beneficiaryPrivateKey: privateKey,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to claim inheritance");
      }

      console.log("✅ Claim successful:", data);
      alert(`✅ Inheritance claimed successfully!\nAmount: ${beneficiaryData.allocation} MON\nTX: ${data.txHash}`);

      // Reload beneficiary data to show claimed status
      await loadBeneficiaryInfo();
    } catch (error) {
      console.error("Error claiming:", error);
      alert("Failed to claim inheritance: " + (error as Error).message);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Load Beneficiary Info */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">🔍 Check Your Allocation</h2>
        <div className="space-y-4">
          {address && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">Your Connected Address:</p>
                  <p className="text-sm font-mono text-blue-900 dark:text-blue-100">{address}</p>
                </div>
                <button
                  onClick={() => {
                    disconnect();
                    setBeneficiaryData(null);
                    setVaultAddress("");
                  }}
                  className="text-xs px-3 py-1 rounded-lg bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
                >
                  Change Account
                </button>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">Vault Address</label>
            <input
              type="text"
              value={vaultAddress}
              onChange={(e) => setVaultAddress(e.target.value)}
              className="input-field font-mono"
              placeholder="0x... (Vault Address)"
            />
          </div>
          <button
            onClick={loadBeneficiaryInfo}
            disabled={loading || !vaultAddress || !address}
            className="btn-primary w-full"
          >
            {loading ? "Loading..." : "Check Allocation"}
          </button>
        </div>
      </div>

      {beneficiaryData && (
        <>
          {beneficiaryData.isEligible ? (
            <>
              {/* Allocation Card */}
              <div className="card bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800">
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Your Allocation</p>
                  <p className="text-5xl font-bold text-green-600 dark:text-green-400 mb-2">
                    {beneficiaryData.allocation} MON
                  </p>
                  <p className="text-2xl font-semibold text-gray-700 dark:text-gray-300">
                    {beneficiaryData.percentage}% of vault
                  </p>
                  {beneficiaryData.name && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Beneficiary: {beneficiaryData.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Claim Status */}
              <div className="card">
                <h2 className="text-xl font-bold mb-4">📋 Claim Status</h2>

                {beneficiaryData.hasClaimed ? (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
                    <div className="text-5xl mb-3">✅</div>
                    <h3 className="text-xl font-semibold text-green-800 dark:text-green-200 mb-2">
                      Already Claimed
                    </h3>
                    <p className="text-green-700 dark:text-green-300">
                      You have successfully claimed your inheritance
                    </p>
                  </div>
                ) : beneficiaryData.canClaimNow ? (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
                    <div className="text-center mb-4">
                      <div className="text-5xl mb-3">💰</div>
                      <h3 className="text-xl font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                        Ready to Claim!
                      </h3>
                      <p className="text-yellow-700 dark:text-yellow-300 mb-4">
                        The deadline has passed. You can now claim your inheritance.
                      </p>
                    </div>
                    <button
                      onClick={handleClaim}
                      disabled={claiming}
                      className="btn-primary w-full text-lg"
                    >
                      {claiming ? "Claiming..." : "💰 Claim Inheritance"}
                    </button>
                  </div>
                ) : (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                    <div className="text-center mb-4">
                      <div className="text-5xl mb-3">⏰</div>
                      <h3 className="text-xl font-semibold text-blue-800 dark:text-blue-200 mb-2">
                        Waiting Period
                      </h3>
                      <p className="text-blue-700 dark:text-blue-300 mb-4">
                        You cannot claim yet. The owner is still active.
                      </p>
                    </div>
                    <CountdownTimer deadline={beneficiaryData.deadline} />
                    <p className="text-sm text-center text-gray-600 dark:text-gray-400 mt-4">
                      You can claim after this countdown reaches zero
                    </p>
                  </div>
                )}
              </div>

              {/* Vault Info */}
              <div className="card">
                <h2 className="text-xl font-bold mb-4">🏦 Vault Information</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Vault Address</span>
                    <span className="font-mono text-sm break-all">{vaultAddress.slice(0, 10)}...{vaultAddress.slice(-8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Vault Balance</span>
                    <span className="font-semibold">{beneficiaryData.vaultBalance} MON</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Status</span>
                    <span className="font-semibold capitalize">
                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${beneficiaryData.vaultStatus === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                      {beneficiaryData.vaultStatus}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="card text-center py-12">
              <div className="text-6xl mb-4">❌</div>
              <h3 className="text-xl font-semibold mb-2 text-red-600 dark:text-red-400">
                Not a Beneficiary
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                You are not listed as a beneficiary for this vault
              </p>
            </div>
          )}
        </>
      )}

      {!beneficiaryData && !loading && (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">🔐</div>
          <h3 className="text-xl font-semibold mb-2">Check Your Allocation</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Enter the vault address and your address to view your allocation
          </p>
        </div>
      )}
    </div>
  );
}
