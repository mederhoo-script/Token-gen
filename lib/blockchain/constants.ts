import { SUPPORTED_CHAINS, DEFAULT_CHAIN_ID, getChainConfig } from "./chains";

export { getChainConfig };

/**
 * Legacy single-chain config — points at the default chain (Sepolia).
 * Used by the legacy server-side deploy path (`/api/tokens`).
 * New code should use `getChainConfig(chainId)` from `./chains` instead.
 */
export const CHAIN_CONFIG = SUPPORTED_CHAINS[DEFAULT_CHAIN_ID];

export const TOKEN_LIMITS = {
  maxPerUser: 5,
  windowMs: 60 * 60 * 1000,
  maxSupply: 1_000_000_000,
} as const;

/**
 * Legacy single factory address env var — used by the legacy deploy path and
 * as a fallback for Sepolia in the multi-chain factory address lookup.
 * New code should use `getFactoryAddress(chainId)` from `./chains`.
 */
export const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS ?? "";

/**
 * Default service fee shown to users before wallet is connected.
 * Must match (or be <= to) the fee stored on-chain in TokenFactory.deploymentFee.
 * Set NEXT_PUBLIC_DEPLOYMENT_FEE_ETH in env to override.
 */
export const DEPLOYMENT_FEE_ETH = process.env.NEXT_PUBLIC_DEPLOYMENT_FEE_ETH ?? "0.005";
