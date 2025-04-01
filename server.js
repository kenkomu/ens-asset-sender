require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { ethers } = require('ethers');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Updated for ethers.js v6
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Basic health check
app.get('/', (req, res) => {
  res.send('ENS Asset Sender Backend');
});

// We'll add our routes here
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


  // Base Name Service contract address (testnet)
const BASE_NS_CONTRACT = '0x...'; // Replace with actual Base NS testnet contract

// ABI for the resolver function
const BASE_NS_ABI = [
  "function getNode(bytes32 node) public view returns (address)",
];

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

    // Base names use namehash algorithm similar to ENS - updated for v6
    const namehash = ethers.namehash(baseName);
    const contract = new ethers.Contract(BASE_NS_CONTRACT, BASE_NS_ABI, provider);
    const address = await contract.getNode(namehash);
    
    if (!address || address === ethers.ZeroAddress) {
      return res.status(404).json({ error: 'Base name not found' });
    }

    res.json({ address });
  } catch (error) {
    console.error('Base name resolution error:', error);
    res.status(500).json({ error: 'Failed to resolve Base name' });
  }
});

/**
 * @route POST /send-asset
 * @description Send ETH or tokens to an address or name
 */
app.post('/send-asset', async (req, res) => {
    try {
      const { recipient, amount, isEth = true, tokenAddress } = req.body;
      
      if (!recipient || !amount) {
        return res.status(400).json({ error: 'Recipient and amount are required' });
      }
  
      let recipientAddress = recipient;
      
      // Check if it's an ENS or Base name (contains .eth or .base)
      if (recipient.includes('.eth')) {
        recipientAddress = await provider.resolveName(recipient);
      } else if (recipient.includes('.base')) {
        const namehash = ethers.namehash(recipient);
        const contract = new ethers.Contract(BASE_NS_CONTRACT, BASE_NS_ABI, provider);
        recipientAddress = await contract.getNode(namehash);
      }
  
      if (!ethers.isAddress(recipientAddress)) {
        return res.status(400).json({ error: 'Invalid recipient address' });
      }
  
      let tx;
      
      if (isEth) {
        // Send ETH
        tx = await wallet.sendTransaction({
          to: recipientAddress,
          value: ethers.parseEther(amount.toString())
        });
      } else {
        // Send ERC20 token
        if (!tokenAddress) {
          return res.status(400).json({ error: 'Token address is required for token transfers' });
        }
        
        const tokenAbi = [
          "function transfer(address to, uint amount) returns (bool)",
        ];
        
        const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, wallet);
        tx = await tokenContract.transfer(
          recipientAddress,
          ethers.parseUnits(amount.toString(), 18) // Adjust decimals as needed
        );
      }
  
      res.json({ 
        success: true,
        txHash: tx.hash,
        recipient: recipientAddress
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
});