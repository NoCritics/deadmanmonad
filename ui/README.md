# 🎨 Vault UI

Simple Next.js interface for the Digital Inheritance Vault system.

## Quick Start

```bash
# Install dependencies
cd ui
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Features

### 🏗️ Create Vault Tab
- Configure check-in period (5 min to 12 months)
- Set initial funding amount
- Add multiple beneficiaries with custom allocations
- Validates total allocation = 100%
- Shows allocation breakdown

### 👤 Owner Dashboard Tab
- Load existing vault by address
- View vault status and balance
- Real-time countdown timer until deadline
- Check-in button to reset timer
- View beneficiaries and their claim status
- Check-in history

### 💰 Beneficiary View Tab
- Check allocation by vault + beneficiary address
- View allocation amount and percentage
- Real-time countdown until claim becomes available
- Claim button (enabled after deadline)
- Vault information

## Components

- `CreateVaultForm.tsx` - Vault creation interface
- `OwnerDashboard.tsx` - Owner management interface
- `BeneficiaryView.tsx` - Beneficiary claim interface
- `CountdownTimer.tsx` - Reusable countdown component

## Integration Status

**Current**: UI with mock data for demonstration

**TODO**: Connect to vault backend
- Import vault functions from `../vault`
- Connect to MetaMask wallet
- Integrate with Monad testnet
- Handle real transactions

## Tech Stack

- Next.js 14 (App Router)
- React 18
- TypeScript
- TailwindCSS
- Viem + Wagmi (wallet connection)
- @metamask/delegation-toolkit

## Notes

This is a **demo UI** showing the vault functionality. Backend integration with the actual smart contract vault system (in `/vault`) is in progress.

The UI demonstrates:
- ✅ Vault creation flow
- ✅ Owner check-in mechanism
- ✅ Beneficiary claim process
- ✅ Countdown timers
- ✅ Status displays

Backend integration needed for:
- 🔨 Actual vault deployment
- 🔨 Real delegation creation
- 🔨 On-chain check-ins
- 🔨 Actual claims
- 🔨 Wallet connection
