// Mint metadata checked against Solana mainnet RPC on 2026-09-25.
// Read-only admission policy; this module never builds or submits transactions.
export const ACCESS_POLICY = Object.freeze({
  mint: 'Dv1prgxPZs1M6vpacCzmGjLkd7ZFZVJSHCH9PLwEpump',
  symbol: 'MEMEZZO',
  minimumTokens: '1000000',
  decimals: 6,
  minimumRaw: 1000000000000n,
  rawPerLife: 1000000000000n,
  aggregation: 'sum',
  minOriginalSeconds: 0,
  minRemainingSeconds: 0,
  maxAgeSeconds: 90,
  refreshSeconds: 60,
  requestTimeoutMs: 15000,
  apiBase: 'https://scan.devfridge.cool/api/sdk/check',
  network: 'mainnet-beta',
  tokenProgram: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
  metadataVerifiedAt: '2026-09-25',
});
