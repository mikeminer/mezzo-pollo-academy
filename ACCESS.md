# Hard, Easy and the MEMEZZO Shop — 5 October 2026

## Modes and starting lives

- Solana mainnet mint: `Dv1prgxPZs1M6vpacCzmGjLkd7ZFZVJSHCH9PLwEpump` (on-chain name POLLO, symbol MEMEZZO).
- **Hard is free**, with exactly **2 lives per new run**. It requires no wallet, token balance or token verification. `/practice` remains available as an alias opening Hard mode.
- **Easy is slower and gives more time.** Players choose the Shop to create timelocks externally, then choose **Connect & verify** to connect Phantom and request the first check. Its minimum is **1,000,000 MEMEZZO**, exactly `1000000000000` raw units at six decimals.
- At a manual Shop check, add the amounts of all active DevFridge locks belonging to the connected wallet for this exact mint. No minimum original duration or remaining duration. A lock qualifies while `unlockAt > now`, including its final seconds; expired locks do not count when verifying.
- Each new **Easy** run starts with **one total life for every full 1,000,000 MEMEZZO confirmed in the Shop**: `floor(activeRaw / 1000000000000)`, using exact raw units. Thus 1,000,000 MEMEZZO gives 1 life, 1,999,999 gives 1, and 2,000,000 gives 2. **There are no base lives in Easy.** A check below the minimum does not unlock future Easy runs; Hard remains available.
- Verified Easy lives are held in memory for the current page session. They change only after a manual Shop check, a wallet account change or disconnection, or page reload. Changing or disconnecting the wallet clears the entitlement for future Easy runs. **Connect & verify** requests a new check; account-change events do not check automatically.
- **No automatic token checks** run on starting a game, retrying, resuming, during play or on returning to the foreground. A lock expiring after a successful check does not interrupt the session or trigger a new check.
- Each run keeps its starting-lives snapshot and remaining lives independently of the wallet and Shop. Manual verification, errors, wallet changes and disconnection do not pause or otherwise interrupt an ongoing run. Neither checking nor resuming refills lives.
- Hard and Easy records are stored separately, locally and without verification. Seasonal challenges, rankings and rewards are not implemented.
- An interactive tutorial appears before the first play in each selected language (Italian, English or Polish), and can be replayed from the menu. It introduces the controls and rules without requiring a wallet.

The continuous-verification rule documented on 25 September 2026 is superseded by this Shop-only policy. Historical recordings and verification counts describe the previous implementation; see [VERIFICATION.md](VERIFICATION.md) for dated results and limits.

## Mint evidence

RPC `getAccountInfo` at finalized slot **450424379** reported Token-2022 owner `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`, decimals 6, extensions `metadataPointer` and `tokenMetadata`, and no transfer-fee or transfer-hook extension. Mint authority, freeze authority and metadata update authority were null. [Mint explorer](https://explorer.solana.com/address/Dv1prgxPZs1M6vpacCzmGjLkd7ZFZVJSHCH9PLwEpump).

The existing Fridge mainnet program is `9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6`. It was executable at finalized slot **450427993**. Its Token-2022 requirement was reviewed in [program source](https://github.com/mikeminer/devfridge/blob/9f3a4839b4228ee6365083df624446e234ad6c43/programs/fridge/src/lib.rs). This is an integration review, not a new binary-verification or audit claim.

## Manual Shop verification and session lifetime

The browser connects to the official injected `window.phantom.solana` provider only after a click in the Shop. The Connect action includes the first verification; subsequent checks require the explicit Verify Easy lives button. No message signing or transaction requests are made by this game. On ordinary mobile browsers without injection, a user-clicked link opens the game inside Phantom. No wallet/address or Easy entitlement is silently restored from local storage.

Only a requested Shop check reads the endpoint used by the [published DevFridge SDK](https://sdk.devfridge.cool/sdk/devfridge-sdk.js): `https://scan.devfridge.cool/api/sdk/check?wallet=...&mint=...`. The SDK's subscription-plan helper uses whole-day rules, so this game instead uses an exact BigInt evaluator with zero duration minimums. It validates wallet/mint on the response and each lock, raw quantities, duplicates, times and evidence age. Evidence older than 90 seconds or more than five seconds in the future cannot grant an entitlement at verification time. After verification, the entitlement is a session snapshot: there is no expiry timer, polling or foreground refresh. Pending responses for prior wallets are discarded. A failed manual check clears future Easy access and offers a manual retry, without affecting Hard or an ongoing run.

The endpoint may be cached for 30 seconds plus 60 seconds stale revalidation. Its previously reviewed `locksForDepositor` implementation can turn an upstream RPC failure into an empty array, so the UI says that sufficient locks are **not confirmed**, rather than claiming the wallet certainly has no locks. This can prevent unlocking future Easy runs temporarily; it does not grant an entitlement on a failed lookup. Hard remains available.

The access check and lives run in the browser. They are not server authentication, protected code delivery or proof of fair scores. Connecting a public key does not establish a signed server session. No backend, ranked admission, leaderboard or prize authority is introduced.

## Locking and redemption

Creation and redemption take place on external DevFridge, with player wallet approval. The game displays the full mint, threshold, no-early-withdrawal rule, network costs and the 2% redemption fee for PASTA buy-and-burn before the external link. Non-PASTA redemption requires an executable Jupiter route; expiry alone does not guarantee immediate redemption. A read-only quote for a 20,000 MEMEZZO fee amount was available during review, but no transaction was signed or simulated and future routing is not guaranteed. Wallet features are presented for adults.

Sources reviewed: [Phantom connection/events](https://docs.phantom.com/solana/establishing-a-connection), [mobile browser link](https://docs.phantom.com/phantom-deeplinks/other-methods/browse), [Fridge documentation](https://docs.devfridge.cool/fridge), [program documentation](https://docs.devfridge.cool/program). Tests and remaining limits are recorded in [VERIFICATION.md](VERIFICATION.md).
