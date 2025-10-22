import { createExecution, ExecutionMode, getDeleGatorEnvironment } from "@metamask/delegation-toolkit";
import { DelegationManager } from "@metamask/delegation-toolkit/contracts";
import { parseEther, createWalletClient, http } from "viem";
import { monadTestnet } from "../config/chain.js";
import { bobAccount } from "../config/accounts.js";
import { publicClient } from "../config/client.js";

/**
 * Redeems a delegation by executing a native token (MON) transfer
 * Bob (as EOA) uses Alice's delegation to transfer MON from her account
 * NOTE: This version uses regular transaction instead of user operation (no bundler/paymaster needed)
 */
export async function redeemDelegation(
  signedDelegation: any,
  recipientAddress: string,
  amount: string = "0.1" // MON amount
) {
  console.log("\n🔓 Redeeming Delegation...");
  console.log("   Delegate (Bob EOA):", bobAccount.address);
  console.log("   Transferring:", amount, "MON");
  console.log("   To:", recipientAddress);

  try {
    // Step 1: Create execution for native token transfer
    const execution = createExecution({
      target: recipientAddress,
      value: parseEther(amount),
      callData: "0x", // Empty callData for native token transfer
    });

    console.log("   ✓ Native token transfer execution created");

    // Step 2: Encode redeemDelegations call
    // executions parameter should be array of execution arrays: [[execution]]
    const redeemDelegationCalldata = DelegationManager.encode.redeemDelegations({
      delegations: [[signedDelegation]],
      modes: [ExecutionMode.SingleDefault],
      executions: [[execution]],
    });

    console.log("   ✓ Redemption calldata encoded");

    // Step 4: Get DelegationManager address for Monad
    const environment = getDeleGatorEnvironment(monadTestnet.id);
    const delegationManagerAddress = environment.DelegationManager;

    console.log("   DelegationManager:", delegationManagerAddress);

    // Step 5: Create wallet client for Bob
    const bobWalletClient = createWalletClient({
      account: bobAccount,
      chain: monadTestnet,
      transport: http(),
    });

    // Step 6: Submit regular transaction (not user operation)
    console.log("   📤 Submitting transaction...");

    const hash = await bobWalletClient.sendTransaction({
      to: delegationManagerAddress,
      data: redeemDelegationCalldata,
      chain: monadTestnet,
      gas: 3000000n, // 3M gas limit for redemption
      gasPrice: 100000000000n, // 100 gwei (Monad minimum requirement)
    });

    console.log("   Transaction Hash:", hash);
    console.log("   Waiting for confirmation...");

    // Step 7: Wait for receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    console.log("✅ Delegation Redeemed!");
    console.log("   Block Number:", receipt.blockNumber);
    console.log("   Gas Used:", receipt.gasUsed);

    return receipt;
  } catch (error) {
    console.error("❌ Redemption failed:", error);
    throw error;
  }
}
