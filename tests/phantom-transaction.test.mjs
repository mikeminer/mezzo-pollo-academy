import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Message, Transaction } from '../vendor/solana-transaction.mjs';
import { ARCADE_TIERS, ARCADE_RECIPIENT, arcadeMessage, sendArcadePayment, encode58 } from '../arcade-transaction.mjs';
import { buildTransaction } from '../server/arcade-chain.mjs';

const payer = encode58(Buffer.alloc(32, 11)), blockhash = encode58(Buffer.alloc(32, 31));
function intent(tier) {
  return { intentId: '00000000-0000-4000-8000-000000000010', tier, payer, blockhash,
    reference: encode58(Buffer.alloc(32, 21)), network: 'mainnet-beta', recipient: ARCADE_RECIPIENT,
    lamports: ARCADE_TIERS[tier].lamports, lives: ARCADE_TIERS[tier].lives, transaction: 'do-not-trust-server-wire' };
}

for (const tier of Object.keys(ARCADE_TIERS)) test(`${tier}: official Phantom Transaction preserves the exact canonical full wire and decodes as legacy`, async () => {
  const record = intent(tier); let called = 0;
  const result = await sendArcadePayment({ isPhantom: true,
    request() { throw Error('Legacy request must not be called'); },
    async signAndSendTransaction(transaction) {
      called++;
      assert.ok(transaction instanceof Transaction);
      const wire = transaction.serialize({ requireAllSignatures: false, verifySignatures: false });
      const decoded = Transaction.from(wire), message = decoded.compileMessage();
      assert.equal(wire.length, 338);
      assert.equal(wire[0], 1); assert.equal(wire[65], 1);
      assert.deepEqual(Buffer.from(transaction.serializeMessage()), Buffer.from(arcadeMessage(record)));
      assert.deepEqual(Buffer.from(transaction.serialize({ requireAllSignatures: false, verifySignatures: false })), Buffer.from(wire), 'Repeated wallet serialization must preserve account ordering');
      assert.equal(message.version, 'legacy');
      assert.deepEqual(Buffer.from(wire), Buffer.from(buildTransaction(record, blockhash), 'base64'));
      assert.deepEqual(Buffer.from(message.serialize()), Buffer.from(arcadeMessage(record)));
      assert.equal(decoded.feePayer.toBase58(), payer);
      assert.equal(decoded.recentBlockhash, blockhash);
      assert.equal(decoded.instructions.length, 2);
      const [transfer, memo] = decoded.instructions;
      assert.equal(transfer.programId.toBase58(), '11111111111111111111111111111111');
      assert.deepEqual(transfer.keys.map(key => ({ address: key.pubkey.toBase58(), signer: key.isSigner, writable: key.isWritable })), [
        { address: payer, signer: true, writable: true }, { address: ARCADE_RECIPIENT, signer: false, writable: true },
        { address: record.reference, signer: false, writable: false },
      ]);
      assert.equal(Buffer.from(transfer.data).readUInt32LE(0), 2);
      assert.equal(Buffer.from(transfer.data).readBigUInt64LE(4), BigInt(record.lamports));
      assert.equal(memo.programId.toBase58(), 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
      assert.equal(Buffer.from(memo.data).toString(), `mezzopollo:arcade:${record.intentId}`);
      return { signature: 'fake-wallet-signature' };
    },
  }, record);
  assert.deepEqual(result, { signature: 'fake-wallet-signature' }); assert.equal(called, 1);
});

test('regression: interpreting the old message-only bytes as a transaction exposes unsupported version 57', () => {
  const message = arcadeMessage(intent('hard'));
  assert.equal(message.length, 273); assert.equal(message[0], 1);
  assert.equal(message[65], 0xb9);
  assert.equal(message[65] & 0x7f, 57);
  const wire = Buffer.from(buildTransaction(intent('hard'), blockhash), 'base64');
  assert.equal(Transaction.from(wire).compileMessage().version, 'legacy');
  assert.deepEqual(Buffer.from(Message.from(message).serialize()), Buffer.from(message));
});

test('Phantom failure is returned unchanged without request fallback or automatic signing retry', async () => {
  for (const error of [Object.assign(Error('User rejected'), { code: 4001 }), Error('Connection lost after submission')]) {
    let signed = 0, legacy = 0;
    await assert.rejects(sendArcadePayment({ isPhantom: true,
      async signAndSendTransaction() { signed++; throw error; }, request() { legacy++; },
    }, intent('hard')), caught => caught === error);
    assert.equal(signed, 1); assert.equal(legacy, 0);
  }
});

test('missing direct Phantom signing support fails before invoking legacy request', async () => {
  let legacy = 0;
  await assert.rejects(sendArcadePayment({ isPhantom: true, request() { legacy++; } }, intent('hard')), /missing_wallet/);
  assert.equal(legacy, 0);
});

test('invalid local payment terms never reach Phantom signing', async () => {
  let signed = 0;
  await assert.rejects(sendArcadePayment({ isPhantom: true, signAndSendTransaction() { signed++; } }, { ...intent('hard'), lamports: 1 }), /payment_mismatch/);
  assert.equal(signed, 0);
});

test('transaction SDK is pinned, self hosted and loaded lazily after the native/MWA branches', async () => {
  const source = await readFile(new URL('../arcade-transaction.mjs', import.meta.url), 'utf8');
  assert.ok(source.indexOf("import('./vendor/solana-transaction.mjs')") > source.indexOf('provider?.isMezzoWebWallet'));
  assert.doesNotMatch(source, /from\s+['"].*vendor/);
  const bundle = await readFile(new URL('../vendor/solana-transaction.mjs', import.meta.url), 'utf8');
  assert.match(bundle, /@solana\/web3\.js 1\.99\.0/);
  assert.doesNotMatch(bundle, /from\s*["'](?:https?:|@solana)/);
});
