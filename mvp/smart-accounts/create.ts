import { Implementation, toMetaMaskSmartAccount } from "@metamask/delegation-toolkit";
import { publicClient } from "../config/client.js";
import { aliceAccount, bobAccount } from "../config/accounts.js";

/**
 * Creates Alice's Hybrid Smart Account (Delegator)
 * This account will create delegations
 */
export async function createAliceSmartAccount() {
  console.log("\n📝 Creating Alice's Hybrid Smart Account...");

  // Generate unique salt for fresh deployment
  const uniqueSalt = `0x${Date.now().toString(16).padStart(64, '0')}`;

  const smartAccount = await toMetaMaskSmartAccount({
    client: publicClient,
    implementation: Implementation.Hybrid,
    deployParams: [aliceAccount.address, [], [], []],
    deploySalt: uniqueSalt,
    signer: { account: aliceAccount },
  });

  console.log("✅ Alice's Smart Account Created");
  console.log("   Address:", smartAccount.address);
  console.log("   Environment Chain ID:", smartAccount.environment);

  return smartAccount;
}

/**
 * Creates Bob's Hybrid Smart Account (Delegate)
 * This account will redeem delegations
 */
export async function createBobSmartAccount() {
  console.log("\n📝 Creating Bob's Hybrid Smart Account...");

  // Generate unique salt for fresh deployment
  const uniqueSalt = `0x${(Date.now() + 1).toString(16).padStart(64, '0')}`; // +1 to ensure different from Alice's

  const smartAccount = await toMetaMaskSmartAccount({
    client: publicClient,
    implementation: Implementation.Hybrid,
    deployParams: [bobAccount.address, [], [], []],
    deploySalt: uniqueSalt,
    signer: { account: bobAccount },
  });

  console.log("✅ Bob's Smart Account Created");
  console.log("   Address:", smartAccount.address);

  return smartAccount;
}
