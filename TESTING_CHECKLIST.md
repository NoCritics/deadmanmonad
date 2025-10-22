# 🧪 MVP Testing Checklist

## Pre-Flight Checks

### Environment Setup
- [ ] `.env` file exists in project root
- [ ] `DEPLOYER_PRIVATE_KEY` is set in `.env`
- [ ] Private key has MON tokens for gas (check balance on Monad explorer)
- [ ] `RPC_URL` is accessible (test with curl or browser)

### Dependencies
- [ ] Run `npm install` completed successfully
- [ ] No vulnerability warnings
- [ ] TypeScript compiles without errors

### Network Verification
- [ ] Monad Testnet RPC responding
- [ ] FastLane bundler endpoint accessible
- [ ] Block explorer available for verification

---

## Running the MVP

### Step 1: Initial Run
```bash
npm run mvp
```

### Step 2: Monitor Output

#### Expected Phase 1 Output
```
🔑 Accounts loaded:
   Alice (Delegator EOA): 0x...
   Bob (Delegate EOA): 0x...

📦 PHASE 1: Creating Smart Accounts

[1/7] Creating Alice's Smart Account (Delegator)...
✅ Alice's Smart Account Created
   Address: 0x...
```

**Checklist**:
- [ ] Alice's EOA address shown
- [ ] Bob's EOA address shown
- [ ] Alice's Smart Account address shown
- [ ] Environment chain ID matches Monad (10143)

#### Expected Phase 1 Deployment
```
[2/7] Deploying Alice's Smart Account...
🚀 Deploying smart account...
   User Op Hash: 0x...
   Waiting for receipt...
✅ Smart Account Deployed!
   Transaction Hash: 0x...
   Block Number: ...
```

**Checklist**:
- [ ] User operation hash received
- [ ] Transaction hash received
- [ ] Block number shown
- [ ] No error messages

#### Expected Bob's Account Creation
```
[3/7] Creating Bob's Smart Account (Delegate)...
✅ Bob's Smart Account Created
   Address: 0x...
```

**Checklist**:
- [ ] Bob's Smart Account address shown
- [ ] Different from Alice's address

#### Expected Phase 2 Output
```
🔐 PHASE 2: Delegation Lifecycle

[4/7] Creating Delegation (Alice → Bob)...
✅ Delegation Created
   Caveats: 2

[5/7] Signing Delegation (Alice signs)...
✅ Delegation Signed
   Signature length: 132
```

**Checklist**:
- [ ] Delegation created without errors
- [ ] Caveats count shown (should be >= 1)
- [ ] Signature generated
- [ ] Signature length reasonable (>100 chars)

#### Expected Redemption Output
```
[6/7] Redeeming Delegation (Bob transfers 1 token)...
🔓 Redeeming Delegation...
   Delegate (Bob): 0x...
   Transferring: 1 tokens
   To: 0x...
   ✓ Transfer encoded
   ✓ Execution created
   ✓ Redemption calldata encoded
   📤 Submitting user operation...
   User Op Hash: 0x...
   Waiting for receipt...
✅ Delegation Redeemed!
   Transaction Hash: 0x...
   Block Number: ...
```

**Checklist**:
- [ ] Transfer encoded successfully
- [ ] Execution created
- [ ] Calldata encoded
- [ ] User operation submitted
- [ ] Receipt received
- [ ] Transaction hash shown

#### Expected Success Output
```
🎉 PHASE 3: Complete!

✅ MVP SUCCESSFULLY COMPLETED!

📊 Summary:
   Alice's Smart Account: 0x...
   Bob's Smart Account: 0x...
   Delegation Scope: ERC-20 Transfer (max 10 tokens)
   Redeemed: Bob transferred 1 token from Alice
```

**Checklist**:
- [ ] Success message displayed
- [ ] All addresses shown
- [ ] Summary accurate

---

## Verification

### On-Chain Verification

#### Step 1: Check Alice's Smart Account Deployment
- [ ] Copy Alice's Smart Account address
- [ ] Visit Monad block explorer
- [ ] Verify contract exists at that address
- [ ] Check deployment transaction

#### Step 2: Check Bob's Delegation Redemption
- [ ] Copy redemption transaction hash
- [ ] Verify transaction on block explorer
- [ ] Check transaction succeeded
- [ ] Verify gas was paid

