import { z } from "zod";
import { ProtocolProviderFactory } from "../providers/protocol-factory.js";
import { UniversalMonitorResponse, UniversalPoolMetric } from "../types/universal.js";
import { NetworkId, NETWORKS, validateNetworkId } from "../config/networks.js";
import { blockchainProvider } from "../providers/blockchain.js";
import { storageService } from "../services/storage.js";

export const universalMonitorSchema = z.object({
  protocols: z.array(z.enum(["aave_v3", "compound_v3", "morpho"])).optional().default(["aave_v3", "compound_v3", "morpho"]).describe("DeFi protocols to monitor"),
  networks: z.array(z.string()).optional().default(["ethereum", "base", "polygon", "arbitrum", "optimism"]).describe("Blockchain networks to monitor"),
  assets: z.array(z.string()).optional().default([]).describe("Specific asset addresses to monitor (leave empty for default assets)"),
  include_historical: z.boolean().optional().default(false).describe("Include historical data in response"),
  include_predictions: z.boolean().optional().default(false).describe("Include yield predictions (future feature)"),
  threshold_rules: z.object({
    apy_spike_percent: z.number().optional().describe("Alert if APY increases by this percentage"),
    apy_drop_percent: z.number().optional().describe("Alert if APY decreases by this percentage"),
    tvl_drain_percent: z.number().optional().describe("Alert if TVL decreases by this percentage"),
    tvl_surge_percent: z.number().optional().describe("Alert if TVL increases by this percentage"),
  }).optional().default({}).describe("Alert threshold configuration"),
}) as any;

