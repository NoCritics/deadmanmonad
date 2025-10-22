import { createPublicClient, http } from "viem";
import { monadTestnet } from "./chain.js";

/**
 * Public Client for Monad Testnet
 * Used to query blockchain state and interact with contracts
 */
export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});
