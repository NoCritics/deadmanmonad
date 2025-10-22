# MetaMask Smart Account MVP

## Monad Dev Cook-Off Hackathon

A minimal viable product demonstrating MetaMask Smart Accounts and delegation on Monad Testnet.

---

## 🎯 What This MVP Does

1. **Creates Smart Accounts**: Deploys Hybrid smart accounts for Alice (delegator) and Bob (delegate)
2. **Creates Delegation**: Alice delegates permission to Bob to transfer ERC-20 tokens
3. **Redeems Delegation**: Bob executes a token transfer from Alice's account using the delegation

---

## 🏗️ Architecture

```
mvp/
├── config/
│   ├── chain.ts           # Monad testnet configuration
│   ├── client.ts          # PublicClient for blockchain interaction
│   ├── bundler.ts         # BundlerClient for user operations
│   └── accounts.ts        # Alice & Bob EOA accounts
├── smart-accounts/
│   ├── create.ts          # Smart account creation logic
│   └── deploy.ts          # Smart account deployment
├── delegation/
│   ├── create.ts          # Delegation creation
│   ├── sign.ts            # Delegation signing
│   └── redeem.ts          # Delegation redemption
└── index.ts               # Main orchestrator
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js v18+
- Private key with MON tokens on Monad Testnet

### Installation

```bash
# Install dependencies
npm install

# Or with yarn
yarn install

# Or with pnpm
pnpm install
```

### Configuration

Create `.env` file in the project root:

```bash
# Your private key (with MON for gas)
DEPLOYER_PRIVATE_KEY=0x...

# Optional: Custom RPC URL
RPC_URL=https://testnet-rpc.monad.xyz

# Optional: Test token address for delegation
TEST_TOKEN_ADDRESS=0x...
```

### Run the MVP

```bash
npm run mvp
```

---

## 📊 Expected Output

```
======================================================================
🎭 MetaMask Smart Account MVP - Monad Testnet
======================================================================

🔑 Accounts loaded:
   Alice (Delegator EOA): 0x...
   Bob (Delegate EOA): 0x...

📦 PHASE 1: Creating Smart Accounts
----------------------------------------------------------------------

[1/7] Creating Alice's Smart Account (Delegator)...
✅ Alice's Smart Account Created
   Address: 0x...

[2/7] Deploying Alice's Smart Account...
🚀 Deploying smart account...
   User Op Hash: 0x...
✅ Smart Account Deployed!
   Transaction Hash: 0x...

[3/7] Creating Bob's Smart Account (Delegate)...
✅ Bob's Smart Account Created
   Address: 0x...

🔐 PHASE 2: Delegation Lifecycle
----------------------------------------------------------------------

[4/7] Creating Delegation (Alice → Bob)...
✅ Delegation Created

[5/7] Signing Delegation (Alice signs)...
✅ Delegation Signed

[6/7] Redeeming Delegation (Bob transfers 1 token)...
✅ Delegation Redeemed!
   Transaction Hash: 0x...

🎉 PHASE 3: Complete!
----------------------------------------------------------------------

✅ MVP SUCCESSFULLY COMPLETED!
```

---

## 🔍 What's Happening

### Phase 1: Smart Account Creation

1. **Alice's Smart Account**: A Hybrid smart account is created with Alice's EOA as owner
2. **Deployment**: Alice's account is deployed via a user operation (required for delegation)
3. **Bob's Smart Account**: A Hybrid smart account is created with Bob's EOA as owner

### Phase 2: Delegation Lifecycle

4. **Create Delegation**: Alice creates a delegation allowing Bob to transfer up to 10 tokens
   - Scope: `erc20TransferAmount`
   - Token: Specified ERC-20 token address
   - Max Amount: 10 tokens (6 decimals)

5. **Sign Delegation**: Alice signs the delegation with her smart account

6. **Redeem Delegation**: Bob redeems the delegation by:
   - Creating execution calldata (transfer 1 token to himself)
   - Encoding `redeemDelegations` call
   - Submitting user operation through FastLane bundler
   - Transaction executes on Alice's behalf

---

## 🛠️ Technical Stack

- **@metamask/delegation-toolkit** v0.13.0 - Smart accounts & delegation
- **viem** v2.21.0 - Ethereum library
- **FastLane Bundler** - ERC-4337 bundler for Monad
- **Monad Testnet** - Chain ID 10143

---

## 📝 Key Concepts

### Smart Account Types

This MVP uses **Hybrid** smart accounts:
- Supports EOA owner + optional passkey signers
- Most flexible implementation
- `deployParams: [owner.address, [], [], []]`

### Delegation Scope

**erc20TransferAmount**:
- Allows delegate to transfer ERC-20 tokens
- Max amount enforced by caveat enforcer
- Simplest scope for MVP demonstration

### File Organization Pattern

**"Stack Pattern"**:
```
signer.ts (accounts.ts)  →  Creates EOA accounts
client.ts                →  Creates PublicClient
bundler.ts               →  Creates BundlerClient
example.ts (index.ts)    →  Orchestrates logic
```

---

## ⚠️ Important Notes

1. **Alice Must Be Deployed**: The delegator smart account MUST be deployed before creating a delegation
2. **Gas Fees**: Ensure Alice's EOA has enough MON for gas
3. **Test Token**: Replace `TEST_TOKEN_ADDRESS` with an actual token on Monad for real testing
4. **Bundler**: Uses FastLane bundler specifically for Monad Testnet

---

## 🐛 Troubleshooting

### Error: "Chain not supported"
- Ensure using `@metamask/delegation-toolkit` v0.12.0+
- Monad chain ID should be 10143

### Error: "Delegator not deployed"
- Alice's smart account must be deployed before creating delegation
- Check Step 2 in the output

### Error: "Insufficient funds"
- Alice's EOA needs MON for gas
- Get testnet MON from faucet

### Error: "User operation reverted"
- Check gas fees (may need adjustment)
- Verify token address is correct
- Ensure token exists and has proper permissions

---

## 🎓 Learning Resources

- [MetaMask Smart Accounts Docs](https://docs.metamask.io/wallet/concepts/smart-accounts/)
- [Monad Documentation](https://docs.monad.xyz/)
- [ERC-4337 Specification](https://eips.ethereum.org/EIPS/eip-4337)
- [Viem Documentation](https://viem.sh/)

---

## 📄 License

MIT

---

## 🏆 Hackathon Submission

**MetaMask Smart Accounts x Monad Dev Cook-Off**
September 19 - October 20, 2025

This MVP demonstrates:
- ✅ Smart account creation and deployment
- ✅ Delegation lifecycle (create, sign, redeem)
- ✅ ERC-4337 user operations
- ✅ Integration with Monad Testnet
- ✅ Clean, modular code architecture

---

*Built with ❤️ for the Monad Dev Cook-Off*
