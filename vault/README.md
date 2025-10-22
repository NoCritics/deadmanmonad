# 🏦 Digital Inheritance Vault

A "Dead Man's Switch" implementation using MetaMask Smart Accounts on Monad testnet.

## Overview

The Digital Inheritance Vault allows owners to:
- Create a vault (smart account) with time-locked funds
- Add beneficiaries with specific allocations
- Set a check-in period (5 minutes to 1 year)
- Check in periodically to prove they're alive
- If no check-in → beneficiaries can claim their inheritance

## Quick Start

```bash
# Install dependencies
npm install

# Run example flow
npm run vault

# Or run the MVP (original delegation demo)
npm run mvp
```

## Architecture

```
Owner creates vault → Funds vault → Adds beneficiaries
                                           ↓
                                  Time-locked delegations
                                           ↓
                            ┌──────────────┴──────────────┐
                            ↓                             ↓
                   Owner checks in               Owner doesn't check in
                   (timer resets)                (deadline passes)
                            ↓                             ↓
                  Beneficiaries blocked         Beneficiaries can claim
```

## Core Features

### ✅ Implemented

1. **Vault Creation** - Create smart account vault with initial funding
2. **Beneficiary Setup** - Add beneficiaries with time-locked delegations
3. **Multi-Caveat Delegations**:
   - Timestamp enforcer (claim only AFTER deadline)
   - Limited calls (one-time claim)
   - Transfer amount (specific allocation)
4. **Check-In Mechanism** - Owner resets timer, disables old delegations
5. **Claim Functionality** - Beneficiaries redeem after deadline
6. **Status Queries** - View vault state, beneficiary info, health checks
7. **Off-Chain Storage** - LocalStorage for delegation management

### 🔨 To Be Built

- UI dashboard (Next.js + TailwindCSS)
- Notification system
- Multi-token support (currently MON only)
- Paymaster for gasless claims

## API Reference

### Vault Creation

```typescript
import { createVault, PeriodUnit } from "./vault/index.js";

const { vault, config } = await createVault({
  ownerAddress: "0x...",
  checkInPeriod: 30,
  checkInPeriodUnit: PeriodUnit.DAYS,
  initialFunding: parseEther("10"), // 10 MON
});
```

**Supported Time Units:**
- `PeriodUnit.MINUTES` - For testing (min: 5 minutes)
- `PeriodUnit.HOURS`
- `PeriodUnit.DAYS`
- `PeriodUnit.WEEKS`
- `PeriodUnit.MONTHS` - (max: 12 months)

### Setup Beneficiaries

```typescript
import { setupBeneficiaries } from "./vault/index.js";

const beneficiaries = await setupBeneficiaries({
  vault,
  beneficiaries: [
    {
      address: "0xBeneficiary1",
      name: "Alice Jr",
      allocation: parseEther("4"), // 40% of 10 MON
    },
    {
      address: "0xBeneficiary2",
      name: "Bob Jr",
      allocation: parseEther("3"), // 30%
    },
    {
      address: "0xBeneficiary3",
      name: "Charlie",
      allocation: parseEther("3"), // 30%
    },
  ],
  deadline: config.nextDeadline,
});
```

**Validation:**
- Max 10 beneficiaries
- Total allocation ≤ vault balance
- No duplicate addresses
- Positive allocations only

### Owner Check-In

```typescript
import { simpleCheckIn } from "./vault/index.js";

// Simple check-in (uses current period)
const checkInRecord = await simpleCheckIn(vault);

// Or check-in with new period
const checkInRecord = await simpleCheckIn(vault, 60); // Change to 60 days
```

**What happens:**
1. Disables all active delegations on-chain
2. Creates new delegations with updated deadline
3. Records check-in in history
4. Returns transaction details

### Beneficiary Claim

```typescript
import { simpleClaim } from "./vault/index.js";
import { privateKeyToAccount } from "viem/accounts";

const beneficiaryAccount = privateKeyToAccount("0xBeneficiaryPrivateKey");

const { txHash, amount, gasUsed } = await simpleClaim(
  vaultAddress,
  beneficiaryAccount
);

console.log(`Claimed ${amount} wei!`);
```

**Requirements:**
- Deadline must have passed
- Beneficiary must not have claimed yet
- Delegation must be active (not disabled)
- Beneficiary pays gas for claim

### Query Vault Status

```typescript
import { printVaultSummary, getVaultStatus } from "./vault/index.js";

// Print human-readable summary
await printVaultSummary(vaultAddress);

// Get structured data
const state = await getVaultStatus(vaultAddress);
console.log(state.status); // "active" | "claimable" | "empty" | etc.
console.log(state.timeRemaining); // seconds until deadline
console.log(state.beneficiaries); // array of beneficiary objects
```

### Health Checks

```typescript
import { checkVaultHealth } from "./vault/index.js";

const health = await checkVaultHealth(vaultAddress);

if (!health.isHealthy) {
  console.error("Errors:", health.errors);
}

if (health.warnings.length > 0) {
  console.warn("Warnings:", health.warnings);
}
```

## File Structure

