# Digital Inheritance Vault

A "Dead Man's Switch" implementation using MetaMask Smart Accounts on Monad Testnet.

Built for the **MetaMask Smart Accounts x Monad Dev Cook-Off** hackathon.

## Overview

Digital Inheritance Vault allows you to create time-locked vaults that automatically transfer assets to designated beneficiaries if you fail to check in periodically. Think of it as a blockchain-based "dead man's switch" for your digital assets.

## Features

- **Smart Account Vaults**: Deploy MetaMask smart accounts as inheritance vaults
- **Multi-Beneficiary Support**: Distribute assets across multiple beneficiaries with percentage-based allocations
- **Periodic Check-ins**: Owner must check in regularly to prove they're active
- **Time-Locked Delegations**: Beneficiaries can only claim after deadline passes
- **Native MON Support**: Transfer Monad testnet's native token (MON)
- **Automatic Inheritance**: Delegations automatically enable beneficiary claims after deadline

## Tech Stack

- **Smart Accounts**: MetaMask Delegation Toolkit (Hybrid Implementation)
- **Blockchain**: Monad Testnet
- **Frontend**: Next.js 14, React, TailwindCSS
- **Backend**: Next.js API Routes
- **Libraries**: viem, TypeScript

## Project Structure

```
monad_hail_m/
├── vault/              # Core vault logic (smart account, delegations, storage)
├── mvp/                # Original proof-of-concept
├── ui/                 # Next.js frontend application
└── .vault-storage/     # Server-side vault data (gitignored)
```

## Getting Started

### Prerequisites

- Node.js 18+
- A Monad testnet RPC endpoint
- Private key with MON tokens for testing

### Installation

1. Clone the repository:
```bash
git clone https://github.com/NoCritics/deadmanmonad.git
cd deadmanmonad
```

2. Install dependencies:
```bash
cd ui
npm install
```

3. Create `.env` file in the `ui` directory:
```env
NEXT_PUBLIC_RPC_URL=https://monad-testnet-rpc-url
PRIVATE_KEY=0x... # For backend operations only
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Usage

### Creating a Vault (Owner)

1. Go to "Create Vault" tab
2. Connect your wallet (enter private key for demo)
3. Configure:
   - Check-in period (e.g., 5 minutes, 30 days)
   - Initial funding amount (MON)
   - Beneficiaries with addresses, names, and percentages
4. Click "Create Vault"
5. Save the vault address!

### Managing Your Vault (Owner)

1. Go to "Owner Dashboard" tab
2. Enter your vault address
3. Click "Load Vault"
4. Click "Check In Now" before deadline expires to reset timer

### Claiming Inheritance (Beneficiary)

1. Go to "Beneficiary" tab
2. Connect with your beneficiary private key
3. Enter the vault address
4. Click "Check Allocation"
5. Wait for deadline to pass
6. Click "Claim Inheritance" to redeem your allocation

## How It Works

### Delegation-Based Inheritance

1. **Vault Creation**: Owner deploys a MetaMask smart account that holds assets
2. **Delegation Setup**: For each beneficiary, a delegation is created with:
   - Timestamp caveat (only valid after deadline)
   - Limited calls caveat (single redemption)
   - Transfer amount caveat (exact allocation)
3. **Check-Ins**: Owner can check in to:
   - Disable old delegations
   - Create new delegations with extended deadline
   - Prove they're still active
4. **Claiming**: After deadline passes, beneficiaries redeem their delegations to transfer funds

### Smart Account Architecture

```
Owner's EOA
    |
    v
Vault (Smart Account)
    |
    +-- Holds MON tokens
    |
    +-- Delegations to Beneficiaries
        |
        +-- Beneficiary A (40%)
        +-- Beneficiary B (30%)
        +-- Beneficiary C (30%)
```

## Monad Integration

This project leverages Monad's high-performance testnet:
- **Gas Price**: 100 gwei minimum (Monad requirement)
- **Chain ID**: 10143
- **Speed**: Fast finality for quick testing

## ⚠️ Security Notes

**🚨 CRITICAL: This is a hackathon demo - NOT production ready! 🚨**

### Private Key Storage

**User Private Keys (Frontend):**
- Stored **unencrypted** in browser localStorage when you connect
- Persists across sessions (auto-reconnects on page reload)
- ❌ Vulnerable to XSS attacks
- ❌ Anyone with access to your browser can read them
- ❌ NOT suitable for mainnet or real funds

**Developer Private Keys (Backend):**
- Stored in `.env` file (gitignored)
- Only for backend operations in development
- Must use testnet keys with no real value

### Other Security Issues

- No encryption on vault storage files
- Server-side storage is file-based (use database for production)
- Single-signature security (no multisig)
- No rate limiting or abuse protection
- No input sanitization beyond basic validation

### Safe Usage

✅ **DO:**
- Use testnet private keys only
- Use keys with no real value
- Test on Monad testnet
- Clear browser data after use

❌ **DON'T:**
- Enter mainnet private keys
- Use keys that hold real funds
- Use on production networks
- Share your keys with anyone

## Development Roadmap

- [ ] MetaMask wallet integration (in progress locally)
- [ ] Multi-token support (ERC-20s)
- [ ] Emergency withdrawal mechanisms
- [ ] Database storage instead of filesystem
- [ ] Encrypted storage
- [ ] Multi-signature support
- [ ] Email/SMS check-in reminders
- [ ] Mainnet deployment

## License

MIT

## Hackathon Submission

Built for MetaMask Smart Accounts x Monad Dev Cook-Off

- Demonstrates ERC-7710 delegation caveats
- Hybrid smart account implementation
- Time-locked inheritance with automatic execution
- Production-quality UI/UX
