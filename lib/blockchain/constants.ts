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
