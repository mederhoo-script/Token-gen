export const CHAIN_CONFIG = {
  name: "Sepolia",
  id: 11155111,
  rpcUrl: process.env.SEPOLIA_RPC_URL ?? "",
  explorerUrl: "https://sepolia.etherscan.io",
} as const;

export const TOKEN_LIMITS = {
  maxPerUser: 5,
  windowMs: 60 * 60 * 1000,
  maxSupply: 1_000_000_000,
} as const;

/** Address of the deployed TokenFactory contract (set NEXT_PUBLIC_FACTORY_ADDRESS in env). */
export const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS ?? "";

/**
 * Default service fee shown to users before wallet is connected.
 * Must match (or be <= to) the fee stored on-chain in TokenFactory.deploymentFee.
 * Set NEXT_PUBLIC_DEPLOYMENT_FEE_ETH in env to override.
 */
export const DEPLOYMENT_FEE_ETH = process.env.NEXT_PUBLIC_DEPLOYMENT_FEE_ETH ?? "0.005";
