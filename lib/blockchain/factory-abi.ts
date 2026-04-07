// Human-readable ABI for TokenFactory.sol — used client-side with ethers.js v6 BrowserProvider.
export const FACTORY_ABI = [
  "function createToken(string calldata name, string calldata symbol, uint256 initialSupply, uint8 decimalsValue) payable returns (address)",
  "function deploymentFee() view returns (uint256)",
  "function setDeploymentFee(uint256 _fee)",
  "function withdraw()",
  "function owner() view returns (address)",
  "event TokenCreated(address indexed creator, address indexed tokenAddress, string name, string symbol, uint256 initialSupply, uint8 decimals)",
  "event FeeUpdated(uint256 oldFee, uint256 newFee)",
] as const;
