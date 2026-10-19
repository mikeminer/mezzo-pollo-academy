# Arcade checkout

Arcade is a per-run SOL purchase. The recipient is `AXomB2bpJ7F3EFVPQwrwBV4yVE7bazshZaVa64KhGCfE` on Solana mainnet. Network fees are additional.

| Difficulty | Price | Starting lives |
| --- | --- | --- |
| Hard | 0.001 SOL | 1 |
| Medium | 0.002 SOL | 3 |
| Easy | 0.003 SOL | 9 |
| God | 0.01 SOL | 32 |

These four choices belong to Arcade. The only other mode is Subscription: at least 10,000,000 MEMEZZO in active timelocks, verified manually in the Shop, with one total life per full million (at least 10 lives). There is no free scored mode. The tutorial remains free training.

## Website service

The static game calls `GET /api/arcade` for readiness and `POST /api/arcade` with an `action` of `create`, `prepare`, `status`, or `start`. The Android client uses its own on-device payment ledger and direct Solana RPC; this website API is not required by the native client.

`create` accepts a payer public key, a strict difficulty key (`hard`, `medium`, `easy`, `god`), and a cryptographically random UUIDv4 `requestId`. Persist the request ID before calling the API. Repeating it recovers the same intent and secret. Reusing it with another payer or difficulty is rejected. Intent IDs and the unsigned transaction are public references; the request ID and returned secret are private bearer capabilities and must never appear in URLs, analytics or logs. The on-chain payer signature authorizes the exact payment; this service does not expose wallet-based public receipt lookup.

Other actions require `intentId` and `secret`. `status` and `prepare` accept an optional transaction `signature`. `start` also requires a random UUIDv4 `runId`. Responses include the immutable payer, tier, lamports, lives, reference, recipient and network, plus `status` (`pending`, `paid`, `started`), signature, run ID and `canPay`. `prepare` additionally returns `transaction` (base64 unsigned legacy wire format), `blockhash` and `lastValidBlockHeight` when payment is safe to offer.

The canonical transaction has two instructions: one System Program transfer for the exact tier price, with the unique reference as an additional read-only account; and the Memo Program text `mezzopollo:arcade:<intentId>`, signed by the payer. Account order is payer, recipient, reference, System Program, Memo Program. Header is `[1,0,3]`; transfer accounts are `[0,1,2]`; memo accounts are `[0]`. Wallet approval is always an explicit player action. No server component signs or broadcasts transfers.

Verification uses the configured mainnet RPC, checks the mainnet genesis hash, and accepts only successful finalized transactions with the exact payer, recipient, amount, reference, memo, signer and canonical instructions. Recipient balance growth and payer debit including the network fee must match. Extra instructions, account substitutions, overpayment, underpayment and failed transactions do not grant credit.

An unknown wallet result is pending, not a failed payment. Reference lookup recovers a broadcast even if the wallet did not return its signature. A retry uses identical bytes while the blockhash remains valid. Before replacing an expired blockhash, the service observes finalized height beyond its lifetime and repeats reference reconciliation at least at that finalized context. An unresolved signature, unavailable RPC, or saturated reference history blocks another purchase. Paid and spent receipts have no expiry.

Postgres locks each intent row for atomic transitions and enforces a globally unique payment signature. Starting a paid intent changes it to `started` exactly once. Only the first successful claim returns `admitted: true`; later requests retrieve the stable receipt without authorizing another run. A different run ID cannot reuse it. The game must persist its local claim before starting and must not turn a historical receipt into a new run. If the first start response is lost after the server consumed the credit, the receipt is recoverable but it does not automatically issue a replacement run. Operator support can investigate that receipt; no automatic refund or refund signer is implemented.

This is authoritative payment accounting for the normal client. Gameplay and local scores remain client-side. It does not prevent a modified copy from bypassing its own UI, and it does not prove an honest score. Native storage survives app restarts but is not a global server ledger across reinstall, data clearing or devices. Clearing browser storage also removes its recovery capability; the server retains the underlying receipt for support.

## Configuration and setup

- `DATABASE_URL` (or `ARCADE_DATABASE_URL`): pooled Neon connection string, server-only.
- `DATABASE_URL_UNPOOLED` (or `ARCADE_DATABASE_URL_UNPOOLED`): direct migration connection, server-only.
- `ARCADE_SOLANA_RPC_URL` (or `SOLANA_RPC_URL`): HTTPS mainnet RPC endpoint, server-only.
- `ARCADE_ENABLED=true`: explicit checkout enable switch after schema and readiness verification.

The backend fails closed if configuration, durable storage, recipient validation or chain access is unavailable. Secrets are read from deployment environment variables, never embedded in the app. `node scripts/setup-arcade-db.mjs` creates only the dedicated Arcade tables/function; it preserves existing receipts. Review/test schema changes on an isolated Neon branch first. The deployment must keep the server source, schema, test files and environment files out of public static paths.

Do not expire/delete paid or spent intents. Back up the ledger and retain the unique signature constraint. The rate-limit table contains only hashed request source identifiers and may be pruned for rows with `window_start` older than one day; it is not part of payment recovery.

## Verification

Run `node --test tests/arcade-backend.test.mjs` for codec, verification, lifecycle and HTTP boundary fixtures. Run `node --test tests/arcade-postgres.integration.mjs` with `ARCADE_TEST_DATABASE_URL` set to an isolated, migrated Neon branch for actual concurrent SQL transitions and persistent recovery. That integration suite deletes only its own generated test intent IDs. Fixtures and storage concurrency checks do not constitute a live wallet transfer test. Do not send a real payment without the player's explicit wallet approval.

Primary references checked 19 October 2026: [Solana getTransaction](https://solana.com/docs/rpc/http/gettransaction), [Solana Pay transfer handling](https://docs.solanapay.com/core/transfer-request/wallet-integration), and [Neon serverless driver configuration](https://github.com/neondatabase/serverless/blob/main/CONFIG.md).
