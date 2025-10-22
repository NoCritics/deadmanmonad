import { Chain } from "viem";

/**
 * Monad Testnet Chain Configuration
 * Chain ID: 10143
 */
export const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: {
    name: 'Monad',
    symbol: 'MON',
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: [
        process.env.RPC_URL || 'https://testnet-rpc.monad.xyz'
      ]
    },
    public: {
      http: [
        'https://testnet-rpc.monad.xyz',
        'https://monad-testnet.drpc.org',
        'https://rpc.ankr.com/monad_testnet'
      ]
    }
  },
} as const satisfies Chain;