### Optional: Token Balance Verification
*If using a real test token:*
- [ ] Check Alice's token balance decreased
- [ ] Check Bob's token balance increased
- [ ] Verify transfer amount matches (1 token)

---

## Error Scenarios & Solutions

### Error: "Chain not supported"
**Cause**: MetaMask toolkit doesn't recognize Monad
**Solution**:
- Verify toolkit version is v0.12.0+
- Check chain ID is 10143
- Review `mvp/config/chain.ts`

### Error: "Insufficient funds for gas"
**Cause**: Alice's EOA lacks MON
**Solution**:
- Get MON from Monad faucet
- Verify balance with: `cast balance <address> --rpc-url <RPC>`

### Error: "Delegator not deployed"
**Cause**: Trying to create delegation before deploying
**Solution**:
- Ensure Step 2 (deployment) succeeds before Step 4
- Check Alice's smart account is on-chain

### Error: "User operation reverted"
**Cause**: Various reasons (gas, token, permissions)
**Solution**:
- Check bundler logs
- Verify gas fees adequate
- Ensure token address is valid
- Try with different gas values

### Error: "Cannot find module"
**Cause**: Dependencies not installed or import paths wrong
**Solution**:
- Run `npm install` again
- Check all imports use `.js` extension
- Verify `type: "module"` in package.json

---

## Performance Expectations

### Execution Times (Approximate)
- Account creation: < 1 second
- Deployment: 5-15 seconds (network dependent)
- Delegation creation: < 1 second
- Delegation signing: < 1 second
- Delegation redemption: 5-15 seconds
- **Total runtime**: ~30-60 seconds

### Network Requests
- Alice deployment: 1 user operation
- Bob redemption: 1 user operation
- **Total: 2 user operations**

---

## Success Indicators

### All Green Checkmarks
```
✅ Alice's Smart Account Created
✅ Smart Account Deployed!
✅ Bob's Smart Account Created
✅ Delegation Created
✅ Delegation Signed
✅ Delegation Redeemed!
✅ MVP SUCCESSFULLY COMPLETED!
```

### Transaction Hashes
- [ ] Alice deployment tx hash received
- [ ] Bob redemption tx hash received
- [ ] Both transactions successful on-chain

### No Red Errors
- [ ] No `❌` error symbols in output
- [ ] No uncaught exceptions
- [ ] Process exits with code 0

---

## Debugging Tips

### Enable Verbose Logging
Add to `.env`:
```bash
DEBUG=true
VERBOSE=true
```

### Check Bundler Status
```bash
curl https://monad-testnet.4337-shbundler-fra.fastlane-labs.xyz
```

### Check RPC Connection
```bash
curl -X POST https://testnet-rpc.monad.xyz \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### Verify Account Balance
```bash
# Using cast (Foundry)
cast balance <ALICE_EOA_ADDRESS> --rpc-url https://testnet-rpc.monad.xyz
```

---

## Post-Testing

### Documentation
- [ ] Screenshot successful run
- [ ] Save transaction hashes
- [ ] Note any issues encountered
- [ ] Record gas costs

### Next Steps
- [ ] Test with different token amounts
- [ ] Try native token delegation
- [ ] Experiment with other scopes
- [ ] Build UI on top

---

## Quick Test Script

Create `test.sh` (optional):
```bash
#!/bin/bash

echo "🧪 Testing MetaMask Smart Account MVP"
echo ""

# Check .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found"
    exit 1
fi

# Check private key set
if ! grep -q "DEPLOYER_PRIVATE_KEY" .env; then
    echo "❌ DEPLOYER_PRIVATE_KEY not set in .env"
    exit 1
fi

# Check dependencies
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run MVP
echo "🚀 Running MVP..."
npm run mvp

echo ""
echo "✅ Test complete!"
```

---

## Final Checklist

Before considering MVP complete:

- [ ] All 7 steps execute successfully
- [ ] No error messages in output
- [ ] Transaction hashes verifiable on-chain
- [ ] Smart accounts deployed correctly
- [ ] Delegation created and signed
- [ ] Delegation redeemed successfully
- [ ] Summary shows correct addresses
- [ ] Code is clean and well-documented
- [ ] README is comprehensive
- [ ] Ready for hackathon submission

---

*Testing checklist for MetaMask Smart Accounts x Monad Dev Cook-Off MVP* ✅
