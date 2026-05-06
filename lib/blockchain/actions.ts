import { getContract, getWallet } from "./config";

const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/i;
const BYTES32_HEX_PATTERN = /^0x[a-f0-9]{64}$/i;

function toBytes32Hash(sha256Hash: string): `0x${string}` {
  const normalizedHash = sha256Hash.trim().toLowerCase();

  if (BYTES32_HEX_PATTERN.test(normalizedHash)) {
    return normalizedHash as `0x${string}`;
  }

  if (SHA256_HEX_PATTERN.test(normalizedHash)) {
    return `0x${normalizedHash}`;
  }

  throw new Error("SHA-256 hash must be 64 hex characters");
}

function fromBytes32Hash(bytes32Hash: string): string {
  const normalizedHash = bytes32Hash.toLowerCase();

  if (BYTES32_HEX_PATTERN.test(normalizedHash)) {
    return normalizedHash.slice(2);
  }

  return normalizedHash;
}

export async function registerOnChain(
  sha256Hash: string,
  submissionType: string,
  thesisLevel: string,
  thesisCategory: string,
): Promise<{ txHash: string; blockTimestamp: number }> {
  const wallet = getWallet();
  const contract = getContract(wallet);
  const bytes32Hash = toBytes32Hash(sha256Hash);

  const tx = await contract.registerThesis(
    bytes32Hash,
    submissionType,
    thesisLevel,
    thesisCategory,
  );
  const receipt = await Promise.race([
    tx.wait(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Transaction timeout")), 60_000),
    ),
  ]);

  const block = await receipt.getBlock();

  return {
    txHash: receipt.hash,
    blockTimestamp: block.timestamp,
  };
}

export async function verifyOnChain(
  sha256Hash: string,
): Promise<{
  isRegistered: boolean;
  record?: {
    sha256Hash: string;
    submissionType: string;
    thesisLevel: string;
    thesisCategory: string;
    timestamp: number;
    registeredBy: string;
  };
}> {
  const contract = getContract();
  const bytes32Hash = toBytes32Hash(sha256Hash);

  const registered = await contract.isRegistered(bytes32Hash);
  if (!registered) {
    return { isRegistered: false };
  }

  const record = await contract.getThesis(bytes32Hash);
  return {
    isRegistered: true,
    record: {
      sha256Hash: fromBytes32Hash(record.sha256Hash),
      submissionType: record.submissionType,
      thesisLevel: record.thesisLevel,
      thesisCategory: record.thesisCategory,
      timestamp: Number(record.timestamp),
      registeredBy: record.registeredBy,
    },
  };
}

export async function isRegisteredOnChain(sha256Hash: string): Promise<boolean> {
  const contract = getContract();
  return contract.isRegistered(toBytes32Hash(sha256Hash));
}
