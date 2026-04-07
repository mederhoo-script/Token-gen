import { ethers } from "ethers";
import { CHAIN_CONFIG } from "./constants";

interface DeployTokenParams {
  name: string;
  symbol: string;
  initialSupply: number;
  decimals: number;
}

interface DeployTokenResult {
  contractAddress: string;
  deploymentTxHash: string;
  deployedAt: string;
  explorerUrl: string;
}

// ABI for the Token constructor
const TOKEN_ABI = [
  "constructor(string name, string symbol, uint256 initialSupply, uint8 decimalsValue)",
  "event TokenDeployed(address indexed deployer, uint256 initialSupply)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
];

function getProvider(): ethers.JsonRpcProvider {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  if (!rpcUrl) throw new Error("SEPOLIA_RPC_URL is not configured");
  return new ethers.JsonRpcProvider(rpcUrl);
}

function getWallet(provider: ethers.JsonRpcProvider): ethers.Wallet {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) throw new Error("DEPLOYER_PRIVATE_KEY is not configured");
  return new ethers.Wallet(privateKey, provider);
}

function getBytecode(): string {
  // TOKEN_BYTECODE must be set in env — compile Token.sol with hardhat/foundry and paste the bytecode
  const bytecode = process.env.TOKEN_BYTECODE;
  if (!bytecode) {
    throw new Error(
      "TOKEN_BYTECODE is not configured. Compile Token.sol and set the bytecode in your environment.",
    );
  }
  return bytecode;
}

export async function estimateDeploymentGas(
  params: DeployTokenParams,
): Promise<{ gasEstimate: bigint; gasCost: string }> {
  const provider = getProvider();
  const bytecode = getBytecode();

  // No wallet needed for estimation — use ZeroAddress as a placeholder sender.
  const factory = new ethers.ContractFactory(TOKEN_ABI, bytecode);
  const deployTx = await factory.getDeployTransaction(
    params.name,
    params.symbol,
    params.initialSupply,
    params.decimals,
  );

  const gasEstimate = await provider.estimateGas({
    ...deployTx,
    from: ethers.ZeroAddress,
  });

  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? ethers.parseUnits("20", "gwei");
  const costWei = gasEstimate * gasPrice;
  const costEth = ethers.formatEther(costWei);

  return { gasEstimate, gasCost: `${parseFloat(costEth).toFixed(6)} ETH` };
}

export async function deployToken(params: DeployTokenParams): Promise<DeployTokenResult> {
  const provider = getProvider();
  const wallet = getWallet(provider);
  const bytecode = getBytecode();

  const factory = new ethers.ContractFactory(TOKEN_ABI, bytecode, wallet);

  const deployTx = await factory.getDeployTransaction(
    params.name,
    params.symbol,
    params.initialSupply,
    params.decimals,
  );

  const gasEstimate = await provider.estimateGas({
    ...deployTx,
    from: wallet.address,
  });

  if (gasEstimate > BigInt(3_000_000)) {
    throw new Error("Gas estimation too high — possible misconfiguration");
  }

  const contract = await factory.deploy(
    params.name,
    params.symbol,
    params.initialSupply,
    params.decimals,
    { gasLimit: (gasEstimate * BigInt(120)) / BigInt(100) },
  );

  const receipt = await contract.deploymentTransaction()!.wait(1);
  if (!receipt) throw new Error("Deployment receipt not received");

  const contractAddress = await contract.getAddress();
  const txHash = receipt.hash;
  const deployedAt = new Date().toISOString();
  const explorerUrl = `${CHAIN_CONFIG.explorerUrl}/tx/${txHash}`;

  return { contractAddress, deploymentTxHash: txHash, deployedAt, explorerUrl };
}
