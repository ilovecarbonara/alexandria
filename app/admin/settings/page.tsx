import { Card } from "@/components/ui";
import {
  DEFAULT_TITLE_ALERT_THRESHOLD,
  DEFAULT_AUTO_FLAG_THRESHOLD,
} from "@/lib/constants";

export default function AdminSettingsPage() {
  const contractAddress = process.env.CONTRACT_ADDRESS ?? "Not configured";
  const contractUrl = /^0x[a-f0-9]{40}$/i.test(contractAddress)
    ? `https://sepolia.etherscan.io/address/${contractAddress}`
    : null;
  const threshold =
    parseFloat(process.env.TITLE_ALERT_THRESHOLD ?? "") ||
    DEFAULT_TITLE_ALERT_THRESHOLD;
  const autoFlagThreshold =
    parseFloat(process.env.AUTO_FLAG_THRESHOLD ?? "") ||
    DEFAULT_AUTO_FLAG_THRESHOLD;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-ink">Settings</h1>
        <p className="mt-1 text-sm text-ink-subtle">
          System configuration (read-only)
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-heading text-lg text-ink">
            Blockchain Configuration
          </h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-xs text-ink-subtle uppercase">
                Network
              </dt>
              <dd className="mt-1 text-sm text-ink">
                Sepolia Testnet
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-subtle uppercase">
                Contract Address
              </dt>
              <dd className="mt-1 break-all text-sm font-mono text-ink-muted">
                {contractUrl ? (
                  <a
                    href={contractUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors hover:text-primary"
                  >
                    {contractAddress}
                  </a>
                ) : (
                  contractAddress
                )}
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="mb-4 font-heading text-lg text-ink">
            Title Similarity
          </h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-xs text-ink-subtle uppercase">
                Alert Threshold
              </dt>
              <dd className="mt-1 text-sm text-ink">
                {(threshold * 100).toFixed(0)}% ({threshold})
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-subtle uppercase">
                Source
              </dt>
              <dd className="mt-1 text-sm text-ink-muted">
                {process.env.TITLE_ALERT_THRESHOLD
                  ? "Environment variable (TITLE_ALERT_THRESHOLD)"
                  : "Default value"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-subtle uppercase">
                Auto-Flag Threshold
              </dt>
              <dd className="mt-1 text-sm text-ink">
                {(autoFlagThreshold * 100).toFixed(0)}% ({autoFlagThreshold})
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-subtle uppercase">
                Auto-Flag Source
              </dt>
              <dd className="mt-1 text-sm text-ink-muted">
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
