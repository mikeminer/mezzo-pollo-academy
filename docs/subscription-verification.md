# Subscription verification repair — 2026-11-17

The legacy Scan evidence URL returned HTTP 402 / DEPLOYMENT_DISABLED. The game now injects a direct, read-only Solana mainnet verifier into the existing shop access controller. No signatures, purchases or transactions are requested by the verifier.

Reviewed DevFridge Game Builder 1.12.0:
- https://github.com/mikeminer/devfridge/blob/master/skills/devfridge-game-builder/references/sdk-access.md
- https://github.com/mikeminer/devfridge/blob/master/skills/devfridge-game-builder/references/program-and-verification.md
- https://github.com/mikeminer/devfridge/blob/master/skills/devfridge-game-builder/references/season-pass.md

Existing games retain their access policy unless explicitly migrated. MezzoPollo still requires 10 million active MEMEZZO, sums exact raw amounts and grants one life per complete million. Verification remains an explicit shop action; ongoing rounds are not interrupted. This change does not introduce the new SOL-priced Daily/Weekly/Monthly purchase flow.

The verifier uses the public mainnet RPC with a six-second deadline. It checks initialized Token-2022 mint ownership, decimals and supported metadata extensions; reads all matching program accounts with confirmed commitment and identity/discriminator filters; rederives every PDA and bump; checks timestamps; verifies the derived Token-2022 vault owner, mint, authority, state and balance at least equal to the recorded amount. Vault reads cannot predate the account discovery slot. Partial reads, unsupported mint extensions, errors and rate limits fail unavailable, never grant access. No fixed-ID fallback can fabricate an empty result.

Live read-only checks: MEMEZZO mint is Token-2022, initialized, 6 decimals, with MetadataPointer (18) and TokenMetadata (19). Public getProgramAccounts accepted the exact filters and returned a complete empty result for the System address at slot 470609263. No real wallet subscription or physical Seeker was tested. Direct Node fetch in the workspace timed out; curl RPC reads succeeded. Browser/provider availability and RPC rate limits remain operational dependencies.

Validation: 80 tests passed across timelock-chain, lock-access, shop-access, run-admission and phantom-transaction; public asset build passed. Tests cover tampered accounts, wrong owners/mints/PDAs, insufficient vault balance, expiry, incomplete reads, duplicates and RPC failures. Browser-only access is UX, not authoritative wallet authentication or score verification.

The compatibility fetch path in lock-access remains for existing consumers/tests; game-access always supplies readVerifiedTimelocks. Generated vendor transaction bundle now also exports the pinned official PublicKey class, preserving the transaction implementation.

Publication is pending a successful Vercel deployment; previous deployments were blocked by Vercel. This is not physical-device or production certification.

## Helius follow-up

The browser now calls `/api/subscription?wallet=…`. The Vercel function uses the server-only `SUBSCRIPTION_SOLANA_RPC_URL` variable, set to the owner's Helius mainnet endpoint. Do not prefix it with NEXT_PUBLIC/VITE or put its value in source files. Configure the variable for Production (and Preview if needed), then redeploy. Missing configuration returns unavailable; there is no public-RPC fallback.

Clients can supply only one wallet. Mint, program, method sequence and vault addresses are fixed or derived by the verifier. The server validates the configured Helius host, coalesces simultaneous wallet checks, caches evidence for ten seconds without refreshing its timestamp, caps concurrent lookups and applies a per-instance request budget. Origin filtering is not authentication; these process-local limits supplement deployment edge controls and the Helius quota, not a globally shared rate limiter. Errors never return provider URLs or keys.

Helius change validation: 66 tests passed, including endpoint input restrictions, missing/unsafe configuration, request deduplication, timestamp preservation, error redaction and browser same-origin behavior; public build passed. The Vercel connector returned 403 for the owning team, its authorization helper returned 404, and the browser is at Vercel login. Environment setup and production verification remain pending.
