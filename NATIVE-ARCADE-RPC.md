# Private RPC for native Arcade

`POST /api/native-arcade-rpc` forwards only the seven read-only Solana methods needed by the installed Android Arcade verifier. The APK continues to hold its game assets and receipt ledger locally. This endpoint does not authorize a game, sign or submit transactions, create timelocks, or replace native receipt validation.

The provider URL and API key remain in server environment variables. Do not put a provider credential in an APK, browser asset, query parameter supplied by a player, repository, or screenshot. The endpoint uses `loadConfig()` and the same private `ARCADE_SOLANA_RPC_URL` (or existing `SOLANA_RPC_URL` fallback) as web Arcade. The destination cannot be supplied by a request. Upstream redirects are disabled; requests, provider headers and errors are not logged or echoed.

## Configuration

Set `NATIVE_ARCADE_RPC_ENABLED=true` explicitly after the server RPC and durable Postgres storage are ready. Without this exact flag the endpoint fails closed with HTTP 503. Existing `ARCADE_ENABLED=true`, `ARCADE_DATABASE_URL` (or `DATABASE_URL`) and an HTTPS RPC URL are also required. The existing `mezzopollo_arcade_rate` table must be installed; no new schema is needed.

Two optional positive integer limits protect the paid provider:

| Environment variable | Default | Meaning |
| --- | ---: | --- |
| `NATIVE_ARCADE_RPC_PER_IP_LIMIT` | 120 | Forwarded requests per IP per one-minute quota window |
| `NATIVE_ARCADE_RPC_GLOBAL_LIMIT` | 6000 | Forwarded requests across all IPs per one-minute quota window |

Configured values must be between 1 and 1,000,000. Invalid values disable the endpoint. Each validated request reserves the IP quota and then the global quota using the existing atomic Postgres rate limiter before contacting the provider. These counters use a separate namespace from web checkout. Failed provider calls still consume quota. If storage is unavailable, the request stops rather than falling back to an unrestricted RPC. HTTP 429 includes `Retry-After: 60`.

The defaults are conservative spend controls, **not evidence of capacity for 2,000 simultaneous players**. They cap the native relay's request count, not the provider's full invoice: different RPC methods may have different billing weights, and web Arcade also uses the provider. Players behind one shared IP share its limit. Increase limits only against measured provider/database capacity and the purchased plan. Attackers can consume available anonymous quota, so a provider-side spending cap and platform request controls remain useful.

Client IP comes from Vercel's `x-vercel-forwarded-for` header or the direct socket address; arbitrary `x-forwarded-for` is not trusted by this route. Alternative IPv6 spellings are normalized. See [Vercel request header documentation](https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for). Missing/invalid addresses share one `unknown` quota bucket. If hosted behind another platform or proxy, update the trusted IP handling before deployment.

## Exact request contract

Send one JSON-RPC 2.0 object containing exactly `jsonrpc`, a nonnegative safe-integer `id`, `method`, and `params`. Batches, notifications, extra fields, unknown options, additional positional parameters, arbitrary URLs, and every other RPC method are rejected. HTTP GET is not supported. Browser calls require one of the existing approved MezzoPollo origins; native HTTP calls may omit Origin. Cross-site browser requests are rejected. Origin checks are not native-client authentication, and no shared secret is embedded in the APK.

| Method | Exact params |
| --- | --- |
| `getGenesisHash` | `[]` |
| `getAccountInfo` | `[fixed Arcade recipient, {"encoding":"base64","commitment":"finalized"}]` |
| `getLatestBlockhash` | `[{"commitment":"finalized"}]` |
| `getSlot` | `[{"commitment":"finalized"}]` |
| `getBlockHeight` | `[{"commitment":"finalized","minContextSlot":slot}]` |
| `getSignaturesForAddress` | `[32-byte base58 reference, {"commitment":"confirmed","limit":20}]`, optionally with a nonnegative safe-integer `minContextSlot` in that options object |
| `getTransaction` | `[64-byte base58 signature, {"encoding":"base64","commitment":"finalized","maxSupportedTransactionVersion":0}]` |

The account-info recipient is fixed to the reviewed Arcade recipient in `POLICY`. Incoming bodies are limited to 4,096 bytes. Provider response bodies are streamed under a 1 MiB cap, including when Content-Length is missing or false. An eight-second deadline covers both response headers and body. Successful responses contain only `jsonrpc`, the matching request ID, and `result`; upstream errors are replaced with fixed error codes/messages. There are no automatic retries in this route.

## Verification

Run `node --test tests/native-arcade-rpc.test.mjs`. Tests use an in-memory quota stub and fake Fetch responses only. They cover every allowed method, rejected methods/parameters, body and response size limits, origins, opt-in configuration, both quota failures, IP normalization, deadline cancellation, and upstream error redaction. These tests do not exercise a real provider, the production Postgres database, the APK, or production throughput.
