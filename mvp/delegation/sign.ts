import type { SmartAccount } from "viem/account-abstraction";

/**
 * Signs a delegation with the delegator's smart account
 * Alice signs the delegation to authorize Bob
 */
export async function signDelegation(
  delegatorSmartAccount: SmartAccount & { signDelegation: any },
  delegation: any
) {
  console.log("\n✍️  Signing Delegation...");

  const signature = await delegatorSmartAccount.signDelegation({ delegation });

  const signedDelegation = {
    ...delegation,
    signature,
  };

  console.log("✅ Delegation Signed");
  console.log("   Signature length:", signature.length);

  return signedDelegation;
}
