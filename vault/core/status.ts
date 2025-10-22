import { createPublicClient, http, type Address } from "viem";
import { monadTestnet } from "../../mvp/config/chain";
import { VaultState, VaultStatus, Beneficiary } from "../types/index";
import { loadVaultData, getActiveDelegations } from "../utils/delegation-storage";
import {
  calculateTimeRemaining,
  getCurrentTimestamp,
  formatPeriod,
} from "../utils/time-helpers";

/**
 * Get comprehensive vault status
 * Returns current state including balance, beneficiaries, deadline, etc.
 */
export async function getVaultStatus(vaultAddress: Address): Promise<VaultState> {
  console.log("\n📊 Getting vault status...");
  console.log("   Vault:", vaultAddress);

  // Load vault data from storage
  const vaultData = loadVaultData(vaultAddress);
  if (!vaultData) {
    throw new Error(`Vault not found: ${vaultAddress}`);
  }

  const config = vaultData.config;

  // Get on-chain balance
  const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http(),
  });

  const balance = await publicClient.getBalance({ address: vaultAddress });
  console.log(`   Balance: ${balance.toString()} wei`);

  // Update total value in config
  config.totalValue = balance;

  // Calculate time remaining
  const timeCalc = calculateTimeRemaining(config.nextDeadline);

  // Get active delegations
  const activeDelegations = getActiveDelegations(vaultAddress);

  // Determine vault status
  let status: VaultStatus;

  if (vaultData.beneficiaries.length === 0) {
    status = VaultStatus.CREATED;
  } else if (balance === 0n) {
    status = VaultStatus.EMPTY;
  } else if (timeCalc.isPast) {
    status = VaultStatus.CLAIMABLE;
  } else if (activeDelegations.length > 0) {
    status = VaultStatus.ACTIVE;
  } else {
    status = VaultStatus.DISABLED;
  }

  // Check if all beneficiaries have claimed
  const allClaimed = vaultData.beneficiaries.every((b) => b.hasClaimed);
  if (allClaimed && vaultData.beneficiaries.length > 0) {
    status = VaultStatus.EMPTY;
  }

  // Can check in if there are active delegations
  const canCheckIn = activeDelegations.length > 0;

  const vaultState: VaultState = {
    config,
    beneficiaries: vaultData.beneficiaries,
    checkIns: vaultData.checkIns,
    status,
    timeRemaining: timeCalc.secondsRemaining,
    canCheckIn,
  };

  console.log(`   Status: ${status}`);
  console.log(`   Beneficiaries: ${vaultData.beneficiaries.length}`);
  console.log(`   Active delegations: ${activeDelegations.length}`);
  console.log(`   Time remaining: ${timeCalc.humanReadable}`);

  return vaultState;
}

/**
 * Print human-readable vault summary
 */
export async function printVaultSummary(vaultAddress: Address): Promise<void> {
  const state = await getVaultStatus(vaultAddress);

  console.log("\n" + "=".repeat(60));
  console.log("🏦 VAULT SUMMARY");
  console.log("=".repeat(60));

  console.log("\n📍 Basic Info:");
  console.log(`   Vault Address: ${state.config.vaultAddress}`);
  console.log(`   Owner: ${state.config.ownerAddress}`);
  console.log(`   Status: ${state.status.toUpperCase()}`);
  console.log(`   Created: ${new Date(state.config.createdAt * 1000).toLocaleString()}`);

  console.log("\n💰 Balance:");
  console.log(`   Total: ${state.config.totalValue.toString()} wei`);

  console.log("\n⏰ Check-In:");
  console.log(
    `   Period: ${formatPeriod(state.config.checkInPeriod, state.config.checkInPeriodUnit)}`
  );
  console.log(
    `   Last Check-In: ${new Date(state.config.lastCheckIn * 1000).toLocaleString()}`
  );
  console.log(
    `   Next Deadline: ${new Date(state.config.nextDeadline * 1000).toLocaleString()}`
  );

  const timeCalc = calculateTimeRemaining(state.config.nextDeadline);
  if (timeCalc.isPast) {
    console.log(`   ⚠️  DEADLINE PASSED ${timeCalc.humanReadable} ago`);
  } else {
    console.log(`   ⏳ Time Remaining: ${timeCalc.humanReadable}`);
  }

  console.log("\n👥 Beneficiaries:");
  if (state.beneficiaries.length === 0) {
    console.log("   None");
  } else {
    for (const beneficiary of state.beneficiaries) {
      const claimStatus = beneficiary.hasClaimed ? "✅ CLAIMED" : "⏳ PENDING";
      console.log(`   ${beneficiary.name}:`);
      console.log(`      Address: ${beneficiary.address}`);
      console.log(`      Allocation: ${beneficiary.allocation.toString()} wei (${beneficiary.percentage.toFixed(2)}%)`);
      console.log(`      Status: ${claimStatus}`);
      if (beneficiary.hasClaimed && beneficiary.claimTxHash) {
        console.log(`      Claim TX: ${beneficiary.claimTxHash}`);
      }
    }
  }

  console.log("\n📜 Check-In History:");
  if (state.checkIns.length === 0) {
    console.log("   No check-ins yet");
  } else {
    console.log(`   Total: ${state.checkIns.length} check-in(s)`);
    const recentCheckIns = state.checkIns.slice(-3).reverse(); // Last 3, most recent first
    for (const checkIn of recentCheckIns) {
      console.log(`   ${new Date(checkIn.timestamp * 1000).toLocaleString()}`);
      console.log(`      TX: ${checkIn.txHash}`);
      console.log(`      Disabled: ${checkIn.disabledDelegationCount}, Created: ${checkIn.createdDelegationCount}`);
    }
  }

  console.log("\n" + "=".repeat(60));
}

