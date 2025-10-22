import { privateKeyToAccount, generatePrivateKey, mnemonicToAccount } from "viem/accounts";
import { Hex } from "viem";
import dotenv from "dotenv";

dotenv.config();

/**
 * Alice's Account (Delegator)
 * Uses PRIVATE_KEY from .env (fixed: was looking for DEPLOYER_PRIVATE_KEY!)
 */
export const aliceAccount = process.env.PRIVATE_KEY
  ? privateKeyToAccount(process.env.PRIVATE_KEY as Hex)
  : (() => { throw new Error("PRIVATE_KEY not found in .env"); })();

/**
 * Bob's Account (Delegate)
 * CRITICAL FIX: Generate unique private key and save to .env
 * DO NOT use well-known test mnemonics - they get swept by bots!
 */
const BOB_PRIVATE_KEY = process.env.BOB_PRIVATE_KEY as Hex | undefined;
if (!BOB_PRIVATE_KEY) {
  const newKey = generatePrivateKey();
  console.error("\n⚠️  BOB_PRIVATE_KEY not found in .env!");
  console.error("Add this line to your .env file:");
  console.error(`BOB_PRIVATE_KEY=${newKey}`);
  console.error("\nThen restart the script.\n");
  process.exit(1);
}
export const bobAccount = privateKeyToAccount(BOB_PRIVATE_KEY);

console.log("🔑 Accounts loaded:");
console.log("   Alice (Delegator EOA):", aliceAccount.address);
console.log("   Bob (Delegate EOA):", bobAccount.address);
