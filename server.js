require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { ethers } = require('ethers');
const { ResolveBaseName } = require('./trial');
const { SendToBaseName } = require('./trial');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Updated for ethers.js v6
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Set up Base providers
const baseProvider = new ethers.providers.JsonRpcProvider(process.env.BASE_RPC_URL || 'https://mainnet.base.org');
const baseSepoliaProvider = new ethers.providers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org');

// Basic health check
app.get('/', (req, res) => {
  res.send('ENS Asset Sender Backend');
});

// Base Name Service contract addresses
const BASE_NAME_REGISTRY = '0x4D046fEC231aD4C31dC9A1F4fEa10663D7CD0987'; // Mainnet
const BASE_NAME_REGISTRY_SEPOLIA = '0x4Ee2F9B7cf3A68966c370F3eb2C16613d3235245'; // Sepolia

const BASE_NAME_ABI = [
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function resolveWithProof(bytes calldata name, bytes calldata data) view returns (bytes memory, uint64)",
  "function resolve(bytes calldata name, bytes calldata data) view returns (bytes memory)"
];

// Helper function to normalize Base name
function normalizeBaseName(name) {
  if (!name.includes('.')) {
    return name + '.base.eth';
  }
  return name;
}

/**
 * @route POST /resolve-ens
 * @description Resolve an ENS name to an Ethereum address
 */
app.post('/resolve-ens', async (req, res) => {
  try {
    const { ensName } = req.body;

    if (!ensName) {
      return res.status(400).json({ error: 'ENS name is required' });
    }

    const address = await provider.resolveName(ensName);

    if (!address) {
      return res.status(404).json({ error: 'ENS name not found' });
    }

    res.json({ address });
  } catch (error) {
    console.error('ENS resolution error:', error);
    res.status(500).json({ error: 'Failed to resolve ENS name' });
  }
});

/**
 * @route POST /resolve-base
 * @description Resolve a Base name to an Ethereum address
 */
app.post('/resolve-base', async (req, res) => {
  try {
    const { baseName } = req.body;

    if (!baseName) {
      return res.status(400).json({ error: 'Base name is required' });
    }

    // First check if it's a .base.eth name (which is resolved through ENS)
    if (baseName.endsWith('.base.eth')) {
      const address = await ResolveBaseName(baseName);

      if (!address) {
        return res.status(404).json({ error: 'Base.eth name not found' });
      }

      return res.json({ address });
    }

    // Fallback to Sepolia resolution
    const normalizedName = normalizeBaseName(baseName);
    console.log(`Attempting to resolve ${normalizedName} on Base Sepolia`);

    const sepoliaContract = new ethers.Contract(
      BASE_NAME_REGISTRY_SEPOLIA,
      BASE_NAME_ABI,
      baseSepoliaProvider
    );

    // Try the ownerOf method first
    try {
      const tokenId = ethers.keccak256(ethers.toUtf8Bytes(normalizedName));
      console.log(`Trying ownerOf with token ID: ${tokenId}`);
      const owner = await sepoliaContract.ownerOf(tokenId);
      console.log(`Found owner on Sepolia: ${owner}`);
      return res.json({ address: owner });
    } catch (e) {
      console.log('Sepolia ownerOf method failed:', e.message);
    }

    throw new Error('Base name resolution failed on Sepolia');
  } catch (error) {
    console.error('Base name resolution error:', error);
    res.status(500).json({ error: 'Failed to resolve Base name' });
  }
});

/**
 * @route POST /send-asset
 * @description Send ETH or tokens to an address or name
 */
// @route POST /send-asset
// @description Send ETH or tokens to an address or name
app.post('/send-asset', async (req, res) => {
  try {
    const { recipient, amount, isEth = true, tokenAddress } = req.body;

    if (!recipient || !amount) {
      return res.status(400).json({ error: 'Recipient and amount are required' });
    }

    let recipientAddress = recipient;

    // If it's not a direct address, resolve it
    if (!ethers.utils.isAddress(recipient)) {
      if (recipient.endsWith('.base.eth')) {
        recipientAddress = await ResolveBaseName(recipient);
        if (!recipientAddress) {
          return res.status(400).json({ error: 'Failed to resolve .base.eth name' });
        }
        console.log(`Resolved .base.eth to: ${recipientAddress}`);
      } else if (recipient.endsWith('.eth')) {
        recipientAddress = await provider.resolveName(recipient);
        if (!recipientAddress) {
          return res.status(404).json({ error: 'ENS name could not be resolved' });
        }
        console.log(`Resolved ENS (.eth) to: ${recipientAddress}`);
      } else {
        const normalizedName = normalizeBaseName(recipient);
        console.log(`Attempting to resolve ${normalizedName} via internal /resolve-base endpoint`);

        const resolveResponse = await new Promise((resolve) => {
          const mockReq = { body: { baseName: normalizedName } };
          const mockRes = {
            json: (data) => resolve({ status: 200, data }),
            status: (code) => ({ json: (data) => resolve({ status: code, data }) }),
          };

          app._router.handle(
            { ...mockReq, method: 'POST', url: '/resolve-base', path: '/resolve-base' },
            mockRes
          );
        });

        if (resolveResponse.status === 200) {
          recipientAddress = resolveResponse.data.address;
          console.log(`Resolved Base name to: ${recipientAddress}`);
        } else {
          throw new Error(resolveResponse.data.error);
        }
      }
    }

    // Final check
    if (!ethers.utils.isAddress(recipientAddress)) {
      return res.status(400).json({ error: 'Invalid recipient address or unresolvable name' });
    }

    // Fetch the current gas price from the network
    const gasPrice = await provider.getGasPrice();
    console.log(`Current gas price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei`);

    let tx;

    // ETH transfer
    if (isEth) {
      // Send ETH via Ethereum wallet
      tx = await wallet.sendTransaction({
        to: recipientAddress,
        value: ethers.utils.parseEther(amount.toString()),
        gasPrice: gasPrice, // Use dynamic gas price
      });
    } else {
      // Token transfer
      if (!tokenAddress) {
        return res.status(400).json({ error: 'Token address is required for token transfers' });
      }

      const tokenAbi = ["function transfer(address to, uint amount) returns (bool)"];
      const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, wallet);

      tx = await tokenContract.transfer(
        recipientAddress,
        ethers.parseUnits(amount.toString(), 18), // Adjust decimals if needed
        { gasPrice: gasPrice } // Use dynamic gas price
      );
    }

    res.json({
      success: true,
      txHash: tx.hash || tx.txHash || null,
      recipient: recipientAddress,
      amount,
    });

  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ error: 'Failed to send transaction', details: error.message });
  }
});

// Add this before app.listen()
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Using Ethereum RPC: ${process.env.RPC_URL}`);
  console.log(`Using Base RPC: ${process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'}`);
});
