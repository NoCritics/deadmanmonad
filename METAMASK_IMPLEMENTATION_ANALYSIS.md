# MetaMask Smart Account Implementation - Comprehensive Analysis

## 📋 Document Purpose
This document provides a meticulously organized understanding of MetaMask Smart Accounts for the Monad Dev Cook-Off hackathon MVP implementation.

---

## 🏗️ ARCHITECTURE OVERVIEW

### The "Stack Pattern" - Modular File Structure

```
project/
├── signer.ts       # Account creation & private key management
├── client.ts       # PublicClient for blockchain interaction
├── config.ts       # BundlerClient + optional PaymasterClient
└── example.ts      # Main business logic orchestration
```

**Key Principle**: Separation of concerns enables reusability, testing, and clarity.

---

## 🎯 SMART ACCOUNT TYPES

### Option 1: Hybrid Smart Account ✅ **RECOMMENDED FOR MVP**
- **Description**: Supports EOA owner + optional passkey (WebAuthn) signers
- **Use Case**: Most flexible, easiest to implement
- **deployParams**: `[owner.address, [], [], []]`
- **Implementation**: `Implementation.Hybrid`

### Option 2: Multisig Smart Account
- **Description**: Multiple EOA signers with configurable threshold
- **Use Case**: Governance, shared wallets
- **deployParams**: `[owners[], threshold]`
- **Implementation**: `Implementation.MultiSig`

### Option 3: Stateless 7702 Smart Account
- **Description**: Upgraded EOA via EIP-7702 authorization
- **Use Case**: Existing EOA users wanting smart account features
- **Prerequisites**: Requires signAuthorization step first
- **Implementation**: `Implementation.Stateless7702`

---

## 🔧 COMPLETE IMPLEMENTATION FLOW

### Phase 1: Project Setup

#### 1.1 Install Dependencies
```bash
npm install @metamask/delegation-toolkit viem
```

**Key Packages**:
- `@metamask/delegation-toolkit` - Core smart account & delegation functionality
- `viem` - Ethereum library (TypeScript-first, lightweight)

#### 1.2 Monad Chain Configuration
```typescript
// Custom Monad chain definition (if not in viem/chains)
export const monadTestnet = {
  id: <CHAIN_ID>, // Check Monad docs
  name: 'Monad Testnet',
  network: 'monad-testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['<MONAD_RPC_URL>'] },
    public: { http: ['<MONAD_RPC_URL>'] }
  },
  blockExplorers: {
    default: { name: 'MonadScan', url: '<EXPLORER_URL>' }
  }
}
```

---

### Phase 2: Core Configuration Files

#### 2.1 `signer.ts` - Account Creation
```typescript
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";

// Generate new private key (for testing)
const privateKey = generatePrivateKey();

// Create account from private key
export const account = privateKeyToAccount(privateKey);
```

**Alternative** (using existing private key):
```typescript
const privateKey = "0x..." as const;
export const account = privateKeyToAccount(privateKey);
```

#### 2.2 `client.ts` - PublicClient Setup
```typescript
import { http, createPublicClient } from "viem";
import { monadTestnet as chain } from "./chain"; // Custom chain config

const transport = http(); // Or http("CUSTOM_RPC_URL")

export const publicClient = createPublicClient({
  transport,
  chain,
});
```

**Purpose**: Queries blockchain state, interacts with contracts

#### 2.3 `config.ts` - BundlerClient Setup
```typescript
import { createBundlerClient } from "viem/account-abstraction";
import { publicClient } from "./client.ts";
import { http } from "viem";

// FastLane bundler for Monad Testnet
export const bundlerClient = createBundlerClient({
  client: publicClient,
  transport: http("https://monad-testnet.4337-shbundler-fra.fastlane-labs.xyz"),
});
```

**Optional - Paymaster** (for gas sponsorship):
```typescript
import { createPaymasterClient } from "viem/account-abstraction";

export const paymasterClient = createPaymasterClient({
  transport: http("<PAYMASTER_URL>"),
});

export const bundlerClient = createBundlerClient({
  client: publicClient,
  transport: http("https://monad-testnet.4337-shbundler-fra.fastlane-labs.xyz"),
  paymaster: paymasterClient, // Optional
});
```

