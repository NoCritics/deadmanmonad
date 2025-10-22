# MetaMask Smart Account MVP - Implementation Plan
## Monad Dev Cook-Off Hackathon

---

## 🎯 MVP OBJECTIVE

**Build the simplest possible implementation** that demonstrates:
1. ✅ Create & deploy a MetaMask Hybrid Smart Account
2. ✅ Create a basic delegation (Alice → Bob)
3. ✅ Redeem the delegation (Bob executes on Alice's behalf)

**Scope**: ERC-20 token transfer delegation using the erc20TransferAmount scope.

---

## 🔧 MONAD TESTNET CONFIGURATION

### Chain Details
```typescript
export const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: {
    name: 'Monad',
    symbol: 'MON',
    decimals: 18
  },
  rpcUrls: {
    default: { http: [process.env.RPC_URL || '<DEFAULT_RPC>'] },
    public: { http: [process.env.RPC_URL || '<DEFAULT_RPC>'] }
  },
} as const satisfies Chain;
```

### Infrastructure Endpoints
- **Chain ID**: `10143`
- **RPC URL**: From environment variable or Monad public RPC
- **FastLane Bundler**: `https://monad-testnet.4337-shbundler-fra.fastlane-labs.xyz`
- **Explorer**: TBD (MonadScan equivalent)

---

## 📁 PROJECT STRUCTURE

```
monad-metamask-mvp/
├── package.json
├── tsconfig.json
├── .env
├── src/
│   ├── config/
│   │   ├── chain.ts          # Monad chain definition
│   │   ├── client.ts         # PublicClient setup
│   │   ├── bundler.ts        # BundlerClient setup
│   │   └── accounts.ts       # Alice & Bob account creation
│   ├── smart-accounts/
│   │   └── create.ts         # Smart account creation logic
│   ├── delegation/
│   │   ├── create.ts         # Delegation creation & signing
│   │   └── redeem.ts         # Delegation redemption
│   └── index.ts              # Main orchestrator
└── README.md
```

---

## 📦 DEPENDENCIES

### package.json
```json
{
  "name": "monad-metamask-mvp",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc"
  },
  "dependencies": {
    "@metamask/delegation-toolkit": "^0.13.0",
    "viem": "^2.21.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

### .env Template
```bash
# Private keys (generate for testing)
ALICE_PRIVATE_KEY=0x...
BOB_PRIVATE_KEY=0x...

# Monad RPC URL (get from Monad)
RPC_URL=https://...

# Optional: Token address for delegation testing
TEST_TOKEN_ADDRESS=0x...
```

---

## 🏗️ IMPLEMENTATION STEPS

### Step 1: Chain Configuration
**File**: `src/config/chain.ts`

```typescript
import { Chain } from "viem";

export const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: {
    name: 'Monad',
    symbol: 'MON',
    decimals: 18
  },
  rpcUrls: {
    default: { http: [process.env.RPC_URL || ''] },
    public: { http: [process.env.RPC_URL || ''] }
  },
} as const satisfies Chain;
```

---

### Step 2: Client Setup
**File**: `src/config/client.ts`

```typescript
import { createPublicClient, http } from "viem";
import { monadTestnet } from "./chain";

export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});
```

---

### Step 3: Bundler Configuration
**File**: `src/config/bundler.ts`

```typescript
import { createBundlerClient } from "viem/account-abstraction";
import { publicClient } from "./client";
import { http } from "viem";

export const bundlerClient = createBundlerClient({
  client: publicClient,
  transport: http("https://monad-testnet.4337-shbundler-fra.fastlane-labs.xyz"),
});
```

---

### Step 4: Account Creation
**File**: `src/config/accounts.ts`

```typescript
import { privateKeyToAccount } from "viem/accounts";
import { Hex } from "viem";
import dotenv from "dotenv";

dotenv.config();

export const aliceAccount = privateKeyToAccount(
  process.env.ALICE_PRIVATE_KEY as Hex
);

export const bobAccount = privateKeyToAccount(
  process.env.BOB_PRIVATE_KEY as Hex
);
```

---

### Step 5: Smart Account Creation
**File**: `src/smart-accounts/create.ts`

```typescript
import { Implementation, toMetaMaskSmartAccount } from "@metamask/delegation-toolkit";
import { publicClient } from "../config/client";
import { aliceAccount, bobAccount } from "../config/accounts";

export async function createAliceSmartAccount() {
  const smartAccount = await toMetaMaskSmartAccount({
    client: publicClient,
    implementation: Implementation.Hybrid,
    deployParams: [aliceAccount.address, [], [], []],
    deploySalt: "0x",
    signer: { account: aliceAccount },
  });

  console.log("✅ Alice Smart Account Created");
  console.log("   Address:", smartAccount.address);
  console.log("   Environment:", smartAccount.environment);

  return smartAccount;
}

