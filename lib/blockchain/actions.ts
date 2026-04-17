import { getContract, getWallet } from "./config";

export async function registerOnChain(
  sha256Hash: string,
  submissionType: string,
  thesisLevel: string,
  thesisCategory: string,
): Promise<{ txHash: string; blockTimestamp: number }> {
  const wallet = getWallet();
  const contract = getContract(wallet);

  const tx = await contract.registerThesis(
    sha256Hash,
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

  const registered = await contract.isRegistered(sha256Hash);
  if (!registered) {
    return { isRegistered: false };
  }

  const record = await contract.getThesis(sha256Hash);
  return {
    isRegistered: true,
    record: {
      sha256Hash: record.sha256Hash,
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
  return contract.isRegistered(sha256Hash);
}
