import { Delta, PoolMetric } from "../types/index.js";
import { ProtocolId, isProtocolSupported } from "../config/protocols.js";
import { NetworkId } from "../config/networks.js";
import { AaveProvider } from "../providers/aave.js";
import { CompoundProvider } from "../providers/compound.js";
import { storageService } from "./storage.js";

export class MonitoringService {
  private aaveProvider = new AaveProvider();
  private compoundProvider = new CompoundProvider();

  async fetchMetrics(protocolIds: ProtocolId[], pools: string[], networkId: NetworkId): Promise<PoolMetric[]> {
    const allMetrics: PoolMetric[] = [];
    
    for (const protocolId of protocolIds) {
      try {
        // Check if protocol is supported on this network
        if (!isProtocolSupported(protocolId, networkId)) {
          console.warn(`Protocol ${protocolId} not supported on ${networkId}, skipping...`);
          continue;
        }
        
        if (protocolId === "aave_v3") {
          const metrics = await this.aaveProvider.fetchMetrics(pools, networkId);
          allMetrics.push(...metrics);
        } else if (protocolId === "compound_v3") {
          const metrics = await this.compoundProvider.fetchMetrics(pools, networkId);
          allMetrics.push(...metrics);
        }
      } catch (error) {
        console.error(`Error fetching ${protocolId} metrics on ${networkId}:`, error);
        throw error;
      }
    }
    
    return allMetrics;
  }

  calculateDeltas(current: PoolMetric[]): Delta[] {
    const deltas: Delta[] = [];
    
    for (const metric of current) {
      const history = storageService.getHistory(metric.pool_id);
      if (history.length === 0) continue;
      
      const previous = history[history.length - 1];
      const apyChange = metric.apy - previous.apy;
      const tvlChange = metric.tvl - previous.tvl;
      const apyChangePercent = previous.apy !== 0 ? (apyChange / previous.apy) * 100 : 0;
      const tvlChangePercent = previous.tvl !== 0 ? (tvlChange / previous.tvl) * 100 : 0;
      const timeElapsed = metric.timestamp - previous.timestamp;
      const blocksElapsed = metric.block_number - previous.block_number;
      
      deltas.push({
        pool_id: metric.pool_id,
        apy_change: apyChange,
        tvl_change: tvlChange,
        apy_change_percent: apyChangePercent,
        tvl_change_percent: tvlChangePercent,
        time_elapsed: timeElapsed,
        blocks_elapsed: blocksElapsed
      });
    }
    
    return deltas;
  }
}

export const monitoringService = new MonitoringService();
