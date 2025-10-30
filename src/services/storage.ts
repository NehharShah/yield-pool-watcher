import { PoolMetric } from "../types/index.js";

class StorageService {
  private metricsHistory = new Map<string, PoolMetric[]>();

  store(metrics: PoolMetric[], maxHistory: number = 100): void {
    for (const metric of metrics) {
      if (!this.metricsHistory.has(metric.pool_id)) {
        this.metricsHistory.set(metric.pool_id, []);
      }
      
      const history = this.metricsHistory.get(metric.pool_id)!;
      
      // Only store if it's a new block (within 1 block detection)
      const lastEntry = history[history.length - 1];
      if (!lastEntry || lastEntry.block_number < metric.block_number) {
        history.push(metric);
        
        // Cleanup old entries
        if (history.length > maxHistory) {
          history.shift();
        }
      }
    }
  }

  getHistory(poolId: string): PoolMetric[] {
    return this.metricsHistory.get(poolId) || [];
  }

  getPoolCount(): number {
    return this.metricsHistory.size;
  }
}

export const storageService = new StorageService();
