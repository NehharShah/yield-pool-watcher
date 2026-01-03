import { ethers } from "ethers";
import { IProtocolProvider, UniversalPoolMetric } from "../types/universal.js";
import { AAVE_POOL_DATA_PROVIDER_ABI, ERC20_ABI, getProtocolConfig, isProtocolSupported } from "../config/protocols.js";
import { NetworkId } from "../config/networks.js";
import { blockchainProvider } from "./blockchain.js";

export class AaveUniversalProvider implements IProtocolProvider {
  private readonly NETWORK_ASSETS: Record<string, string[]> = {
    ethereum: [
      "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
      "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // WBTC
    ],
    polygon: [
      "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // USDC
      "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", // WETH
      "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6", // WBTC
    ],
    arbitrum: [
      "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC
      "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
      "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // WBTC
    ],
    optimism: [
      "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // USDC
      "0x4200000000000000000000000000000000000006", // WETH
      "0x68f180fcCe6836688e9084f035309E29Bf0A2095", // WBTC
    ]
  };

  async fetchMetrics(assets: string[], networkId: string): Promise<UniversalPoolMetric[]> {
    if (!isProtocolSupported("aave_v3", networkId as NetworkId)) {
      console.warn(`Aave V3 not supported on ${networkId}, skipping...`);
      return [];
    }

    const metrics: UniversalPoolMetric[] = [];
    const provider = blockchainProvider.getProvider(networkId as NetworkId);
    const protocolConfig = getProtocolConfig("aave_v3", networkId as NetworkId);
    
    if (!protocolConfig.poolDataProvider) {
      throw new Error(`Aave V3 not configured for network ${networkId}`);
    }
    
    const contract = new ethers.Contract(
      protocolConfig.poolDataProvider,
      AAVE_POOL_DATA_PROVIDER_ABI,
      provider
    );
    
    // Use provided assets or network-specific defaults
    const assetsToCheck = assets.length > 0 ? assets : this.getSupportedAssets(networkId);
    
    for (const assetAddress of assetsToCheck) {
      try {
        // Validate Ethereum address
        if (!ethers.isAddress(assetAddress)) {
          console.warn(`Invalid address for Aave: ${assetAddress}, skipping...`);
          continue;
        }
        
        const [reserveData, tokenContract] = await Promise.all([
          contract.getReserveData(assetAddress),
          new ethers.Contract(assetAddress, ERC20_ABI, provider)
        ]);
        
        const decimals = await tokenContract.decimals();
        const decimalsBN = BigInt(10) ** BigInt(decimals);
        
        // Calculate APY from liquidityRate (ray format: 1e27)
        const liquidityRateRay = reserveData.liquidityRate;
        // Convert from RAY (1e27) to APY percentage
        // Formula: APY = (1 + rate/SECONDS_PER_YEAR)^SECONDS_PER_YEAR - 1
        const SECONDS_PER_YEAR = 365.25 * 24 * 60 * 60;
        const ratePerSecond = Number(liquidityRateRay) / 1e27;
        const apy = ratePerSecond > 0 ? ((1 + ratePerSecond / SECONDS_PER_YEAR) ** SECONDS_PER_YEAR - 1) * 100 : 0;
        
        // Calculate TVL
        const availableLiquidity = reserveData.availableLiquidity;
        const totalStableDebt = reserveData.totalStableDebt;
        const totalVariableDebt = reserveData.totalVariableDebt;
        
        const tvl = Number(
          (availableLiquidity + totalStableDebt + totalVariableDebt) / decimalsBN
        );
        
        // Get asset symbol for better identification
        let assetSymbol = assetAddress;
        try {
          const symbolContract = new ethers.Contract(assetAddress, ["function symbol() view returns (string)"], provider);
          assetSymbol = await symbolContract.symbol();
        } catch (e) {
          // Use address if symbol fetch fails
        }
        
        metrics.push({
          pool_id: `aave_v3:${networkId}:${assetAddress}`,
          protocol: "aave_v3",
          network: networkId,
          asset: assetSymbol,
          apy,
          tvl,
          timestamp: Date.now(),
          block_number: blockchainProvider.getCurrentBlock(networkId as NetworkId),
          additional_data: {
            liquidityRate: Number(liquidityRateRay),
            availableLiquidity: Number(availableLiquidity / decimalsBN),
            totalDebt: Number((totalStableDebt + totalVariableDebt) / decimalsBN)
          }
        });
        
      } catch (error) {
        console.warn(`⚠️ Aave V3 asset ${assetAddress.slice(0,6)}...${assetAddress.slice(-4)} not available on ${networkId}`);
        // Continue with other assets instead of failing completely
      }
    }
    
    return metrics;
  }

  getSupportedAssets(networkId: string): string[] {
    // Return network-specific assets
    return this.NETWORK_ASSETS[networkId] || this.NETWORK_ASSETS.ethereum;
  }

  getSupportedNetworks(): string[] {
    // Aave V3 is NOT deployed on Base - only these networks
    return ["ethereum", "polygon", "avalanche", "arbitrum", "optimism"];
  }
}
