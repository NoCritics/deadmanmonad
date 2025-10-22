import { Address, Hex } from "viem";
import { Delegation } from "@metamask/delegation-toolkit";
import type { SmartAccount } from "viem/account-abstraction";
import { PeriodUnit } from "../utils/time-helpers";

/**
 * Vault Configuration
 * Represents the core vault settings and state
 */
export interface VaultConfig {
  /** Smart account address (the vault) */
  vaultAddress: Address;

  /** Owner's EOA address */
  ownerAddress: Address;

  /** Check-in period value */
  checkInPeriod: number;

  /** Check-in period unit (minutes, hours, days, weeks, months) */
  checkInPeriodUnit: PeriodUnit;

  /** Last check-in timestamp (Unix seconds) */
  lastCheckIn: number;

  /** Next deadline when delegations become active (Unix seconds) */
  nextDeadline: number;

  /** Total value in vault (MON in wei) */
  totalValue: bigint;

  /** Token addresses held in vault */
  tokens: Address[];

  /** Vault creation timestamp */
  createdAt: number;
}

/**
 * Beneficiary Information
 * Represents a single beneficiary and their allocation
 */
export interface Beneficiary {
  /** Beneficiary's address (EOA or smart account) */
  address: Address;

  /** Display name */
  name: string;

  /** Amount they can claim (in wei) */
  allocation: bigint;

  /** Percentage of vault (0-100, for display) */
  percentage: number;

  /** Token address (0x0 for native MON) */
  tokenAddress: Address;

  /** Signed delegation object */
  delegation?: Delegation;

  /** Delegation hash (for checking disabled status) */
  delegationHash?: Hex;

  /** Whether beneficiary has claimed */
  hasClaimed: boolean;

  /** Claim transaction hash (if claimed) */
  claimTxHash?: Hex;

  /** Claim timestamp (if claimed) */
  claimTimestamp?: number;
}

/**
 * Check-In Record
 * Tracks each time the owner checks in
 */
export interface CheckInRecord {
  /** Check-in timestamp (Unix seconds) */
  timestamp: number;

  /** Transaction hash */
  txHash: Hex;

  /** New deadline after this check-in */
  newDeadline: number;

  /** Number of delegations disabled */
  disabledDelegationCount: number;

  /** Number of new delegations created */
  createdDelegationCount: number;

  /** Gas used */
  gasUsed: bigint;
}

/**
 * Vault State
 * Complete vault state including config and beneficiaries
 */
export interface VaultState {
  /** Vault configuration */
  config: VaultConfig;

  /** List of beneficiaries */
  beneficiaries: Beneficiary[];

  /** Check-in history */
  checkIns: CheckInRecord[];

  /** Current status */
  status: VaultStatus;

  /** Time remaining until deadline (seconds) */
  timeRemaining: number;

  /** Whether owner can check in (any active delegations) */
  canCheckIn: boolean;
}

/**
 * Vault Status Enum
 */
export enum VaultStatus {
  /** Vault created but not yet setup */
  CREATED = "created",

  /** Vault active, owner checking in regularly */
  ACTIVE = "active",

  /** Deadline passed, beneficiaries can claim */
  CLAIMABLE = "claimable",

  /** All beneficiaries have claimed */
  EMPTY = "empty",

  /** Vault disabled by owner */
  DISABLED = "disabled",
}

/**
 * Vault Creation Parameters
 */
export interface CreateVaultParams {
  /** Owner's EOA */
  ownerAddress: Address;

  /** Check-in period value (default: 30) */
  checkInPeriod?: number;

  /** Check-in period unit (default: days) */
  checkInPeriodUnit?: PeriodUnit;

  /** Initial funding amount (MON in wei) */
  initialFunding?: bigint;

  /** Owner's private key (optional - uses process.env.PRIVATE_KEY if not provided) */
  ownerPrivateKey?: Hex;
}

/**
 * Beneficiary Setup Parameters
 */
export interface SetupBeneficiariesParams {
  /** Smart account vault */
  vault: SmartAccount & { environment: any };

  /** List of beneficiaries with allocations */
  beneficiaries: {
    address: Address;
    name: string;
    allocation: bigint;
    tokenAddress?: Address; // Omit or 0x0 for native MON
  }[];

  /** Deadline timestamp (Unix seconds) */
  deadline: number;
}

/**
 * Check-In Parameters
 */
export interface CheckInParams {
  /** Smart account vault */
  vault: SmartAccount & { environment: any };

  /** Current active delegations to disable */
  currentDelegations: (Delegation & { signature: Hex })[];

  /** List of beneficiaries (to create new delegations) */
  beneficiaries: Beneficiary[];

  /** New check-in period (days) - if changing */
  newCheckInPeriodDays?: number;

  /** Owner's private key for signing transactions */
  ownerPrivateKey: Hex;
}

/**
 * Claim Parameters
 */
export interface ClaimParams {
  /** Vault address */
  vaultAddress: Address;

  /** Beneficiary's wallet client */
  beneficiaryAccount: any;

  /** Signed delegation */
  signedDelegation: Delegation & { signature: Hex };

  /** Beneficiary info */
  beneficiary: Beneficiary;

  /** DelegationManager address */
  delegationManagerAddress: Address;
}

/**
 * Delegation Storage
 * Format for storing delegations off-chain
 */
export interface StoredDelegation {
  /** Beneficiary address */
  beneficiaryAddress: Address;

  /** Delegation object */
  delegation: Delegation;

  /** Signature */
  signature: Hex;

  /** Delegation hash */
  hash: Hex;

  /** Timestamp when created */
  createdAt: number;

  /** Deadline when becomes active */
  deadline: number;

  /** Whether disabled */
  isDisabled: boolean;
}

/**
 * Vault Storage Format
 * Complete vault data for persistence
 */
export interface VaultStorage {
  /** Vault configuration */
  config: VaultConfig;

  /** Beneficiaries */
  beneficiaries: Beneficiary[];

  /** Stored delegations */
  delegations: StoredDelegation[];

  /** Check-in history */
  checkIns: CheckInRecord[];

  /** Last updated */
  lastUpdated: number;
}

/**
 * Time Helper Result
 */
export interface TimeCalculation {
  /** Seconds until deadline */
  secondsRemaining: number;

  /** Human-readable time string */
  humanReadable: string;

  /** Whether deadline has passed */
  isPast: boolean;

  /** Deadline timestamp */
  deadline: number;
}

/**
 * Validation Result
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;

  /** Error message (if invalid) */
  error?: string;

  /** Warnings (non-blocking) */
  warnings?: string[];
}
