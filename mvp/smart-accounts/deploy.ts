import { createWalletClient, http } from "viem";
import { monadTestnet } from "../config/chain.js";
import { aliceAccount } from "../config/accounts.js";
import { publicClient } from "../config/client.js";
import type { SmartAccount } from "viem/account-abstraction";

/**
 * Deploys a smart account via regular transaction (bypasses bundler/paymaster)
 * Uses Alice's EOA to pay for gas
 */
export async function deploySmartAccount(smartAccount: SmartAccount) {
  console.log("\n🚀 Deploying smart account...");
  console.log("   Address:", smartAccount.address);

  try {
    // Check if already deployed
    const code = await publicClient.getCode({ address: smartAccount.address });
    if (code && code !== "0x") {
      console.log("✅ Smart Account Already Deployed!");
      console.log("   Skipping deployment");
      return { alreadyDeployed: true };
    }

    // Get factory args for deployment
    const { factory, factoryData } = await smartAccount.getFactoryArgs();

    console.log("   Factory:", factory);
    console.log("   Deploying via regular transaction...");

    // Create wallet client with Alice's account
    const walletClient = createWalletClient({
      account: aliceAccount,
      chain: monadTestnet,
      transport: http(),
    });

    // Deploy via regular transaction with manual gas parameters
    // Monad requires higher gas price than typical testnets
    const hash = await walletClient.sendTransaction({
      to: factory,
      data: factoryData,
      gas: 5000000n, // 5M gas limit (plenty for deployment)
      gasPrice: 100000000000n, // 100 gwei (Monad minimum requirement)
    });

    console.log("   Transaction Hash:", hash);
    console.log("   Waiting for confirmation...");

    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    console.log("✅ Smart Account Deployed!");
    console.log("   Block Number:", receipt.blockNumber);
    console.log("   Gas Used:", receipt.gasUsed);

    return receipt;
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}
