# 🔍 Research Findings: Vault Implementation

**Date**: October 2025
**Purpose**: Answer key questions about implementing the Digital Inheritance Vault

---

## ✅ Question 1: Can We Use Multiple Caveats Together?

**Answer**: YES! Multiple caveats can be combined using `CaveatBuilder`.

### Confirmed Syntax

```typescript
import { createCaveatBuilder } from "@metamask/delegation-toolkit";

const caveatBuilder = createCaveatBuilder(smartAccount.environment);

const caveats = caveatBuilder
  .addCaveat("timestamp", afterThreshold, beforeThreshold)
  .addCaveat("limitedCalls", 1)
  .addCaveat("erc20TransferAmount", maxAmount)
  .build();

const delegation = createDelegation({
  from: vault.address,
  to: beneficiary.address,
  scope: {
    type: "erc20TransferAmount",
    tokenAddress: "0x...",
    maxAmount: allocation,
  },
  caveats,  // Array of multiple caveats
  environment: vault.environment,
});
```

### Real-World Example from MetaMask Docs

**Social Invite Feature** (combining 3 caveats):
```typescript
const caveats = caveatBuilder
  .addCaveat("limitedCalls", 1)                    // One-time use
  .addCaveat("nativeTokenTransferAmount", 1n)      // Max 1 wei
  .addCaveat("timestamp", 0, expirationTime)       // 24-hour expiry
  .build();
```

### For Our Vault System

Each beneficiary delegation will use:
```typescript
const caveats = caveatBuilder
  .addCaveat("timestamp",
    deadlineTimestamp,      // afterThreshold (can't claim BEFORE deadline)
    0xffffffffffffffff      // beforeThreshold (valid forever AFTER)
  )
  .addCaveat("limitedCalls", 1)  // One-time claim only
  .addCaveat("erc20TransferAmount", beneficiary.allocation)
  .build();
```

**Key Insight**: Caveats are applied as a **chain**. Each must pass for the delegation to execute.

---

## 🎨 Question 2: UI/Frontend Patterns for Delegations

### Available Resources

**Official MetaMask Examples**:
- **gator-extension** (Scaffold-ETH 2 extension)
  - URL: `https://github.com/metamask/gator-extension`
  - Install: `npx create-eth@latest -e metamask/gator-extension`
  - Stack: **Next.js + TypeScript + Viem**
  - Demonstrates: End-to-end flow (create smart account → generate delegation → redeem)

- **hello-gator** (Minimal implementation)
  - URL: `https://github.com/MetaMask/hello-gator`
  - Purpose: Minimal Viable Gator example
  - Note: Uses private package (need to contact team)

- **gator-examples** (Template collection)
  - URL: `https://github.com/MetaMask/gator-examples`
  - Tool: `create-gator-app` CLI
  - Purpose: Bootstrap delegation-enabled projects

### React Integration Patterns (General MetaMask)

While no specific delegation + React `useState` examples exist publicly, the pattern would be:

```typescript
// Typical React component structure
import { useState, useEffect } from 'react';
import { toMetaMaskSmartAccount } from '@metamask/delegation-toolkit';

function VaultDashboard() {
  const [vault, setVault] = useState(null);
  const [delegations, setDelegations] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    // Load vault and delegations
    loadVaultState();
  }, []);

  const handleCheckIn = async () => {
    // Disable old delegations
    // Create new ones
    // Update state
  };

  return (
    <div>
      <VaultHeader vault={vault} timeRemaining={timeRemaining} />
      <BeneficiaryList beneficiaries={delegations} />
      <CheckInButton onClick={handleCheckIn} />
    </div>
  );
}
```

### Recommended Approach for Vault UI

**Option A: Use gator-extension as base**
- Clone and modify the scaffold-eth extension
- Already has delegation flow built-in
- Next.js + TypeScript ready

**Option B: Build custom with Wagmi/Viem**
- Use `@metamask/sdk-react` for wallet connection
- Manage delegation state with `useState` / `useReducer`
- Build custom UI components

**For Hackathon**: **Option B is simpler** - build minimal custom UI focused on vault functionality.

---

## 💾 Question 3: Delegation Storage Patterns

### ERC-7710 Key Insight

**Delegations DON'T need to be on-chain to be valid!**

From research:
> "Delegations don't need to live on-chain to be valid. This is important for understanding how delegations can be stored off-chain."

