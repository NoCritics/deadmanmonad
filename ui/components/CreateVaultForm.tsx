"use client";

import { useState } from "react";
import { useWallet } from "@/lib/WalletContext";
import { createVaultClient, setupBeneficiariesClient } from "@/lib/vaultClient";
import type { Address } from "viem";

interface Beneficiary {
  address: string;
  name: string;
  percentage: number;
}

interface CreateVaultFormProps {
  onVaultCreated: (address: string) => void;
}

export default function CreateVaultForm({ onVaultCreated }: CreateVaultFormProps) {
  const { privateKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [checkInPeriod, setCheckInPeriod] = useState("30");
  const [periodUnit, setPeriodUnit] = useState("days");
  const [fundingAmount, setFundingAmount] = useState("1");
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([
    { address: "", name: "", percentage: 40 },
    { address: "", name: "", percentage: 30 },
    { address: "", name: "", percentage: 30 },
  ]);
  const [createdVault, setCreatedVault] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");

  const updateBeneficiary = (index: number, field: keyof Beneficiary, value: string | number) => {
    const updated = [...beneficiaries];
    updated[index] = { ...updated[index], [field]: value };
    setBeneficiaries(updated);
  };

  const addBeneficiary = () => {
    const remaining = 100 - beneficiaries.reduce((sum, b) => sum + b.percentage, 0);
    setBeneficiaries([...beneficiaries, { address: "", name: "", percentage: remaining }]);
  };

  const removeBeneficiary = (index: number) => {
    setBeneficiaries(beneficiaries.filter((_, i) => i !== index));
  };

  const handleCreateVault = async () => {
    if (!privateKey) {
      setError("Please connect your wallet first");
      return;
    }

    setLoading(true);
    setError("");
    setCreatedVault("");
    setTxHash("");

    try {
      // Validation
      const totalPercentage = beneficiaries.reduce((sum, b) => sum + b.percentage, 0);
      if (totalPercentage !== 100) {
        throw new Error(`Total percentage must be 100% (currently ${totalPercentage}%)`);
      }

      for (const b of beneficiaries) {
        if (!b.address || !b.name) {
          throw new Error("All beneficiaries must have an address and name");
        }
      }

      console.log("Creating vault with real backend...");

      // Step 1: Create vault
      const vaultResult = await createVaultClient({
        ownerPrivateKey: privateKey,
        checkInPeriod: parseInt(checkInPeriod),
        periodUnit: periodUnit, // Already a string: 'minutes', 'hours', etc.
        fundingAmount: fundingAmount,
      });

      if (!vaultResult.success || !vaultResult.vaultAddress) {
        throw new Error(vaultResult.error || "Failed to create vault");
      }

      console.log("✅ Vault created:", vaultResult.vaultAddress);
      setCreatedVault(vaultResult.vaultAddress);

      // Step 2: Setup beneficiaries
      console.log("Setting up beneficiaries...");

      const beneficiariesResult = await setupBeneficiariesClient({
        vaultAddress: vaultResult.vaultAddress as Address,
        ownerPrivateKey: privateKey,
        beneficiaries: beneficiaries.map((b) => ({
          address: b.address as Address,
          name: b.name,
          percentage: b.percentage,
        })),
        totalFunding: fundingAmount,
        deadline: vaultResult.config!.nextDeadline,
      });

      if (!beneficiariesResult.success) {
        throw new Error(beneficiariesResult.error || "Failed to setup beneficiaries");
      }

      console.log("✅ Beneficiaries configured");

      onVaultCreated(vaultResult.vaultAddress);

      alert(`✅ Vault created successfully!\n\nAddress: ${vaultResult.vaultAddress}\nBeneficiaries: ${beneficiaries.length}\nCheck-in period: ${checkInPeriod} ${periodUnit}`);
    } catch (err: any) {
      console.error("Error creating vault:", err);
      setError(err.message || "Failed to create vault");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Vault Configuration */}
      <div className="card">
        <h2 className="text-2xl font-bold mb-6 vault-gradient-text">Vault Configuration</h2>

        <div className="space-y-6">
          {/* Check-In Period */}
          <div>
            <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--vault-text)' }}>Check-In Period</label>
            <div className="flex gap-4">
              <input
                type="number"
                value={checkInPeriod}
                onChange={(e) => setCheckInPeriod(e.target.value)}
                className="input-field flex-1"
                placeholder="30"
                min="1"
                style={{ minWidth: '120px' }}
              />
              <select
                value={periodUnit}
                onChange={(e) => setPeriodUnit(e.target.value)}
                className="input-field w-40"
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
              </select>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--vault-text-dim)' }}>
              Owner must check in every {checkInPeriod} {periodUnit} or beneficiaries can claim
            </p>
          </div>

          {/* Funding Amount */}
          <div>
            <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--vault-text)' }}>Initial Funding (MON)</label>
            <input
              type="number"
              value={fundingAmount}
              onChange={(e) => setFundingAmount(e.target.value)}
              className="input-field"
              placeholder="1.0"
              step="0.1"
              min="0"
            />
            <p className="text-xs mt-2" style={{ color: 'var(--vault-text-dim)' }}>
              Amount of MON to fund the vault with
            </p>
          </div>
        </div>
      </div>

      {/* Beneficiaries */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold vault-gradient-text">Beneficiaries</h2>
          <button
            onClick={addBeneficiary}
            className="btn-secondary text-sm"
          >
            + Add Beneficiary
          </button>
        </div>

        <div className="space-y-4">
          {beneficiaries.map((beneficiary, index) => (
            <div key={index} className="beneficiary-card">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-lg">Beneficiary {index + 1}</h3>
                {beneficiaries.length > 1 && (
                  <button
                    onClick={() => removeBeneficiary(index)}
                    className="text-sm px-3 py-1 rounded-lg transition-colors"
                    style={{ color: 'var(--vault-error)', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--vault-text)' }}>Name</label>
                  <input
                    type="text"
                    value={beneficiary.name}
                    onChange={(e) => updateBeneficiary(index, "name", e.target.value)}
                    className="input-field text-sm"
                    placeholder="Alice Jr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--vault-text)' }}>Address</label>
                  <input
                    type="text"
                    value={beneficiary.address}
                    onChange={(e) => updateBeneficiary(index, "address", e.target.value)}
                    className="input-field text-sm font-mono"
                    placeholder="0x..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--vault-text)' }}>Allocation (%)</label>
                  <input
                    type="number"
                    value={beneficiary.percentage}
                    onChange={(e) => updateBeneficiary(index, "percentage", parseFloat(e.target.value) || 0)}
                    className="input-field text-sm"
                    min="0"
                    max="100"
                    step="1"
                  />
                </div>
              </div>

              <div className="mt-3 text-sm font-medium" style={{ color: 'var(--vault-cyan)' }}>
                Will receive: {((beneficiary.percentage / 100) * parseFloat(fundingAmount)).toFixed(3)} MON
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: 'var(--vault-darker)', border: '1px solid var(--vault-border)' }}>
          <div className="flex justify-between items-center">
            <span className="font-semibold" style={{ color: 'var(--vault-text)' }}>Total Allocation:</span>
            <span
              className="text-lg font-bold"
              style={{
                color: beneficiaries.reduce((sum, b) => sum + b.percentage, 0) === 100
                  ? 'var(--vault-success)'
                  : 'var(--vault-error)'
              }}
            >
              {beneficiaries.reduce((sum, b) => sum + b.percentage, 0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="status-error">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="font-semibold mb-1">Error</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Display */}
      {createdVault && (
        <div className="status-success">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="font-semibold mb-2">Vault Created Successfully!</p>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium opacity-80 mb-1">Vault Address:</p>
                  <p className="text-sm font-mono break-all">{createdVault}</p>
                </div>
                {txHash && (
                  <div>
                    <p className="text-xs font-medium opacity-80 mb-1">Transaction:</p>
                    <p className="text-sm font-mono break-all">{txHash}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Button */}
      <button
        onClick={handleCreateVault}
        disabled={loading}
        className="btn-primary w-full text-lg relative"
      >
        {loading && (
          <div className="spinner absolute left-4" />
        )}
        {loading ? "Creating Vault..." : "Create Vault"}
      </button>

      <p className="text-xs text-center" style={{ color: 'var(--vault-text-dim)' }}>
        {loading ? "Deploying smart contract on Monad testnet..." : "Connected to vault backend - creates real smart accounts!"}
      </p>
    </div>
  );
}
