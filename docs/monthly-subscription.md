# Monthly website subscription — 2026-11-17

Owner-requested migration from the legacy 10-million-token gate. Browser website only; installed APK is not modified or certified.

- Price exactly 200,000,000 lamports; 30 days; ten lives per slower Subscription round.
- One unsigned v0 transaction: bounded compute budget, idempotent user ATA, reviewed Pump exact-SOL-input buy, exactly one Fridge create_lock. Swap minimum and deposit amount match. Extra output stays in wallet. No automatic renewal or separate treasury payment.
- DevFridge Game Builder 1.12.0 and season-pass.md re-read from mikeminer/devfridge master on 2026-11-17. Uses unchanged timelock-gate plus official subscription helper. Access accepts any positive verified active MEMEZZO deposit, using its latest expiry, not an amount threshold. Foreground and expiry refresh; existing run not interrupted.
- Current market is an active SOL Pump bonding curve. Graduated/PumpSwap, mayhem, cashback, holder-reward and unsupported extension routes fail closed. Client pins reviewed route accounts and rederives user/deposit accounts. Protocol fee/creator account changes require review before purchases resume.
- Quotes expire after 30 seconds. Review shows amount, minimum token output, network/setup costs, reserve (not charged), local/UTC expiry, value risk and no recurring renewal.
- Durable pending record is saved before wallet handoff. Unknown results never trigger automatic resubmission. Exact verified deposit reconciliation can recover a lost signature. A new attempt is permitted only after finalized chain evidence proves the transaction lifetime ended and its deposit is absent. No age-only reset.
- Phantom and browser MWA supported. Existing native bridge is deliberately not given arbitrary transaction privileges: older bundled APK users must use the browser to buy the monthly pass.

## Social board

Opt-in, player-reported scores only, explicitly unverified and not prize-eligible. A domain/action/score/wallet/nonce/expiry-bound Ed25519 message proves publication consent, not honest play. Server rechecks current subscription both before challenge and publication and atomically consumes the nonce. Links open https://chat.cherry.fun/solana/<wallet>; no automated follow or messages. Score/address publication is disclosed before signing. A future prize-bearing ranked mode requires authoritative server sessions; this is not one.

`api/community` creates two `mezzopollo_social_*` tables with IF NOT EXISTS and reuses the existing Arcade durable rate limiter. It needs ARCADE_DATABASE_URL or DATABASE_URL. Purchase, recovery and gate use the existing server-only SUBSCRIPTION_SOLANA_RPC_URL Helius setting. No credential is committed. Set these for Preview separately if preview endpoint tests are required.

New purchase/social text is Italian, Polish and English, with English fallback for other locales. Existing gameplay translations are preserved. Web terms/privacy document actual mechanics and data practices; existing native policy remains separately scoped.

## Validation and release status

Unsigned mainnet purchase and combined swap/create_lock simulations succeeded for a public funded wallet; no transaction was signed or sent. The saved unsigned fixture contains no secret and is not proof of a completed purchase. Unit tests cover tampered transactions, quote expiry, duplicate prevention, durable-write failure, wallet changes, rejection, unknown recovery, positive-small-amount admission, expiration, signed social publication and replay. Entire project suite: 372 tests passing, including final recovery endpoint tests. Public asset build passes.

Release remains pending: browser visual/wallet roundtrip and candidate-bound performance evidence. Local Chromium cannot start in this environment (socket Operation not permitted). No 50 FPS claim and no physical Seeker claim. Production must not be described as updated until a successful deployment and actual endpoint/UI verification. GitHub's previous Vercel account block is now cleared on main.
