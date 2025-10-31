import { ethers } from "ethers";
import { PoolMetric } from "../types/index.js";
import { COMPOUND_COMET_ABI, getProtocolConfig } from "../config/protocols.js";
import { NetworkId } from "../config/networks.js";
import { blockchainProvider } from "./blockchain.js";

export class CompoundProvider {
  async fetchMetrics(pools: string[], networkId: NetworkId): Promise<PoolMetric[]> {
    const metrics: PoolMetric[] = [];
    const provider = blockchainProvider.getProvider(networkId);
    const protocolConfig = getProtocolConfig("compound_v3", networkId);
    
    // For Compound V3, if no pools specified, use the main comet address
    const poolsToCheck = pools.length > 0 ? pools : [protocolConfig.comet!];
    
    for (const poolAddress of poolsToCheck) {
      try {
        if (!ethers.isAddress(poolAddress)) {
          throw new Error(`Invalid Ethereum address: ${poolAddress}`);
        }
        
        const contract = new ethers.Contract(poolAddress, COMPOUND_COMET_ABI, provider);
        
        // Add detailed logging for debugging
        console.log(`🔍 Fetching Compound V3 data for ${poolAddress} on ${networkId}`);
        
        const [totalSupply, totalBorrow, decimals] = await Promise.all([
          contract.totalSupply().catch(e => { throw new Error(`totalSupply failed: ${e.message}`); }),
          contract.totalBorrow().catch(e => { throw new Error(`totalBorrow failed: ${e.message}`); }),
          contract.decimals().catch(e => { throw new Error(`decimals failed: ${e.message}`); })
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
        
        metrics.push({
          pool_id: `compound_v3:${networkId}:${poolAddress}`,
          protocol: "compound_v3",
          apy,
          tvl,
          timestamp: Date.now(),
          block_number: blockchainProvider.getCurrentBlock(networkId)
        });
        
      } catch (error) {
        console.error(`Failed to fetch Compound metrics for ${poolAddress}:`, error);
        throw new Error(`Compound V3 fetch failed for ${poolAddress}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    return metrics;
  }
}
