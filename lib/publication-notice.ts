/**
 * Persists "Don't show again" for the publication consent notice.
 *
 * Deliberately swallows its own failures: the researcher has already consented
 * and their submission must not be held up by a preference write. A failure
 * costs them nothing worse than seeing the notice again on the next visit.
 */
export async function acknowledgePublicationNotice(): Promise<void> {
  try {
    await fetch("/api/account/publication-notice", { method: "POST" });
  } catch {
    // Preference only — nothing to recover.
  }
}
