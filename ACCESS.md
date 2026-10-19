# Subscription and the MEMEZZO Shop — 19 October 2026

## Modes and starting lives

The only modes are paid **Arcade** (four tiers; see [ARCADE.md](ARCADE.md)) and **Subscription**. There is no free scored mode. `/practice` is an alias for the same menu. The interactive tutorial remains free training in all 25 country/region profiles.

Subscription requires at least **10,000,000 MEMEZZO** across active DevFridge timelocks of the connected wallet and exact mint `Dv1prgxPZs1M6vpacCzmGjLkd7ZFZVJSHCH9PLwEpump`. The threshold is `10000000000000` raw units at six decimals. No minimum original or remaining duration applies: `unlockAt > now` at manual verification.

Each new Subscription run has one total life per full million, without base lives: 10,000,000 gives 10; 10,999,999 gives 10; 11,000,000 gives 11. Below the threshold, no Subscription entitlement is granted. Subscription retains the slower pace and the old Subscription local score record.

Only explicit Shop actions connect and verify. Entitlement is a snapshot for the page session, cleared by a failed manual check, wallet change, disconnection or reload. No automatic token checks run on game start, retry, resume, foreground return or during play. A lock expiring after verification does not interrupt that session. An ongoing run retains its starting-lives snapshot and remaining lives; checks never refill them.

All scores are local and unverified, with no prizes or leaderboard authority. The tutorial cannot bypass Arcade payment or Subscription admission. Historical recordings and verification reports describe earlier rules.

## Mint evidence

RPC `getAccountInfo` at finalized slot **450424379** reported Token-2022 owner `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`, decimals 6, extensions `metadataPointer` and `tokenMetadata`, and no transfer-fee or transfer-hook extension. Mint authority, freeze authority and metadata update authority were null. [Mint explorer](https://explorer.solana.com/address/Dv1prgxPZs1M6vpacCzmGjLkd7ZFZVJSHCH9PLwEpump).

The existing Fridge mainnet program is `9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6`. It was executable at finalized slot **450427993**. Its Token-2022 requirement was reviewed in [program source](https://github.com/mikeminer/devfridge/blob/9f3a4839b4228ee6365083df624446e234ad6c43/programs/fridge/src/lib.rs). This is an integration review, not a new binary-verification or audit claim.

## Manual Shop verification and session lifetime

The browser connects to the official injected `window.phantom.solana` provider only after a click in the Shop. The Connect action includes the first verification; subsequent checks require the explicit Verify Subscription lives button. Shop verification never requests transaction signatures; Arcade separately requests an explicitly approved SOL transfer. On ordinary mobile browsers without injection, a user-clicked link opens the game inside Phantom. No wallet/address or Subscription entitlement is silently restored from local storage.

Only a requested Shop check reads the endpoint used by the [published DevFridge SDK](https://sdk.devfridge.cool/sdk/devfridge-sdk.js): `https://scan.devfridge.cool/api/sdk/check?wallet=...&mint=...`. The SDK's subscription-plan helper uses whole-day rules, so this game instead uses an exact BigInt evaluator with zero duration minimums. It validates wallet/mint on the response and each lock, raw quantities, duplicates, times and evidence age. Evidence older than 90 seconds or more than five seconds in the future cannot grant an entitlement at verification time. After verification, the entitlement is a session snapshot: there is no expiry timer, polling or foreground refresh. Pending responses for prior wallets are discarded. A failed manual check clears future Subscription access and offers a manual retry, without affecting Arcade or an ongoing run.

The endpoint may be cached for 30 seconds plus 60 seconds stale revalidation. Its previously reviewed `locksForDepositor` implementation can turn an upstream RPC failure into an empty array, so the UI says that sufficient locks are **not confirmed**, rather than claiming the wallet certainly has no locks. This can prevent unlocking future Subscription runs temporarily; it does not grant an entitlement on a failed lookup. Arcade remains available with its own per-run payment.

The access check and lives run in the browser. They are not server authentication, protected code delivery or proof of fair scores. Connecting a public key does not establish a signed server session. This Subscription check does not authenticate scores or award prizes. The separate Arcade checkout has its own payment ledger.

## Locking and redemption

Creation and redemption take place on external DevFridge, with player wallet approval. The game displays the full mint, threshold, no-early-withdrawal rule, network costs and the 2% redemption fee for PASTA buy-and-burn before the external link. Non-PASTA redemption requires an executable Jupiter route; expiry alone does not guarantee immediate redemption. A read-only quote for a 20,000 MEMEZZO fee amount was available during review, but no transaction was signed or simulated and future routing is not guaranteed. Wallet features are presented for adults.

Sources reviewed: [Phantom connection/events](https://docs.phantom.com/solana/establishing-a-connection), [mobile browser link](https://docs.phantom.com/phantom-deeplinks/other-methods/browse), [Fridge documentation](https://docs.devfridge.cool/fridge), [program documentation](https://docs.devfridge.cool/program). Tests and remaining limits are recorded in [VERIFICATION.md](VERIFICATION.md).
