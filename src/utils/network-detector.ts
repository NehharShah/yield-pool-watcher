import { NetworkId } from "../config/networks.js";

/**
 * Auto-detect network from RPC URL
 */
export function detectNetworkFromRPC(rpcUrl: string): NetworkId {
  const url = rpcUrl.toLowerCase();
  
  // Alchemy URL patterns
  if (url.includes('eth-mainnet')) return 'ethereum';
  if (url.includes('eth-sepolia')) return 'ethereum-sepolia';
  if (url.includes('base-mainnet')) return 'base';
  if (url.includes('base-sepolia')) return 'base-sepolia';
  if (url.includes('opt-mainnet')) return 'optimism';
  if (url.includes('opt-sepolia')) return 'optimism-sepolia';
  if (url.includes('polygon-mainnet')) return 'polygon';
  if (url.includes('polygon-amoy')) return 'polygon-amoy';
  if (url.includes('arb-mainnet')) return 'arbitrum';
  if (url.includes('arb-sepolia')) return 'arbitrum-sepolia';
  if (url.includes('avax-mainnet')) return 'avalanche';
  if (url.includes('avax-fuji')) return 'avalanche-fuji';
  if (url.includes('bnb-mainnet')) return 'bnb';
  if (url.includes('bnb-testnet')) return 'bnb-testnet';
  if (url.includes('solana-mainnet')) return 'solana';
  if (url.includes('solana-devnet')) return 'solana-devnet';
  
  // Generic patterns
  if (url.includes('base')) return 'base';
  if (url.includes('polygon')) return 'polygon';
  if (url.includes('arbitrum') || url.includes('arb')) return 'arbitrum';
  if (url.includes('optimism') || url.includes('opt')) return 'optimism';
  if (url.includes('avalanche') || url.includes('avax')) return 'avalanche';
  if (url.includes('bsc') || url.includes('bnb')) return 'bnb';
  if (url.includes('solana')) return 'solana';
  
  // Default fallback
  console.warn(`⚠️  Could not detect network from RPC URL: ${rpcUrl}. Defaulting to ethereum.`);
  return 'ethereum';
}
