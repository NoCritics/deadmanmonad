# 🏦 Digital Inheritance Vault Architecture

## Concept: "Dead Man's Switch" on Monad using MetaMask Smart Accounts

**Use Case**: If the owner doesn't check in within a time period, beneficiaries can claim their allocated funds.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Owner                             │
│  (Controls Smart Account Vault)                     │
└───────────────┬─────────────────────────────────────┘
                │
                │ Creates/Manages
                ↓
┌─────────────────────────────────────────────────────┐
│           Smart Account Vault                       │
│  - Holds ETH & ERC-20 tokens                        │
│  - Owner's address as account owner                 │
│  - Time-locked delegations to beneficiaries         │
└───────────────┬─────────────────────────────────────┘
                │
                │ Delegations with Caveats:
                │  - TimestampEnforcer (valid AFTER deadline)
                │  - LimitedCallsEnforcer (one-time claim)
                │  - TokenTransferAmountEnforcer (specific amount)
                │
                ↓
┌─────────────────────────────────────────────────────┐
│              Beneficiaries                          │
│  - Beneficiary 1: 40% of vault                      │
│  - Beneficiary 2: 30% of vault                      │
│  - Beneficiary 3: 30% of vault                      │
└─────────────────────────────────────────────────────┘
```

---

## Core Mechanisms

### 1. **Vault Creation**
```typescript
// Owner creates smart account (vault)
const vault = await toMetaMaskSmartAccount({
  implementation: Implementation.Hybrid,
  deployParams: [ownerEOA.address, [], [], []],
  ...
});

// Fund the vault
await transferFundsToVault(vault.address, initialAmount);
```

### 2. **Beneficiary Setup with Time-Locks**
```typescript
const checkInPeriod = 30; // days
const deadline = currentTime + (checkInPeriod * 24 * 60 * 60);

// Create delegation for each beneficiary
for (const beneficiary of beneficiaries) {
  const delegation = createDelegation({
    from: vault.address,
    to: beneficiary.address,
    scope: {
      type: "erc20TransferAmount", // or "nativeTokenTransferAmount"
      tokenAddress: tokenAddress, // omit for native
      maxAmount: beneficiary.allocation,
    },
    caveats: [
      {
        type: "timestamp",
        afterThreshold: deadline, // ONLY valid AFTER this time
        beforeThreshold: 0xffffffffffffffff, // Valid forever once active
      },
      {
        type: "limitedCalls",
        limit: 1, // One-time claim only
      },
    ],
    environment: vault.environment,
  });

  // Sign and store delegation
  const signed = await signDelegation(vault, delegation);
  storeDelegation(beneficiary.address, signed);
}
```

### 3. **Check-In Mechanism (Owner is Alive)**

**Option A: Disable old + Create new** (PREFERRED)
```typescript
async function checkIn(vault, currentDelegations) {
  // 1. Disable all existing delegations
  for (const delegation of currentDelegations) {
    await DelegationManager.execute.disableDelegation({
      client: walletClient,
      delegationManagerAddress: environment.DelegationManager,
      delegation,
    });
  }

  // 2. Create new delegations with updated deadline
  const newDeadline = currentTime + (30 * 24 * 60 * 60);
  await createBeneficiaryDelegations(vault, beneficiaries, newDeadline);

  console.log("✅ Check-in complete. Timer reset to 30 days.");
}
```

**Option B: Update timestamp caveat** (if possible - need to research)
```typescript
// Potentially update the timestamp without creating new delegation?
// This would be more gas-efficient but may not be supported
```

### 4. **Beneficiary Claim (Owner Didn't Check In)**

```typescript
async function claimInheritance(beneficiary, signedDelegation) {
  // Check if deadline has passed
  const currentTime = Math.floor(Date.now() / 1000);
  const delegation = signedDelegation;

  // TimestampEnforcer will automatically block if too early
  // Just attempt redemption

  const execution = createExecution({
    target: tokenAddress,
    callData: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'transfer',
      args: [beneficiary.address, beneficiary.allocation],
    }),
  });

  const redeemCalldata = DelegationManager.encode.redeemDelegations({
    delegations: [[signedDelegation]],
    modes: [ExecutionMode.SingleDefault],
    executions: [[execution]],
  });

  // Beneficiary submits transaction
  const hash = await beneficiaryWalletClient.sendTransaction({
    to: environment.DelegationManager,
    data: redeemCalldata,
  });

  console.log("✅ Inheritance claimed!");
}
```

---

## MetaMask Toolkit Features Used

### Available Caveat Enforcers on Monad (from Environment):

```typescript
const relevantEnforcers = {
  // TIME-LOCK: Only allow claims AFTER deadline
  TimestampEnforcer: '0x1046bb45C8d673d4ea75321280DB34899413c069',

  // ONE-TIME CLAIM: Prevent multiple withdrawals
  LimitedCallsEnforcer: '0x04658B29F6b82ed55274221a06Fc97D318E25416',

  // AMOUNT LIMITS: Each beneficiary gets specific amount
  ERC20TransferAmountEnforcer: '0xf100b0819427117EcF76Ed94B358B1A5b5C6D2Fc',
  NativeTokenTransferAmountEnforcer: '0xF71af580b9c3078fbc2BBF16FbB8EEd82b330320',

  // REDEEMER RESTRICTION: Only specific address can claim
  RedeemerEnforcer: '0xE144b0b2618071B4E56f746313528a669c7E65c5',
};
```

### DelegationManager Methods:

```typescript
// Create delegation
DelegationManager.encode.redeemDelegations({ ... })