```
vault/
├── core/
│   ├── create-vault.ts          # Create and deploy vaults
│   ├── setup-beneficiaries.ts   # Multi-caveat delegations
│   ├── check-in.ts              # Owner check-in mechanism
│   ├── claim.ts                 # Beneficiary claims
│   └── status.ts                # Query vault state
├── utils/
│   ├── delegation-storage.ts    # LocalStorage management
│   ├── time-helpers.ts          # Time calculations
│   └── validation.ts            # Input validation
├── types/
│   └── index.ts                 # TypeScript definitions
├── example-vault-flow.ts        # Complete example
├── index.ts                     # Main exports
└── README.md                    # This file
```

## Example Flows

### Happy Path (Owner Alive)

```
Day 0:  Owner creates vault with 30-day check-in
Day 15: Owner checks in → timer resets to Day 45
Day 40: Owner checks in again → timer resets to Day 70
...     Owner continues checking in
```

**Result:** Beneficiaries never able to claim

### Inheritance Path (Owner Inactive)

```
Day 0:  Owner creates vault with 30-day check-in
Day 29: Beneficiaries can see vault but claims blocked
Day 30: Deadline passes → delegations become ACTIVE
Day 31: Beneficiary 1 claims their 40%
Day 32: Beneficiary 2 claims their 30%
Day 33: Beneficiary 3 claims their 30%
```

**Result:** All funds distributed, vault empty

### Recovery Path (Owner Returns)

```
Day 0:  Owner creates vault
Day 30: Deadline passes
Day 31: Beneficiary 1 claims 40%
Day 32: Owner returns → checks in
        → Disables remaining delegations
        → Prevents further claims
```

**Result:** Partial distribution, owner regains control

## Testing

### Quick Test (5 minutes)

```typescript
// 1. Create vault with 5-minute period
const { vault } = await createVault({
  ownerAddress: owner.address,
  checkInPeriod: 5,
  checkInPeriodUnit: PeriodUnit.MINUTES,
  initialFunding: parseEther("1"),
});

// 2. Add beneficiaries
await setupBeneficiaries({ vault, beneficiaries, deadline });

// 3. Wait 5 minutes...

// 4. Claim as beneficiary
await simpleClaim(vault.address, beneficiaryAccount);
```

### Check-In Test

```typescript
// 1. Create vault
const { vault } = await createVault({ ... });

// 2. Add beneficiaries
await setupBeneficiaries({ ... });

// 3. Check in before deadline
await simpleCheckIn(vault);

// 4. Verify deadline extended
const status = await getVaultStatus(vault.address);
console.log(status.timeRemaining); // Should be reset
```

## Gas Costs (Estimated)

| Operation | Gas | Cost @ 100 gwei |
|-----------|-----|-----------------|
| Create Vault | ~5M | 0.5 MON |
| Setup Beneficiary | ~50K | 0.005 MON |
| Check-In (3 beneficiaries) | ~400K | 0.04 MON |
| Claim | ~300K | 0.03 MON |

**Note:** Monad requires minimum 100 gwei gas price

## Security Considerations

### ✅ Built-in Protections

1. **Time-Lock**: TimestampEnforcer prevents early claims
2. **One-Time Claim**: LimitedCallsEnforcer prevents double-claims
3. **Amount Limits**: TransferAmountEnforcer caps each claim
4. **On-Chain Verification**: All delegations verified by DelegationManager
5. **Owner Control**: Only owner can disable delegations

### ⚠️ Known Limitations

1. **Gas Cost**: Beneficiaries must have MON to pay claim gas
   - Future: Add paymaster for gasless claims
2. **Lost Keys**: Beneficiary loses keys = can't claim
   - Mitigation: Owner can update beneficiary addresses (before deadline)
3. **Partial Balance**: If total allocation > balance, first claimers win
   - Validation: Enforced during setup

## Environment Setup

```bash
# .env file
PRIVATE_KEY=0x... # Owner's private key
BOB_PRIVATE_KEY=0x... # Test beneficiary key
RPC_URL=https://testnet-rpc.monad.xyz
```

## Troubleshooting

### "Insufficient funds for gas"
- Send MON to owner address
- Check `PRIVATE_KEY` is correct in .env

### "Transaction fee too low"
- Monad requires 100 gwei minimum
- All scripts already configured correctly

### "Vault not found"
- Run `createVault()` first
- Check vault address is correct
- Verify .env has correct keys

### "Cannot claim yet"
- Wait for deadline to pass
- Check `await getVaultStatus(vaultAddress)` for time remaining

### "Delegation disabled"
- Owner checked in (reset delegations)
- Previous delegations are now invalid
- New delegations created with new deadline

## Next Steps

1. ✅ **Backend Complete** - All core functionality implemented
2. 🔨 **UI Development** - Build Next.js dashboard
3. 🎨 **Polish** - Add animations, better UX
4. 🚀 **Deploy** - Launch on Monad testnet
5. 📱 **Mobile** - Responsive design

## Resources

- [MetaMask Delegation Toolkit](https://docs.metamask.io/delegation-toolkit/)
- [ERC-7710 Spec](https://eips.ethereum.org/EIPS/eip-7710)
- [Monad Testnet](https://docs.monad.xyz/)
- [Research Findings](../RESEARCH_FINDINGS.md)
- [Architecture Doc](../VAULT_ARCHITECTURE.md)

## License

MIT

---

**Built for MetaMask Smart Accounts x Monad Dev Cook-Off 🏆**
