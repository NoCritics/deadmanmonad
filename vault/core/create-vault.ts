import {
  toMetaMaskSmartAccount,
  Implementation,
} from "@metamask/delegation-toolkit";
import { createWalletClient, createPublicClient, http, type Address } from "viem";
import type { SmartAccount } from "viem/account-abstraction";
import { monadTestnet } from "../../mvp/config/chain";
import { CreateVaultParams, VaultConfig, VaultStorage } from "../types/index";
import { PeriodUnit, getDeadlineFromPeriod, getCurrentTimestamp } from "../utils/time-helpers";
import { validateCheckInPeriod } from "../utils/validation";
import { saveVaultData } from "../utils/delegation-storage";
import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";

/**
 * Create a new vault (smart account) for the owner
 * This deploys a MetaMask smart account that will hold assets
 */
export async function createVault(
  params: CreateVaultParams
): Promise<{
  vault: SmartAccount & { environment: any };
  config: VaultConfig;
}> {
  console.log("\n🏦 Creating Digital Inheritance Vault...");
  console.log("   Owner:", params.ownerAddress);

  // Validate check-in period
  const period = params.checkInPeriod || 30;
  const unit = params.checkInPeriodUnit || PeriodUnit.DAYS;

  const periodValidation = validateCheckInPeriod(period, unit);
  if (!periodValidation.isValid) {
    throw new Error(`Invalid check-in period: ${periodValidation.error}`);
  }

  if (periodValidation.warnings) {
    periodValidation.warnings.forEach((warning) =>
      console.warn(`⚠️  ${warning}`)
    );
  }

  console.log(`   Check-in period: ${period} ${unit}`);

  // Create smart account
  console.log("\n📝 Creating smart account...");

  // Get private key from params or environment
  const privateKey = params.ownerPrivateKey || (process.env.PRIVATE_KEY as Hex);
  if (!privateKey) {
    throw new Error("No private key provided. Pass ownerPrivateKey or set PRIVATE_KEY environment variable.");
  }

  const ownerAccount = privateKeyToAccount(privateKey);

  // Generate unique salt to ensure fresh vault deployment
  const uniqueSalt = `0x${Date.now().toString(16).padStart(64, '0')}` as Hex;

  const vault = await toMetaMaskSmartAccount({
    client: createPublicClient({
      chain: monadTestnet,
      transport: http(),
    }),
    implementation: Implementation.Hybrid,
    deployParams: [params.ownerAddress, [], [], []],
    deploySalt: uniqueSalt, // Use timestamp-based unique salt for fresh deployment
    signer: { account: ownerAccount }, // Changed from 'signatory' to 'signer' (matches working MVP)
  });

  console.log("✅ Smart account created!");
  console.log("   Vault Address:", vault.address);

  // Check if already deployed
  const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http(),
  });

  const code = await publicClient.getCode({ address: vault.address });
  const isDeployed = code && code !== "0x";

  if (!isDeployed) {
    console.log("\n🚀 Deploying vault to Monad...");

    const { factory, factoryData } = await vault.getFactoryArgs();

    const walletClient = createWalletClient({
      account: ownerAccount,
      chain: monadTestnet,
      transport: http(),
    });

    // Deploy vault using regular transaction
    const deployHash = await walletClient.sendTransaction({
      to: factory,
      data: factoryData,
      gas: 5000000n,
      gasPrice: 100000000000n, // 100 gwei (Monad requirement)
    });

    console.log("   Deploy TX:", deployHash);

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: deployHash,
    });

    console.log("✅ Vault deployed!");
    console.log("   Gas used:", receipt.gasUsed.toString());
  } else {
    console.log("ℹ️  Vault already deployed on-chain");
  }

  // Fund vault if initial funding provided
  if (params.initialFunding && params.initialFunding > 0n) {
    console.log("\n💰 Funding vault...");
    console.log("   Amount:", params.initialFunding.toString(), "wei");

    const walletClient = createWalletClient({
      account: ownerAccount,
      chain: monadTestnet,
      transport: http(),
    });

    const fundHash = await walletClient.sendTransaction({
      to: vault.address,
      value: params.initialFunding,
      // Remove gas limit - let viem estimate (smart contracts need >21000)
      gasPrice: 100000000000n, // 100 gwei
    });

    console.log("   Fund TX:", fundHash);

    await publicClient.waitForTransactionReceipt({ hash: fundHash });
    console.log("✅ Vault funded!");
  }

  // Get vault balance
  const balance = await publicClient.getBalance({ address: vault.address });
  console.log(`   Current balance: ${balance.toString()} wei`);

  // Calculate initial deadline
  const now = getCurrentTimestamp();
  const deadline = getDeadlineFromPeriod(period, unit);

  // Create vault configuration
  const config: VaultConfig = {
    vaultAddress: vault.address,
    ownerAddress: params.ownerAddress,
    checkInPeriod: period,
    checkInPeriodUnit: unit,
    lastCheckIn: now,
    nextDeadline: deadline,
    totalValue: balance,
    tokens: [], // No tokens yet, just native MON
    createdAt: now,
  };

  // Save initial vault data to storage
  const initialStorage: VaultStorage = {
    config,
    beneficiaries: [],
    delegations: [],
    checkIns: [],
    lastUpdated: now,
  };

  saveVaultData(vault.address, initialStorage);

  console.log("\n✅ Vault created successfully!");
  console.log("   Address:", vault.address);
  console.log("   Owner:", config.ownerAddress);
  console.log("   Check-in deadline:", new Date(deadline * 1000).toLocaleString());

  return { vault, config };
}

/**
 * Load existing vault from address
 */
export async function loadVault(
  vaultAddress: Address,
  ownerPrivateKey?: Hex // Optional private key
): Promise<SmartAccount & { environment: any }> {
  console.log("\n📂 Loading vault:", vaultAddress);

  // Get private key from params or environment
  const privateKey = ownerPrivateKey || (process.env.PRIVATE_KEY as Hex);
  if (!privateKey) {
    throw new Error("No private key provided. Pass ownerPrivateKey or set PRIVATE_KEY environment variable.");
  }

  const ownerAccount = privateKeyToAccount(privateKey);

  const vault = await toMetaMaskSmartAccount({
    client: createPublicClient({
      chain: monadTestnet,
      transport: http(),
    }),
    implementation: Implementation.Hybrid,
    deployParams: [vaultAddress, [], [], []], // Will be overridden by address
    address: vaultAddress, // Load existing account
    signer: { account: ownerAccount }, // Changed from 'signatory' to 'signer'
  });

  // Verify it exists on-chain
  const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http(),
  });

  const code = await publicClient.getCode({ address: vaultAddress });
  if (!code || code === "0x") {
    throw new Error(`Vault not deployed at ${vaultAddress}`);
  }

  console.log("✅ Vault loaded successfully");
  return vault;
}
