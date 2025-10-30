import { z } from "zod";
import { blockchainProvider } from "../providers/blockchain.js";
import { storageService } from "../services/storage.js";

export const echoInputSchema = z.object({ 
  text: z.string().describe("Text to echo back") 
}) as any;

export async function handleEcho({ input }: { input: any }) {
  const { text } = input;
  
  return {
    output: { 
      text: String(text || ""),
      system_status: {
        rpc_connected: blockchainProvider.isInitialized(),
        current_block: blockchainProvider.getCurrentBlock(),
        pools_monitored: storageService.getPoolCount(),
        uptime: process.uptime()
      }
    },
    usage: { 
      total_tokens: String(text || "").length 
    }
  };
}
