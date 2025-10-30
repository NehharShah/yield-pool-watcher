import { z } from "zod";
import { ThresholdRules } from "../types/index.js";
import { ProtocolId, SUPPORTED_PROTOCOLS } from "../config/protocols.js";
import { NetworkId, NETWORKS, validateNetworkId } from "../config/networks.js";
import { monitoringService } from "../services/monitoring.js";
import { alertService } from "../services/alerts.js";
import { storageService } from "../services/storage.js";
import { blockchainProvider } from "../providers/blockchain.js";

export const monitorInputSchema = z.object({
  network: z.string().optional().default("ethereum").describe("Blockchain network to monitor"),
  protocol_ids: z.array(z.enum(SUPPORTED_PROTOCOLS)).describe("DeFi protocols to monitor"),
  pools: z.array(z.string()).optional().default([]).describe("Pool addresses to watch (leave empty for default pools)"),
  threshold_rules: z.object({
    apy_spike_percent: z.number().optional().describe("Alert if APY increases by this percentage"),
    apy_drop_percent: z.number().optional().describe("Alert if APY decreases by this percentage"),
    tvl_drain_percent: z.number().optional().describe("Alert if TVL decreases by this percentage"),
    tvl_surge_percent: z.number().optional().describe("Alert if TVL increases by this percentage"),
  }).describe("Alert threshold configuration"),
}) as any;

export async function handleMonitor({ input }: { input: any }) {
  try {
    const { network, protocol_ids, pools, threshold_rules } = input as {
      network: string;
      protocol_ids: ProtocolId[];
      pools: string[];
      threshold_rules: ThresholdRules;
    };
    
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
    
    // Validate inputs
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
