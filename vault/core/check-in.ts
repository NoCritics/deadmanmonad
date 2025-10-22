import { DelegationManager } from "@metamask/delegation-toolkit/contracts";
import { createWalletClient, createPublicClient, http, type Hex } from "viem";
import type { SmartAccount } from "viem/account-abstraction";
import { monadTestnet } from "../../mvp/config/chain";
import { CheckInParams, CheckInRecord } from "../types/index";
import {
  loadVaultData,
  saveVaultData,
  getActiveDelegations,
  updateDelegationStatus,
} from "../utils/delegation-storage";
import { getCurrentTimestamp, getDeadlineFromPeriod } from "../utils/time-helpers";
import { setupBeneficiaries } from "./setup-beneficiaries";
import { privateKeyToAccount } from "viem/accounts";

/**
 * Owner check-in mechanism
 * Disables existing delegations and creates new ones with extended deadline
 * This proves the owner is alive and resets the inheritance timer
 */
export async function checkIn(
  params: CheckInParams
): Promise<CheckInRecord> {
  console.log("\n✋ Owner checking in...");

  const vaultData = loadVaultData(params.vault.address);
  if (!vaultData) {
    throw new Error("Vault not found");
  }

  const config = vaultData.config;
  console.log(`   Last check-in: ${new Date(config.lastCheckIn * 1000).toLocaleString()}`);
  console.log(`   Current deadline: ${new Date(config.nextDeadline * 1000).toLocaleString()}`);

  // Get active delegations
  const activeDelegations = getActiveDelegations(params.vault.address);
  console.log(`\n   Found ${activeDelegations.length} active delegation(s) to disable`);

  if (activeDelegations.length === 0) {
    console.warn("⚠️  No active delegations found. Nothing to check in.");
    throw new Error("No active delegations to check in");
  }

  // Create wallet client for owner
  const walletClient = createWalletClient({
    account: privateKeyToAccount(params.ownerPrivateKey),
    chain: monadTestnet,
    transport: http(),
  });

  const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http(),
  });

  let disabledCount = 0;
  const txHashes: Hex[] = [];

  // Disable each active delegation
  console.log("\n🚫 Disabling old delegations...");

  for (const storedDelegation of activeDelegations) {
    try {
      console.log(`   Disabling delegation ${storedDelegation.hash.slice(0, 10)}...`);

      const hash = await DelegationManager.execute.disableDelegation({
        client: walletClient,
        delegationManagerAddress: params.vault.environment.DelegationManager,
        delegation: {
          ...storedDelegation.delegation,
          signature: storedDelegation.signature,
        },
      });

      console.log(`   ✓ Disabled: ${hash}`);
      txHashes.push(hash);

      // Wait for confirmation
      await publicClient.waitForTransactionReceipt({ hash });

      // Update status in storage
      updateDelegationStatus(params.vault.address, storedDelegation.hash, true);

      disabledCount++;
    } catch (error) {
      console.error(`   ❌ Failed to disable ${storedDelegation.hash}:`, error);
      // Continue with others even if one fails
    }
  }

  console.log(`✅ Disabled ${disabledCount} delegation(s)`);

  // Calculate new deadline
  const newPeriod = params.newCheckInPeriodDays || config.checkInPeriod;
  const newDeadline = getDeadlineFromPeriod(newPeriod, config.checkInPeriodUnit);

  console.log(`\n🔄 Creating new delegations...`);
  console.log(`   New deadline: ${new Date(newDeadline * 1000).toLocaleString()}`);

  // Create new delegations with updated deadline
  const newBeneficiaries = await setupBeneficiaries({
    vault: params.vault,
    beneficiaries: params.beneficiaries.map((b) => ({
      address: b.address,
      name: b.name,
      allocation: b.allocation,
      tokenAddress: b.tokenAddress,
    })),
    deadline: newDeadline,
  });

  console.log(`✅ Created ${newBeneficiaries.length} new delegation(s)`);

  // Get gas used from first transaction
  let totalGasUsed = 0n;
  for (const hash of txHashes) {
    try {
      const receipt = await publicClient.getTransactionReceipt({ hash });
      totalGasUsed += receipt.gasUsed;
    } catch (error) {
      // Ignore if can't get receipt
    }
  }

  // Create check-in record
  const checkInRecord: CheckInRecord = {
    timestamp: getCurrentTimestamp(),
    txHash: txHashes[0] || ("0x0" as Hex), // First disable tx
    newDeadline,
    disabledDelegationCount: disabledCount,
    createdDelegationCount: newBeneficiaries.length,
    gasUsed: totalGasUsed,
  };

  // Update vault config
  config.lastCheckIn = checkInRecord.timestamp;
  config.nextDeadline = newDeadline;
  if (params.newCheckInPeriodDays) {
    config.checkInPeriod = params.newCheckInPeriodDays;
  }

  // Add check-in to history
  vaultData.checkIns.push(checkInRecord);
  vaultData.lastUpdated = getCurrentTimestamp();

  saveVaultData(params.vault.address, vaultData);

  console.log("\n✅ Check-in complete!");
  console.log(`   Timer reset. New deadline: ${new Date(newDeadline * 1000).toLocaleString()}`);
  console.log(`   Total gas used: ${totalGasUsed.toString()}`);

  return checkInRecord;
}

/**
 * Simple check-in using current vault state
 * Convenience method that loads beneficiaries from storage
 */
export async function simpleCheckIn(
  vault: SmartAccount & { environment: any },
  ownerPrivateKey: Hex,
  newCheckInPeriodDays?: number
): Promise<CheckInRecord> {
  console.log("\n✋ Simple check-in...");

  // Load vault data
  const vaultData = loadVaultData(vault.address);
  if (!vaultData) {
    throw new Error("Vault not found");
  }

  // Get active delegations
  const activeDelegations = getActiveDelegations(vault.address);

  // Convert stored delegations back to format needed for check-in
  const currentDelegations = activeDelegations.map((d) => ({
    ...d.delegation,
    signature: d.signature,
  }));

  return checkIn({
    vault,
    currentDelegations,
    beneficiaries: vaultData.beneficiaries,
    newCheckInPeriodDays,
    ownerPrivateKey,
  });
}

/**
 * Get time until next required check-in
 */
export function getTimeUntilCheckIn(vaultAddress: string): {
  secondsRemaining: number;
  isPastDeadline: boolean;
  deadline: number;
} {
  const vaultData = loadVaultData(vaultAddress as any);
  if (!vaultData) {
    throw new Error("Vault not found");
  }

  const now = getCurrentTimestamp();
  const deadline = vaultData.config.nextDeadline;
  const secondsRemaining = Math.max(0, deadline - now);

  return {
    secondsRemaining,
    isPastDeadline: now >= deadline,
    deadline,
  };
}

/**
 * Check if owner can check in (has active delegations)
 */
export function canCheckIn(vaultAddress: string): boolean {
  const activeDelegations = getActiveDelegations(vaultAddress as any);
  return activeDelegations.length > 0;
}
