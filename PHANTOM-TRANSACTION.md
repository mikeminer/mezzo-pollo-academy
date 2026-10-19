# Phantom Arcade transaction transport

The injected Phantom provider receives an official `@solana/web3.js` `Transaction` through `signAndSendTransaction(transaction)`. The website constructs the canonical Arcade message locally, prefixes its required empty signature slot, and deserializes the resulting unsigned full transaction with `Transaction.from`. No server-provided transaction is used for signing.

The former low-level `request` path passed message-only bytes. The observed provider interpreted them as a complete transaction: the leading byte `1` looked like a signature count, so it skipped 64 bytes and read `0xb9` as a version prefix, reporting unsupported version `57`. The complete unsigned legacy transaction is 338 bytes; its message begins at byte 65 with `1`, the legacy required-signature count.

`Transaction.from` initializes the empty signature slot as well as the message. This preserves the original account ordering across repeated `serializeMessage()` and `serialize({ requireAllSignatures: false, verifySignatures: false })` calls. `Transaction.populate(message)` without signature slots would invalidate its cached message during the first serialization and reorder readonly accounts on the next call.

The direct Phantom call is attempted exactly once. Neither a rejection nor a transport failure falls back to `request`; existing checkout recovery retains ambiguous payments. The native APK and web Mobile Wallet Adapter return through their existing branches before the lazy import of the browser-only transaction bundle.

## Build and dependencies

`@solana/web3.js` is pinned to registry version `1.99.0` as a build-only dependency. `npm run build:transaction` bundles its original shipped `src/message/legacy.ts` and `src/transaction/legacy.ts` classes without changing their implementation. The generated same-origin artifact is `vendor/solana-transaction.mjs`; the build manifest records retained inputs and bundled third-party licenses are included beside it.

The package's unused RPC dependencies produce four moderate `npm audit` findings through `jayson`, `stream-json` and `uuid`. The actual browser bundle excludes all three, as well as `rpc-websockets`; no RPC client from this package is used by the site or server. Existing server dependencies are unchanged.

## Checks

`tests/phantom-transaction.test.mjs` decodes every tier with the official classes, compares the full wire byte-for-byte with the server's existing builder, checks repeated serialization, recipient, payer, reference, memo and amount, reproduces the unsupported-version offset, and verifies that the old request path is never called. `tests/arcade-client.test.mjs` and `tests/web-wallet.test.mjs` cover checkout recovery and the unchanged native/MWA paths. These tests use mock providers and submit no transactions.

Official API reference: <https://docs.phantom.com/solana/sending-a-transaction>.