---

### Phase 3: Smart Account Creation

#### 3.1 Create Smart Account Instance
```typescript
// example.ts
import { publicClient } from "./client.ts";
import { account } from "./signer.ts";
import { Implementation, toMetaMaskSmartAccount } from "@metamask/delegation-toolkit";

const smartAccount = await toMetaMaskSmartAccount({
  client: publicClient,
  implementation: Implementation.Hybrid,
  deployParams: [account.address, [], [], []],
  deploySalt: "0x",
  signer: { account },
});

console.log("Smart Account Address:", smartAccount.address);
console.log("Environment:", smartAccount.environment);
```

**Key Points**:
- `smartAccount.address` - Deterministic smart account address
- `smartAccount.environment` - Auto-resolved contract addresses for Monad
- Account is **counterfactual** (not yet deployed on-chain)

#### 3.2 Deploy Smart Account

**Option A: Auto-Deploy on First User Operation** ✅ **RECOMMENDED**
```typescript
import { bundlerClient } from "./config.ts";
import { parseEther } from "viem";

const userOpHash = await bundlerClient.sendUserOperation({
  account: smartAccount,
  calls: [{
    to: "0x1234567890123456789012345678901234567890",
    value: parseEther("0.001"),
  }],
  maxFeePerGas: 1n, // Adjust per bundler requirements
  maxPriorityFeePerGas: 1n,
});

console.log("User Operation Hash:", userOpHash);
```
- Smart account deploys automatically if not already deployed
- Uses `initCode` internally

**Option B: Manual Deploy via Relay Account**
```typescript
import { createWalletClient } from "viem";

const relayAccount = privateKeyToAccount("0x..."); // Funded EOA
const walletClient = createWalletClient({
  account: relayAccount,
  chain,
  transport: http(),
});

const { factory, factoryData } = await smartAccount.getFactoryArgs();

const hash = await walletClient.sendTransaction({
  to: factory,
  data: factoryData,
});

console.log("Deploy Transaction Hash:", hash);
```

---

### Phase 4: Delegation Lifecycle

#### 4.1 Prerequisites
- ✅ Delegator MUST be a MetaMask Smart Account
- ✅ Delegator MUST be deployed on-chain
- ✅ Delegate can be smart account OR EOA

#### 4.2 Create Delegator (Alice)
```typescript
import { privateKeyToAccount } from "viem/accounts";
import { Implementation, toMetaMaskSmartAccount } from "@metamask/delegation-toolkit";

const delegatorAccount = privateKeyToAccount("0x...");

const delegatorSmartAccount = await toMetaMaskSmartAccount({
  client: publicClient,
  implementation: Implementation.Hybrid,
  deployParams: [delegatorAccount.address, [], [], []],
  deploySalt: "0x",
  signer: { account: delegatorAccount },
});

// Ensure deployed
console.log("Delegator Address:", delegatorSmartAccount.address);
```

#### 4.3 Create Delegate (Bob)
```typescript
const delegateAccount = privateKeyToAccount("0x...");

const delegateSmartAccount = await toMetaMaskSmartAccount({
  client: publicClient,
  implementation: Implementation.Hybrid,
  deployParams: [delegateAccount.address, [], [], []],
  deploySalt: "0x",
  signer: { account: delegateAccount },
});

console.log("Delegate Address:", delegateSmartAccount.address);
```

#### 4.4 Create Delegation with Scope
```typescript
import { createDelegation } from "@metamask/delegation-toolkit";
import { parseUnits } from "viem";

// Example: Allow Bob to spend 10 USDC from Alice's account
const tokenAddress = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // USDC

const delegation = createDelegation({
  to: delegateSmartAccount.address,
  from: delegatorSmartAccount.address,
  environment: delegatorSmartAccount.environment,
  scope: {
    type: "erc20TransferAmount",
    tokenAddress,
    maxAmount: parseUnits("10", 6), // 10 USDC (6 decimals)
  },
});

console.log("Delegation Created:", delegation);
```

