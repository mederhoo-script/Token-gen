/** Metadata for a supported EVM chain. */
export interface ChainConfig {
  id: number;
  name: string;
  explorerUrl: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  /**
   * Public RPC URLs used only by `wallet_addEthereumChain` when MetaMask does not
   * recognise the network (EIP-3085 error 4902). These are well-known public
   * endpoints — the app's private RPC URLs (env vars) are used server-side.
   */
  publicRpcUrls: string[];
}

export const SUPPORTED_CHAINS: Record<number, ChainConfig> = {
  1: {
    id: 1,
    name: "Ethereum",
    explorerUrl: "https://etherscan.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    publicRpcUrls: ["https://ethereum.publicnode.com"],
  },
  137: {
    id: 137,
    name: "Polygon",
    explorerUrl: "https://polygonscan.com",
    nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
    publicRpcUrls: ["https://polygon-rpc.com"],
  },
  56: {
    id: 56,
    name: "BNB Chain",
    explorerUrl: "https://bscscan.com",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    publicRpcUrls: ["https://bsc-dataseed.binance.org"],
  },
  42161: {
    id: 42161,
    name: "Arbitrum One",
    explorerUrl: "https://arbiscan.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    publicRpcUrls: ["https://arb1.arbitrum.io/rpc"],
  },
  8453: {
    id: 8453,
    name: "Base",
    explorerUrl: "https://basescan.org",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    publicRpcUrls: ["https://mainnet.base.org"],
  },
  43114: {
    id: 43114,
    name: "Avalanche",
    explorerUrl: "https://snowtrace.io",
    nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
    publicRpcUrls: ["https://api.avax.network/ext/bc/C/rpc"],
  },
  11155111: {
    id: 11155111,
    name: "Sepolia",
    explorerUrl: "https://sepolia.etherscan.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    publicRpcUrls: ["https://rpc.sepolia.org"],
  },
};

/** Ordered list of supported chains for use in UI dropdowns. */
export const SUPPORTED_CHAINS_LIST: ChainConfig[] = [
  SUPPORTED_CHAINS[11155111], // Sepolia first (testnet / default)
  SUPPORTED_CHAINS[1],
  SUPPORTED_CHAINS[137],
  SUPPORTED_CHAINS[56],
  SUPPORTED_CHAINS[42161],
  SUPPORTED_CHAINS[8453],
  SUPPORTED_CHAINS[43114],
];

/** Default chain ID used when no chain has been selected. */
export const DEFAULT_CHAIN_ID = 11155111;

/** Returns the ChainConfig for the given chain ID, or undefined if unsupported. */
export function getChainConfig(chainId: number): ChainConfig | undefined {
  return SUPPORTED_CHAINS[chainId];
}

/**
 * Returns the deployed TokenFactory address for the given chain.
 *
 * Each chain has its own env var (`NEXT_PUBLIC_FACTORY_ADDRESS_{chainId}`).
 * Sepolia also falls back to the legacy `NEXT_PUBLIC_FACTORY_ADDRESS` var for
 * backward compatibility.
 *
 * IMPORTANT: All `process.env` references must be written out explicitly so
 * Next.js can statically inline NEXT_PUBLIC_ variables at build time.
 */
export function getFactoryAddress(chainId: number): string {
  switch (chainId) {
    case 1:
      return process.env.NEXT_PUBLIC_FACTORY_ADDRESS_1 ?? "";
    case 137:
      return process.env.NEXT_PUBLIC_FACTORY_ADDRESS_137 ?? "";
    case 56:
      return process.env.NEXT_PUBLIC_FACTORY_ADDRESS_56 ?? "";
    case 42161:
      return process.env.NEXT_PUBLIC_FACTORY_ADDRESS_42161 ?? "";
    case 8453:
      return process.env.NEXT_PUBLIC_FACTORY_ADDRESS_8453 ?? "";
    case 43114:
      return process.env.NEXT_PUBLIC_FACTORY_ADDRESS_43114 ?? "";
    case 11155111:
      // Support both the chain-specific and the legacy env var
      return (
        process.env.NEXT_PUBLIC_FACTORY_ADDRESS_11155111 ??
        process.env.NEXT_PUBLIC_FACTORY_ADDRESS ??
        ""
      );
    default:
      return "";
  }
}

/**
 * Returns the JSON-RPC URL for the given chain.
 *
 * SERVER-SIDE ONLY — these env vars are not prefixed with NEXT_PUBLIC_ and are
 * never sent to the browser.
 */
export function getChainRpcUrl(chainId: number): string {
  switch (chainId) {
    case 1:
      return process.env.ETH_MAINNET_RPC_URL ?? "";
    case 137:
      return process.env.POLYGON_RPC_URL ?? "";
    case 56:
      return process.env.BNB_RPC_URL ?? "";
    case 42161:
      return process.env.ARB_RPC_URL ?? "";
    case 8453:
      return process.env.BASE_RPC_URL ?? "";
    case 43114:
      return process.env.AVAX_RPC_URL ?? "";
    case 11155111:
      return process.env.SEPOLIA_RPC_URL ?? "";
    default:
      return "";
  }
}
