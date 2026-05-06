import { ethers } from "ethers";

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY!;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS!;

export const THESIS_REGISTRY_ABI = [
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
  "event ThesisRegistered(bytes32 indexed sha256Hash, address indexed registeredBy, uint256 indexed timestamp)",
  "function owner() external view returns (address)",
  "function transferOwnership(address newOwner) external",
  "function registerThesis(bytes32 _sha256Hash, string _submissionType, string _thesisLevel, string _thesisCategory) external",
  "function getThesis(bytes32 _sha256Hash) external view returns (tuple(bytes32 sha256Hash, string submissionType, string thesisLevel, string thesisCategory, uint256 timestamp, address registeredBy))",
  "function isRegistered(bytes32 _sha256Hash) public view returns (bool)",
] as const;

export function getProvider() {
  return new ethers.JsonRpcProvider(
    `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  );
}

export function getContract(signerOrProvider?: ethers.Signer | ethers.Provider) {
  return new ethers.Contract(
    CONTRACT_ADDRESS,
    THESIS_REGISTRY_ABI,
    signerOrProvider ?? getProvider(),
  );
}

export function getWallet() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY is not set");
  }
  return new ethers.Wallet(privateKey, getProvider());
}
