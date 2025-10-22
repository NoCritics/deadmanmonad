import { createCaveatBuilder } from "@metamask/delegation-toolkit/utils";
import {
  createDelegation,
  type Delegation,
} from "@metamask/delegation-toolkit";
import { type Address, type Hex, encodeFunctionData, createPublicClient, http, keccak256, toHex } from "viem";
import type { SmartAccount } from "viem/account-abstraction";
import { SetupBeneficiariesParams, Beneficiary, StoredDelegation } from "../types/index";
import {
  validateBeneficiaryAllocations,
  validateAddress,
  validateBeneficiaryName,
  validateNoDuplicates,
} from "../utils/validation";
import { saveVaultData, loadVaultData } from "../utils/delegation-storage";
import { monadTestnet } from "../../mvp/config/chain";
import { getCurrentTimestamp } from "../utils/time-helpers";

/**
 * Setup beneficiaries with time-locked delegations
 * Creates one delegation per beneficiary with multi-caveat enforcement:
 * - Timestamp: Can only claim AFTER deadline
 * - LimitedCalls: One-time claim only
 * - TransferAmount: Maximum amount they can claim
 */
export async function setupBeneficiaries(
  params: SetupBeneficiariesParams
): Promise<Beneficiary[]> {
  console.log("\n👥 Setting up beneficiaries...");
  console.log("   Count:", params.beneficiaries.length);
  console.log("   Deadline:", new Date(params.deadline * 1000).toLocaleString());

  // Validate beneficiaries
  const addresses = params.beneficiaries.map((b) => b.address);
  const duplicateValidation = validateNoDuplicates(addresses);
  if (!duplicateValidation.isValid) {
    throw new Error(duplicateValidation.error);
  }

  // Validate each beneficiary
  for (const beneficiary of params.beneficiaries) {
    const addressValidation = validateAddress(beneficiary.address);
    if (!addressValidation.isValid) {
      throw new Error(addressValidation.error);
    }

    const nameValidation = validateBeneficiaryName(beneficiary.name);
    if (!nameValidation.isValid) {
      throw new Error(nameValidation.error);
    }

    if (beneficiary.allocation <= 0n) {
      throw new Error(`Beneficiary ${beneficiary.name} has zero allocation`);
    }
  }

  // Get vault balance
  const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http(),
  });

  const vaultBalance = await publicClient.getBalance({
    address: params.vault.address,
  });

  console.log(`   Vault balance: ${vaultBalance.toString()} wei`);

  // Calculate total allocation and validate
  const totalAllocation = params.beneficiaries.reduce(
    (sum, b) => sum + b.allocation,
    0n
  );

  console.log(`   Total allocation: ${totalAllocation.toString()} wei`);

  if (totalAllocation > vaultBalance) {
    throw new Error(
      `Total allocation (${totalAllocation}) exceeds vault balance (${vaultBalance})`
    );
  }

  if (totalAllocation < vaultBalance) {
    const unallocated = vaultBalance - totalAllocation;
    console.warn(
      `⚠️  ${unallocated} wei unallocated. Remaining funds will stay in vault.`
    );
  }

  const beneficiaries: Beneficiary[] = [];
  const storedDelegations: StoredDelegation[] = [];

  // Create delegation for each beneficiary
  for (const beneficiaryInput of params.beneficiaries) {
    console.log(`\n   Creating delegation for ${beneficiaryInput.name}...`);

    const tokenAddress = beneficiaryInput.tokenAddress || "0x0000000000000000000000000000000000000000";
    const isNativeToken = tokenAddress === "0x0000000000000000000000000000000000000000";

    // Create a new caveat builder for this beneficiary (builders can only be used once)
    const caveatBuilder = createCaveatBuilder(params.vault.environment);

    // Build multi-caveat delegation
    const caveats = caveatBuilder
      .addCaveat("timestamp", {
        afterThreshold: params.deadline, // Can't claim BEFORE deadline
        beforeThreshold: 253402300799 // Max allowed: Dec 31, 9999 (valid forever AFTER deadline)
      })
      .addCaveat("limitedCalls", { limit: 1 }) // One-time claim only
      .addCaveat(
        isNativeToken ? "nativeTokenTransferAmount" : "erc20TransferAmount",
        { maxAmount: beneficiaryInput.allocation }
      )
      .build();

    console.log(`   ✓ Caveats built: timestamp + limitedCalls + transferAmount`);

    // Create delegation
    const delegation = createDelegation({
      from: params.vault.address,
      to: beneficiaryInput.address,
      scope: isNativeToken
        ? {
            type: "nativeTokenTransferAmount",
            maxAmount: beneficiaryInput.allocation,
          }
        : {
            type: "erc20TransferAmount",
            tokenAddress: tokenAddress as Address,
            maxAmount: beneficiaryInput.allocation,
          },
      caveats,
      environment: params.vault.environment,
    });

    console.log(`   ✓ Delegation created`);

    // Sign delegation (using vault's signDelegation method)
    const signature = await (params.vault as any).signDelegation({
      delegation,
    });

    console.log(`   ✓ Delegation signed`);

    // Compute delegation hash using keccak256
    const delegationHash = keccak256(toHex(JSON.stringify(delegation))) as Hex;

    // Calculate percentage
    const percentage = Number(
      (beneficiaryInput.allocation * 10000n) / vaultBalance
    ) / 100;

    // Create beneficiary object
    const beneficiary: Beneficiary = {
      address: beneficiaryInput.address,
      name: beneficiaryInput.name,
      allocation: beneficiaryInput.allocation,
      percentage,
      tokenAddress: tokenAddress as Address,
      delegation,
      delegationHash,
      hasClaimed: false,
    };

    beneficiaries.push(beneficiary);

    // Create stored delegation
    const storedDelegation: StoredDelegation = {
      beneficiaryAddress: beneficiaryInput.address,
      delegation,
      signature: signature as Hex,
      hash: delegationHash,
      createdAt: getCurrentTimestamp(),
      deadline: params.deadline,
      isDisabled: false,
    };

    storedDelegations.push(storedDelegation);

    console.log(`   ✅ ${beneficiaryInput.name}: ${percentage.toFixed(2)}%`);
  }

  // Update vault storage (optional - only works client-side)
  const vaultData = loadVaultData(params.vault.address);
  if (vaultData) {
    // Update existing vault data
    vaultData.beneficiaries = beneficiaries;
    vaultData.delegations = storedDelegations;
    vaultData.lastUpdated = getCurrentTimestamp();
    saveVaultData(params.vault.address, vaultData);
    console.log("   ✓ Vault data updated in localStorage");
  } else {
    console.log("   ℹ️  Skipping localStorage update (server-side or vault not found)");
  }

  console.log("\n✅ All beneficiaries set up successfully!");
  console.log(`   Total: ${beneficiaries.length} beneficiaries`);
  console.log(`   Allocation: ${totalAllocation.toString()} wei`);

  return beneficiaries;
}