// Revoke/Disable delegation (for check-in)
DelegationManager.execute.disableDelegation({ delegation })

// Check if disabled
DelegationManager.read.disabledDelegations({ delegationHash })
```

---

## Data Structures

### Vault Configuration
```typescript
interface VaultConfig {
  vaultAddress: string; // Smart account address
  ownerAddress: string; // Owner's EOA
  checkInPeriodDays: number; // e.g., 30
  lastCheckIn: number; // Unix timestamp
  nextDeadline: number; // Unix timestamp when delegations become active
  totalValue: bigint; // Total MON + tokens
}
```

### Beneficiary
```typescript
interface Beneficiary {
  address: string; // Beneficiary's address
  name: string; // Display name
  allocation: bigint; // Amount they can claim (in token wei)
  percentage: number; // Percentage of vault (for display)
  delegation: Delegation; // Signed delegation object
  delegationHash: string; // For checking disabled status
  hasClaimed: boolean; // Track if already claimed
}
```

### Check-In Record
```typescript
interface CheckInRecord {
  timestamp: number;
  txHash: string;
  newDeadline: number;
  disabledDelegationCount: number;
  createdDelegationCount: number;
}
```

---

## File Structure

```
vault/
├── config/
│   ├── vault-setup.ts          # Vault configuration constants
│   └── beneficiaries.ts         # Beneficiary list management
├── core/
│   ├── create-vault.ts          # Create smart account vault
│   ├── fund-vault.ts            # Transfer assets to vault
│   ├── setup-beneficiaries.ts   # Create time-locked delegations
│   ├── check-in.ts              # Owner check-in mechanism
│   ├── claim.ts                 # Beneficiary claim process
│   └── status.ts                # Query vault status
├── utils/
│   ├── delegation-storage.ts    # Store/retrieve delegations
│   ├── time-helpers.ts          # Time calculation utilities
│   └── validation.ts            # Input validation
├── types/
│   └── index.ts                 # TypeScript interfaces
└── index.ts                     # Main vault orchestrator
```

---

## Flow Examples

### Happy Path (Owner Alive)

```
Day 0:  Owner creates vault, adds 3 beneficiaries, funds with 10 MON
Day 1:  Beneficiaries notified, can see their future allocation
Day 15: Owner checks in → timer resets to Day 45
Day 30: (original deadline) - Beneficiaries CANNOT claim (timer was reset)
Day 40: Owner checks in again → timer resets to Day 70
Day 60: Owner continues checking in regularly
```

### Inheritance Path (Owner Inactive)

```
Day 0:  Owner creates vault with 30-day check-in period
Day 1:  Beneficiaries can see vault but claims blocked (too early)
Day 25: Still too early to claim
Day 30: Deadline passes - delegations become ACTIVE
Day 31: Beneficiary 1 claims their 40% (4 MON)
Day 32: Beneficiary 2 claims their 30% (3 MON)
Day 35: Beneficiary 3 claims their 30% (3 MON)
Day 36: All funds distributed. Vault empty.
```

### Recovery Path (Owner Returns)

```
Day 0:  Owner creates vault
Day 25: Owner goes offline (travel, emergency)
Day 30: Deadline passes
Day 31: Beneficiary 1 tries to claim → SUCCESS
Day 32: Owner returns online, sees Beneficiary 1 claimed
Day 32: Owner disables remaining delegations
Day 32: Owner sends new funds, creates new delegations
```

---

## Smart Contract Interactions

### On-Chain State

**DelegationManager Contract** (deployed by MetaMask):
- `disabledDelegations` mapping: tracks which delegations are revoked
- `redeemDelegations`: executes delegation with caveat checks

### Gas Costs (Estimated)

| Operation | Gas | Cost @ 100 gwei |
|-----------|-----|-----------------|
| Create Vault | 5M | 0.5 MON |
| Create Delegation (per beneficiary) | ~50K | 0.005 MON |
| Check-In (disable 3 + create 3) | ~400K | 0.04 MON |
| Claim (per beneficiary) | ~300K | 0.03 MON |

**Total Setup Cost**: ~0.5 MON + (0.005 * beneficiaries)

---

## Security Considerations

### ✅ Built-in Protections

1. **Time-Lock**: TimestampEnforcer prevents early claims
2. **One-Time Claim**: LimitedCallsEnforcer prevents double-claims
3. **Amount Limits**: TransferAmountEnforcer caps each claim
4. **On-Chain Proof**: All delegations and claims are on-chain
5. **Owner Control**: Only owner can disable delegations

### ⚠️ Potential Issues

1. **Gas Price Risk**: Beneficiaries need MON for gas to claim
   - *Solution*: Could use paymaster for gasless claims

2. **Smart Account Not Funded**: Vault created but no funds sent
   - *Solution*: UI validation before beneficiary setup

3. **Beneficiary Lost Keys**: Cannot claim inheritance
   - *Solution*: Allow owner to update beneficiary addresses (before deadline)

4. **Total > Balance**: Allocations exceed vault balance
   - *Solution*: Validation during setup + UI warnings

---

## UI Components Needed

### Owner Dashboard
- Create vault form
- Add/remove beneficiaries
- Set check-in period
- **CHECK-IN BUTTON** (big, prominent)
- View time until deadline
- Transaction history

### Beneficiary Dashboard
- View vault they're part of
- See their allocation
- Time remaining until claimable
- **CLAIM BUTTON** (enabled after deadline)
- Claim status

### Public Vault Explorer
- View vault address
- See beneficiaries (names hidden, just percentages)
- Time until next deadline
- Check-in history

---

## Implementation Priority

### Phase 1: Core Backend (MVP)
1. ✅ Keep existing delegation demo
2. Create vault creation logic
3. Setup time-locked beneficiary delegations
4. Implement check-in mechanism
5. Implement claim mechanism
6. Test with 2-3 beneficiaries

### Phase 2: UI
1. Simple React/Next.js app
2. Connect wallet (MetaMask or Privy)
3. Owner: Create vault + check-in page
4. Beneficiary: View + claim page
5. Demo mode with test data

### Phase 3: Polish
1. Add transaction confirmations
2. Better error messages
3. Gas estimation
4. Email/notification system (optional)
5. Deployment to production

---

## Open Questions

1. **Can we update timestamp caveat without recreating delegation?**
   - Need to research if caveats can be modified
   - If not, must disable old + create new (confirmed approach)

2. **Should we use paymaster for beneficiary claims?**
   - Pro: Gasless inheritance claims
   - Con: Adds complexity
   - Decision: Start without, add later

3. **How to handle partial claims?**
   - Current design: all-or-nothing per beneficiary
   - Alternative: Allow streaming/partial claims
   - Decision: Keep simple for MVP

4. **Off-chain vs on-chain beneficiary storage?**
   - On-chain: More expensive but fully decentralized
   - Off-chain: Cheaper, requires storage solution
   - Decision: Store off-chain (localStorage for demo, IPFS for production)

---

## Success Metrics

### For Hackathon Demo

✅ **Must Have**:
- Create vault with 3 beneficiaries
- Show check-in functionality
- Demonstrate successful claim after deadline
- Working UI showing both owner and beneficiary views

🎯 **Nice to Have**:
- Real-time countdown timer
- Transaction history
- Multiple token support (MON + ERC-20)
- Notification system

---

## Next Steps

1. Complete this analysis ✅
2. Design data structures and file organization
3. Implement vault core functionality
4. Build simple UI
5. Create demo flow
6. Test on Monad testnet
7. Document and submit for hackathon

---

*Architecture for MetaMask Smart Accounts x Monad Dev Cook-Off*
*Last Updated: 2025*