export async function createBobSmartAccount() {
  const smartAccount = await toMetaMaskSmartAccount({
    client: publicClient,
    implementation: Implementation.Hybrid,
    deployParams: [bobAccount.address, [], [], []],
    deploySalt: "0x",
    signer: { account: bobAccount },
  });

  console.log("✅ Bob Smart Account Created");
  console.log("   Address:", smartAccount.address);

  return smartAccount;
}
```

---

### Step 6: Deploy Alice's Smart Account
**File**: `src/smart-accounts/deploy.ts`

```typescript
import { bundlerClient } from "../config/bundler";
import { MetaMaskSmartAccount } from "@metamask/delegation-toolkit";

export async function deploySmartAccount(smartAccount: MetaMaskSmartAccount) {
  console.log("🚀 Deploying smart account via user operation...");

  const userOpHash = await bundlerClient.sendUserOperation({
    account: smartAccount,
    calls: [{
      to: smartAccount.address,
      value: 0n,
      data: "0x",
    }],
    maxFeePerGas: 1n,
    maxPriorityFeePerGas: 1n,
  });

  console.log("   User Op Hash:", userOpHash);

  const receipt = await bundlerClient.waitForUserOperationReceipt({
    hash: userOpHash,
  });

  console.log("✅ Smart Account Deployed!");
  console.log("   Transaction Hash:", receipt.receipt.transactionHash);

  return receipt;
}
```

---

### Step 7: Create Delegation
**File**: `src/delegation/create.ts`

```typescript
import { createDelegation } from "@metamask/delegation-toolkit";
import { parseUnits } from "viem";
import { MetaMaskSmartAccount } from "@metamask/delegation-toolkit";

export async function createTokenDelegation(
  delegatorSmartAccount: MetaMaskSmartAccount,
  delegateAddress: string,
  tokenAddress: string,
  maxAmount: string = "10" // 10 tokens
) {
  console.log("📝 Creating delegation...");

  const delegation = createDelegation({
    to: delegateAddress,
    from: delegatorSmartAccount.address,
    environment: delegatorSmartAccount.environment,
    scope: {
      type: "erc20TransferAmount",
      tokenAddress,
      maxAmount: parseUnits(maxAmount, 6), // Assuming 6 decimals (USDC-like)
    },
  });

  console.log("   Delegation created");
  console.log("   From:", delegation.from);
  console.log("   To:", delegation.to);
  console.log("   Scope:", delegation.caveats[0]);

  return delegation;
}
```

---

### Step 8: Sign Delegation
**File**: `src/delegation/sign.ts`

```typescript
import { MetaMaskSmartAccount } from "@metamask/delegation-toolkit";
import type { Delegation } from "@metamask/delegation-toolkit";

export async function signDelegation(
  delegatorSmartAccount: MetaMaskSmartAccount,
  delegation: Delegation
) {
  console.log("✍️  Signing delegation...");

  const signature = await delegatorSmartAccount.signDelegation({ delegation });

  const signedDelegation = {
    ...delegation,
    signature,
  };

  console.log("✅ Delegation signed");
  console.log("   Signature:", signature);

  return signedDelegation;
}
```

---

### Step 9: Redeem Delegation
**File**: `src/delegation/redeem.ts`

```typescript
import { createExecution, ExecutionMode } from "@metamask/delegation-toolkit";
import { DelegationManager } from "@metamask/delegation-toolkit/contracts";
import { encodeFunctionData, erc20Abi, parseUnits } from "viem";
import { bundlerClient } from "../config/bundler";
import type { MetaMaskSmartAccount } from "@metamask/delegation-toolkit";

export async function redeemDelegation(
  delegateSmartAccount: MetaMaskSmartAccount,
  signedDelegation: any,
  tokenAddress: string,
  recipientAddress: string,
  amount: string = "1"
) {
  console.log("🔓 Redeeming delegation...");

  // Step 1: Encode transfer action
  const callData = encodeFunctionData({
    abi: erc20Abi,
    args: [recipientAddress, parseUnits(amount, 6)],
    functionName: 'transfer',
  });

  console.log("   Encoded transfer of", amount, "tokens to", recipientAddress);

  // Step 2: Create execution
  const executions = createExecution({
    target: tokenAddress,
    callData,
  });

  // Step 3: Encode redeemDelegations
  const redeemDelegationCalldata = DelegationManager.encode.redeemDelegations({
    delegations: [[signedDelegation]],
    modes: [ExecutionMode.SingleDefault],
    executions: [executions],
  });

  // Step 4: Submit user operation
  console.log("📤 Submitting user operation...");

  const userOpHash = await bundlerClient.sendUserOperation({
    account: delegateSmartAccount,
    calls: [{
      to: delegateSmartAccount.address,
      data: redeemDelegationCalldata,
    }],
    maxFeePerGas: 1n,
    maxPriorityFeePerGas: 1n,
  });

  console.log("   User Op Hash:", userOpHash);

  // Step 5: Wait for receipt
  const receipt = await bundlerClient.waitForUserOperationReceipt({
    hash: userOpHash,
  });

  console.log("✅ Delegation Redeemed!");
  console.log("   Transaction Hash:", receipt.receipt.transactionHash);

  return receipt;
}
```

---

### Step 10: Main Orchestrator
**File**: `src/index.ts`

```typescript
import { createAliceSmartAccount, createBobSmartAccount } from "./smart-accounts/create";
import { deploySmartAccount } from "./smart-accounts/deploy";
import { createTokenDelegation } from "./delegation/create";
import { signDelegation } from "./delegation/sign";
import { redeemDelegation } from "./delegation/redeem";

