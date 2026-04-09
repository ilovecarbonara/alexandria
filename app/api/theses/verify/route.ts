import { NextRequest } from "next/server";
import { verifyOnChain } from "@/lib/blockchain/actions";
import { createClient } from "@/lib/supabase/server";
import { getVersionChain } from "@/lib/actions/theses";

export async function GET(request: NextRequest) {
  const hash = request.nextUrl.searchParams.get("hash");

  if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) {
    return Response.json(
      { error: "A valid SHA-256 hash (64 hex characters) is required." },
      { status: 400 },
    );
  }

  const normalizedHash = hash.toLowerCase();

  // Check blockchain
  let blockchainResult;
  try {
    blockchainResult = await verifyOnChain(normalizedHash);
  } catch (err) {
    console.error("Blockchain verification failed:", err);
    return Response.json(
      { error: "Blockchain verification failed. Please try again." },
      { status: 502 },
    );
  }

  if (!blockchainResult.isRegistered) {
    return Response.json({ isRegistered: false });
  }

  // Fetch metadata from Supabase
  const supabase = await createClient();
  const { data: thesis } = await supabase
    .from("theses")
    .select(
      "id, title, author_name, thesis_level, thesis_category, submission_type, sha256_hash, tx_hash, status, registered_at",
    )
    .eq("sha256_hash", normalizedHash)
    .single();

  // Fetch version chain if thesis exists
  let versionChain = undefined;
  if (thesis) {
    const chainResult = await getVersionChain(thesis.id);
    if (chainResult.data && chainResult.data.length > 1) {
      versionChain = chainResult.data;
    }
  }

  return Response.json({
    isRegistered: true,
    blockchain: blockchainResult.record,
    thesis: thesis ?? null,
    versionChain,
  });
}