/**
 * Get beneficiary-specific view
 */
export async function getBeneficiaryView(
  vaultAddress: Address,
  beneficiaryAddress: Address
): Promise<{
  isEligible: boolean;
  allocation: bigint;
  percentage: number;
  hasClaimed: boolean;
  canClaimNow: boolean;
  timeUntilClaim: number;
  claimTxHash?: string;
}> {
  const state = await getVaultStatus(vaultAddress);

  const beneficiary = state.beneficiaries.find(
    (b) => b.address.toLowerCase() === beneficiaryAddress.toLowerCase()
  );

  if (!beneficiary) {
    return {
      isEligible: false,
      allocation: 0n,
      percentage: 0,
      hasClaimed: false,
      canClaimNow: false,
      timeUntilClaim: 0,
    };
  }

  const timeCalc = calculateTimeRemaining(state.config.nextDeadline);
  const canClaimNow = timeCalc.isPast && !beneficiary.hasClaimed;

  return {
    isEligible: true,
    allocation: beneficiary.allocation,
    percentage: beneficiary.percentage,
    hasClaimed: beneficiary.hasClaimed,
    canClaimNow,
    timeUntilClaim: timeCalc.secondsRemaining,
    claimTxHash: beneficiary.claimTxHash,
  };
}

/**
 * Get owner dashboard data
 */
export async function getOwnerDashboard(vaultAddress: Address): Promise<{
  vaultAddress: Address;
  balance: bigint;
  status: VaultStatus;
  beneficiaryCount: number;
  totalAllocated: bigint;
  unallocated: bigint;
  nextDeadline: number;
  timeRemaining: number;
  canCheckIn: boolean;
  checkInCount: number;
  claimedCount: number;
}> {
  const state = await getVaultStatus(vaultAddress);

  const totalAllocated = state.beneficiaries.reduce(
    (sum, b) => sum + b.allocation,
    0n
  );

  const unallocated = state.config.totalValue - totalAllocated;

  const claimedCount = state.beneficiaries.filter((b) => b.hasClaimed).length;

  return {
    vaultAddress: state.config.vaultAddress,
    balance: state.config.totalValue,
    status: state.status,
    beneficiaryCount: state.beneficiaries.length,
    totalAllocated,
    unallocated,
    nextDeadline: state.config.nextDeadline,
    timeRemaining: state.timeRemaining,
    canCheckIn: state.canCheckIn,
    checkInCount: state.checkIns.length,
    claimedCount,
  };
}

/**
 * Check vault health
 */
export async function checkVaultHealth(vaultAddress: Address): Promise<{
  isHealthy: boolean;
  warnings: string[];
  errors: string[];
}> {
  const state = await getVaultStatus(vaultAddress);

  const warnings: string[] = [];
  const errors: string[] = [];

  // Check balance
  if (state.config.totalValue === 0n) {
    errors.push("Vault has zero balance");
  }

  // Check if total allocation exceeds balance
  const totalAllocated = state.beneficiaries.reduce(
    (sum, b) => sum + b.allocation,
    0n
  );

  if (totalAllocated > state.config.totalValue) {
    errors.push(
      `Total allocation (${totalAllocated}) exceeds balance (${state.config.totalValue})`
    );
  }

  // Check if deadline is very close
  if (state.timeRemaining < 3600 && state.timeRemaining > 0) {
    // Less than 1 hour
    warnings.push(`Deadline approaching: ${state.timeRemaining} seconds remaining`);
  }

  // Check if deadline has passed
  if (state.timeRemaining === 0 && state.status !== VaultStatus.EMPTY) {
    warnings.push("Deadline passed - beneficiaries can claim");
  }

  // Check for beneficiaries without delegations
  const activeDelegations = getActiveDelegations(vaultAddress);
  if (state.beneficiaries.length > activeDelegations.length) {
    warnings.push(
      `Some beneficiaries missing active delegations (${activeDelegations.length}/${state.beneficiaries.length})`
    );
  }

  return {
    isHealthy: errors.length === 0,
    warnings,
    errors,
  };
}
