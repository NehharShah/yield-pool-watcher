import { ethers } from "ethers";
import { NetworkId, getNetwork } from "../config/networks.js";
import { ENV } from "../config/env.js";
import { detectNetworkFromRPC } from "../utils/network-detector.js";

class BlockchainProvider {
  private providers = new Map<NetworkId, ethers.JsonRpcProvider>();
  private currentBlocks = new Map<NetworkId, number>();
  private activeNetwork: NetworkId;

  constructor() {
    // Auto-detect network from RPC_URL
    this.activeNetwork = ENV.RPC_URL 
      ? detectNetworkFromRPC(ENV.RPC_URL)
      : (ENV.DEFAULT_NETWORK as NetworkId) || "ethereum";
  }

  async initialize(networkId?: NetworkId): Promise<void> {
    const network = networkId || this.activeNetwork;
    
    if (this.providers.has(network)) {
      const networkConfig = getNetwork(network);
      console.log(`🔗 Already connected to ${networkConfig.name}`);
      return;
    }

    const networkConfig = getNetwork(network);
    const rpcUrl = networkConfig.rpcUrl;
    
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Test connection and get block number
    const currentBlock = await provider.getBlockNumber();
    
    this.providers.set(network, provider);
    this.currentBlocks.set(network, currentBlock);
    this.activeNetwork = network;
    
    console.log(`✅ ${networkConfig.name} ready (block: ${currentBlock})`);
    
    this.startBlockMonitoring(network);
  }

  private startBlockMonitoring(networkId: NetworkId): void {
    const provider = this.providers.get(networkId);
    
    if (!provider) return;

    // Monitor new blocks (silent monitoring)
    provider.on("block", (blockNumber: number) => {
      this.currentBlocks.set(networkId, blockNumber);
      // Silent block monitoring - only log on significant events
    });
  }

  async switchNetwork(networkId: NetworkId): Promise<void> {
    if (!this.providers.has(networkId)) {
      await this.initialize(networkId);
    }
    this.activeNetwork = networkId;
  }

  getProvider(networkId?: NetworkId): ethers.JsonRpcProvider {
    const network = networkId || this.activeNetwork;
    const provider = this.providers.get(network);
    
    if (!provider) {
      throw new Error(`Provider not initialized for network: ${network}`);
    }
    
    return provider;
  }

  getCurrentBlock(networkId?: NetworkId): number {
    const network = networkId || this.activeNetwork;
    return this.currentBlocks.get(network) || 0;
  }

  getActiveNetwork(): NetworkId {
    return this.activeNetwork;
  }

  isInitialized(networkId?: NetworkId): boolean {
    const network = networkId || this.activeNetwork;
    return this.providers.has(network);
  }

  getSupportedNetworks(): NetworkId[] {
    return Array.from(this.providers.keys());
  }
}

export const blockchainProvider = new BlockchainProvider();
