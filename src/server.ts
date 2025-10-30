import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { validateEnv, ENV } from "./config/env.js";
import { blockchainProvider } from "./providers/blockchain.js";

async function startServer(): Promise<void> {
  try {
    // Validate environment
    validateEnv();
    
    // Initialize blockchain monitoring
    await blockchainProvider.initialize();
    
    const PORT = parseInt(ENV.PORT, 10);
    const HOST = ENV.HOST;
    
    serve({
      fetch: app.fetch,
      port: PORT,
      hostname: HOST
    }, () => {
      console.log(`🚀 Yield Pool Watcher running on http://${HOST}:${PORT}`);
      console.log(`📊 Real-time DeFi pool monitoring with block-level precision`);
      console.log(`🔗 Connected to Ethereum RPC`);
      console.log(`📦 Monitoring block: ${blockchainProvider.getCurrentBlock()}`);
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