export async function handleUniversalMonitor({ input }: { input: any }): Promise<{ output: UniversalMonitorResponse; usage: { total_tokens: number } }> {
  try {
    // Apply defaults for x402scan users who can't input parameters
    const { 
      protocols = ["aave_v3", "compound_v3", "morpho"], 
      networks = ["ethereum", "base", "polygon", "arbitrum", "optimism"],
      assets = [],
      include_historical = false,
      include_predictions = false,
      threshold_rules = {}
    } = input || {};
    
    console.log(`🔍 Universal Monitor: ${protocols.length} protocols across ${networks.length} networks`);
    
    // Validate networks
    const validNetworks: NetworkId[] = [];
    for (const network of networks) {
      if (validateNetworkId(network)) {
        validNetworks.push(network as NetworkId);
      } else {
        console.warn(`Invalid network: ${network}, skipping...`);
      }
    }
    
    if (validNetworks.length === 0) {
      throw new Error(`No valid networks provided. Supported networks: ${Object.keys(NETWORKS).join(', ')}`);
    }
    
    // Initialize blockchain providers for all networks
    for (const networkId of validNetworks) {
      if (!blockchainProvider.isInitialized(networkId)) {
        await blockchainProvider.initialize(networkId);
      }
    }
    
    // Fetch data from all protocols across all networks
    const allMetrics: UniversalPoolMetric[] = [];
    const protocolResults: Record<string, Record<string, UniversalPoolMetric[]>> = {};
    
    for (const protocol of protocols) {
      try {
        console.log(`📊 Fetching ${protocol} data...`);
        const provider = ProtocolProviderFactory.create(protocol);
        protocolResults[protocol] = {};
        
        for (const networkId of validNetworks) {
          // Check if protocol supports this network
          if (!provider.getSupportedNetworks().includes(networkId)) {
            console.log(`⚠️ ${protocol} not deployed on ${networkId}`);
            protocolResults[protocol][networkId] = [];
            continue;
          }
          
          try {
            const metrics = await provider.fetchMetrics(assets, networkId);
            protocolResults[protocol][networkId] = metrics;
            allMetrics.push(...metrics);
            console.log(`✅ ${protocol} on ${networkId}: ${metrics.length} pools`);
          } catch (error) {
            console.warn(`⚠️ ${protocol} failed on ${networkId}`);
            protocolResults[protocol][networkId] = [];
          }
        }
      } catch (error) {
        console.error(`❌ Failed to initialize ${protocol} provider:`, error);
        protocolResults[protocol] = {};
      }
    }
    
    // Generate summary
    const totalTvlUsd = allMetrics.reduce((sum, metric) => sum + metric.tvl, 0);
    const bestApyMetric = allMetrics.reduce((best, current) => 
      current.apy > best.apy ? current : best, 
      allMetrics[0] || { apy: 0, protocol: '', pool_id: '', asset: '' }
    );
    
    // Generate alerts based on thresholds
    const alerts = generateAlerts(allMetrics, threshold_rules);
    
    // Get current blocks for all networks
    const currentBlocks: Record<string, number> = {};
    for (const networkId of validNetworks) {
      currentBlocks[networkId] = blockchainProvider.getCurrentBlock(networkId);
    }
    
    // Store metrics for historical tracking
    storageService.store(allMetrics.map(metric => ({
      pool_id: metric.pool_id,
      protocol: metric.protocol,
      apy: metric.apy,
      tvl: metric.tvl,
      timestamp: metric.timestamp,
      block_number: metric.block_number
    })));
    
    // Build response
    const response: UniversalMonitorResponse = {
      summary: {
        total_protocols: protocols.length,
        total_pools: allMetrics.length,
        total_tvl_usd: totalTvlUsd,
        best_apy: {
          protocol: bestApyMetric.protocol,
          pool_id: bestApyMetric.pool_id,
          apy: bestApyMetric.apy,
          asset: bestApyMetric.asset
        },
        evaluated_at: Date.now(),
        current_blocks: currentBlocks
      },
      protocols: protocolResults,
      alerts
    };
    
    // Add historical data if requested
    if (include_historical) {
      response.historical = {};
      for (const metric of allMetrics) {
        const history = storageService.getHistory(metric.pool_id);
        if (history.length > 0) {
          response.historical[metric.pool_id] = history.slice(-5).map(h => ({
            ...metric,
            apy: h.apy,
            tvl: h.tvl,
            timestamp: h.timestamp,
            block_number: h.block_number
          }));
        }
      }
    }
    
    // Add predictions if requested (placeholder for future implementation)
    if (include_predictions) {
      response.predictions = {
        note: "Yield predictions feature coming soon!"
      };
    }
    
    const responseSize = JSON.stringify(response).length;
    console.log(`✅ Universal Monitor complete: ${allMetrics.length} pools, ${alerts.length} alerts`);
    
    return {
      output: response,
      usage: {
        total_tokens: responseSize
      }
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Universal Monitor error:", errorMessage);
    throw new Error(`Universal Monitor failed: ${errorMessage}`);
  }
}

function generateAlerts(metrics: UniversalPoolMetric[], thresholds: any): Array<{
  type: string;
  protocol: string;
  pool_id: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}> {
  const alerts: Array<{
    type: string;
    protocol: string;
    pool_id: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
  }> = [];
  
  // Alert for high APY opportunities (real-time analysis)
  const highApyPools = metrics.filter(m => m.apy > 3.0);
  for (const pool of highApyPools) {
    alerts.push({
      type: 'high_apy_opportunity',
      protocol: pool.protocol,
      pool_id: pool.pool_id,
      message: `High APY opportunity: ${pool.apy.toFixed(2)}% on ${pool.asset}`,
      severity: 'medium' as const
    });
  }

  for (const metric of metrics) {
    // Get historical data for comparison
    const history = storageService.getHistory(metric.pool_id);
    if (history.length === 0) continue;
    
    const previous = history[history.length - 1];
    const apyChange = ((metric.apy - previous.apy) / previous.apy) * 100;
    const tvlChange = ((metric.tvl - previous.tvl) / previous.tvl) * 100;
    
    // APY spike alert
    if (thresholds.apy_spike_percent && apyChange > thresholds.apy_spike_percent) {
      alerts.push({
        type: 'apy_spike',
        protocol: metric.protocol,
        pool_id: metric.pool_id,
        message: `APY spiked ${apyChange.toFixed(2)}% to ${metric.apy.toFixed(2)}% for ${metric.asset}`,
        severity: apyChange > thresholds.apy_spike_percent * 2 ? 'high' : 'medium'
      });
    }
    
    // APY drop alert
    if (thresholds.apy_drop_percent && apyChange < -thresholds.apy_drop_percent) {
      alerts.push({
        type: 'apy_drop',
        protocol: metric.protocol,
        pool_id: metric.pool_id,
        message: `APY dropped ${Math.abs(apyChange).toFixed(2)}% to ${metric.apy.toFixed(2)}% for ${metric.asset}`,
        severity: Math.abs(apyChange) > thresholds.apy_drop_percent * 2 ? 'high' : 'medium'
      });
    }
    
    // TVL drain alert
    if (thresholds.tvl_drain_percent && tvlChange < -thresholds.tvl_drain_percent) {
      alerts.push({
        type: 'tvl_drain',
        protocol: metric.protocol,
        pool_id: metric.pool_id,
        message: `TVL drained ${Math.abs(tvlChange).toFixed(2)}% to $${metric.tvl.toLocaleString()} for ${metric.asset}`,
        severity: Math.abs(tvlChange) > thresholds.tvl_drain_percent * 2 ? 'high' : 'medium'
      });
    }
    
    // TVL surge alert
    if (thresholds.tvl_surge_percent && tvlChange > thresholds.tvl_surge_percent) {
      alerts.push({
        type: 'tvl_surge',
        protocol: metric.protocol,
        pool_id: metric.pool_id,
        message: `TVL surged ${tvlChange.toFixed(2)}% to $${metric.tvl.toLocaleString()} for ${metric.asset}`,
        severity: 'low' // TVL increases are generally good
      });
    }
  }
  
  return alerts;
}
