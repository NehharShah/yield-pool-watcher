import { z } from "zod";
import { storageService } from "../services/storage.js";
import { blockchainProvider } from "../providers/blockchain.js";

export const historyInputSchema = z.object({
  pool_id: z.string().describe("Pool identifier to get history for"),
  limit: z.number().optional().default(10).describe("Number of historical entries to return"),
}) as any;

export async function handleGetHistory({ input }: { input: any }) {
  const { pool_id, limit } = input;
  
  if (!pool_id || typeof pool_id !== 'string') {
    throw new Error("pool_id must be a non-empty string");
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
