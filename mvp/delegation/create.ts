import { createDelegation } from "@metamask/delegation-toolkit";
import { parseEther } from "viem";
import type { SmartAccount } from "viem/account-abstraction";

/**
 * Creates a Native Token (MON) transfer delegation
 * Alice delegates to Bob the ability to transfer up to maxAmount MON
 */
export async function createTokenDelegation(
  delegatorSmartAccount: SmartAccount & { environment: any },
  delegateAddress: string,
  maxAmount: string = "1" // MON amount
) {
  console.log("\n📝 Creating Native Token (MON) Delegation...");
  console.log("   From (Alice):", delegatorSmartAccount.address);
  console.log("   To (Bob):", delegateAddress);
  console.log("   Max Amount:", maxAmount, "MON");

  const delegation = createDelegation({
    to: delegateAddress,
    from: delegatorSmartAccount.address,
    environment: delegatorSmartAccount.environment,
    scope: {
      type: "nativeTokenTransferAmount",
      maxAmount: parseEther(maxAmount), // Native token uses 18 decimals
    },
  });

  console.log("✅ Delegation Created");
  console.log("   Caveats:", delegation.caveats.length);

  return delegation;
}
