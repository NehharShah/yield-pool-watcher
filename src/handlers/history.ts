import { z } from "zod";
import { storageService } from "../services/storage.js";
import { blockchainProvider } from "../providers/blockchain.js";

export const historyInputSchema = z.object({
  pool_id: z.string().optional().default("compound_v3:base:0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf").describe("Pool identifier to get history for (defaults to Compound V3 USDC on Base)"),
  limit: z.number().optional().default(5).describe("Number of historical entries to return"),
}) as any;

export async function handleGetHistory({ input }: { input: any }) {
  // Provide sensible defaults for x402scan users who can't input parameters
  const { 
    pool_id = "compound_v3:base:0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf", // Default to Compound V3 USDC on Base
    limit = 5 
  } = input || {};
  
  if (pool_id && typeof pool_id !== 'string') {
    throw new Error("pool_id must be a string");
  }
  
  const history = storageService.getHistory(pool_id);
  const recentHistory = history.slice(-Math.max(1, limit));
  
  return {
    output: {
      pool_id,
      history: recentHistory,
      count: recentHistory.length,
      current_block: blockchainProvider.getCurrentBlock()
    },
    usage: {
      total_tokens: JSON.stringify(recentHistory).length
    }
  };
}
