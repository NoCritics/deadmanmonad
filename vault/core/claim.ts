import {
  DelegationManager,
  createExecution,
  ExecutionMode,
} from "@metamask/delegation-toolkit";
import {
  createWalletClient,
  createPublicClient,
  http,
  encodeFunctionData,
  type Hex,
  type Address,
} from "viem";
import { monadTestnet } from "../../mvp/config/chain";
import { ClaimParams } from "../types/index";
import {
  loadVaultData,
  saveVaultData,
  getBeneficiaryDelegation,
} from "../utils/delegation-storage";
import { getCurrentTimestamp, isDeadlinePassed } from "../utils/time-helpers";
import { erc20Abi } from "viem";

/**
 * Beneficiary claims their inheritance allocation
 * Redeems the delegation to transfer funds from vault to beneficiary
 */
export async function claimInheritance(
  params: ClaimParams
): Promise<{
  txHash: Hex;
  amount: bigint;
  gasUsed: bigint;
}> {
  console.log("\n💰 Claiming inheritance...");
  console.log("   Beneficiary:", params.beneficiary.address);
  console.log("   Allocation:", params.beneficiary.allocation.toString(), "wei");

  // Check if deadline has passed
  const vaultData = loadVaultData(params.signedDelegation.delegation.from);
  if (!vaultData) {
    throw new Error("Vault not found");
  }

  const deadline = vaultData.config.nextDeadline;
  const isPast = isDeadlinePassed(deadline);

  if (!isPast) {
    const timeRemaining = deadline - getCurrentTimestamp();
    throw new Error(
      `Cannot claim yet. Deadline in ${timeRemaining} seconds (${new Date(deadline * 1000).toLocaleString()})`
    );
  }

  console.log("   ✓ Deadline passed, claim allowed");

  // Check if already claimed
  if (params.beneficiary.hasClaimed) {
    throw new Error("Already claimed");
  }

  // Create wallet client for beneficiary
  const walletClient = createWalletClient({
    account: params.beneficiaryAccount,
    chain: monadTestnet,
    transport: http(),
  });

  const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http(),
  });

  // Determine if native or ERC-20 transfer
  const isNativeToken =
    params.beneficiary.tokenAddress === "0x0000000000000000000000000000000000000000";

  let callData: Hex;

  if (isNativeToken) {
    // Native token transfer (MON)
    // For native transfers, we just encode empty calldata since the value is in the execution
    callData = "0x" as Hex;
  } else {
    // ERC-20 transfer
    callData = encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: [params.beneficiary.address, params.beneficiary.allocation],
    });
  }

  // Create execution
  const execution = createExecution({
    target: isNativeToken
      ? (params.beneficiary.address as Address)
      : (params.beneficiary.tokenAddress as Address),
    value: isNativeToken ? params.beneficiary.allocation : 0n,
    callData,
  });

  console.log("   ✓ Execution created");

  // Encode redemption calldata
  const redeemDelegationCalldata = DelegationManager.encode.redeemDelegations({
    delegations: [[params.signedDelegation]],
    modes: [ExecutionMode.SingleDefault],
    executions: [[execution]],
  });

  console.log("   ✓ Redemption calldata encoded");

  // Send transaction
  console.log("\n📤 Submitting claim transaction...");

  const hash = await walletClient.sendTransaction({
    to: params.delegationManagerAddress,
    data: redeemDelegationCalldata,
    chain: monadTestnet,
    gas: 3000000n,
    gasPrice: 100000000000n, // 100 gwei
  });

  console.log("   TX Hash:", hash);

  // Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  console.log("   ✓ Confirmed!");
  console.log("   Gas used:", receipt.gasUsed.toString());

  // Update beneficiary status in storage
  const beneficiaryIndex = vaultData.beneficiaries.findIndex(
    (b) => b.address.toLowerCase() === params.beneficiary.address.toLowerCase()
  );

  if (beneficiaryIndex !== -1) {
    vaultData.beneficiaries[beneficiaryIndex].hasClaimed = true;
    vaultData.beneficiaries[beneficiaryIndex].claimTxHash = hash;
    vaultData.beneficiaries[beneficiaryIndex].claimTimestamp = getCurrentTimestamp();
    vaultData.lastUpdated = getCurrentTimestamp();

    saveVaultData(vaultData.config.vaultAddress, vaultData);
  }

  console.log("\n✅ Inheritance claimed successfully!");
  console.log(`   Amount: ${params.beneficiary.allocation.toString()} wei`);
  console.log(`   Transaction: ${hash}`);

  return {
    txHash: hash,
    amount: params.beneficiary.allocation,
    gasUsed: receipt.gasUsed,
  };
}

