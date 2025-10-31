import { createAgentApp } from "@lucid-dreams/agent-kit";
import { ENV } from "./config/env.js";
import { handleMonitor } from "./handlers/monitor.js";
import { handleGetHistory } from "./handlers/history.js";
import { handleEcho } from "./handlers/echo.js";
import { z } from "zod";

export const { app, addEntrypoint } = createAgentApp({
  name: "yield-pool-watcher",
  version: "0.1.0",
  description: "Track APY and TVL across pools and alert on changes. Zero-config defaults perfect for x402scan payments.",
}, {
  payments: process.env.NODE_ENV === 'production' ? {
    defaultPrice: "0.005",
    facilitatorUrl: ENV.FACILITATOR_URL,
    payTo: ENV.ADDRESS || "0x742d35Cc6634C0532925a3b8D486Ee7a51d8D7B9",
    network: ENV.NETWORK
  } : false,
  useConfigPayments: process.env.NODE_ENV === 'production'
});

// Create detailed schemas for documentation and x402scan compatibility
const monitorSchema = z.object({
  network: z.string().optional().default("base").describe("Blockchain network to monitor (ethereum, base, polygon, arbitrum, optimism, avalanche, bnb, solana)"),
  protocol_ids: z.array(z.enum(["aave_v3", "compound_v3"])).optional().default(["compound_v3"]).describe("DeFi protocols to monitor"),
  pools: z.array(z.string()).optional().default([]).describe("Pool addresses to watch (leave empty for default pools)"),
  threshold_rules: z.object({
    apy_spike_percent: z.number().optional().describe("Alert if APY increases by this percentage"),
    apy_drop_percent: z.number().optional().describe("Alert if APY decreases by this percentage"),
    tvl_drain_percent: z.number().optional().describe("Alert if TVL decreases by this percentage"),
    tvl_surge_percent: z.number().optional().describe("Alert if TVL increases by this percentage"),
  }).optional().default({
    apy_spike_percent: 10,
    tvl_drain_percent: 20
  }).describe("Alert threshold configuration"),
}).describe("Monitor DeFi pool metrics across networks");

const historySchema = z.object({
  pool_id: z.string().optional().default("compound_v3:base:0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf").describe("Pool identifier (format: protocol:network:address)"),
  limit: z.number().optional().default(5).describe("Number of historical entries to return (1-100)"),
}).describe("Get historical pool data");

const echoSchema = z.object({
  text: z.string().optional().default("Hello from yield-pool-watcher!").describe("Text to echo back")
}).describe("Health check with system status");

addEntrypoint({
  key: "monitor",
  description: "Monitor DeFi pool metrics (APY, TVL) across multiple networks with block-level precision and configurable alert thresholds. Returns real-time data, change deltas, and triggered alerts. Works with zero parameters (defaults to Base + Compound V3).",
  price: "0.002",
  input: monitorSchema as any,
  handler: handleMonitor
});

addEntrypoint({
  key: "get_history", 
  description: "Retrieve historical APY and TVL metrics for a specific pool, with configurable limit. Useful for tracking trends and analyzing pool performance over time. Works with zero parameters (defaults to Compound V3 USDC on Base).",
  price: "0.001",
  input: historySchema as any,
  handler: handleGetHistory
});

addEntrypoint({
  key: "echo",
  description: "Health check endpoint that echoes input text and provides system status including RPC connectivity, current block number, monitored pools count, and server uptime. Works with zero parameters (uses default greeting).",
  input: echoSchema as any,
  handler: handleEcho
});

