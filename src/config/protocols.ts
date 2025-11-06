import { NetworkId } from "./networks.js";

export const AAVE_POOL_DATA_PROVIDER_ABI = [
  "function getReserveData(address asset) external view returns (uint256 availableLiquidity, uint256 totalStableDebt, uint256 totalVariableDebt, uint256 liquidityRate, uint256 variableBorrowRate, uint256 stableBorrowRate, uint256 averageStableBorrowRate, uint256 liquidityIndex, uint256 variableBorrowIndex, uint40 lastUpdateTimestamp)"
];

export const COMPOUND_COMET_ABI = [
  "function getSupplyRate(uint256 utilization) external view returns (uint64)",
  "function totalSupply() external view returns (uint256)",
  "function totalBorrow() external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];

export const ERC20_ABI = [
  "function decimals() external view returns (uint8)"
];

export const MORPHO_VAULT_ABI = [
  "function totalAssets() external view returns (uint256)",
  "function totalSupply() external view returns (uint256)", 
  "function asset() external view returns (address)",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)"
];

export interface ProtocolConfig {
  name: string;
  poolDataProvider?: string;
  comet?: string;
  morpho?: string;
  supportedNetworks: NetworkId[];
}

// Protocol contract addresses per network
export const PROTOCOL_ADDRESSES: Record<string, Partial<Record<NetworkId, Partial<ProtocolConfig>>>> = {
  aave_v3: {
    "ethereum": {
      name: "Aave V3",
      poolDataProvider: "0x0a16f2FCC0D44FaE41cc54e079281D84A363bECD", // Official Aave V3 AaveProtocolDataProvider
      supportedNetworks: ["ethereum"]
    },
    "polygon": {
      name: "Aave V3",
      poolDataProvider: "0x243Aa95cAC2a25651eda86e80bEe66114413c43b", // Official Aave V3 AaveProtocolDataProvider
      supportedNetworks: ["polygon"]
    },
    "avalanche": {
      name: "Aave V3",
      poolDataProvider: "0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654",
      supportedNetworks: ["avalanche"]
    },
    "arbitrum": {
      name: "Aave V3",
      poolDataProvider: "0x243Aa95cAC2a25651eda86e80bEe66114413c43b", // Official Aave V3 AaveProtocolDataProvider
      supportedNetworks: ["arbitrum"]
    },
    "optimism": {
      name: "Aave V3",
      poolDataProvider: "0x243Aa95cAC2a25651eda86e80bEe66114413c43b", // Official Aave V3 AaveProtocolDataProvider (same as Arbitrum/Polygon)
      supportedNetworks: ["optimism"]
    },
    "base": {
      name: "Aave V3",
      poolDataProvider: "0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac", // Base Mainnet
      supportedNetworks: ["base"]
    }
  },
  compound_v3: {
    "ethereum": {
      name: "Compound V3",
      comet: "0xc3d688B66703497DAA19211EEdff47f25384cdc3", // USDC market
      supportedNetworks: ["ethereum"]
    },
    "polygon": {
      name: "Compound V3",
      comet: "0xF25212E676D1F7F89Cd72fFEe66158f541246445", // USDC market
      supportedNetworks: ["polygon"]
    },
    "arbitrum": {
      name: "Compound V3",
      comet: "0xA5EDBDD9646f8dFF606d7448e414884C7d905dCA", // USDC market
      supportedNetworks: ["arbitrum"]
    },
    "base": {
      name: "Compound V3",
      comet: "0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf", // USDC market
      supportedNetworks: ["base"]
    },
    "optimism": {
      name: "Compound V3",
      comet: "0x2e44e174f7D53F0212823acC11C01A11d58c5bCB", // USDC market
      supportedNetworks: ["optimism"]
    }
  },
  morpho: {
    "ethereum": {
      name: "Morpho Blue",
      morpho: "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb", // Official Morpho Blue core contract
      supportedNetworks: ["ethereum"]
    },
    "base": {
      name: "Morpho Blue", 
      morpho: "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb", // Official Morpho Blue core contract
      supportedNetworks: ["base"]
    }
  }
};

export function getProtocolConfig(protocolId: string, networkId: NetworkId): ProtocolConfig {
  const protocolNetworks = PROTOCOL_ADDRESSES[protocolId];
  if (!protocolNetworks) {
    throw new Error(`Unsupported protocol: ${protocolId}`);
  }
  
  const config = protocolNetworks[networkId];
  if (!config) {
    throw new Error(`Protocol ${protocolId} not supported on network ${networkId}`);
  }
  
  return config as ProtocolConfig;
}

export function isProtocolSupported(protocolId: string, networkId: NetworkId): boolean {
  try {
    getProtocolConfig(protocolId, networkId);
    return true;
  } catch {
    return false;
  }
}

export const SUPPORTED_PROTOCOLS = ["aave_v3", "compound_v3", "morpho"] as const;
export type ProtocolId = typeof SUPPORTED_PROTOCOLS[number];