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
# Health check (works with no parameters - uses default greeting)
curl -X POST http://localhost:3000/entrypoints/echo/invoke \
  -H "Content-Type: application/json" \
  -d '{"input":{}}'

# OR with custom text
curl -X POST http://localhost:3000/entrypoints/echo/invoke \
  -H "Content-Type: application/json" \
  -d '{"input":{"text":"Working!"}}'

# Monitor (works with no parameters - defaults to Base + Compound V3)
curl -X POST http://localhost:3000/entrypoints/monitor/invoke \
  -H "Content-Type: application/json" \
  -d '{"input":{}}'

# OR with custom parameters  
curl -X POST http://localhost:3000/entrypoints/monitor/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "network": "ethereum",
      "protocol_ids": ["aave_v3"],
      "threshold_rules": {"apy_spike_percent": 5}
    }
  }'

# Get history (works with no parameters - defaults to Compound V3 USDC on Base)
curl -X POST http://localhost:3000/entrypoints/get_history/invoke \
  -H "Content-Type: application/json" \
  -d '{"input":{}}'

# OR with specific pool
curl -X POST http://localhost:3000/entrypoints/get_history/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "pool_id": "aave_v3:ethereum:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "limit": 10
    }
  }'
```

## x402 Usage (Live Production)

**Perfect for x402scan users - no parameters needed!** ✅ FIXED

**All endpoints now work with empty `{}` request bodies!**

```bash
# Just pay and get results! (uses smart defaults)
curl -X POST https://yield-pool-watcher.vercel.app/x402/echo \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: <payment_header>" \
  -d '{}'

curl -X POST https://yield-pool-watcher.vercel.app/x402/monitor \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: <payment_header>" \
  -d '{}'

curl -X POST https://yield-pool-watcher.vercel.app/x402/get_history \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: <payment_header>" \
  -d '{}'

# OR customize parameters if you want specific behavior
curl -X POST https://yield-pool-watcher.vercel.app/x402/monitor \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: <payment_header>" \
  -d '{
    "network": "ethereum",
    "protocol_ids": ["aave_v3"],
    "threshold_rules": {"apy_spike_percent": 2}
  }'

# Without payment header (returns 402 with pricing info)
curl -X POST https://yield-pool-watcher.vercel.app/x402/monitor \
  -H "Content-Type: application/json" \
  -d '{}'
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

## Smart Defaults (Perfect for x402scan!)

All endpoints work with **zero parameters** using intelligent defaults:

- **📞 Echo**: Default greeting message with system status
- **📊 Monitor**: Base network + Compound V3 + 10% APY alerts  
- **📈 History**: Compound V3 USDC pool on Base (last 5 entries)

**Users can just pay via x402scan and get instant results!**

## Features

✅ **Within 1 block detection** - Real-time monitoring  
✅ **Direct Aave V3 & Compound V3** - No aggregated APIs  
✅ **Smart alerts** - APY/TVL threshold breaches  
✅ **Production ready** - Full error handling  
✅ **x402scan compatible** - Zero-config payments  


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