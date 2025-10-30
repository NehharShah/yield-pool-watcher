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

export interface ProtocolConfig {
  name: string;
  poolDataProvider?: string;
  comet?: string;
  supportedNetworks: NetworkId[];
}

// Protocol contract addresses per network
export const PROTOCOL_ADDRESSES: Record<string, Partial<Record<NetworkId, Partial<ProtocolConfig>>>> = {
  aave_v3: {
    "ethereum": {
      name: "Aave V3",
      poolDataProvider: "0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3",
      supportedNetworks: ["ethereum"]
    },
    "polygon": {
      name: "Aave V3",
      poolDataProvider: "0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654",
      supportedNetworks: ["polygon"]
    },
    "avalanche": {
      name: "Aave V3",
      poolDataProvider: "0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654",
      supportedNetworks: ["avalanche"]
    },
    "arbitrum": {
      name: "Aave V3",
      poolDataProvider: "0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654",
      supportedNetworks: ["arbitrum"]
    },
    "optimism": {
      name: "Aave V3",
      poolDataProvider: "0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654",
      supportedNetworks: ["optimism"]
    },
    "base": {
      name: "Aave V3",
      poolDataProvider: "0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac",
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

export const SUPPORTED_PROTOCOLS = ["aave_v3", "compound_v3"] as const;
export type ProtocolId = typeof SUPPORTED_PROTOCOLS[number];