#### 4.5 Sign Delegation (Alice signs)
```typescript
const signature = await delegatorSmartAccount.signDelegation({
  delegation
});

const signedDelegation = {
  ...delegation,
  signature,
};

console.log("Signed Delegation:", signedDelegation);
```

#### 4.6 Redeem Delegation (Bob executes)
```typescript
import { createExecution, ExecutionMode } from "@metamask/delegation-toolkit";
import { DelegationManager } from "@metamask/delegation-toolkit/contracts";
import { encodeFunctionData, erc20Abi, parseUnits } from "viem";

// Step 1: Encode the action Bob wants to perform
const callData = encodeFunctionData({
  abi: erc20Abi,
  args: [
    delegateSmartAccount.address, // Recipient (Bob)
    parseUnits("1", 6) // Amount: 1 USDC
  ],
  functionName: 'transfer',
});

// Step 2: Create execution
const executions = createExecution({
  target: tokenAddress,
  callData
});

// Step 3: Encode redeemDelegations call
const redeemDelegationCalldata = DelegationManager.encode.redeemDelegations({
  delegations: [[signedDelegation]], // Array of delegation chains
  modes: [ExecutionMode.SingleDefault], // Single chain execution
  executions: [executions],
});

// Step 4: Bob submits user operation
const userOpHash = await bundlerClient.sendUserOperation({
  account: delegateSmartAccount,
  calls: [{
    to: delegateSmartAccount.address, // Delegate's smart account
    data: redeemDelegationCalldata,
  }],
  maxFeePerGas: 1n,
  maxPriorityFeePerGas: 1n,
});

console.log("Redemption User Op Hash:", userOpHash);

// Step 5: Wait for receipt
const receipt = await bundlerClient.waitForUserOperationReceipt({
  hash: userOpHash
});
console.log("Delegation Redeemed! Tx Hash:", receipt.receipt.transactionHash);
```

---

## 🎨 DELEGATION SCOPES

### 1. ERC-20 Transfer Amount ✅ **SIMPLEST FOR MVP**
```typescript
scope: {
  type: "erc20TransferAmount",
  tokenAddress: "0x...",
  maxAmount: 10000000n, // 10 USDC (6 decimals)
}
```
- **Use Case**: Allow delegate to transfer up to X tokens
- **Caveat Enforcers**: erc20TransferAmount, valueLte

### 2. Native Token Transfer Amount
```typescript
scope: {
  type: "nativeTokenTransferAmount",
  maxAmount: parseEther("0.1"), // 0.1 MON
}
```
- **Use Case**: Allow delegate to transfer native token
- **Caveat Enforcers**: exactCalldata, nativeTokenTransferAmount

### 3. Function Call
```typescript
scope: {
  type: "functionCall",
  targets: ["0x..."], // Contract addresses
  selectors: ["approve(address,uint256)"], // Function signatures
}
```
- **Use Case**: Allow delegate to call specific functions
- **Caveat Enforcers**: allowedTargets, allowedMethods

### 4. ERC-20 Periodic Transfer
```typescript
scope: {
  type: "erc20PeriodTransfer",
  tokenAddress: "0x...",
  periodAmount: parseUnits("10", 6),
  periodDuration: 86400, // 1 day in seconds
  startDate: Math.floor(Date.now() / 1000),
}
```
- **Use Case**: Daily spending limit
- **Caveat Enforcers**: erc20PeriodTransfer, valueLte

---

## 🌐 MONAD-SPECIFIC CONFIGURATION

### Supported Versions
- ✅ **v0.12.0** - Monad Testnet supported
- ✅ **v0.13.0** - Monad Mainnet supported

### FastLane Bundler
- **URL**: `https://monad-testnet.4337-shbundler-fra.fastlane-labs.xyz`
- **WebSocket**: `wss://monad-testnet.4337-shbundler-fra.fastlane-labs.xyz`

