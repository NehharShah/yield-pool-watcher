import { ethers } from "ethers";
import { PoolMetric } from "../types/index.js";
import { AAVE_POOL_DATA_PROVIDER_ABI, ERC20_ABI, getProtocolConfig } from "../config/protocols.js";
import { NetworkId } from "../config/networks.js";
import { blockchainProvider } from "./blockchain.js";

export class AaveProvider {
  async fetchMetrics(pools: string[], networkId: NetworkId): Promise<PoolMetric[]> {
    const metrics: PoolMetric[] = [];
    const provider = blockchainProvider.getProvider(networkId);
    const protocolConfig = getProtocolConfig("aave_v3", networkId);
    
    if (!protocolConfig.poolDataProvider) {
      throw new Error(`Aave V3 not configured for network ${networkId}`);
    }
    
    const contract = new ethers.Contract(
      protocolConfig.poolDataProvider,
      AAVE_POOL_DATA_PROVIDER_ABI,
      provider
    );
    
    for (const poolAddress of pools) {
      try {
        if (!ethers.isAddress(poolAddress)) {
          throw new Error(`Invalid Ethereum address: ${poolAddress}`);
        }
        
        const [reserveData, tokenContract] = await Promise.all([
          contract.getReserveData(poolAddress),
          new ethers.Contract(poolAddress, ERC20_ABI, provider)
        ]);
        
        const decimals = await tokenContract.decimals();
        const decimalsBN = BigInt(10) ** BigInt(decimals);
        
        // Calculate APY from liquidityRate (ray format: 1e27)
        const liquidityRateRay = reserveData.liquidityRate;
        const apy = Number(liquidityRateRay) / 1e25; // Convert from ray to percentage
        
        // Calculate TVL
        const availableLiquidity = reserveData.availableLiquidity;
        const totalStableDebt = reserveData.totalStableDebt;
        const totalVariableDebt = reserveData.totalVariableDebt;
        
        const tvl = Number(
          (availableLiquidity + totalStableDebt + totalVariableDebt) / decimalsBN
        );
        
        metrics.push({
          pool_id: `aave_v3:${networkId}:${poolAddress}`,
          protocol: "aave_v3",
          apy,
          tvl,
          timestamp: Date.now(),
          block_number: blockchainProvider.getCurrentBlock(networkId)
        });
        
      } catch (error) {
        console.error(`Failed to fetch Aave metrics for ${poolAddress}:`, error);
        throw new Error(`Aave V3 fetch failed for ${poolAddress}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    return metrics;
  }
}
