# Yield Pool Watcher 🎯

Real-time DeFi pool monitoring with block-level precision.

## Quick Start

```bash
# 1. Install
npm install

# 2. Configure environment
cat > .env << EOF
# RPC Configuration (get free from alchemy.com)
RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# x402 Payment Configuration  
FACILITATOR_URL=https://facilitator.daydreams.systems
ADDRESS=<your_address>

# Server Config
PORT=3000
HOST=0.0.0.0

# Optional: Default network
DEFAULT_NETWORK=base
EOF


# 3. Run
npm run dev
```

Agent runs on `http://localhost:3000`

## Test It Locally

```bash
# Health check
curl -X POST http://localhost:3000/entrypoints/echo/invoke \
  -H "Content-Type: application/json" \
  -d '{"input":{"text":"Working!"}}'

# Monitor Base Compound V3 
curl -X POST http://localhost:3000/entrypoints/monitor/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "network": "base",
      "protocol_ids": ["compound_v3"],
      "threshold_rules": {"apy_spike_percent": 10, "tvl_drain_percent": 15}
    }
  }'

# Get historical data
curl -X POST http://localhost:3000/entrypoints/get_history/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "pool_id": "compound_v3:base:0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf",
      "limit": 5
    }
  }'
```

## x402 Usage (Live Production)

```bash
# Production endpoint (requires x402 payment)
curl -X POST https://yield-pool-watcher.vercel.app/x402/monitor \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: <payment_header>" \
  -d '{
    "network": "base",
    "protocol_ids": ["compound_v3"],
    "threshold_rules": {"apy_spike_percent": 5}
  }'

# Without payment header (returns 402 with pricing info)
curl -X POST https://yield-pool-watcher.vercel.app/x402/monitor \
  -H "Content-Type: application/json" \
  -d '{"network":"base","protocol_ids":["compound_v3"],"threshold_rules":{}}'
```

## Multi-Chain Examples

```bash
# Ethereum Aave V3
{"network": "ethereum", "protocol_ids": ["aave_v3"], "threshold_rules": {"apy_spike_percent": 10}}

# Polygon Compound V3  
{"network": "polygon", "protocol_ids": ["compound_v3"], "threshold_rules": {"tvl_drain_percent": 20}}

# Base (both protocols)
{"network": "base", "protocol_ids": ["aave_v3", "compound_v3"], "threshold_rules": {"apy_drop_percent": 5}}
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