const { ethers } = require("ethers");

// Configuration
const provider = new ethers.providers.JsonRpcProvider("https://mainnet.base.org");
const BASE_ENS_RESOLVER_ADDRESS = "0xC6d566A56A1aFf6508b41f6c90ff131615583BCD";

// Main function to send ETH to Base names
async function sendToBaseName(privateKey, basename, amountInETH) {
  try {
    // 1. Setup wallet
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log("Using wallet:", wallet.address);

    // 2. Resolve Base name
    console.log(`Resolving ${basename}...`);
    const recipientAddress = await resolveBaseName(basename);
    if (!recipientAddress) {
      throw new Error("Resolution failed - name may not exist");
    }
    console.log("Resolved to:", recipientAddress);

    // 3. Prepare transaction
    const tx = {
      to: recipientAddress,
      value: ethers.utils.parseEther(amountInETH.toString()),
      // EIP-1559 gas parameters
      type: 2,
      maxFeePerGas: await provider.getFeeData().then(f => f.maxFeePerGas),
      maxPriorityFeePerGas: await provider.getFeeData().then(f => f.maxPriorityFeePerGas)
    };

    // 4. Estimate gas
    const estimatedGas = await provider.estimateGas(tx);
    tx.gasLimit = estimatedGas.mul(12).div(10); // 20% buffer

    // 5. Send transaction
    console.log(`Sending ${amountInETH} ETH to ${basename}...`);
    const txResponse = await wallet.sendTransaction(tx);
    console.log("Transaction sent:", txResponse.hash);

    // 6. Wait for confirmation (optional)
    console.log("Waiting for confirmation...");
    const receipt = await txResponse.wait();
    console.log(`Confirmed in block ${receipt.blockNumber}`);
    console.log("Status:", receipt.status === 1 ? "Success" : "Failed");

    return {
      success: true,
      txHash: txResponse.hash,
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
async function resolveBaseName(basename) {
  try {
    // Validate name format
    if (!basename.toLowerCase().endsWith('.base.eth')) {
      throw new Error("Only .base.eth names are supported");
    }

    // Create resolver contract instance
    const resolver = new ethers.Contract(
      BASE_ENS_RESOLVER_ADDRESS,
      ["function addr(bytes32 node) view returns (address)"],
      provider
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
async function testTransfer(basename, amount) {
  const result = await sendToBaseName(
    process.env.PRIVATE_KEY,  // Replace with your private key
    basename,  // Replace with target .base.eth name
    amount                // Amount in ETH to send
  );
 
  console.log("Final result:", result);
}

// Run the test
testTransfer().catch(console.error);