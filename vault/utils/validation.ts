import { Address, isAddress } from "viem";
import { Beneficiary, ValidationResult } from "../types/index";
import { PeriodUnit } from "./time-helpers";

/**
 * Validate beneficiary address
 */
export function validateAddress(address: string): ValidationResult {
  if (!isAddress(address)) {
    return {
      isValid: false,
      error: `Invalid Ethereum address: ${address}`,
    };
  }

  return { isValid: true };
}

/**
 * Validate beneficiary allocations
 * Ensures total doesn't exceed vault balance and each is reasonable
 */
export function validateBeneficiaryAllocations(
  beneficiaries: Beneficiary[],
  vaultBalance: bigint
): ValidationResult {
  if (beneficiaries.length === 0) {
    return {
      isValid: false,
      error: "At least one beneficiary is required",
    };
  }

  if (beneficiaries.length > 10) {
    return {
      isValid: false,
      error: "Maximum 10 beneficiaries allowed",
      warnings: ["Large number of beneficiaries will increase gas costs significantly"],
    };
  }

  // Calculate total allocation
  const totalAllocation = beneficiaries.reduce(
    (sum, b) => sum + b.allocation,
    0n
  );

  if (totalAllocation > vaultBalance) {
    return {
      isValid: false,
      error: `Total allocation (${totalAllocation}) exceeds vault balance (${vaultBalance})`,
    };
  }

  // Check each allocation is positive
  for (const beneficiary of beneficiaries) {
    if (beneficiary.allocation <= 0n) {
      return {
        isValid: false,
        error: `Beneficiary ${beneficiary.name} has zero or negative allocation`,
      };
    }
  }

  // Warnings
  const warnings: string[] = [];

  if (totalAllocation < vaultBalance) {
    const unallocated = vaultBalance - totalAllocation;
    warnings.push(
      `${unallocated} wei unallocated. Remaining funds will stay in vault.`
    );
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate check-in period
 * Ensures period is reasonable (5 minutes to 1 year)
 */
export function validateCheckInPeriod(
  period: number,
  unit: PeriodUnit
): ValidationResult {
  const warnings: string[] = [];

  // Convert to minutes for comparison
  let totalMinutes = 0;
  switch (unit) {
    case PeriodUnit.MINUTES:
      totalMinutes = period;
      break;
    case PeriodUnit.HOURS:
      totalMinutes = period * 60;
      break;
    case PeriodUnit.DAYS:
      totalMinutes = period * 24 * 60;
      break;
    case PeriodUnit.WEEKS:
      totalMinutes = period * 7 * 24 * 60;
      break;
    case PeriodUnit.MONTHS:
      totalMinutes = period * 30 * 24 * 60;
      break;
  }

  // Minimum: 5 minutes (for testing)
  if (totalMinutes < 5) {
    return {
      isValid: false,
      error: "Check-in period must be at least 5 minutes",
    };
  }

  // Maximum: 1 year
  if (totalMinutes > 365 * 24 * 60) {
    return {
      isValid: false,
      error: "Check-in period cannot exceed 1 year",
    };
  }

  // Warnings for very short or very long periods
  if (totalMinutes < 60) {
    warnings.push("Very short check-in period - suitable for testing only");
  }

  if (totalMinutes > 180 * 24 * 60) {
    // 6 months
    warnings.push("Long check-in period - consider a shorter interval");
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate vault balance is sufficient
 */
export function validateVaultBalance(balance: bigint): ValidationResult {
  const MIN_BALANCE = 1000000000000000n; // 0.001 MON

  if (balance < MIN_BALANCE) {
    return {
      isValid: false,
      error: `Vault balance too low. Minimum: ${MIN_BALANCE} wei (0.001 MON)`,
    };
  }

  return { isValid: true };
}

/**
 * Validate beneficiary name
 */
export function validateBeneficiaryName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return {
      isValid: false,
      error: "Beneficiary name cannot be empty",
    };
  }

  if (name.length > 50) {
    return {
      isValid: false,
      error: "Beneficiary name too long (max 50 characters)",
    };
  }

  return { isValid: true };
}

/**
 * Validate duplicate beneficiaries
 */
export function validateNoDuplicates(addresses: Address[]): ValidationResult {
  const seen = new Set<string>();

  for (const address of addresses) {
    const normalized = address.toLowerCase();
    if (seen.has(normalized)) {
      return {
        isValid: false,
        error: `Duplicate beneficiary address: ${address}`,
      };
    }
    seen.add(normalized);
  }

  return { isValid: true };
}

/**
 * Validate complete vault setup
 */
export function validateVaultSetup(
  ownerAddress: Address,
  beneficiaries: Beneficiary[],
  vaultBalance: bigint,
  period: number,
  unit: PeriodUnit
): ValidationResult {
  // Validate owner address
  const ownerValidation = validateAddress(ownerAddress);
  if (!ownerValidation.isValid) return ownerValidation;

  // Validate period
  const periodValidation = validateCheckInPeriod(period, unit);
  if (!periodValidation.isValid) return periodValidation;

  // Validate vault balance
  const balanceValidation = validateVaultBalance(vaultBalance);
  if (!balanceValidation.isValid) return balanceValidation;

  // Validate beneficiaries
  const beneficiaryValidation = validateBeneficiaryAllocations(
    beneficiaries,
    vaultBalance
  );
  if (!beneficiaryValidation.isValid) return beneficiaryValidation;

  // Validate no duplicate addresses
  const duplicateValidation = validateNoDuplicates(
    beneficiaries.map((b) => b.address)
  );
  if (!duplicateValidation.isValid) return duplicateValidation;

  // Collect all warnings
  const warnings = [
    ...(periodValidation.warnings || []),
    ...(beneficiaryValidation.warnings || []),
  ];

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
