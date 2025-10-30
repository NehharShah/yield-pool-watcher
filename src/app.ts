import { createAgentApp } from "@lucid-dreams/agent-kit";
import { ENV } from "./config/env.js";
import { handleMonitor, monitorInputSchema } from "./handlers/monitor.js";
import { handleGetHistory, historyInputSchema } from "./handlers/history.js";
import { handleEcho, echoInputSchema } from "./handlers/echo.js";

export const { app, addEntrypoint } = createAgentApp({
  name: "yield-pool-watcher",
  version: "0.1.0",
  description: "Track APY and TVL across pools and alert on changes",
}, {
  payments: {
    defaultPrice: "1000",
    facilitatorUrl: ENV.FACILITATOR_URL,
    payTo: ENV.ADDRESS || "0x742d35Cc6634C0532925a3b8D486Ee7a51d8D7B9",
    network: ENV.NETWORK
  },
  useConfigPayments: true
});

// Register endpoints
addEntrypoint({
  key: "monitor",
  description: "Monitor pool metrics and emit alerts on spikes or drains",
  price: "2500",
  input: monitorInputSchema,
  handler: handleMonitor
});

addEntrypoint({
  key: "get_history", 
  description: "Get historical metrics for a specific pool",
  price: "500",
  input: historyInputSchema,
  handler: handleGetHistory
});

addEntrypoint({
  key: "echo",
  description: "Echo a message and provide system status",
  input: echoInputSchema,
  handler: handleEcho
});
