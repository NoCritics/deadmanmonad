/**
 * Vault Client - Browser-compatible API wrapper for vault backend
 * This module provides client-side access to vault functions via Next.js API routes
 */

import { parseEther, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type { Hex } from 'viem';

/**
 * Create a new vault via API
 */
export async function createVaultClient(params: {
  ownerPrivateKey: Hex;
  checkInPeriod: number;
  periodUnit: string; // 'minutes' | 'hours' | 'days' | 'weeks' | 'months'
  fundingAmount: string; // ETH amount as string (e.g., "1.0")
}) {
  try {
    const ownerAccount = privateKeyToAccount(params.ownerPrivateKey);

    const response = await fetch('/api/vault/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ownerAddress: ownerAccount.address,
        ownerPrivateKey: params.ownerPrivateKey,
        checkInPeriod: params.checkInPeriod,
        periodUnit: params.periodUnit,
        initialFunding: parseEther(params.fundingAmount).toString(),
      }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to create vault');
    }

    return {
      success: true,
      vaultAddress: data.vaultAddress,
      config: data.config,
    };
  } catch (error: any) {
    console.error('Error creating vault:', error);
    return {
      success: false,
      error: error.message || 'Failed to create vault',
    };
  }
}

/**
 * Setup beneficiaries for a vault via API
 */
export async function setupBeneficiariesClient(params: {
  vaultAddress: Address;
  ownerPrivateKey: Hex;
  beneficiaries: Array<{
    address: Address;
    name: string;
    percentage: number;
  }>;
  totalFunding: string; // Total vault funding in ETH
  deadline: number; // Unix timestamp
}) {
  try {
    // Convert percentages to allocations
    const totalFundingWei = parseEther(params.totalFunding);
    const beneficiariesWithAllocations = params.beneficiaries.map((b) => ({
      address: b.address,
      name: b.name,
      allocation: ((totalFundingWei * BigInt(b.percentage)) / 100n).toString(),
    }));

    const response = await fetch('/api/vault/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vaultAddress: params.vaultAddress,
        ownerPrivateKey: params.ownerPrivateKey,
        beneficiaries: beneficiariesWithAllocations,
        deadline: params.deadline,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to setup beneficiaries');
    }

    return {
      success: true,
      beneficiaries: data.beneficiaries,
    };
  } catch (error: any) {
    console.error('Error setting up beneficiaries:', error);
    return {
      success: false,
      error: error.message || 'Failed to setup beneficiaries',
    };
  }
}

/**
 * Owner check-in via API
 */
export async function checkInClient(params: {
  vaultAddress: Address;
  newCheckInPeriodDays?: number;
}) {
  try {
    const response = await fetch('/api/vault/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vaultAddress: params.vaultAddress,
        newCheckInPeriodDays: params.newCheckInPeriodDays,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to check in');
    }

    return {
      success: true,
      checkInRecord: data.checkInRecord,
    };
  } catch (error: any) {
    console.error('Error checking in:', error);
    return {
      success: false,
      error: error.message || 'Failed to check in',
    };
  }
}

/**
 * Beneficiary claim via API
 */
export async function claimClient(params: {
  vaultAddress: Address;
  beneficiaryPrivateKey: Hex;
}) {
  try {
    const response = await fetch('/api/vault/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vaultAddress: params.vaultAddress,
        beneficiaryPrivateKey: params.beneficiaryPrivateKey,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to claim');
    }

    return {
      success: true,
      txHash: data.txHash,
      amount: BigInt(data.amount),
      gasUsed: BigInt(data.gasUsed),
    };
  } catch (error: any) {
    console.error('Error claiming:', error);
    return {
      success: false,
      error: error.message || 'Failed to claim',
    };
  }
}

/**
 * Get vault status via API
 */
export async function getVaultStatusClient(vaultAddress: Address) {
  try {
    const response = await fetch(`/api/vault/status?address=${vaultAddress}`);

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to get vault status');
    }

    return {
      success: true,
      status: data.status,
    };
  } catch (error: any) {
    console.error('Error getting vault status:', error);
    return {
      success: false,
      error: error.message || 'Failed to get vault status',
    };
  }
}
