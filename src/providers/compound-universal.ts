import { ethers } from "ethers";
import { IProtocolProvider, UniversalPoolMetric } from "../types/universal.js";
import { COMPOUND_COMET_ABI, getProtocolConfig, isProtocolSupported } from "../config/protocols.js";
import { NetworkId } from "../config/networks.js";
import { blockchainProvider } from "./blockchain.js";

export class CompoundUniversalProvider implements IProtocolProvider {
  private readonly NETWORK_COMET_ADDRESSES: Record<string, string[]> = {
    "ethereum": ["0xc3d688B66703497DAA19211EEdff47f25384cdc3"], // USDC Comet
    "base": ["0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf"], // USDC Comet
    "polygon": ["0xF25212E676D1F7F89Cd72fFEe66158f541246445"], // USDC Comet
    "arbitrum": ["0xA5EDBDD9646f8dFF606d7448e414884C7d905dCA"], // USDC Comet
    "optimism": ["0x2e44e174f7D53F0212823acC11C01A11d58c5bCB"], // USDC Comet
  };

  async fetchMetrics(_assets: string[], networkId: string): Promise<UniversalPoolMetric[]> {
    if (!isProtocolSupported("compound_v3", networkId as NetworkId)) {
      console.warn(`Compound V3 not supported on ${networkId}, skipping...`);
      return [];
    }

    const metrics: UniversalPoolMetric[] = [];
    const provider = blockchainProvider.getProvider(networkId as NetworkId);
    
    // Get comet addresses for this network
    const cometAddresses = this.NETWORK_COMET_ADDRESSES[networkId] || [];
    if (cometAddresses.length === 0) {
      // Fallback to protocol config
      try {
        const protocolConfig = getProtocolConfig("compound_v3", networkId as NetworkId);
        if (protocolConfig.comet) {
          cometAddresses.push(protocolConfig.comet);
        }
      } catch (e) {
        console.warn(`No Compound V3 comet addresses found for ${networkId}`);
        return [];
      }
    }
    
    for (const cometAddress of cometAddresses) {
      try {
        if (!ethers.isAddress(cometAddress)) {
          console.warn(`Invalid comet address: ${cometAddress}, skipping...`);
          continue;
        }
        
        const contract = new ethers.Contract(cometAddress, COMPOUND_COMET_ABI, provider);
        
        const [totalSupply, totalBorrow, decimals] = await Promise.all([
          contract.totalSupply(),
          contract.totalBorrow(),
          contract.decimals()
        ]);
        
        const decimalsBN = BigInt(10) ** BigInt(decimals);
        
        // Calculate utilization rate
        const utilizationRate = totalSupply > 0n 
          ? Number((totalBorrow * BigInt(1e18)) / totalSupply) / 1e18
          : 0;
        
        // Get supply rate based on utilization
        const supplyRate = await contract.getSupplyRate(BigInt(Math.floor(utilizationRate * 1e18)));
        
        // Convert to APY (rate is per second)
        const secondsPerYear = 365.25 * 24 * 60 * 60;
        const apy = (Number(supplyRate) / 1e18) * secondsPerYear * 100;
        
        // Calculate TVL
        const tvl = Number(totalSupply / decimalsBN);
        
        // Determine asset symbol based on network and comet
        let assetSymbol = "USDC"; // Most Compound V3 markets are USDC
        if (networkId === "ethereum" && cometAddress.toLowerCase() === "0xc3d688B66703497DAA19211EEdff47f25384cdc3") {
          assetSymbol = "USDC";
        }
        
        metrics.push({
          pool_id: `compound_v3:${networkId}:${cometAddress}`,
          protocol: "compound_v3",
          network: networkId,
          asset: assetSymbol,
          apy,
          tvl,
          timestamp: Date.now(),
          block_number: blockchainProvider.getCurrentBlock(networkId as NetworkId),
          additional_data: {
            utilizationRate,
            supplyRate: Number(supplyRate),
            totalSupply: Number(totalSupply / decimalsBN),
            totalBorrow: Number(totalBorrow / decimalsBN),
            cometAddress
          }
        });
        
      } catch (error) {
        console.error(`Failed to fetch Compound metrics for ${cometAddress} on ${networkId}:`, error);
        // Continue with other comets instead of failing completely
      }
    }
    
    return metrics;
  }

  getSupportedAssets(_networkId: string): string[] {
    // Compound V3 primarily supports USDC markets
    return ["USDC"];
  }

  getSupportedNetworks(): string[] {
    return ["ethereum", "base", "polygon", "arbitrum", "optimism"];
  }
}