/**
 * Simple claim using vault address and beneficiary address
 * Convenience method that loads delegation from storage
 */
export async function simpleClaim(
  vaultAddress: Address,
  beneficiaryAccount: any
): Promise<{
  txHash: Hex;
  amount: bigint;
  gasUsed: bigint;
}> {
  console.log("\n💰 Simple claim...");
  console.log("   Vault:", vaultAddress);
  console.log("   Beneficiary:", beneficiaryAccount.address);

  // Load vault data
  const vaultData = loadVaultData(vaultAddress);
  if (!vaultData) {
    throw new Error("Vault not found");
  }

  // Find beneficiary
  const beneficiary = vaultData.beneficiaries.find(
    (b) => b.address.toLowerCase() === beneficiaryAccount.address.toLowerCase()
  );

  if (!beneficiary) {
    throw new Error("Beneficiary not found in vault");
  }

  // Get delegation
  const storedDelegation = getBeneficiaryDelegation(
    vaultAddress,
    beneficiaryAccount.address
  );

  if (!storedDelegation) {
    throw new Error("Delegation not found");
  }

  if (storedDelegation.isDisabled) {
    throw new Error("Delegation has been disabled");
  }

  // Get delegation manager from environment
  // We need to load the vault to get the environment
  // For simplicity, we'll use the hardcoded address from Monad environment
  const delegationManagerAddress =
    "0x1324Ad9507DD8380F3a03f2E19E77De7E1e8d7Ca" as Address;

  return claimInheritance({
    beneficiaryAccount,
    signedDelegation: {
      ...storedDelegation.delegation,
      signature: storedDelegation.signature,
    },
    beneficiary,
    delegationManagerAddress,
  });
}

/**
 * Check if beneficiary can claim
 */
export function canClaim(
  vaultAddress: Address,
  beneficiaryAddress: Address
): {
  canClaim: boolean;
  reason?: string;
} {
  const vaultData = loadVaultData(vaultAddress);
  if (!vaultData) {
    return { canClaim: false, reason: "Vault not found" };
  }

  const beneficiary = vaultData.beneficiaries.find(
    (b) => b.address.toLowerCase() === beneficiaryAddress.toLowerCase()
  );

  if (!beneficiary) {
    return { canClaim: false, reason: "Not a beneficiary" };
  }

  if (beneficiary.hasClaimed) {
    return { canClaim: false, reason: "Already claimed" };
  }

  const delegation = getBeneficiaryDelegation(vaultAddress, beneficiaryAddress);
  if (!delegation) {
    return { canClaim: false, reason: "Delegation not found" };
  }

  if (delegation.isDisabled) {
    return { canClaim: false, reason: "Delegation disabled" };
  }

  const isPast = isDeadlinePassed(vaultData.config.nextDeadline);
  if (!isPast) {
    return { canClaim: false, reason: "Deadline not reached" };
  }

  return { canClaim: true };
}

/**
 * Get beneficiary claim status
 */
export function getClaimStatus(
  vaultAddress: Address,
  beneficiaryAddress: Address
): {
  hasClaimed: boolean;
  claimTxHash?: Hex;
  claimTimestamp?: number;
  allocation: bigint;
} | null {
  const vaultData = loadVaultData(vaultAddress);
  if (!vaultData) return null;

  const beneficiary = vaultData.beneficiaries.find(
    (b) => b.address.toLowerCase() === beneficiaryAddress.toLowerCase()
  );

  if (!beneficiary) return null;

  return {
    hasClaimed: beneficiary.hasClaimed,
    claimTxHash: beneficiary.claimTxHash,
    claimTimestamp: beneficiary.claimTimestamp,
    allocation: beneficiary.allocation,
  };
}
