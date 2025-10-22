/**
 * Digital Inheritance Vault - Complete Flow Example
 *
 * This example demonstrates:
 * 1. Creating a vault with initial funding
 * 2. Setting up beneficiaries with time-locked delegations
 * 3. Owner checking in to reset timer
 * 4. Beneficiary claiming inheritance after deadline
 *
 * Run with: npm run vault-example
 */

import {
  createVault,
  setupBeneficiaries,
  simpleCheckIn,
  simpleClaim,
  printVaultSummary,
  PeriodUnit,
} from "./index";
import { parseEther, type Address } from "viem";
import { aliceAccount, bobAccount } from "../mvp/config/accounts";
import { privateKeyToAccount } from "viem/accounts";
import dotenv from "dotenv";

dotenv.config();

/**
 * Main example flow
 */
async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("🏦 DIGITAL INHERITANCE VAULT - COMPLETE FLOW EXAMPLE");
  console.log("=".repeat(80));

  try {
    // =========================================================================
    // STEP 1: Create Vault
    // =========================================================================
    console.log("\n\n📍 STEP 1: CREATE VAULT");
    console.log("-".repeat(80));

    const { vault, config } = await createVault({
      ownerAddress: aliceAccount.address,
      checkInPeriod: 5, // 5 minutes for testing
      checkInPeriodUnit: PeriodUnit.MINUTES,
      initialFunding: parseEther("1"), // 1 MON
    });

    console.log("\n✅ Vault created successfully!");
    console.log(`   Address: ${vault.address}`);

    // =========================================================================
    // STEP 2: Setup Beneficiaries
    // =========================================================================
    console.log("\n\n📍 STEP 2: SETUP BENEFICIARIES");
    console.log("-".repeat(80));

    // Create test beneficiary accounts
    const beneficiary1 = privateKeyToAccount(
      process.env.BOB_PRIVATE_KEY as `0x${string}`
    );
    const beneficiary2 = privateKeyToAccount(
      "0x1111111111111111111111111111111111111111111111111111111111111111"
    );
    const beneficiary3 = privateKeyToAccount(
      "0x2222222222222222222222222222222222222222222222222222222222222222"
    );

    console.log("\n👥 Beneficiaries:");
    console.log(`   1. Alice Jr (${beneficiary1.address}) - 40%`);
    console.log(`   2. Bob Jr (${beneficiary2.address}) - 30%`);
    console.log(`   3. Charlie (${beneficiary3.address}) - 30%`);

    const deadline = config.nextDeadline; // Use deadline from vault config

    const beneficiaries = await setupBeneficiaries({
      vault,
      beneficiaries: [
        {
          address: beneficiary1.address,
          name: "Alice Jr",
          allocation: parseEther("0.4"), // 40%
        },
        {
          address: beneficiary2.address,
          name: "Bob Jr",
          allocation: parseEther("0.3"), // 30%
        },
        {
          address: beneficiary3.address,
          name: "Charlie",
          allocation: parseEther("0.3"), // 30%
        },
      ],
      deadline,
    });

    console.log(`\n✅ ${beneficiaries.length} beneficiaries configured`);

    // =========================================================================
    // STEP 3: View Vault Status
    // =========================================================================
    console.log("\n\n📍 STEP 3: VAULT STATUS (INITIAL)");
    console.log("-".repeat(80));

    await printVaultSummary(vault.address);

    // =========================================================================
    // STEP 4: Owner Check-In (Optional - Comment out to test claim flow)
    // =========================================================================
    console.log("\n\n📍 STEP 4: OWNER CHECK-IN");
    console.log("-".repeat(80));
    console.log("\n⚠️  SCENARIO A: Owner checks in (timer resets)");
    console.log("   To test beneficiary claim, comment out the check-in code below");
    console.log("   and wait 5 minutes after vault creation.\n");

    // UNCOMMENT TO TEST CHECK-IN:
    /*
    const checkInRecord = await simpleCheckIn(vault);
    console.log("\n✅ Check-in complete!");
    console.log(`   New deadline: ${new Date(checkInRecord.newDeadline * 1000).toLocaleString()}`);
    console.log(`   Disabled: ${checkInRecord.disabledDelegationCount} delegations`);
    console.log(`   Created: ${checkInRecord.createdDelegationCount} new delegations`);

    await printVaultSummary(vault.address);
    */

    // =========================================================================
    // STEP 5: Wait for Deadline (In Production)
    // =========================================================================
    console.log("\n\n📍 STEP 5: WAITING FOR DEADLINE");
    console.log("-".repeat(80));
    console.log("\n⏰ In production, you would wait for the deadline to pass.");
    console.log("   For testing: Wait 5 minutes, then run the claim script.");
    console.log(
      `   Deadline: ${new Date(config.nextDeadline * 1000).toLocaleString()}`
    );

    // =========================================================================
    // STEP 6: Beneficiary Claims (After Deadline)
    // =========================================================================
    console.log("\n\n📍 STEP 6: BENEFICIARY CLAIM");
    console.log("-".repeat(80));
    console.log("\n⚠️  This will only work AFTER the deadline has passed.");
    console.log("   To test, wait 5 minutes then run this script again with claim enabled.\n");

    // UNCOMMENT TO TEST CLAIM (after deadline):
    /*
    console.log("\n💰 Beneficiary 1 (Alice Jr) attempting to claim...");

    const claimResult = await simpleClaim(vault.address, beneficiary1);

    console.log("\n✅ Claim successful!");
    console.log(`   TX Hash: ${claimResult.txHash}`);
    console.log(`   Amount: ${claimResult.amount.toString()} wei`);
    console.log(`   Gas used: ${claimResult.gasUsed.toString()}`);

    await printVaultSummary(vault.address);
    */

    // =========================================================================
    // FINAL SUMMARY
    // =========================================================================
    console.log("\n\n" + "=".repeat(80));
    console.log("✅ EXAMPLE COMPLETE");
    console.log("=".repeat(80));

    console.log("\n📝 Next Steps:");
    console.log("   1. Review vault summary above");
    console.log("   2. To test check-in: Uncomment STEP 4 code and re-run");
    console.log(
      "   3. To test claim: Wait 5 minutes, uncomment STEP 6 code, and re-run"
    );
    console.log(`   4. Vault address: ${vault.address}`);

    console.log("\n🔗 Useful Commands:");
    console.log(
      `   Load vault: const vault = await loadVault("${vault.address}")`
    );
    console.log(
      `   Check status: await printVaultSummary("${vault.address}")`
    );
    console.log(`   Check in: await simpleCheckIn(vault)`);
    console.log(
      `   Claim: await simpleClaim("${vault.address}", beneficiaryAccount)`
    );
  } catch (error) {
    console.error("\n❌ Error:", error);
    throw error;
  }
}

// Run example
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
