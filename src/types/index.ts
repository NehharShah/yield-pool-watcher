export interface PoolMetric {
  pool_id: string;
  protocol: string;
  apy: number;
  tvl: number;
  timestamp: number;
  block_number: number;
}

export interface Delta {
  pool_id: string;
  apy_change: number;
  tvl_change: number;
  apy_change_percent: number;
  tvl_change_percent: number;
  time_elapsed: number;
  blocks_elapsed: number;
}

export interface Alert {
  pool_id: string;
  alert_type: "apy_spike" | "apy_drop" | "tvl_drain" | "tvl_surge";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  current_value: number;
  previous_value: number;
  change_percent: number;
  threshold_breached: number;
  timestamp: number;
  block_number: number;
}

export interface ThresholdRules {
  apy_spike_percent?: number;
  apy_drop_percent?: number;
  tvl_drain_percent?: number;
  tvl_surge_percent?: number;
}

export type ProtocolId = "aave_v3" | "compound_v3";
