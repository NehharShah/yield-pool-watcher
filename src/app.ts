import { createAgentApp } from "@lucid-dreams/agent-kit";
import { ENV } from "./config/env.js";
import { handleMonitor } from "./handlers/monitor.js";
import { handleGetHistory } from "./handlers/history.js";
import { handleEcho } from "./handlers/echo.js";
import { z } from "zod";

export const { app, addEntrypoint } = createAgentApp({
  name: "yield-pool-watcher",
  version: "0.1.0",
  description: "Track APY and TVL across pools and alert on changes",
}, {
  payments: {
    defaultPrice: "5",
    facilitatorUrl: ENV.FACILITATOR_URL,
    payTo: ENV.ADDRESS || "0x742d35Cc6634C0532925a3b8D486Ee7a51d8D7B9",
    network: ENV.NETWORK
  },
  useConfigPayments: true
});

// Create detailed schemas for documentation
const monitorSchema = z.object({
  network: z.string().optional().default("ethereum").describe("Blockchain network to monitor (ethereum, base, polygon, arbitrum, optimism, avalanche, bnb, solana)"),
  protocol_ids: z.array(z.enum(["aave_v3", "compound_v3"])).describe("DeFi protocols to monitor"),
  pools: z.array(z.string()).optional().default([]).describe("Pool addresses to watch (leave empty for default pools)"),
  threshold_rules: z.object({
    apy_spike_percent: z.number().optional().describe("Alert if APY increases by this percentage"),
    apy_drop_percent: z.number().optional().describe("Alert if APY decreases by this percentage"),
    tvl_drain_percent: z.number().optional().describe("Alert if TVL decreases by this percentage"),
    tvl_surge_percent: z.number().optional().describe("Alert if TVL increases by this percentage"),
  }).describe("Alert threshold configuration"),
});

const historySchema = z.object({
  pool_id: z.string().describe("Pool identifier (format: protocol:network:address)"),
  limit: z.number().optional().default(10).describe("Number of historical entries to return (1-100)"),
});

const echoSchema = z.object({
  text: z.string().describe("Text to echo back")
});

addEntrypoint({
  key: "monitor",
  description: "Monitor DeFi pool metrics (APY, TVL) across multiple networks with block-level precision and configurable alert thresholds. Returns real-time data, change deltas, and triggered alerts.",
  price: "2",
  input: monitorSchema as any,
  handler: handleMonitor
});

addEntrypoint({
  key: "get_history", 
  description: "Retrieve historical APY and TVL metrics for a specific pool, with configurable limit. Useful for tracking trends and analyzing pool performance over time.",
  price: "1",
  input: historySchema as any,
  handler: handleGetHistory
});

addEntrypoint({
  key: "echo",
  description: "Health check endpoint that echoes input text and provides system status including RPC connectivity, current block number, monitored pools count, and server uptime.",
  input: echoSchema as any,
  handler: handleEcho
});