### Environment Resolution
```typescript
import { getDeleGatorEnvironment } from "@metamask/delegation-toolkit";

// Auto-resolves when creating smart account
const environment = smartAccount.environment;

// Or manually resolve
const environment = getDeleGatorEnvironment(monadChainId);
```

**Environment Contains**:
- EntryPoint address
- DelegationManager address
- SimpleFactory address
- Implementation contracts (Hybrid, MultiSig, Stateless7702)

---

## ⚠️ CRITICAL GOTCHAS

### 1. Delegator Deployment Requirement
❌ **Error**: Creating delegation before deploying delegator
```typescript
// WRONG: Delegator not deployed
const delegation = createDelegation({ ... });
```

✅ **Correct**: Ensure delegator is deployed first
```typescript
// Deploy delegator first
await bundlerClient.sendUserOperation({ account: delegatorSmartAccount, ... });

// Then create delegation
const delegation = createDelegation({ ... });
```

### 2. Gas Fee Estimation
- FastLane bundler may require specific `maxFeePerGas` values
- Use constants like `1n` for testing, adjust based on bundler response

### 3. Environment Auto-Resolution
- Happens automatically when calling `toMetaMaskSmartAccount`
- Throws error if chain not supported

### 4. CallData Encoding
```typescript
// Use viem's encodeFunctionData
const callData = encodeFunctionData({
  abi: erc20Abi,
  args: [recipient, amount],
  functionName: 'transfer',
});
```

### 5. Execution Modes
- `ExecutionMode.SingleDefault` - Single delegation chain, reverts on failure
- `ExecutionMode.SingleTry` - Single chain, continues on failure
- `ExecutionMode.BatchDefault` - Multiple chains, reverts on failure
- `ExecutionMode.BatchTry` - Multiple chains, continues on failure

---

## 🚀 SIMPLEST MVP IMPLEMENTATION

### Goal
Create and deploy a Hybrid smart account, then create a simple ERC-20 delegation that can be redeemed.

### MVP Checklist
- [ ] Set up Monad chain configuration
- [ ] Create PublicClient (client.ts)
- [ ] Create account signer (signer.ts)
- [ ] Configure FastLane bundler (config.ts)
- [ ] Create Hybrid smart account
- [ ] Deploy smart account via first user operation
- [ ] Create second smart account as delegate
- [ ] Create ERC-20 transfer delegation with scope
- [ ] Sign delegation
- [ ] Redeem delegation
- [ ] Verify transaction on MonadScan

### Implementation Order
1. **Chain & Client Setup** (signer, client, config files)
2. **Smart Account Creation** (Alice & Bob)
3. **Deploy Alice's Account** (required for delegation)
4. **Create & Sign Delegation** (Alice → Bob)
5. **Redeem Delegation** (Bob executes on Alice's behalf)

---

## 📚 KEY IMPORTS REFERENCE

```typescript
// Core toolkit
import {
  Implementation,
  toMetaMaskSmartAccount,
  createDelegation,
  createExecution,
  ExecutionMode,
  getDeleGatorEnvironment,
} from "@metamask/delegation-toolkit";

// Contracts
import { DelegationManager } from "@metamask/delegation-toolkit/contracts";

// Viem core
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  parseUnits,
  encodeFunctionData,
  erc20Abi,
  zeroAddress,
} from "viem";

// Viem accounts
import {
  privateKeyToAccount,
  generatePrivateKey,
} from "viem/accounts";

// Viem account abstraction
import {
  createBundlerClient,
  createPaymasterClient,
} from "viem/account-abstraction";
```

---

## 🎯 NEXT STEPS

1. ✅ Obtain Monad testnet RPC URL & chain ID
2. ✅ Verify FastLane bundler endpoint
3. ✅ Create project structure with modular files
4. ✅ Implement smart account creation
5. ✅ Test deployment on Monad
6. ✅ Implement delegation flow
7. ✅ Create simple UI (optional for MVP)

---

*Document Version: 1.0*
*Last Updated: 2025*
*Purpose: Monad Dev Cook-Off Hackathon MVP*
