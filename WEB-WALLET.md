# Website wallet connections

`game-wallet.mjs` loads the reviewed, same-origin Mobile Wallet Adapter bundle and exposes `window.MezzoWallet`. Initialization only makes the adapter available; it does not connect, authorize, check token holdings, or request a signature.

Provider priority is the APK's existing native bridge, an injected Phantom provider (`window.phantom.solana`, with a flagged `window.solana` fallback), then Mobile Wallet Adapter on secure Android Chrome. Mobile Wallet Adapter supports the Seeker's Seed Vault Wallet and compatible installed wallets. Other mobile browsers should use Phantom's in-app browser link.

The shared adapter exposes:

- `getProvider()` — synchronous discovery, no wallet request.
- `connect()` — must be called directly from a user's click.
- `withPaymentSession(operation)` — must be called directly from a user's payment click, before imports, HTTP requests, or locks. It opens one MWA session and passes an authorized provider to `operation`. Keep the callback alive through preparation and signing; pass this provider to `client.pay(tier, provider)`.

The MWA provider is marked `isMezzoWebWallet`, never `isMezzoMobile`: website payments still use the web backend and its durable ledger. It pins `solana:mainnet` and binds each signing session to the public key returned by authorization. `payArcade(prepared)` checks the payer and the locally pinned Arcade rules, serializes the canonical legacy transaction, and allows at most one signing attempt in that session. It never accepts a server-supplied transaction for signing. Timeouts or a dropped session remain ambiguous and must retain the existing pending-payment record.

Authorization tokens remain in JavaScript memory only. Reload and disconnect forget them. The provider emits `connect` for the first authorization, `accountChanged` for an actual account switch, and `disconnect` when disconnected. The browser entry dispatches `mezzopollo:wallet` for UI refresh. These events do not trigger token verification.

Phantom signing uses `provider.signAndSendTransaction` with an official `Transaction` deserialized from the complete, locally constructed unsigned transaction. The previous message-only `request` call was interpreted as a full transaction by the current extension and failed with unsupported message version 57 before showing approval. The new path verifies exact message bytes, preserves the empty signature slot and never retries another signing method after a rejection or ambiguous result. The transaction helper is imported only after the native and MWA branches have returned.

## Dependencies and verification

The repository pins `@solana-mobile/mobile-wallet-adapter-protocol` at `3.0.1` and `esbuild` at `0.28.2` in the package lock. Regenerate the checked-in bundle with `npm run build:wallet`. `scripts/build-public.mjs` copies `vendor/` without exposing the dependency tree. Wallet transport code is not loaded from a third-party CDN.

The Phantom transaction helper pins `@solana/web3.js` at `1.99.0` as a build dependency. Run `node scripts/build-transaction.mjs` to rebuild `vendor/solana-transaction.mjs` from the original Message/Transaction sources. `vendor/solana-transaction-build.json` records included sources; the unrelated RPC client is excluded. `tests/phantom-transaction.test.mjs` checks all four tiers, repeated serialization, the version-57 regression and absence of automatic signing retries.

Run `node --test --experimental-test-isolation=none tests/web-wallet.test.mjs`. The tests cover synchronous session launch, injected/native provider precedence, independent connection, account switching, canonical payment bytes, cancellation versus ambiguous submission, disconnect races, expired sessions, and overlapping clicks. These mocked tests do not spend SOL or replace a real-device wallet check.

Official references:

- <https://docs.solanamobile.com/get-started/web/apps>
- <https://docs.solanamobile.com/get-started/web/ux-guidelines>
- <https://github.com/solana-mobile/mobile-wallet-adapter/tree/main/js/packages/mobile-wallet-adapter-protocol>
- <https://docs.phantom.com/solana/detecting-the-provider>
