import { ethers } from "ethers";

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY!;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS!;

export const THESIS_REGISTRY_ABI = [
  "event ThesisRegistered(string sha256Hash, address registeredBy, uint256 timestamp)",
  "function registerThesis(string _sha256Hash, string _submissionType, string _thesisLevel, string _thesisCategory) external",
  "function getThesis(string _sha256Hash) external view returns (tuple(string sha256Hash, string submissionType, string thesisLevel, string thesisCategory, uint256 timestamp, address registeredBy))",
  "function isRegistered(string _sha256Hash) public view returns (bool)",
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
