import { createAliceSmartAccount } from "./smart-accounts/create.js";
import { deploySmartAccount } from "./smart-accounts/deploy.js";
import { createTokenDelegation } from "./delegation/create.js";
import { signDelegation } from "./delegation/sign.js";
import { redeemDelegation } from "./delegation/redeem.js";
import { bobAccount } from "./config/accounts.js";

/**
 * Main orchestrator for MetaMask Smart Account MVP
 * Demonstrates: Create → Deploy → Delegate → Redeem
 *
 * SIMPLIFIED APPROACH (no bundler/paymaster needed):
 * - Alice: Smart Account (delegator)
 * - Bob: EOA (delegate)
 * - Deployment: Regular transaction
 * - Redemption: Regular transaction
 */
async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("🎭 MetaMask Smart Account MVP - Monad Testnet");
  console.log("   (Simplified: No Bundler/Paymaster Required)");
  console.log("=".repeat(70));

  try {
    // ========== PHASE 1: SMART ACCOUNT CREATION ==========

    console.log("\n📦 PHASE 1: Creating Smart Account");
    console.log("-".repeat(70));

    // Step 1: Create Alice's smart account (delegator)
    console.log("\n[1/5] Creating Alice's Smart Account (Delegator)...");
    const aliceSmartAccount = await createAliceSmartAccount();

    // Step 2: Deploy Alice's smart account via regular transaction
    // CRITICAL: Alice's account MUST be deployed before creating delegation
    console.log("\n[2/5] Deploying Alice's Smart Account...");
    await deploySmartAccount(aliceSmartAccount);

    // Bob will use his EOA (no smart account needed)
    console.log("\n   Bob will use EOA:", bobAccount.address);
    console.log("   (No smart account needed for delegate)");

    // ========== PHASE 2: DELEGATION LIFECYCLE ==========

    console.log("\n\n🔐 PHASE 2: Delegation Lifecycle");
    console.log("-".repeat(70));

    // Step 3: Fund Alice's smart account with MON
    console.log("\n[3/7] Funding Alice's Smart Account with MON...");
    const { aliceAccount } = await import("./config/accounts.js");
    const { createWalletClient, http, parseEther } = await import("viem");
    const { monadTestnet } = await import("./config/chain.js");

    const aliceWalletClient = createWalletClient({
      account: aliceAccount,
      chain: monadTestnet,
      transport: http(),
    });

    const fundHash = await aliceWalletClient.sendTransaction({
      to: aliceSmartAccount.address,
      value: parseEther("1"), // Send 1 MON to Alice's smart account
      // Remove gas limit - let viem estimate (smart contracts need >21000)
      gasPrice: 100000000000n, // 100 gwei
    });

    console.log("   Transaction Hash:", fundHash);
    const { publicClient } = await import("./config/client.js");
    await publicClient.waitForTransactionReceipt({ hash: fundHash });
    console.log("   ✅ Alice's smart account funded with 1 MON");

    // Step 4: Create delegation (Alice Smart Account → Bob EOA)
    console.log("\n[4/7] Creating Delegation (Alice → Bob)...");

    const delegation = await createTokenDelegation(
      aliceSmartAccount,
      bobAccount.address, // Bob's EOA address
      "0.5" // Alice allows Bob to transfer up to 0.5 MON
    );

    // Step 5: Sign delegation
    console.log("\n[5/7] Signing Delegation (Alice signs)...");
    const signedDelegation = await signDelegation(aliceSmartAccount, delegation);

    // Step 6: Redeem delegation (Bob's EOA redeems via regular transaction)
    console.log("\n[6/7] Redeeming Delegation (Bob transfers 0.1 MON)...");

    await redeemDelegation(
      signedDelegation,
      bobAccount.address, // Bob transfers to himself
      "0.1" // Transfer 0.1 MON
    );

    // ========== PHASE 3: SUCCESS ==========

    console.log("\n\n🎉 PHASE 3: Complete!");
    console.log("-".repeat(70));

    console.log("\n✅ MVP SUCCESSFULLY COMPLETED!");
    console.log("\n📊 Summary:");
    console.log("   Alice's Smart Account:", aliceSmartAccount.address);
    console.log("   Bob's EOA:", bobAccount.address);
    console.log("   Delegation Scope: Native Token Transfer (max 0.5 MON)");
    console.log("   Redeemed: Bob transferred 0.1 MON from Alice to himself");
    console.log("\n💡 Note: This MVP uses regular transactions (no bundler/paymaster)");
    console.log("   For production, integrate FastLane paymaster with shMon bonding");

    console.log("\n" + "=".repeat(70));

  } catch (error) {
    console.error("\n❌ ERROR:", error);
    console.error("\n" + "=".repeat(70));
    process.exit(1);
  }
}

// Run the MVP
main();
