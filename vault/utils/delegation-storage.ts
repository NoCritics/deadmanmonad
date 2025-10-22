import { Address } from "viem";
import { VaultStorage, StoredDelegation } from "../types/index";
import * as fs from "fs";
import * as path from "path";

const STORAGE_PREFIX = "monad_vault_";

// Check if we're in browser environment
const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

// Server-side storage directory
const VAULT_STORAGE_DIR = path.join(process.cwd(), '.vault-storage');

/**
 * Ensure server-side storage directory exists
 */
function ensureStorageDir(): void {
  if (!isBrowser && !fs.existsSync(VAULT_STORAGE_DIR)) {
    fs.mkdirSync(VAULT_STORAGE_DIR, { recursive: true });
    console.log(`📁 Created vault storage directory: ${VAULT_STORAGE_DIR}`);
  }
}

/**
 * Get file path for vault storage (server-side)
 */
function getVaultFilePath(vaultAddress: Address): string {
  return path.join(VAULT_STORAGE_DIR, `${vaultAddress.toLowerCase()}.json`);
}

/**
 * Save complete vault data to localStorage (browser) or filesystem (server)
 */
export function saveVaultData(vaultAddress: Address, data: VaultStorage): void {
  const serialized = JSON.stringify(data, (key, value) => {
    // Convert BigInt to string for JSON serialization
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  }, 2); // Pretty print with 2 spaces

  if (isBrowser) {
    // Browser: use localStorage
    const key = `${STORAGE_PREFIX}${vaultAddress.toLowerCase()}`;
    try {
      localStorage.setItem(key, serialized);
      console.log(`💾 Vault data saved to localStorage for ${vaultAddress}`);
    } catch (error) {
      console.error("❌ Failed to save vault data to localStorage:", error);
      throw new Error(`Failed to save vault data: ${error}`);
    }
  } else {
    // Server: use filesystem
    try {
      ensureStorageDir();
      const filePath = getVaultFilePath(vaultAddress);
      fs.writeFileSync(filePath, serialized, 'utf8');
      console.log(`💾 Vault data saved to filesystem for ${vaultAddress}`);
    } catch (error) {
      console.error("❌ Failed to save vault data to filesystem:", error);
      throw new Error(`Failed to save vault data: ${error}`);
    }
  }
}

/**
 * Load vault data from localStorage (browser) or filesystem (server)
 */
export function loadVaultData(vaultAddress: Address): VaultStorage | null {
  let data: string | null = null;

  if (isBrowser) {
    // Browser: use localStorage
    const key = `${STORAGE_PREFIX}${vaultAddress.toLowerCase()}`;
    try {
      data = localStorage.getItem(key);
      if (!data) {
        console.log(`ℹ️  No vault data found in localStorage for ${vaultAddress}`);
        return null;
      }
    } catch (error) {
      console.error("❌ Failed to load vault data from localStorage:", error);
      return null;
    }
  } else {
    // Server: use filesystem
    try {
      const filePath = getVaultFilePath(vaultAddress);
      if (!fs.existsSync(filePath)) {
        console.log(`ℹ️  No vault data found in filesystem for ${vaultAddress}`);
        return null;
      }
      data = fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      console.error("❌ Failed to load vault data from filesystem:", error);
      return null;
    }
  }

  try {
    const parsed = JSON.parse(data, (key, value) => {
      // Convert string numbers back to BigInt for specific fields
      if (
        key === 'allocation' ||
        key === 'totalValue' ||
        key === 'gasUsed' ||
        key === 'maxAmount'
      ) {
        return BigInt(value);
      }
      return value;
    });

    console.log(`✅ Vault data loaded for ${vaultAddress}`);
    return parsed as VaultStorage;
  } catch (error) {
    console.error("❌ Failed to parse vault data:", error);
    return null;
  }
}

/**
 * List all vault addresses stored locally (browser) or in filesystem (server)
 */