// Add x402scan-compatible endpoint for get_history with proper schema
app.post('/x402/get_history', async (c) => {
  // Check for x402 payment header
  const paymentHeader = c.req.header('X-PAYMENT');
  
  if (!paymentHeader) {
    // Return 402 with x402scan-compatible schema
    return c.json({
      x402Version: 1,
      error: "X-PAYMENT header is required",
      accepts: [{
        scheme: "exact",
        network: "base",
        maxAmountRequired: "1000000",
        resource: "https://yield-pool-watcher.vercel.app/x402/get_history",
        description: "Retrieve historical APY and TVL metrics for a specific pool, with configurable limit. Useful for tracking trends and analyzing pool performance over time.",
        mimeType: "application/json",
        payTo: "0x7e296A887F7Bd9827D911f01D61ACe27DE542F87",
        maxTimeoutSeconds: 300,
        asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        outputSchema: {
          input: {
            type: "http",
            method: "POST",
            bodyType: "json",
            bodyFields: {
              pool_id: {
                type: "string",
                required: true,
                description: "Pool identifier (format: protocol:network:address)"
              },
              limit: {
                type: "number",
                required: false,
                description: "Number of historical entries to return (1-100)"
              }
            }
          }
        },
        extra: {
          name: "USD Coin",
          version: "2"
        }
      }],
      payer: "0x7e296A887F7Bd9827D911f01D61ACe27DE542F87"
    }, 402);
  }
  
  // Handle paid request
  try {
    let body = {};
    try {
      body = await c.req.json() || {};
    } catch (e) {
      // Handle case where no JSON body is provided
      body = {};
    }
    
    // Import handler
    const { handleGetHistory } = await import("./handlers/history.js");
    
    // Call the handler with proper format (let handler apply defaults)
    const result = await handleGetHistory({ 
      input: body 
    });
    
    return c.json(result.output);
  } catch (error) {
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Add x402scan-compatible endpoint for monitor with proper schema
app.post('/x402/monitor', async (c) => {
  const paymentHeader = c.req.header('X-PAYMENT');
  
  if (!paymentHeader) {
    return c.json({
      x402Version: 1,
      error: "X-PAYMENT header is required",
      accepts: [{
        scheme: "exact",
        network: "base",
        maxAmountRequired: "2000000",
        resource: "https://yield-pool-watcher.vercel.app/x402/monitor",
        description: "Monitor DeFi pool metrics (APY, TVL) across multiple networks with block-level precision and configurable alert thresholds. Returns real-time data, change deltas, and triggered alerts.",
        mimeType: "application/json",
        payTo: "0x7e296A887F7Bd9827D911f01D61ACe27DE542F87",
        maxTimeoutSeconds: 300,
        asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        outputSchema: {
          input: {
            type: "http",
            method: "POST",
            bodyType: "json",
            bodyFields: {
              network: {
                type: "string",
                required: false,
                description: "Blockchain network to monitor (ethereum, base, polygon, arbitrum, optimism, avalanche, bnb, solana)"
              },
              protocol_ids: {
                type: "array",
                required: true,
                description: "DeFi protocols to monitor (aave_v3, compound_v3)"
              },
              pools: {
                type: "array",
                required: false,
                description: "Pool addresses to watch (leave empty for default pools)"
              },
              threshold_rules: {
                type: "object",
                required: true,
                description: "Alert threshold configuration with apy_spike_percent, apy_drop_percent, tvl_drain_percent, tvl_surge_percent"
              }
            }
          }
        },
        extra: {
          name: "USD Coin",
          version: "2"
        }
      }],
      payer: "0x7e296A887F7Bd9827D911f01D61ACe27DE542F87"
    }, 402);
  }
  
  try {
    let body = {};
    try {
      body = await c.req.json() || {};
    } catch (e) {
      // Handle case where no JSON body is provided
      body = {};
    }
    
    const { handleMonitor } = await import("./handlers/monitor.js");
    
    const result = await handleMonitor({ 
      input: body 
    });
    
    return c.json(result.output);
  } catch (error) {
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Add x402scan-compatible endpoint for echo with proper schema
app.post('/x402/echo', async (c) => {
  const paymentHeader = c.req.header('X-PAYMENT');
  
  if (!paymentHeader) {
    return c.json({
      x402Version: 1,
      error: "X-PAYMENT header is required",
      accepts: [{
        scheme: "exact",
        network: "base",
        maxAmountRequired: "5000000",
        resource: "https://yield-pool-watcher.vercel.app/x402/echo",
        description: "Health check endpoint that echoes input text and provides system status including RPC connectivity, current block number, monitored pools count, and server uptime.",
        mimeType: "application/json",
        payTo: "0x7e296A887F7Bd9827D911f01D61ACe27DE542F87",
        maxTimeoutSeconds: 300,
        asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        outputSchema: {
          input: {
            type: "http",
            method: "POST",
            bodyType: "json",
            bodyFields: {
              text: {
                type: "string",
                required: true,
                description: "Text to echo back"
              }
            }
          }
        },
        extra: {
          name: "USD Coin",
          version: "2"
        }
      }],
      payer: "0x7e296A887F7Bd9827D911f01D61ACe27DE542F87"
    }, 402);
  }
  
  try {
    let body = {};
    try {
      body = await c.req.json() || {};
    } catch (e) {
      // Handle case where no JSON body is provided
      body = {};
    }
    
    const { handleEcho } = await import("./handlers/echo.js");
    
    const result = await handleEcho({ 
      input: body 
    });
    
    return c.json(result.output);
  } catch (error) {
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Add schema discovery endpoints for x402scan
app.get('/schema', (c) => {
  return c.json({
    entrypoints: {
      monitor: {
        description: "Monitor DeFi pool metrics (APY, TVL) across multiple networks with block-level precision and configurable alert thresholds. Returns real-time data, change deltas, and triggered alerts.",
        method: "POST",
        endpoint: "/entrypoints/monitor/invoke",
        price: "0.002",
        input_schema: {
          type: "object",
          properties: {
            input: {
              type: "object",
              properties: {
                network: {
                  type: "string",
                  default: "ethereum",
                  description: "Blockchain network to monitor (ethereum, base, polygon, arbitrum, optimism, avalanche, bnb, solana)"
                },
                protocol_ids: {
                  type: "array",
                  items: { enum: ["aave_v3", "compound_v3"] },
                  description: "DeFi protocols to monitor"
                },
                pools: {
                  type: "array",
                  items: { type: "string" },
                  default: [],
                  description: "Pool addresses to watch (leave empty for default pools)"
                },
                threshold_rules: {
                  type: "object",
                  properties: {
                    apy_spike_percent: { type: "number", description: "Alert if APY increases by this percentage" },
                    apy_drop_percent: { type: "number", description: "Alert if APY decreases by this percentage" },
                    tvl_drain_percent: { type: "number", description: "Alert if TVL decreases by this percentage" },
                    tvl_surge_percent: { type: "number", description: "Alert if TVL increases by this percentage" }
                  },
                  description: "Alert threshold configuration"
                }
              },
              required: ["protocol_ids", "threshold_rules"]
            }
          },
          required: ["input"]
        }
      },
      get_history: {
        description: "Retrieve historical APY and TVL metrics for a specific pool, with configurable limit. Useful for tracking trends and analyzing pool performance over time.",
        method: "POST",
        endpoint: "/entrypoints/get_history/invoke",
        price: "0.001",
        input_schema: {
          type: "object",
          properties: {
            input: {
              type: "object",
              properties: {
                pool_id: {
                  type: "string",
                  description: "Pool identifier (format: protocol:network:address)",
                  example: "aave_v3:base:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
                },
                limit: {
                  type: "number",
                  default: 10,
                  minimum: 1,
                  maximum: 100,
                  description: "Number of historical entries to return (1-100)"
                }
              },
              required: ["pool_id"]
            }
          },
          required: ["input"]
        }
      },
      echo: {
        description: "Health check endpoint that echoes input text and provides system status including RPC connectivity, current block number, monitored pools count, and server uptime.",
        method: "POST",
        endpoint: "/entrypoints/echo/invoke",
        price: "0.005",
        input_schema: {
          type: "object",
          properties: {
            input: {
              type: "object",
              properties: {
                text: {
                  type: "string",
                  description: "Text to echo back"
                }
              },
              required: ["text"]
            }
          },
          required: ["input"]
        }
      }
    }
  });
});

// Add OpenAPI spec for better discovery
app.get('/openapi.json', (c) => {
  return c.json({
    openapi: "3.0.0",
    info: {
      title: "Yield Pool Watcher",
      version: "0.1.0",
      description: "Track APY and TVL across pools and alert on changes"
    },
    servers: [
      { url: "https://yield-pool-watcher.vercel.app" }
    ],
    paths: {
      "/entrypoints/monitor/invoke": {
        post: {
          summary: "Monitor DeFi pool metrics",
          description: "Monitor DeFi pool metrics (APY, TVL) across multiple networks with block-level precision and configurable alert thresholds. Returns real-time data, change deltas, and triggered alerts.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    input: {
                      type: "object",
                      properties: {
                        network: { type: "string", default: "ethereum", description: "Blockchain network" },
                        protocol_ids: { type: "array", items: { enum: ["aave_v3", "compound_v3"] } },
                        pools: { type: "array", items: { type: "string" }, default: [] },
                        threshold_rules: { type: "object" }
                      },
                      required: ["protocol_ids", "threshold_rules"]
                    }
                  },
                  required: ["input"]
                }
              }
            }
          }
        }
      },
      "/entrypoints/get_history/invoke": {
        post: {
          summary: "Get pool history",
          description: "Retrieve historical APY and TVL metrics for a specific pool, with configurable limit. Useful for tracking trends and analyzing pool performance over time.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    input: {
                      type: "object",
                      properties: {
                        pool_id: { type: "string", description: "Pool identifier (format: protocol:network:address)" },
                        limit: { type: "number", default: 10, minimum: 1, maximum: 100 }
                      },
                      required: ["pool_id"]
                    }
                  },
                  required: ["input"]
                }
              }
            }
          }
        }
      },
      "/entrypoints/echo/invoke": {
        post: {
          summary: "Echo health check",
          description: "Health check endpoint that echoes input text and provides system status including RPC connectivity, current block number, monitored pools count, and server uptime.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    input: {
                      type: "object",
                      properties: {
                        text: { type: "string", description: "Text to echo back" }
                      },
                      required: ["text"]
                    }
                  },
                  required: ["input"]
                }
              }
            }
          }
        }
      }
    }
  });
});
