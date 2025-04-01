# ENS Asset Sender

A simple backend service that allows sending ETH and tokens to Ethereum Name Service (ENS) names or regular Ethereum addresses.

## Features

- Resolve ENS names to Ethereum addresses
- Resolve Base names to Ethereum addresses (when configured)
- Send ETH to addresses or ENS names
- Send ERC-20 tokens to addresses or ENS names

## Prerequisites

- Node.js (v16 or higher recommended)
- npm or yarn
- An Ethereum wallet with some test ETH (for Sepolia testnet)
- RPC URL (e.g., from Alchemy, Infura, or other providers)

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
     PRIVATE_KEY=your_private_key
     PORT=3000
     ```
   - Replace `your_ethereum_rpc_url` with your Ethereum RPC URL (e.g., Alchemy/Infura)
   - Replace `your_private_key` with your Ethereum wallet private key (without the 0x prefix)
   
   > ⚠️ **WARNING**: Never share your private key or commit the .env file to version control!

4. If you want to use Base name resolution, update the `BASE_NS_CONTRACT` in `server.js` with the correct contract address.

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
  - Body: `{ "baseName": "example.base" }`
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

## Testing the API

You can test the API using curl, Postman, or any API client:

### Test Resolving an ENS Name

```bash
curl -X POST http://localhost:3000/resolve-ens \
  -H "Content-Type: application/json" \
  -d '{"ensName": "vitalik.eth"}'
```

### Test Sending ETH

```bash
curl -X POST http://localhost:3000/send-asset \
  -H "Content-Type: application/json" \
  -d '{"recipient": "vitalik.eth", "amount": "0.001", "isEth": true}'
```

> **Note**: For testing, use small amounts on a testnet like Sepolia.

## License

[MIT License](LICENSE)