export function listAllVaults(): Address[] {
  const vaults: Address[] = [];

  try {
    if (isBrowser) {
      // Browser: scan localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_PREFIX)) {
          const address = key.replace(STORAGE_PREFIX, '') as Address;
          vaults.push(address);
        }
      }
    } else {
      // Server: scan filesystem directory
      if (fs.existsSync(VAULT_STORAGE_DIR)) {
        const files = fs.readdirSync(VAULT_STORAGE_DIR);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const address = file.replace('.json', '') as Address;
            vaults.push(address);
          }
        }
      }
    }

    console.log(`📋 Found ${vaults.length} vault(s) in storage`);
    return vaults;
  } catch (error) {
    console.error("❌ Failed to list vaults:", error);
    return [];
  }
}

/**
 * Delete vault data from localStorage (browser) or filesystem (server)
 */
export function deleteVaultData(vaultAddress: Address): boolean {
  try {
    if (isBrowser) {
      // Browser: remove from localStorage
      const key = `${STORAGE_PREFIX}${vaultAddress.toLowerCase()}`;
      localStorage.removeItem(key);
    } else {
      // Server: delete file
      const filePath = getVaultFilePath(vaultAddress);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    console.log(`🗑️  Vault data deleted for ${vaultAddress}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to delete vault data:", error);
    return false;
  }
}

/**
 * Get specific beneficiary's delegation from storage
 */
export function getBeneficiaryDelegation(
  vaultAddress: Address,
  beneficiaryAddress: Address
): StoredDelegation | null {
  const vaultData = loadVaultData(vaultAddress);
  if (!vaultData) return null;

  const delegation = vaultData.delegations.find(
    (d) => d.beneficiaryAddress.toLowerCase() === beneficiaryAddress.toLowerCase()
  );

  return delegation || null;
}

/**
 * Update specific delegation's disabled status
 */
export function updateDelegationStatus(
  vaultAddress: Address,
  delegationHash: string,
  isDisabled: boolean
): boolean {
  const vaultData = loadVaultData(vaultAddress);
  if (!vaultData) return false;

  const delegation = vaultData.delegations.find(
    (d) => d.hash.toLowerCase() === delegationHash.toLowerCase()
  );

  if (!delegation) {
    console.error(`❌ Delegation ${delegationHash} not found`);
    return false;
  }

  delegation.isDisabled = isDisabled;
  vaultData.lastUpdated = Math.floor(Date.now() / 1000);

  saveVaultData(vaultAddress, vaultData);
  return true;
}

/**
 * Get active (non-disabled) delegations for a vault
 */
export function getActiveDelegations(vaultAddress: Address): StoredDelegation[] {
  const vaultData = loadVaultData(vaultAddress);
  if (!vaultData) return [];

  return vaultData.delegations.filter((d) => !d.isDisabled);
}

/**
 * Check if localStorage is available (for browser environments)
 */
export function isStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (error) {
    console.warn("⚠️  localStorage not available");
    return false;
  }
}

/**
 * Export vault data as JSON (for backup/sharing)
 */
export function exportVaultData(vaultAddress: Address): string | null {
  const vaultData = loadVaultData(vaultAddress);
  if (!vaultData) return null;

  return JSON.stringify(vaultData, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value,
    2 // Pretty print with 2 spaces
  );
}

/**
 * Import vault data from JSON string
 */
export function importVaultData(jsonData: string): Address | null {
  try {
    const parsed = JSON.parse(jsonData, (key, value) => {
      if (
        key === 'allocation' ||
        key === 'totalValue' ||
        key === 'gasUsed' ||
        key === 'maxAmount'
      ) {
        return BigInt(value);
      }
      return value;
    }) as VaultStorage;

    if (!parsed.config?.vaultAddress) {
      throw new Error("Invalid vault data: missing vaultAddress");
    }

    saveVaultData(parsed.config.vaultAddress, parsed);
    return parsed.config.vaultAddress;
  } catch (error) {
    console.error("❌ Failed to import vault data:", error);
    return null;
  }
}
