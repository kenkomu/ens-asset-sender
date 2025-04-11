# ENS Asset Sender

A simple backend service that allows sending ETH and tokens to Ethereum Name Service (ENS) names, Base names, or regular Ethereum addresses.

## Features

- Resolve ENS names to Ethereum addresses
- Resolve Base names to Ethereum addresses (on Base mainnet )
- Send ETH to addresses or domain names (on Base mainnet and testnet)
- Send ERC-20 tokens to addresses or domain names

## Prerequisites

- Node.js (v16 or higher recommended)
- npm or yarn
- An Ethereum wallet with some test ETH (for Sepolia testnet)
- RPC URLs for Ethereum and Base networks

## Setup Instructions

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd ens-asset-sender
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Create a `.env` file in the root directory if it doesn't exist
   - Add the following environment variables:
     ```
     RPC_URL=your_ethereum_rpc_url
     PRIVATE_KEY=your_ethereum_private_key
     PORT=10000
     BASE_RPC_URL=https://mainnet.base.org
     BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
     ```
   - Replace `your_ethereum_rpc_url` with your Ethereum RPC URL (e.g., Alchemy/Infura)
   - Replace `your_ethereum_private_key` with your Ethereum wallet private key (without the 0x prefix)
   
   > ⚠️ **WARNING**: Never share your private key or commit the .env file to version control!

4. The application includes Base Name Registry contracts for both mainnet and Sepolia testnet.

## Running the Application

Start the server:

```bash
node server.js
```

The server will start on port 3000 (or the port specified in your .env file).

## API Endpoints

### Health Check
- **GET /**
  - Returns a simple message to confirm the API is running

### Resolve ENS Name
- **POST /resolve-ens**
  - Resolves an ENS name to an Ethereum address
  - Body: `{ "ensName": "vitalik.eth" }`
  - Response: `{ "address": "0x..." }`

### Resolve Base Name
- **POST /resolve-base**
  - Resolves a Base name to an Ethereum address
  - Body: `{ "baseName": "example.base" }` or `{ "baseName": "example" }` (`.base` will be appended if missing)
  - Response: `{ "address": "0x..." }`

### Send Asset
- **POST /send-asset**
  - Sends ETH or an ERC-20 token to an address or name
  - Body (for ETH): 
    ```json
    { 
      "recipient": "vitalik.eth", 
      "amount": "0.001", 
      "isEth": true 
    }
    ```
  - Body (for token): 
    ```json
    { 
      "recipient": "0x1234...", 
      "amount": "10", 
      "isEth": false, 
      "tokenAddress": "0xTokenAddress" 
    }
    ```
  - Response: 
    ```json
    { 
      "success": true,
      "txHash": "0x...", 
      "recipient": "0x..."
    }
    ```

## Name Resolution Support

This service supports three types of name resolution:

1. **ENS Names** (ending in `.eth`): Resolved using the standard ENS resolvers on Ethereum
2. **Base Names** (ending in `.base` or without TLD): Resolved using the Base Name Registry
3. **Base ENS Names** (ending in `.base.eth`): These are ENS subdomains and are resolved through the ENS

## Base Name Resolution

The service tries to resolve Base names using two different methods:
1. First on Base mainnet
2. Then on Base Sepolia testnet as fallback

For each network, it tries two different resolution methods:
1. The `ownerOf` method which treats Base names as NFTs
2. The `resolve` method which is a more standard naming resolution approach

## Testing the API

You can test the API using curl, Postman, or any API client:

### Test Resolving an ENS Name

```bash
curl -X POST http://localhost:3000/resolve-ens \
  -H "Content-Type: application/json" \
  -d '{"ensName": "vitalik.eth"}'
```

### Test Resolving a Base Name

```bash
curl -X POST http://localhost:3000/resolve-base \
  -H "Content-Type: application/json" \
  -d '{"baseName": "fredgitonga.base"}'
```

### Test Sending ETH to an ENS name

```bash
curl -X POST http://localhost:3000/send-asset \
  -H "Content-Type: application/json" \
  -d '{"recipient": "vitalik.eth", "amount": "0.001", "isEth": true}'
```

### Test Sending ETH to a Base name

```bash
curl -X POST http://localhost:3000/send-asset \
  -H "Content-Type: application/json" \
  -d '{"recipient": "fredgitonga.base", "amount": "0.001", "isEth": true}'
```

> **Note**: For testing, use small amounts on a testnet like Sepolia or Base Sepolia.

## License

[MIT License](LICENSE)
