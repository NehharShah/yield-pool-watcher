import { z } from "zod";
import { createAgentApp } from "@lucid-dreams/agent-kit";
import { serve } from "@hono/node-server";
import { ethers } from "ethers";

// Load environment variables
import { config } from "dotenv";
config();

const { app, addEntrypoint } = createAgentApp({
  name: "yield-pool-watcher",
  version: "0.1.0",
  description: "Track APY and TVL across pools and alert on changes",
});

// Environment validation
const requiredEnvVars = {
  RPC_URL: process.env.RPC_URL || process.env.ETHEREUM_RPC_URL,
  PORT: process.env.PORT || "3000",
  HOST: process.env.HOST || "0.0.0.0"
};

if (!requiredEnvVars.RPC_URL) {
  throw new Error("RPC_URL environment variable is required");
}

// Type definitions
interface PoolMetric {
  pool_id: string;
  protocol: string;
  apy: number;
  tvl: number;
  timestamp: number;
  block_number: number;
}

interface Delta {
  pool_id: string;
  apy_change: number;
  tvl_change: number;
  apy_change_percent: number;
  tvl_change_percent: number;
  time_elapsed: number;
  blocks_elapsed: number;
}

interface Alert {
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

interface ThresholdRules {
  apy_spike_percent?: number;
  apy_drop_percent?: number;
  tvl_drain_percent?: number;
  tvl_surge_percent?: number;
}

// Contract ABIs
const AAVE_POOL_DATA_PROVIDER_ABI = [
  "function getReserveData(address asset) external view returns (uint256 availableLiquidity, uint256 totalStableDebt, uint256 totalVariableDebt, uint256 liquidityRate, uint256 variableBorrowRate, uint256 stableBorrowRate, uint256 averageStableBorrowRate, uint256 liquidityIndex, uint256 variableBorrowIndex, uint40 lastUpdateTimestamp)"
];

const COMPOUND_COMET_ABI = [
  "function getSupplyRate(uint256 utilization) external view returns (uint64)",
  "function totalSupply() external view returns (uint256)",
  "function totalBorrow() external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];

const ERC20_ABI = [
  "function decimals() external view returns (uint8)"
];

// Protocol configurations
const PROTOCOLS = {
  aave_v3: {
    name: "Aave V3",
    poolDataProvider: "0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3",
    chainId: 1
  },
  compound_v3: {
    name: "Compound V3", 
    comet: "0xc3d688B66703497DAA19211EEdff47f25384cdc3",
    chainId: 1
  }
};

// Storage
const metricsHistory = new Map<string, PoolMetric[]>();
let provider: ethers.JsonRpcProvider;
let currentBlockNumber = 0;

// Initialize provider
function initializeProvider(): ethers.JsonRpcProvider {
  const rpcUrl = requiredEnvVars.RPC_URL!;
  console.log(`🔗 Connecting to RPC: ${rpcUrl.substring(0, 50)}...`);
  return new ethers.JsonRpcProvider(rpcUrl);
}

// Block monitoring
async function startBlockMonitoring(): Promise<void> {
  try {
    provider = initializeProvider();
    
    // Get initial block
    currentBlockNumber = await provider.getBlockNumber();
    console.log(`📦 Current block: ${currentBlockNumber}`);
    
    // Monitor new blocks
    provider.on("block", (blockNumber: number) => {
      currentBlockNumber = blockNumber;
      console.log(`📦 New block: ${blockNumber}`);
    });
    
    // Fallback polling if WebSocket fails
    setInterval(async () => {
      try {
        const latestBlock = await provider.getBlockNumber();
        if (latestBlock > currentBlockNumber) {
          currentBlockNumber = latestBlock;
          console.log(`📦 Block update (polling): ${latestBlock}`);
        }
      } catch (error) {
        console.error("Block polling error:", error);
      }
    }, 12000); // Every 12 seconds (average block time)
    
  } catch (error) {
    console.error("Failed to initialize block monitoring:", error);
    throw error;
  }
}

// Fetch Aave V3 metrics
async function fetchAaveMetrics(pools: string[]): Promise<PoolMetric[]> {
  const metrics: PoolMetric[] = [];
  const contract = new ethers.Contract(
    PROTOCOLS.aave_v3.poolDataProvider,
    AAVE_POOL_DATA_PROVIDER_ABI,
    provider
  );
  
  for (const poolAddress of pools) {
    try {
      // Validate Ethereum address
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
        pool_id: `aave_v3:${poolAddress}`,
        protocol: "aave_v3",
        apy,
        tvl,
        timestamp: Date.now(),
        block_number: currentBlockNumber
      });
      
    } catch (error) {
      console.error(`Failed to fetch Aave metrics for ${poolAddress}:`, error);
      throw new Error(`Aave V3 fetch failed for ${poolAddress}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  return metrics;
}

// Fetch Compound V3 metrics
async function fetchCompoundMetrics(pools: string[]): Promise<PoolMetric[]> {
  const metrics: PoolMetric[] = [];
  
  for (const poolAddress of pools) {
    try {
      if (!ethers.isAddress(poolAddress)) {
        throw new Error(`Invalid Ethereum address: ${poolAddress}`);
      }
      
      const contract = new ethers.Contract(poolAddress, COMPOUND_COMET_ABI, provider);
      
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
      
      metrics.push({
        pool_id: `compound_v3:${poolAddress}`,
        protocol: "compound_v3",
        apy,
        tvl,
        timestamp: Date.now(),
        block_number: currentBlockNumber
      });
      
    } catch (error) {
      console.error(`Failed to fetch Compound metrics for ${poolAddress}:`, error);
      throw new Error(`Compound V3 fetch failed for ${poolAddress}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  return metrics;
}

// Calculate deltas
function calculateDeltas(current: PoolMetric[], poolId: string): Delta | null {
  const history = metricsHistory.get(poolId);
  if (!history || history.length === 0) {
    return null;
  }
  
  const previous = history[history.length - 1];
  const currentMetric = current.find(m => m.pool_id === poolId);
  
  if (!currentMetric) {
    return null;
  }
  
  const apyChange = currentMetric.apy - previous.apy;
  const tvlChange = currentMetric.tvl - previous.tvl;
  const apyChangePercent = previous.apy !== 0 ? (apyChange / previous.apy) * 100 : 0;
  const tvlChangePercent = previous.tvl !== 0 ? (tvlChange / previous.tvl) * 100 : 0;
  const timeElapsed = currentMetric.timestamp - previous.timestamp;
  const blocksElapsed = currentMetric.block_number - previous.block_number;
  
  return {
    pool_id: poolId,
    apy_change: apyChange,
    tvl_change: tvlChange,
    apy_change_percent: apyChangePercent,
    tvl_change_percent: tvlChangePercent,
    time_elapsed: timeElapsed,
    blocks_elapsed: blocksElapsed
  };
}

// Check thresholds and generate alerts
function checkThresholds(deltas: Delta[], current: PoolMetric[], thresholds: ThresholdRules): Alert[] {
  const alerts: Alert[] = [];
  
  for (const delta of deltas) {
    const currentMetric = current.find(m => m.pool_id === delta.pool_id);
    if (!currentMetric) continue;
    
    const history = metricsHistory.get(delta.pool_id);
    const previous = history?.[history.length - 1];
    if (!previous) continue;
    
    // APY spike alert
    if (thresholds.apy_spike_percent && delta.apy_change_percent > thresholds.apy_spike_percent) {
      alerts.push({
        pool_id: delta.pool_id,
        alert_type: "apy_spike",
        severity: delta.apy_change_percent > thresholds.apy_spike_percent * 2 ? "critical" : "high",
        message: `APY spiked by ${delta.apy_change_percent.toFixed(4)}% in ${delta.blocks_elapsed} blocks (${previous.apy.toFixed(4)}% → ${currentMetric.apy.toFixed(4)}%)`,
        current_value: currentMetric.apy,
        previous_value: previous.apy,
        change_percent: delta.apy_change_percent,
        threshold_breached: thresholds.apy_spike_percent,
        timestamp: currentMetric.timestamp,
        block_number: currentMetric.block_number
      });
    }
    
    // APY drop alert
    if (thresholds.apy_drop_percent && delta.apy_change_percent < -thresholds.apy_drop_percent) {
      alerts.push({
        pool_id: delta.pool_id,
        alert_type: "apy_drop",
        severity: delta.apy_change_percent < -thresholds.apy_drop_percent * 2 ? "critical" : "high",
        message: `APY dropped by ${Math.abs(delta.apy_change_percent).toFixed(4)}% in ${delta.blocks_elapsed} blocks (${previous.apy.toFixed(4)}% → ${currentMetric.apy.toFixed(4)}%)`,
        current_value: currentMetric.apy,
        previous_value: previous.apy,
        change_percent: delta.apy_change_percent,
        threshold_breached: thresholds.apy_drop_percent,
        timestamp: currentMetric.timestamp,
        block_number: currentMetric.block_number
      });
    }
    
    // TVL drain alert
    if (thresholds.tvl_drain_percent && delta.tvl_change_percent < -thresholds.tvl_drain_percent) {
      alerts.push({
        pool_id: delta.pool_id,
        alert_type: "tvl_drain",
        severity: delta.tvl_change_percent < -thresholds.tvl_drain_percent * 2 ? "critical" : "high",
        message: `TVL drained by ${Math.abs(delta.tvl_change_percent).toFixed(4)}% in ${delta.blocks_elapsed} blocks ($${previous.tvl.toLocaleString()} → $${currentMetric.tvl.toLocaleString()})`,
        current_value: currentMetric.tvl,
        previous_value: previous.tvl,
        change_percent: delta.tvl_change_percent,
        threshold_breached: thresholds.tvl_drain_percent,
        timestamp: currentMetric.timestamp,
        block_number: currentMetric.block_number
      });
    }
    
    // TVL surge alert
    if (thresholds.tvl_surge_percent && delta.tvl_change_percent > thresholds.tvl_surge_percent) {
      alerts.push({
        pool_id: delta.pool_id,
        alert_type: "tvl_surge",
        severity: delta.tvl_change_percent > thresholds.tvl_surge_percent * 2 ? "high" : "medium",
        message: `TVL surged by ${delta.tvl_change_percent.toFixed(4)}% in ${delta.blocks_elapsed} blocks ($${previous.tvl.toLocaleString()} → $${currentMetric.tvl.toLocaleString()})`,
        current_value: currentMetric.tvl,
        previous_value: previous.tvl,
        change_percent: delta.tvl_change_percent,
        threshold_breached: thresholds.tvl_surge_percent,
        timestamp: currentMetric.timestamp,
        block_number: currentMetric.block_number
      });
    }
  }
  
  return alerts;
}

// Store metrics with block-level precision
function storeMetrics(metrics: PoolMetric[], maxHistory: number = 100): void {
  for (const metric of metrics) {
    if (!metricsHistory.has(metric.pool_id)) {
      metricsHistory.set(metric.pool_id, []);
    }
    
    const history = metricsHistory.get(metric.pool_id)!;
    
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

// Main monitor endpoint
addEntrypoint({
  key: "monitor",
  description: "Monitor pool metrics and emit alerts on spikes or drains",
  input: z.object({
    protocol_ids: z.array(z.enum(["aave_v3", "compound_v3"])).describe("DeFi protocols to monitor"),
    pools: z.array(z.string()).describe("Pool addresses to watch (Ethereum addresses)"),
    threshold_rules: z.object({
      apy_spike_percent: z.number().optional().describe("Alert if APY increases by this percentage"),
      apy_drop_percent: z.number().optional().describe("Alert if APY decreases by this percentage"),
      tvl_drain_percent: z.number().optional().describe("Alert if TVL decreases by this percentage"),
      tvl_surge_percent: z.number().optional().describe("Alert if TVL increases by this percentage"),
    }).describe("Alert threshold configuration"),
  }) as any,
  async handler({ input }) {
    try {
      const { protocol_ids, pools, threshold_rules } = input;
      
      if (!provider) {
        throw new Error("Provider not initialized");
      }
      
      // Validate inputs
      if (!Array.isArray(protocol_ids) || protocol_ids.length === 0) {
        throw new Error("protocol_ids must be a non-empty array");
      }
      
      if (!Array.isArray(pools) || pools.length === 0) {
        throw new Error("pools must be a non-empty array");
      }
      
      const allMetrics: PoolMetric[] = [];
      
      // Fetch metrics from specified protocols
      for (const protocolId of protocol_ids) {
        try {
          if (protocolId === "aave_v3") {
            const metrics = await fetchAaveMetrics(pools);
            allMetrics.push(...metrics);
          } else if (protocolId === "compound_v3") {
            const metrics = await fetchCompoundMetrics(pools);
            allMetrics.push(...metrics);
          }
        } catch (error) {
          console.error(`Error fetching ${protocolId} metrics:`, error);
          throw error;
        }
      }
      
      // Calculate deltas
      const deltas: Delta[] = [];
      for (const metric of allMetrics) {
        const delta = calculateDeltas(allMetrics, metric.pool_id);
        if (delta) {
          deltas.push(delta);
        }
      }
      
      // Check thresholds and generate alerts
      const alerts = checkThresholds(deltas, allMetrics, threshold_rules);
      
      // Store metrics (block-level precision)
      storeMetrics(allMetrics);
      
      const responseSize = JSON.stringify({ pool_metrics: allMetrics, deltas, alerts }).length;
      
      return {
        output: {
          pool_metrics: allMetrics,
          deltas,
          alerts,
          current_block: currentBlockNumber
        },
        usage: {
          total_tokens: responseSize
        }
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Monitor endpoint error:", errorMessage);
      throw new Error(`Monitor failed: ${errorMessage}`);
    }
  }
});

// Get history endpoint
addEntrypoint({
  key: "get_history",
  description: "Get historical metrics for a specific pool",
  input: z.object({
    pool_id: z.string().describe("Pool identifier to get history for"),
    limit: z.number().optional().default(10).describe("Number of historical entries to return"),
  }) as any,
  async handler({ input }) {
    const { pool_id, limit } = input;
    
    if (!pool_id || typeof pool_id !== 'string') {
      throw new Error("pool_id must be a non-empty string");
    }
    
    const history = metricsHistory.get(pool_id) || [];
    const recentHistory = history.slice(-Math.max(1, limit));
    
    return {
      output: {
        pool_id,
        history: recentHistory,
        count: recentHistory.length,
        current_block: currentBlockNumber
      },
      usage: {
        total_tokens: JSON.stringify(recentHistory).length
      }
    };
  }
});

// Health check endpoint
addEntrypoint({
  key: "echo",
  description: "Echo a message and provide system status",  
  input: z.object({ 
    text: z.string().describe("Text to echo back") 
  }) as any,
  async handler({ input }) {
    const { text } = input;
    
    return {
      output: { 
        text: String(text || ""),
        system_status: {
          rpc_connected: !!provider,
          current_block: currentBlockNumber,
          pools_monitored: metricsHistory.size,
          uptime: process.uptime()
        }
      },
      usage: { 
        total_tokens: String(text || "").length 
      }
    };
  }
});

// Initialize and start server
async function startServer(): Promise<void> {
  try {
    // Initialize blockchain monitoring
    await startBlockMonitoring();
    
    const PORT = parseInt(requiredEnvVars.PORT, 10);
    const HOST = requiredEnvVars.HOST;
    
    serve({
      fetch: app.fetch,
      port: PORT,
      hostname: HOST
    }, () => {
      console.log(`🚀 Yield Pool Watcher running on http://${HOST}:${PORT}`);
      console.log(`📊 Real-time DeFi pool monitoring with block-level precision`);
      console.log(`🔗 Connected to Ethereum RPC`);
      console.log(`📦 Monitoring block: ${currentBlockNumber}`);
      console.log(`\n📡 Endpoints:`);
      console.log(`  POST /entrypoints/monitor/invoke - Monitor pools with block precision`);
      console.log(`  POST /entrypoints/get_history/invoke - Get historical data`);
      console.log(`  POST /entrypoints/echo/invoke - Health check with system status`);
    });
    
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start the application
startServer().catch(console.error);

export default app;