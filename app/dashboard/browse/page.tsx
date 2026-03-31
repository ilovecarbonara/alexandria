import { RegistryBrowser } from "@/components/RegistryBrowser";

export default function BrowseRegistryPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl text-white">Browse Registry</h1>
        <p className="mt-1 font-mono text-sm text-white/40">
          Search the thesis registry or verify a document against the blockchain
        </p>
      </div>

      <RegistryBrowser />
    </div>
  );
}