async function main() {
  console.log("\n🎭 MetaMask Smart Account MVP - Monad Testnet\n");
  console.log("=" .repeat(60));

  try {
    // Step 1: Create Alice's smart account (delegator)
    console.log("\n[1/7] Creating Alice's Smart Account...");
    const aliceSmartAccount = await createAliceSmartAccount();

    // Step 2: Deploy Alice's smart account
    console.log("\n[2/7] Deploying Alice's Smart Account...");
    await deploySmartAccount(aliceSmartAccount);

    // Step 3: Create Bob's smart account (delegate)
    console.log("\n[3/7] Creating Bob's Smart Account...");
    const bobSmartAccount = await createBobSmartAccount();

    // Step 4: Create delegation
    console.log("\n[4/7] Creating Delegation (Alice → Bob)...");
    const tokenAddress = process.env.TEST_TOKEN_ADDRESS || "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // Example USDC
    const delegation = await createTokenDelegation(
      aliceSmartAccount,
      bobSmartAccount.address,
      tokenAddress,
      "10" // 10 tokens max
    );

    // Step 5: Sign delegation
    console.log("\n[5/7] Signing Delegation...");
    const signedDelegation = await signDelegation(aliceSmartAccount, delegation);

    // Step 6: Redeem delegation
    console.log("\n[6/7] Redeeming Delegation (Bob transfers 1 token from Alice)...");
    await redeemDelegation(
      bobSmartAccount,
      signedDelegation,
      tokenAddress,
      bobSmartAccount.address, // Bob sends to himself
      "1" // 1 token
    );

    // Step 7: Complete
    console.log("\n[7/7] ✅ MVP COMPLETE!\n");
    console.log("=" .repeat(60));
    console.log("\nSummary:");
    console.log("  Alice's Smart Account:", aliceSmartAccount.address);
    console.log("  Bob's Smart Account:", bobSmartAccount.address);
    console.log("  Delegation: Alice → Bob (up to 10 tokens)");
    console.log("  Redeemed: Bob transferred 1 token from Alice's account");

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

main();
```

---

## 🧪 TESTING CHECKLIST

### Pre-flight
- [ ] Monad testnet RPC URL configured
- [ ] Private keys generated and added to `.env`
- [ ] Alice's EOA has MON for gas
- [ ] Test token address identified (or use mock)
- [ ] FastLane bundler endpoint verified

### Execution
- [ ] Alice's smart account created (address shown)
- [ ] Alice's smart account deployed (tx hash shown)
- [ ] Bob's smart account created (address shown)
- [ ] Delegation created with ERC-20 scope
- [ ] Delegation signed by Alice
- [ ] Delegation redeemed by Bob successfully
- [ ] Transaction confirmed on Monad explorer

### Verification
- [ ] Alice's smart account balance decreased by 1 token
- [ ] Bob's smart account received 1 token
- [ ] All logs display correctly
- [ ] No errors in console

---

## 🚨 TROUBLESHOOTING

### Error: "Chain not supported"
- **Cause**: MetaMask Delegation Toolkit doesn't recognize Monad chain
- **Fix**: Ensure using v0.12.0+ and check chain ID is 10143

### Error: "Delegator not deployed"
- **Cause**: Trying to create delegation before deploying smart account
- **Fix**: Deploy Alice's account first (Step 2)

### Error: "Insufficient funds"
- **Cause**: Alice's EOA lacks MON for gas
- **Fix**: Fund Alice's EOA with testnet MON

### Error: "User operation reverted"
- **Cause**: Various (gas, permissions, etc.)
- **Fix**: Check bundler logs, verify gas fees, ensure token address is correct

---

## 📊 SUCCESS METRICS

✅ **MVP is successful if**:
1. Alice's smart account deployed on Monad testnet
2. Delegation created and signed
3. Bob successfully redeemed delegation
4. Token transfer executed (verifiable on-chain)

---

## 🎉 NEXT STEPS (Post-MVP)

- [ ] Add simple web UI
- [ ] Support multiple delegation scopes
- [ ] Add delegation revocation
- [ ] Implement paymaster for gasless txs
- [ ] Add error handling & recovery
- [ ] Create demo video for hackathon

---

*Implementation Plan Version: 1.0*
*Target: Monad Dev Cook-Off Hackathon*
*Estimated Time: 2-4 hours*
