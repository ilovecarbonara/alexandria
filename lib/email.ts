import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "Alexandria <onboarding@resend.dev>";

function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
  };
  return str.replace(/[&<>"']/g, (char) => map[char]);
}

export async function sendTitleAlertEmail({
  recipientEmail,
  recipientName,
  theirTitle,
  incomingTitle,
  txHash,
  registeredAt,
}: {
  recipientEmail: string;
  recipientName: string;
  theirTitle: string;
  incomingTitle: string;
  txHash: string;
  registeredAt: string;
}) {
  const etherscanUrl = `https://sepolia.etherscan.io/tx/${txHash}`;

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: recipientEmail,
    subject:
      "A new thesis with a similar title has been registered on Alexandria",
    html: `
      <div style="font-family: monospace; color: #ededed; background: #0D0F12; padding: 32px;">
        <h2 style="font-family: serif; margin-bottom: 24px;">Title Similarity Alert</h2>
        <p>Hello ${escapeHtml(recipientName)},</p>
        <p>A new thesis with a title similar to yours has been registered on Alexandria.</p>
        <table style="margin: 16px 0; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 12px 4px 0; color: #999;">Your thesis:</td>
            <td style="padding: 4px 0;">${escapeHtml(theirTitle)}</td>
          </tr>
          <tr>
            <td style="padding: 4px 12px 4px 0; color: #999;">New thesis:</td>
            <td style="padding: 4px 0;">${escapeHtml(incomingTitle)}</td>
          </tr>
          <tr>
            <td style="padding: 4px 12px 4px 0; color: #999;">Registered:</td>
            <td style="padding: 4px 0;">${registeredAt}</td>
          </tr>
          <tr>
            <td style="padding: 4px 12px 4px 0; color: #999;">Transaction:</td>
            <td style="padding: 4px 0;"><a href="${etherscanUrl}" style="color: #5CC8FF;">${escapeHtml(txHash)}</a></td>
          </tr>
        </table>
        <p>This is an informational alert only. No action is required.</p>
        <p style="margin-top: 24px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/verify" style="color: #4A90D9;">
            View the public verification interface →
          </a>
        </p>
      </div>
    `,
  });

  return { success: !error, error };
}

export async function sendStatusChangeEmail({
  recipientEmail,
  recipientName,
  thesisTitle,
  newStatus,
  txHash,
}: {
  recipientEmail: string;
  recipientName: string;
  thesisTitle: string;
  newStatus: "accepted" | "rejected";
  txHash: string;
}) {
  const etherscanUrl = `https://sepolia.etherscan.io/tx/${txHash}`;
  const statusLabel = newStatus === "accepted" ? "Accepted" : "Rejected";
  const statusColor = newStatus === "accepted" ? "#2ECC8F" : "#C0392B";

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: recipientEmail,
    subject: `Your thesis registration has been ${statusLabel.toLowerCase()}`,
    html: `
      <div style="font-family: monospace; color: #ededed; background: #0D0F12; padding: 32px;">
        <h2 style="font-family: serif; margin-bottom: 24px;">Thesis Status Update</h2>
        <p>Hello ${escapeHtml(recipientName)},</p>
        <p>The status of your thesis registration has been updated.</p>
        <table style="margin: 16px 0; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 12px 4px 0; color: #999;">Thesis:</td>
            <td style="padding: 4px 0;">${escapeHtml(thesisTitle)}</td>
          </tr>
          <tr>
            <td style="padding: 4px 12px 4px 0; color: #999;">Status:</td>
            <td style="padding: 4px 0; color: ${statusColor}; font-weight: bold;">${statusLabel}</td>
          </tr>
          <tr>
            <td style="padding: 4px 12px 4px 0; color: #999;">Transaction:</td>
            <td style="padding: 4px 0;"><a href="${etherscanUrl}" style="color: #5CC8FF;">${escapeHtml(txHash)}</a></td>
          </tr>
        </table>
      </div>
    `,
  });

  return { success: !error, error };
}