### Storage Options

#### Option 1: LocalStorage (Simplest for MVP)
```typescript
// Store delegation
const storeDelegation = (beneficiaryAddress, signedDelegation) => {
  const key = `vault_${vaultAddress}_beneficiary_${beneficiaryAddress}`;
  localStorage.setItem(key, JSON.stringify({
    delegation: signedDelegation,
    createdAt: Date.now(),
    deadline: deadlineTimestamp,
  }));
};

// Retrieve delegation
const getDelegation = (beneficiaryAddress) => {
  const key = `vault_${vaultAddress}_beneficiary_${beneficiaryAddress}`;
  return JSON.parse(localStorage.getItem(key));
};
```

**Pros**:
- Zero complexity
- Perfect for MVP/demo
- No external dependencies

**Cons**:
- Browser-specific (can't share across devices)
- Not suitable for production
- Data lost if browser cache cleared

#### Option 2: IPFS (Decentralized Storage)
```typescript
// Pin delegation to IPFS
const pinDelegation = async (signedDelegation) => {
  const response = await pinata.pinJSONToIPFS({
    delegation: signedDelegation,
    metadata: { name: "Vault Delegation" }
  });
  return response.IpfsHash; // Store this hash
};

// Retrieve from IPFS
const getDelegation = async (ipfsHash) => {
  const response = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
  return await response.json();
};
```

**Services**:
- Pinata (most popular)
- NFT.Storage (free for NFTs/metadata)
- Eternum (enterprise)

**Pros**:
- Decentralized
- Immutable
- Can share delegation link

**Cons**:
- Requires pinning service
- Costs (though minimal)
- Slower than localStorage

#### Option 3: Database (Centralized but Practical)
```typescript
// Store in Supabase/Firebase
const saveDelegation = async (vaultAddress, beneficiary, delegation) => {
  await supabase.from('delegations').insert({
    vault_address: vaultAddress,
    beneficiary_address: beneficiary.address,
    delegation_data: delegation,
    created_at: new Date(),
    deadline: deadlineTimestamp,
    is_disabled: false,
  });
};
```

**Pros**:
- Fast queries
- Easy to manage
- Can add indexes, relations

**Cons**:
- Centralized
- Requires backend
- Trust assumption

### Recommended for Vault Project

**For Hackathon MVP**: **LocalStorage** ✅
- Fastest to implement
- Zero infrastructure
- Demonstrates concept perfectly

**Structure**:
```typescript
interface StoredVaultData {
  config: VaultConfig;
  beneficiaries: {
    address: string;
    name: string;
    allocation: bigint;
    delegation: Delegation & { signature: Hex };
    delegationHash: Hex;
    createdAt: number;
  }[];
  checkIns: CheckInRecord[];
  lastUpdated: number;
}

// Single key per vault
const STORAGE_KEY = `vault_${vaultAddress}`;
localStorage.setItem(STORAGE_KEY, JSON.stringify(vaultData));
```

**For Production**: Hybrid approach
- Store vault config in localStorage
- Pin delegations to IPFS
- Cache IPFS hashes in localStorage
- Fallback to localStorage if IPFS unavailable

---

## 🏗️ Implementation Recommendations

### 1. Multi-Caveat Implementation

**File**: `vault/core/setup-beneficiaries.ts`

```typescript
import { createCaveatBuilder, createDelegation } from "@metamask/delegation-toolkit";

export async function setupBeneficiaries(params: SetupBeneficiariesParams) {
  const { vault, beneficiaries, deadline } = params;

  const caveatBuilder = createCaveatBuilder(vault.environment);
  const signedDelegations = [];

  for (const beneficiary of beneficiaries) {
    // Build caveats for this beneficiary
    const caveats = caveatBuilder
      .addCaveat("timestamp",
        deadline,                    // Can't claim BEFORE
        0xffffffffffffffff          // Valid forever AFTER
      )
      .addCaveat("limitedCalls", 1)  // One-time claim
      .addCaveat("erc20TransferAmount", beneficiary.allocation)
      .build();

    // Create delegation
    const delegation = createDelegation({
      from: vault.address,
      to: beneficiary.address,
      scope: {
        type: "erc20TransferAmount",
        tokenAddress: beneficiary.tokenAddress || "0x0",  // 0x0 for native
        maxAmount: beneficiary.allocation,
      },
      caveats,
      environment: vault.environment,
    });

    // Sign delegation
    const signature = await signDelegation(vault, delegation);
    signedDelegations.push({ ...delegation, signature });
  }

  return signedDelegations;
}
```

### 2. Storage Implementation

**File**: `vault/utils/delegation-storage.ts`

```typescript
import { VaultStorage, StoredDelegation } from "../types/index.js";

const STORAGE_PREFIX = "monad_vault_";

export function saveVaultData(vaultAddress: string, data: VaultStorage) {
  const key = `${STORAGE_PREFIX}${vaultAddress}`;
  localStorage.setItem(key, JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
}

export function loadVaultData(vaultAddress: string): VaultStorage | null {
  const key = `${STORAGE_PREFIX}${vaultAddress}`;
  const data = localStorage.getItem(key);
  if (!data) return null;

  return JSON.parse(data, (key, value) => {
    // Convert string numbers back to bigint for allocation fields
    if (key === 'allocation' || key === 'totalValue') {
      return BigInt(value);
    }
    return value;
  });
}

export function listAllVaults(): string[] {
  const vaults: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      vaults.push(key.replace(STORAGE_PREFIX, ''));
    }
  }
  return vaults;
}
```

### 3. UI Component Structure

**Minimal React Components Needed**:

```
components/
├── owner/
│   ├── CreateVaultForm.tsx      # Create vault + add beneficiaries
│   ├── CheckInButton.tsx        # Big check-in button
│   ├── VaultStatus.tsx          # Time remaining, balance
│   └── BeneficiaryList.tsx      # View beneficiaries
├── beneficiary/
│   ├── VaultView.tsx            # See vault info
│   ├── AllocationCard.tsx       # Your allocation
│   └── ClaimButton.tsx          # Claim inheritance
└── shared/
    ├── ConnectWallet.tsx        # Wallet connection
    ├── VaultCard.tsx            # Summary card
    └── CountdownTimer.tsx       # Time until deadline
```

**Tech Stack** (minimal):
- Next.js 14 (App Router)
- TailwindCSS (styling)
- viem + wagmi (blockchain)
- @metamask/delegation-toolkit
- React hooks for state

**Estimated Build Time**: 6-8 hours for basic UI

---

## 📊 Summary & Next Steps

### What We Learned

✅ **Multi-Caveats**: Confirmed working with `CaveatBuilder`
✅ **UI Patterns**: gator-extension provides Next.js template
✅ **Storage**: LocalStorage perfect for MVP, IPFS for production

### Recommended Implementation Path

**Phase 1: Backend (3-4 hours)**
1. Use `createCaveatBuilder()` for multi-caveat delegations ✅ Confirmed
2. Store delegations in localStorage ✅ Simple & works
3. Implement all 5 core functions (create, setup, check-in, claim, status)

**Phase 2: UI (6-8 hours)**
1. Use Next.js (like gator-extension)
2. Build 3 main pages: Create Vault / Owner Dashboard / Beneficiary View
3. Use wagmi for wallet connection
4. localStorage for delegation management

**Total Estimate**: 10-12 hours for complete working demo

### Key Files to Create Next

```
vault/
├── utils/
│   └── delegation-storage.ts    ⬅️ BUILD THIS NEXT
├── core/
│   ├── create-vault.ts          ⬅️ THEN THIS
│   └── setup-beneficiaries.ts   ⬅️ AND THIS
```

---

## 🔗 Useful Links Found

- **MetaMask Delegation Docs**: https://docs.metamask.io/delegation-toolkit/
- **Caveat Builder API**: https://docs.metamask.io/delegation-toolkit/reference/delegation/
- **gator-extension Template**: `npx create-eth@latest -e metamask/gator-extension`
- **ERC-7710 Spec**: https://eips.ethereum.org/EIPS/eip-7710

---

## ❓ Remaining Questions

1. **Caveat order matters?**
   - Docs mention: "When using caveat enforcers that modify external contract states, the order matters"
   - Our caveats (timestamp, limitedCalls, transferAmount) don't modify state
   - **Should be safe in any order**

2. **Can we update timestamp without recreating?**
   - Answer from research: **NO**
   - Must disable old delegation and create new one
   - This is why check-in = disable + recreate

3. **Paymaster for beneficiary claims?**
   - Optional for MVP
   - Can add later for gasless claims
   - For now, beneficiaries pay their own gas

---

*Research completed and ready for implementation!*