/**
 * Add a single beneficiary to existing vault
 */
export async function addBeneficiary(
  vault: SmartAccount & { environment: any },
  beneficiary: {
    address: Address;
    name: string;
    allocation: bigint;
    tokenAddress?: Address;
  },
  deadline: number
): Promise<Beneficiary> {
  console.log(`\n➕ Adding beneficiary: ${beneficiary.name}`);

  // Validate
  const addressValidation = validateAddress(beneficiary.address);
  if (!addressValidation.isValid) {
    throw new Error(addressValidation.error);
  }

  const nameValidation = validateBeneficiaryName(beneficiary.name);
  if (!nameValidation.isValid) {
    throw new Error(nameValidation.error);
  }

  // Load existing vault data
  const vaultData = loadVaultData(vault.address);
  if (!vaultData) {
    throw new Error("Vault not found");
  }

  // Check for duplicates
  const exists = vaultData.beneficiaries.some(
    (b) => b.address.toLowerCase() === beneficiary.address.toLowerCase()
  );

  if (exists) {
    throw new Error(`Beneficiary ${beneficiary.address} already exists`);
  }

  // Setup this single beneficiary
  const result = await setupBeneficiaries({
    vault,
    beneficiaries: [
      ...vaultData.beneficiaries.map((b) => ({
        address: b.address,
        name: b.name,
        allocation: b.allocation,
        tokenAddress: b.tokenAddress,
      })),
      beneficiary,
    ],
    deadline,
  });

  // Return the newly added beneficiary
  return result[result.length - 1];
}
