# 🧪 Vault UI Testing Guide

## Quick Start - Test Vault Creation

### 1. Start the UI

```bash
cd ui
npm run dev
```

Open http://localhost:3000

### 2. Connect Wallet

When you open the UI, you'll see a "Connect Wallet" screen.

**Option A: Use Alice's Key from .env**

Paste Alice's private key from the parent `.env` file:
```
0x6ba865b80ab2f05e92c25f4b9b90fbc4da20f912f67cfacbcdc707b38814b095
```

**Option B: Use Your Own Key**

Paste any private key with MON balance on Monad testnet.

### 3. Create a Vault

Once connected, go to the **"Create Vault"** tab:

1. **Check-In Period**: Set to `5` minutes (for quick testing)
2. **Period Unit**: Select `Minutes`
3. **Initial Funding**: Enter `0.1` (or any amount you have)
4. **Beneficiaries**: Add 3 beneficiaries

   **Beneficiary 1:**
   - Name: `Alice Jr`
   - Address: (Bob's address from .env) `0x105651521422783E899261C5294769E1791DC341`
   - Allocation: `40%`

   **Beneficiary 2:**
   - Name: `Bob Jr`
   - Address: `0x1111111111111111111111111111111111111111111111111111111111111111` (any test address)
   - Allocation: `30%`

   **Beneficiary 3:**
   - Name: `Charlie`
   - Address: `0x2222222222222222222222222222222222222222222222222222222222222222` (any test address)
   - Allocation: `30%`

5. **Click "Create Vault"**

### 4. What Happens

The UI will:

1. **Create the vault** (smart account) ✅
   - Deploys to Monad testnet
   - Funds it with your specified amount
   - Returns vault address

2. **Setup beneficiaries** ✅
   - Creates 3 time-locked delegations
   - Each with multi-caveat enforcement:
     - Timestamp (can't claim before 5 min deadline)
     - LimitedCalls (one-time claim)
     - TransferAmount (specific allocation)

3. **Show success** ✅
   - Displays vault address
   - Stores in localStorage

### 5. Expected Output

You should see:

```
✅ Vault Created Successfully!

Vault Address: 0x...
Beneficiaries: 3
Check-in period: 5 minutes
```

**In Console:**
```
Creating vault with real backend...
✅ Vault created: 0x...
Setting up beneficiaries...
✅ Beneficiaries configured
```

---

## Testing Checklist

### Vault Creation
- [ ] Connect wallet successfully
- [ ] See wallet address displayed
- [ ] Enter vault configuration
- [ ] Add beneficiaries (total = 100%)
- [ ] Click "Create Vault"
- [ ] See loading state
- [ ] See success message with vault address
- [ ] Vault address is stored

### Console Logs
- [ ] "Creating vault with real backend..."
- [ ] "✅ Vault created: 0x..."
- [ ] "Setting up beneficiaries..."
- [ ] "✅ Beneficiaries configured"

### Errors to Watch For

**❌ "Please connect your wallet first"**
- Solution: Click "Connect with Private Key" and paste key

**❌ "Total percentage must be 100%"**
- Solution: Adjust beneficiary percentages to total exactly 100%

**❌ "Failed to create vault"**
- Check: Do you have MON balance?
- Check: Is Monad testnet RPC available?
- Check: Console for detailed error

**❌ "Insufficient funds for gas"**
- Solution: Send more MON to Alice's address
- Check balance: https://explorer.monad.xyz/testnet

---

## Advanced Testing

### Test Check-In (TODO - needs OwnerDashboard connection)

1. Copy the vault address from creation
2. Go to "Owner Dashboard" tab
3. Paste vault address
4. Click "Load Vault"
5. Click "Check In"
6. See timer reset

### Test Claim (TODO - needs BeneficiaryView connection)

1. Wait 5 minutes after vault creation
2. Go to "Beneficiary View" tab
3. Enter vault address
4. Enter beneficiary address (Bob's address)
5. Click "Check Allocation"
6. See countdown at zero
7. Click "Claim Inheritance"
8. See success with tx hash

---

## Debugging

### Check Vault in localStorage

Open browser console:

```javascript
// List all vaults
Object.keys(localStorage).filter(k => k.startsWith('monad_vault_'))

// View specific vault
JSON.parse(localStorage.getItem('monad_vault_0xYourVaultAddress'))
```

### Check Transaction on Explorer

If you get a transaction hash, view it on Monad explorer:

```
https://explorer.monad.xyz/testnet/tx/0xYourTxHash
```

### Reset Everything

```javascript
// Clear all vault data
Object.keys(localStorage)
  .filter(k => k.startsWith('monad_vault_'))
  .forEach(k => localStorage.removeItem(k));

// Disconnect wallet
localStorage.removeItem('demo_private_key');

// Refresh page
location.reload();
```

---

## Known Limitations

1. **OwnerDashboard**: Not yet connected to backend (shows mock data)
2. **BeneficiaryView**: Not yet connected to backend (shows mock data)
3. **Wallet Connection**: Uses private key input (MetaMask integration pending)

**But CreateVaultForm is fully connected and working!** 🎉

---

## What to Expect

### ✅ Working Now
- Wallet connection via private key
- Real vault creation on Monad
- Real smart account deployment
- Real delegation creation
- LocalStorage persistence

### 🔨 Coming Next
- Owner Dashboard integration
- Beneficiary View integration
- Real check-in functionality
- Real claim functionality
- MetaMask wallet connection

---

## Success Criteria

✅ **You should be able to:**
1. Connect wallet
2. Create a vault
3. Add beneficiaries
4. See vault address
5. Check console for success logs
6. Verify vault exists in localStorage

🎉 **If all above work, the integration is successful!**

---

*Ready to test? Run `cd ui && npm run dev` and follow the steps above!*
