# Yield Pool Watcher 🎯

Real-time DeFi pool monitoring with block-level precision.

## Quick Start

```bash
# 1. Install
npm install

# 2. Add RPC URL (get free from alchemy.com)
echo 'RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY' > .env

# 3. Run
npm run dev
```

Agent runs on `http://localhost:3000`

## Test It

```bash
# Health check
curl -X POST http://localhost:3000/entrypoints/echo/invoke \
  -H "Content-Type: application/json" \
  -d '{"input":{"text":"Working!"}}'

# Monitor Aave USDC
curl -X POST http://localhost:3000/entrypoints/monitor/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "protocol_ids": ["aave_v3"],
      "pools": ["0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"],
      "threshold_rules": {"apy_spike_percent": 10}
    }
  }'
```

## Features

✅ **Within 1 block detection** - Real-time monitoring  
✅ **Direct Aave V3 & Compound V3** - No aggregated APIs  
✅ **Smart alerts** - APY/TVL threshold breaches  
✅ **Production ready** - Full error handling  


## Pool Addresses

```bash
# Aave V3 (use token addresses)
"0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"  # USDC
"0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599"  # WBTC

# Compound V3 (use comet address)  
"0xc3d688B66703497DAA19211EEdff47f25384cdc3"  # USDC Comet
```

## Requirements

- Node.js 18+
- Ethereum RPC URL (free from Alchemy)