import { Card } from "@/components/ui";
import {
  DEFAULT_TITLE_ALERT_THRESHOLD,
  DEFAULT_AUTO_FLAG_THRESHOLD,
} from "@/lib/constants";

export default function AdminSettingsPage() {
  const contractAddress = process.env.CONTRACT_ADDRESS ?? "Not configured";
  const threshold =
    parseFloat(process.env.TITLE_ALERT_THRESHOLD ?? "") ||
    DEFAULT_TITLE_ALERT_THRESHOLD;
  const autoFlagThreshold =
    parseFloat(process.env.AUTO_FLAG_THRESHOLD ?? "") ||
    DEFAULT_AUTO_FLAG_THRESHOLD;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-white">Settings</h1>
        <p className="mt-1 font-mono text-sm text-white/40">
          System configuration (read-only)
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-heading text-lg text-white">
            Blockchain Configuration
          </h2>
          <dl className="space-y-4">
            <div>
              <dt className="font-mono text-xs text-white/40 uppercase">
                Network
              </dt>
              <dd className="mt-1 font-mono text-sm text-white/90">
                Sepolia Testnet
              </dd>
            </div>
            <div>
              <dt className="font-mono text-xs text-white/40 uppercase">
                Contract Address
              </dt>
              <dd className="mt-1 break-all font-mono text-sm text-hash">
                {contractAddress}
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="mb-4 font-heading text-lg text-white">
            Title Similarity
          </h2>
          <dl className="space-y-4">
            <div>
              <dt className="font-mono text-xs text-white/40 uppercase">
                Alert Threshold
              </dt>
              <dd className="mt-1 font-mono text-sm text-white/90">
                {(threshold * 100).toFixed(0)}% ({threshold})
              </dd>
            </div>
            <div>
              <dt className="font-mono text-xs text-white/40 uppercase">
                Source
              </dt>
              <dd className="mt-1 font-mono text-sm text-white/60">
                {process.env.TITLE_ALERT_THRESHOLD
                  ? "Environment variable (TITLE_ALERT_THRESHOLD)"
                  : "Default value"}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-xs text-white/40 uppercase">
                Auto-Flag Threshold
              </dt>
              <dd className="mt-1 font-mono text-sm text-white/90">
                {(autoFlagThreshold * 100).toFixed(0)}% ({autoFlagThreshold})
              </dd>
            </div>
            <div>
              <dt className="font-mono text-xs text-white/40 uppercase">
                Auto-Flag Source
              </dt>
              <dd className="mt-1 font-mono text-sm text-white/60">
                {process.env.AUTO_FLAG_THRESHOLD
                  ? "Environment variable (AUTO_FLAG_THRESHOLD)"
                  : "Default value"}
              </dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
