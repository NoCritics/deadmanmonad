/**
 * Digital Inheritance Vault - Main Entry Point
 *
 * A "Dead Man's Switch" implementation using MetaMask Smart Accounts on Monad
 *
 * Features:
 * - Owner creates vault (smart account) with check-in period
 * - Add beneficiaries with specific allocations
 * - Owner must check in periodically or beneficiaries can claim
 * - Time-locked delegations with multiple caveats
 * - Off-chain storage for delegations (localStorage)
 *
 * @module vault
 */

// Core vault operations
export { createVault, loadVault } from "./core/create-vault";
export { setupBeneficiaries, addBeneficiary } from "./core/setup-beneficiaries";
export {
  checkIn,
  simpleCheckIn,
  getTimeUntilCheckIn,
  canCheckIn,
} from "./core/check-in";
export {
  claimInheritance,
  simpleClaim,
  canClaim,
  getClaimStatus,
} from "./core/claim";
export {
  getVaultStatus,
  printVaultSummary,
  getBeneficiaryView,
  getOwnerDashboard,
  checkVaultHealth,
} from "./core/status";

// Storage utilities
export {
  saveVaultData,
  loadVaultData,
  listAllVaults,
  deleteVaultData,
  getBeneficiaryDelegation,
  updateDelegationStatus,
  getActiveDelegations,
  isStorageAvailable,
  exportVaultData,
  importVaultData,
} from "./utils/delegation-storage";

// Time helpers
export {
  calculateTimeRemaining,
  formatDuration,
  getDeadlineFromPeriod,
  formatPeriod,
  getCurrentTimestamp,
  formatTimestamp,
  isDeadlinePassed,
  getTimeElapsedPercentage,
  PeriodUnit,
} from "./utils/time-helpers";

// Validation utilities
export {
  validateAddress,
  validateBeneficiaryAllocations,
  validateCheckInPeriod,
  validateVaultBalance,
  validateBeneficiaryName,
  validateNoDuplicates,
  validateVaultSetup,
} from "./utils/validation";

// Type exports
export type {
  VaultConfig,
  Beneficiary,
  CheckInRecord,
  VaultState,
  CreateVaultParams,
  SetupBeneficiariesParams,
  CheckInParams,
  ClaimParams,
  StoredDelegation,
  VaultStorage,
  TimeCalculation,
  ValidationResult,
} from "./types/index";

export { VaultStatus } from "./types/index";
