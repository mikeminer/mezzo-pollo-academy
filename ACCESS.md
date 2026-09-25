# MEMEZZO access — 25 September 2026

## Access and starting lives

- Solana mainnet mint: `Dv1prgxPZs1M6vpacCzmGjLkd7ZFZVJSHCH9PLwEpump` (on-chain name POLLO, symbol MEMEZZO).
- Minimum: **1,000,000 MEMEZZO**, exactly `1000000000000` raw units at six decimals.
- Add the amounts of all active DevFridge locks belonging to the connected wallet for this exact mint. No minimum original duration or remaining duration. A lock qualifies only while `unlockAt > now`, including its final seconds; expired locks never count.
- A qualifying lock balance is required to play. There is no free-play route or cosmetic-only unlock.
- Each new run starts with **one total life for every full 1,000,000 active MEMEZZO**: `floor(activeRaw / 1000000000000)`, using exact raw units. Thus 1,000,000 MEMEZZO gives 1 life, 1,999,999 gives 1, and 2,000,000 gives 2. There are no base lives. Below 1,000,000 cannot start or continue.
- Starting lives are a snapshot taken when a new run begins. Refreshing lock evidence or resuming never refills lives. Balance changes that remain above the access threshold affect starting lives only on the next run.
- Losing the required balance, disconnecting, or receiving stale, invalid or failed evidence pauses the run and blocks continuation. Only fresh qualifying evidence for the same wallet can restore continuation, with the run's remaining lives unchanged. Switching wallets requires a new run.
- Records remain local and unverified. Seasonal challenges, rankings and rewards are not implemented.

The revised rule requested on 25 September 2026 passed 43 unit checks and 53 browser checks using synthetic wallet/lock evidence. See [VERIFICATION.md](VERIFICATION.md) for results and limits.

## Mint evidence

RPC `getAccountInfo` at finalized slot **450424379** reported Token-2022 owner `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`, decimals 6, extensions `metadataPointer` and `tokenMetadata`, and no transfer-fee or transfer-hook extension. Mint authority, freeze authority and metadata update authority were null. [Mint explorer](https://explorer.solana.com/address/Dv1prgxPZs1M6vpacCzmGjLkd7ZFZVJSHCH9PLwEpump).

The existing Fridge mainnet program is `9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6`. It was executable at finalized slot **450427993**. Its Token-2022 requirement was reviewed in [program source](https://github.com/mikeminer/devfridge/blob/9f3a4839b4228ee6365083df624446e234ad6c43/programs/fridge/src/lib.rs). This is an integration review, not a new binary-verification or audit claim.

## Wallet, evidence and freshness

The browser connects to the official injected `window.phantom.solana` provider only after a click. No message signing or transaction requests are made by this game. On ordinary mobile browsers without injection, a user-clicked link opens the game inside Phantom. No wallet/address is silently restored from local storage.

The game reads the endpoint used by the [published DevFridge SDK](https://sdk.devfridge.cool/sdk/devfridge-sdk.js): `https://scan.devfridge.cool/api/sdk/check?wallet=...&mint=...`. The SDK's subscription-plan helper uses whole-day rules, so this game instead uses the skill's exact BigInt evaluator with zero duration minimums. It validates wallet/mint on the response and each lock, raw quantities, duplicates, times and evidence age. Evidence older than 90 seconds or more than five seconds in the future cannot grant access. Cached evidence is re-evaluated at expiry/freshness boundaries, with periodic and foreground refreshes. Pending responses for prior wallets are discarded. Errors revoke access and expose retry; HTTP 429 triggers backoff.

The endpoint may be cached for 30 seconds plus 60 seconds stale revalidation. Its currently reviewed `locksForDepositor` implementation can turn an upstream RPC failure into an empty array, so the UI says that sufficient locks are **not confirmed**, rather than claiming the wallet certainly has no locks. This can deny access temporarily; it does not grant access on a failed lookup.

The access check and lives run in the browser. They are not server authentication, protected code delivery or proof of fair scores. Connecting a public key does not establish a signed server session. No backend, ranked admission, leaderboard or prize authority is introduced.

## Locking and redemption

Creation and redemption take place on external DevFridge, with player wallet approval. The game displays the full mint, threshold, no-early-withdrawal rule, network costs and the 2% redemption fee for PASTA buy-and-burn before the external link. Non-PASTA redemption requires an executable Jupiter route; expiry alone does not guarantee immediate redemption. A read-only quote for a 20,000 MEMEZZO fee amount was available during review, but no transaction was signed or simulated and future routing is not guaranteed. Wallet features are presented for adults.

Sources reviewed: [Phantom connection/events](https://docs.phantom.com/solana/establishing-a-connection), [mobile browser link](https://docs.phantom.com/phantom-deeplinks/other-methods/browse), [Fridge documentation](https://docs.devfridge.cool/fridge), [program documentation](https://docs.devfridge.cool/program). Tests and remaining limits are recorded in [VERIFICATION.md](VERIFICATION.md).
