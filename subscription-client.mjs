// Same-origin endpoint keeps the private RPC key out of browser/APK assets.
export async function readSubscriptionEvidence(wallet, { signal, fetchImpl = globalThis.fetch } = {}) {
  const response = await fetchImpl(`/api/subscription?wallet=${encodeURIComponent(wallet)}`, {
    signal, credentials: 'omit', cache: 'no-store',
  });
  if (!response.ok) {
    const error = Error('Subscription verification unavailable');
    if (response.status === 429) error.retryAfterSeconds = 30;
    throw error;
  }
  return response.json();
}
