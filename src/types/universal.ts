export interface UniversalPoolMetric {
  pool_id: string;
  protocol: string;
  network: string;
  asset: string;
  apy: number;
  tvl: number;
  timestamp: number;
  block_number: number;
  additional_data?: Record<string, any>;
}

export interface ProtocolSummary {
  protocol: string;
  total_pools: number;
  total_tvl_usd: number;
  best_apy: {
    pool_id: string;
    apy: number;
    asset: string;
  };
  networks: string[];
}

export interface UniversalMonitorResponse {
  summary: {
    total_protocols: number;
    total_pools: number;
    total_tvl_usd: number;
    best_apy: {
      protocol: string;
      pool_id: string;
      apy: number;
      asset: string;
    };
    evaluated_at: number;
    current_blocks: Record<string, number>;
  };
  protocols: Record<string, Record<string, UniversalPoolMetric[]>>;
  alerts: Array<{
    type: string;
    protocol: string;
    pool_id: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  historical?: Record<string, UniversalPoolMetric[]>;
  predictions?: Record<string, any>;
}

export interface IProtocolProvider {
  fetchMetrics(assets: string[], networkId: string): Promise<UniversalPoolMetric[]>;
  getSupportedAssets(networkId: string): string[];
  getSupportedNetworks(): string[];
}
