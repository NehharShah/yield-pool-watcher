export type NetworkId = 
  | "ethereum" | "ethereum-sepolia"
  | "base" | "base-sepolia" 
  | "optimism" | "optimism-sepolia"
  | "polygon" | "polygon-amoy"
  | "arbitrum" | "arbitrum-sepolia"
  | "avalanche" | "avalanche-fuji"
  | "bnb" | "bnb-testnet"
  | "solana" | "solana-devnet";

export interface NetworkConfig {
  name: string;
  chainId?: number; // undefined for Solana
  rpcUrl: string;
  nativeCurrency: string;
  explorer: string;
}

export const NETWORKS: Record<NetworkId, NetworkConfig> = {
  // Ethereum
  "ethereum": {
    name: "Ethereum Mainnet",
    chainId: 1,
    rpcUrl: process.env.ETHEREUM_RPC_URL || process.env.RPC_URL || `https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY`,
    nativeCurrency: "ETH",
    explorer: "https://etherscan.io"
  },
  "ethereum-sepolia": {
    name: "Ethereum Sepolia",
    chainId: 11155111,
    rpcUrl: process.env.RPC_URL || process.env.ETHEREUM_SEPOLIA_RPC_URL || `https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY`,
    nativeCurrency: "ETH",
    explorer: "https://sepolia.etherscan.io"
  },

  // Base
  "base": {
    name: "Base Mainnet",
    chainId: 8453,
    rpcUrl: process.env.BASE_RPC_URL || process.env.RPC_URL || `https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY`,
    nativeCurrency: "ETH",
    explorer: "https://basescan.org"
  },
  "base-sepolia": {
    name: "Base Sepolia",
    chainId: 84532,
    rpcUrl: process.env.RPC_URL || process.env.BASE_SEPOLIA_RPC_URL || `https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY`,
    nativeCurrency: "ETH",
    explorer: "https://sepolia.basescan.org"
  },

  // Optimism
  "optimism": {
    name: "OP Mainnet",
    chainId: 10,
    rpcUrl: process.env.OPTIMISM_RPC_URL || process.env.RPC_URL || `https://opt-mainnet.g.alchemy.com/v2/YOUR_API_KEY`,
    nativeCurrency: "ETH",
    explorer: "https://optimistic.etherscan.io"
  },
  "optimism-sepolia": {
    name: "OP Sepolia",
    chainId: 11155420,
    rpcUrl: process.env.RPC_URL || process.env.OPTIMISM_SEPOLIA_RPC_URL || `https://opt-sepolia.g.alchemy.com/v2/YOUR_API_KEY`,
    nativeCurrency: "ETH",
    explorer: "https://sepolia-optimism.etherscan.io"
  },

  // Polygon
  "polygon": {
    name: "Polygon Mainnet",
    chainId: 137,
    rpcUrl: process.env.POLYGON_RPC_URL || process.env.RPC_URL || `https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY`,
    nativeCurrency: "MATIC",
    explorer: "https://polygonscan.com"
  },
  "polygon-amoy": {
    name: "Polygon Amoy",
    chainId: 80002,
    rpcUrl: process.env.RPC_URL || process.env.POLYGON_AMOY_RPC_URL || `https://polygon-amoy.g.alchemy.com/v2/YOUR_API_KEY`,
    nativeCurrency: "MATIC",
    explorer: "https://amoy.polygonscan.com"
  },

  // Arbitrum
  "arbitrum": {
    name: "Arbitrum One",
    chainId: 42161,
    rpcUrl: process.env.ARBITRUM_RPC_URL || process.env.RPC_URL || `https://arb-mainnet.g.alchemy.com/v2/YOUR_API_KEY`,
    nativeCurrency: "ETH",
    explorer: "https://arbiscan.io"
  },
  "arbitrum-sepolia": {
    name: "Arbitrum Sepolia",
    chainId: 421614,
    rpcUrl: process.env.RPC_URL || process.env.ARBITRUM_SEPOLIA_RPC_URL || `https://arb-sepolia.g.alchemy.com/v2/YOUR_API_KEY`,
    nativeCurrency: "ETH",
    explorer: "https://sepolia.arbiscan.io"
  },

  // Avalanche
  "avalanche": {
    name: "Avalanche C-Chain",
    chainId: 43114,
    rpcUrl: process.env.RPC_URL || process.env.AVALANCHE_RPC_URL || `https://avax-mainnet.g.alchemy.com/v2/YOUR_API_KEY`,
    nativeCurrency: "AVAX",
    explorer: "https://snowtrace.io"
  },
  "avalanche-fuji": {
    name: "Avalanche Fuji",
    chainId: 43113,
    rpcUrl: process.env.RPC_URL || process.env.AVALANCHE_FUJI_RPC_URL || `https://avax-fuji.g.alchemy.com/v2/YOUR_API_KEY`,
    nativeCurrency: "AVAX",
    explorer: "https://testnet.snowtrace.io"
  },

  // BNB Smart Chain
  "bnb": {
    name: "BNB Smart Chain",
    chainId: 56,
    rpcUrl: process.env.RPC_URL || process.env.BNB_RPC_URL || `https://bnb-mainnet.g.alchemy.com/v2/YOUR_API_KEY`,
    nativeCurrency: "BNB",
    explorer: "https://bscscan.com"
  },
  "bnb-testnet": {
    name: "BNB Smart Chain Testnet",
    chainId: 97,
    rpcUrl: process.env.RPC_URL || process.env.BNB_TESTNET_RPC_URL || `https://bnb-testnet.g.alchemy.com/v2/YOUR_API_KEY`,
    nativeCurrency: "BNB",
    explorer: "https://testnet.bscscan.com"
  },

  // Solana
  "solana": {
    name: "Solana Mainnet",
    rpcUrl: process.env.RPC_URL || process.env.SOLANA_RPC_URL || `https://solana-mainnet.g.alchemy.com/v2/YOUR_API_KEY`,
    nativeCurrency: "SOL",
    explorer: "https://explorer.solana.com"
  },
  "solana-devnet": {
    name: "Solana Devnet",
    rpcUrl: process.env.RPC_URL || process.env.SOLANA_DEVNET_RPC_URL || `https://solana-devnet.g.alchemy.com/v2/YOUR_API_KEY`,
    nativeCurrency: "SOL",
    explorer: "https://explorer.solana.com?cluster=devnet"
  }
};

export function getNetwork(networkId: NetworkId): NetworkConfig {
  const network = NETWORKS[networkId];
  if (!network) {
    throw new Error(`Unsupported network: ${networkId}`);
  }
  return network;
}

export function validateNetworkId(networkId: string): networkId is NetworkId {
  return networkId in NETWORKS;
}
