import { z } from "zod";
import { SUPPORTED_PROTOCOLS } from "../config/protocols.js";
import { NetworkId, NETWORKS, validateNetworkId } from "../config/networks.js";
import { monitoringService } from "../services/monitoring.js";
import { alertService } from "../services/alerts.js";
import { storageService } from "../services/storage.js";
import { blockchainProvider } from "../providers/blockchain.js";

export const monitorInputSchema = z.object({
  network: z.string().optional().default("base").describe("Blockchain network to monitor (defaults to Base)"),
  protocol_ids: z.array(z.enum(SUPPORTED_PROTOCOLS)).optional().default(["compound_v3"]).describe("DeFi protocols to monitor (defaults to Compound V3)"),
  pools: z.array(z.string()).optional().default([]).describe("Pool addresses to watch (leave empty for default pools)"),
  threshold_rules: z.object({
    apy_spike_percent: z.number().optional().describe("Alert if APY increases by this percentage"),
    apy_drop_percent: z.number().optional().describe("Alert if APY decreases by this percentage"),
    tvl_drain_percent: z.number().optional().describe("Alert if TVL decreases by this percentage"),
    tvl_surge_percent: z.number().optional().describe("Alert if TVL increases by this percentage"),
  }).optional().default({
    apy_spike_percent: 10,
    tvl_drain_percent: 20
  }).describe("Alert threshold configuration (defaults to 10% APY spike, 20% TVL drain)"),
}) as any;

export async function handleMonitor({ input }: { input: any }) {
  try {
    // Provide sensible defaults for x402scan users who can't input parameters
    const { 
      network = "base",
      protocol_ids = ["compound_v3"], 
      pools = [], 
      threshold_rules = {
        apy_spike_percent: 10,
        tvl_drain_percent: 20
      }
    } = input || {};
    
    // Validate network
    if (!validateNetworkId(network)) {
      throw new Error(`Unsupported network: ${network}. Supported networks: ${Object.keys(NETWORKS).join(', ')}`);
    }
    
    const networkId = network as NetworkId;
    
    // Initialize network provider if needed
    if (!blockchainProvider.isInitialized(networkId)) {
      await blockchainProvider.initialize(networkId);
    } else {
      await blockchainProvider.switchNetwork(networkId);
    }
    
    // Validate inputs with defaults
    if (!Array.isArray(protocol_ids) || protocol_ids.length === 0) {
      throw new Error("protocol_ids must be a non-empty array");
    }
    
    // Fetch metrics from specified protocols
    const allMetrics = await monitoringService.fetchMetrics(protocol_ids, pools, networkId);
    
    // Calculate deltas
    const deltas = monitoringService.calculateDeltas(allMetrics);
    
    // Check thresholds and generate alerts
    const alerts = alertService.checkThresholds(deltas, allMetrics, threshold_rules);
    
    // Store metrics (block-level precision)
    storageService.store(allMetrics);
    
    const responseSize = JSON.stringify({ pool_metrics: allMetrics, deltas, alerts }).length;
    
    return {
      output: {
        network: networkId,
        pool_metrics: allMetrics,
        deltas,
        alerts,
        current_block: blockchainProvider.getCurrentBlock(networkId),
        supported_networks: Object.keys(NETWORKS)
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
