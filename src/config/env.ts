import { config } from "dotenv";
config();

export const ENV = {
  // Primary RPC URL (your existing format)
  RPC_URL: process.env.RPC_URL,
  
  // Server Configuration
  PORT: process.env.PORT || "3000",
  HOST: process.env.HOST || "0.0.0.0",
  
  // x402 Payment Configuration
  FACILITATOR_URL: process.env.FACILITATOR_URL,
  ADDRESS: process.env.ADDRESS,
  NETWORK: process.env.NETWORK || "base",
  
  // Default network for operations  
  DEFAULT_NETWORK: process.env.DEFAULT_NETWORK || "ethereum"
} as const;

export function validateEnv(): void {
  if (!ENV.RPC_URL) {
    throw new Error("RPC_URL environment variable is required");
  }
}
