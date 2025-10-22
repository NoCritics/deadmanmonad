import { createBundlerClient } from "viem/account-abstraction";
import { publicClient } from "./client.js";
import { http } from "viem";

/**
 * FastLane Bundler Client for Monad Testnet
 * Handles ERC-4337 user operations
 */
export const bundlerClient = createBundlerClient({
  client: publicClient,
  transport: http("https://monad-testnet.4337-shbundler-fra.fastlane-labs.xyz"),
});
