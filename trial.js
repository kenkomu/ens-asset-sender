const { ethers } = require("ethers");
// use ethers@5.7.2
require('dotenv').config();
// Configuration
const providerMainnet = new ethers.providers.JsonRpcProvider("https://mainnet.base.org");
const BASE_ENS_RESOLVER_ADDRESS = "0xC6d566A56A1aFf6508b41f6c90ff131615583BCD";
const CUSTOM_BASE_ENS_RESOLVER_ADDRESS = "00x2161f1a296f73702d69efaa44e466fb2c1c3ab04"; // Base Mainnet SC address
const providerBaseSepolia = new ethers.providers.JsonRpcProvider("https://sepolia.base.org");

// const provider = new ethers.providers.JsonRpcProvider("https://sepolia.base.org");
// const BASE_ENS_RESOLVER_ADDRESS = "0x6533C94869D28fAA8dF77cc63f9e2b2D6Cf77eBA"; // Sepolia testnet resolver address
// Main function to send ETH to Base names
async function SendToBaseName(privateKey, recipientAddress, amountInETH) {
  try {
    // 1. Setup wallet
    const wallet = new ethers.Wallet(privateKey, providerBaseSepolia);
    console.log("Using wallet:", wallet.address);

    // // 2. Resolve Base name
    // console.log(`Resolving ${basename}...`);
    // const recipientAddress = await ResolveBaseName(basename);
    // if (!recipientAddress) {
    //   throw new Error("Resolution failed - name may not exist");
    // }
    // console.log("Resolved to:", recipientAddress);

    // 3. Prepare transaction
    const tx = {
      to: recipientAddress,
      value: ethers.utils.parseEther(amountInETH.toString()),
      // EIP-1559 gas parameters
      type: 2,
      maxFeePerGas: await providerBaseSepolia.getFeeData().then(f => f.maxFeePerGas),
      maxPriorityFeePerGas: await providerBaseSepolia.getFeeData().then(f => f.maxPriorityFeePerGas)
    };

    // 4. Estimate gas
    const estimatedGas = await providerBaseSepolia.estimateGas(tx);
    tx.gasLimit = estimatedGas.mul(12).div(10); // 20% buffer

    // 5. Send transaction
    console.log(`Sending ${amountInETH} ETH to ${recipientAddress}...`);
    const txResponse = await wallet.sendTransaction(tx);
    console.log("Transaction sent:", txResponse.hash);

    // 6. Wait for confirmation (optional)
    console.log("Waiting for confirmation...");
    const receipt = await txResponse.wait();
    console.log(`Confirmed in block ${receipt.blockNumber}`);
    console.log("Status:", receipt.status === 1 ? "Success" : "Failed");

    return {
      success: true,
      hash: txResponse.hash,
      recipient: recipientAddress,
      amount: amountInETH
    };
  } catch (error) {
    console.error("Error in sendToBaseName:", error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Base Name Resolution Function
async function ResolveBaseName(basename) {
  try {
    // Validate name format
    if (!basename.toLowerCase().endsWith('.base.eth')) {
      throw new Error("Only .base.eth names are supported");
    }

    // Create resolver contract instance
    const resolver = new ethers.Contract(
      BASE_ENS_RESOLVER_ADDRESS,
      ["function addr(bytes32 node) view returns (address)"],
      providerMainnet
    );

    // Get namehash
    const node = ethers.utils.namehash(basename);
    console.log("Namehash:", node);

    // Resolve address
    const address = await resolver.addr(node);
    if (address === ethers.constants.AddressZero) {
      throw new Error("No address configured for this name");
    }

    return address;
  } catch (error) {
    console.error("Error in resolveBaseName:", error.message);
    return null;
  }
}

// Example usage (replace with your actual values)
// async function testTransfer() {
//   const privateKey = process.env.PRIVATE_KEY.toString(); // Replace with your private key
//   const result = await sendToBaseName(
//     privateKey,  // Replace with your private key
//     "allanrobinson.base.eth",  // Replace with target .base.eth name
//     0.0002               // Amount in ETH to send
//   );
 
//   console.log("Final result:", result);
// }

module.exports = { ResolveBaseName, SendToBaseName };
// Run the test
// testTransfer().catch(console.error);

