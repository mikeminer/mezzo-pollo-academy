import test from 'node:test';
import assert from 'node:assert/strict';
import { PublicKey } from '../vendor/solana-transaction.mjs';
import { ACCESS_POLICY } from '../access-policy.mjs';
import { FRIDGE_PROGRAM, readVerifiedTimelocks } from '../timelock-chain.mjs';
import { evaluateTimelocks } from '../timelock-gate.mjs';
const wallet = new PublicKey('11111111111111111111111111111111');
const mint = new PublicKey(ACCESS_POLICY.mint), token = new PublicKey(ACCESS_POLICY.tokenProgram);
const NOW = 2000000000;
const account = (data, owner) => ({ owner: owner.toBase58(), executable: false, data: [Buffer.from(data).toString('base64'), 'base64'] });
function fixtures() {
  const id = Buffer.alloc(8); id.writeBigUInt64LE(123456789n);
  const [pda, bump] = PublicKey.findProgramAddressSync([Buffer.from('lock'), wallet.toBytes(), mint.toBytes(), id], FRIDGE_PROGRAM);
  const data = Buffer.alloc(105);
  data.set([8,255,36,202,210,22,57,137]);data.set(wallet.toBytes(),8);data.set(mint.toBytes(),40);
  data.writeBigUInt64LE(ACCESS_POLICY.minimumRaw,72);data.writeBigInt64LE(BigInt(NOW-10),80);data.writeBigInt64LE(BigInt(NOW+600),88);data[96]=bump;data.set(id,97);
  const vault = Buffer.alloc(166);vault.set(mint.toBytes(),0);vault.set(pda.toBytes(),32);vault.writeBigUInt64LE(ACCESS_POLICY.minimumRaw,64);vault[108]=1;vault[165]=2;
  const mintData = Buffer.alloc(166);mintData[44]=6;mintData[45]=1;mintData[165]=1;
  return {data,vault,mintData,pda};
}
async function read(f = fixtures(), mutate = () => {}, calls = []) {
  return readVerifiedTimelocks(wallet.toBase58(), {now:()=>NOW,fetchImpl:async(url,options)=>{
    assert.equal(url,'https://api.mainnet-beta.solana.com');
    const call=JSON.parse(options.body);calls.push(call);
    let result;
    if(call.method==='getAccountInfo') result={context:{slot:100},value:account(f.mintData,token)};
    else if(call.method==='getProgramAccounts') result={context:{slot:100},value:[{pubkey:f.pda.toBase58(),account:account(f.data,FRIDGE_PROGRAM)}]};
    else result={context:{slot:100},value:[account(f.vault,token)]};
    mutate(result,call);
    return {ok:true,json:async()=>({jsonrpc:'2.0',id:call.id,result})};
  }});
}
test('direct verified chain evidence preserves the legacy threshold, exact amounts and timestamp IDs',async()=>{
  const calls=[];const evidence=await read(fixtures(),undefined,calls);
  assert.equal(evidence.ts,NOW);assert.equal(evidence.activeLocks.length,1);
  assert.equal(evaluateTimelocks(evidence,{...ACCESS_POLICY,wallet:wallet.toBase58()},NOW).eligible,true);
  assert.equal(calls[1].params[1].filters[1].memcmp.bytes,'2WHAy3LEoEg');
  assert.equal(calls[2].params[1].minContextSlot,100);
});
test('tampered lock fields, PDA, discriminator, timestamps and zero balances fail closed',async()=>{
  for(const offset of [0,8,40,96,97]){const f=fixtures();f.data[offset]^=1;await assert.rejects(read(f));}
  const zero=fixtures();zero.data.writeBigUInt64LE(0n,72);await assert.rejects(read(zero));
  const future=fixtures();future.data.writeBigInt64LE(BigInt(NOW+10),80);await assert.rejects(read(future));
  await assert.rejects(read(fixtures(),(r,c)=>{if(c.method==='getProgramAccounts')r.value[0].account.owner=token.toBase58();}));
});
test('vault ownership, mint, authority, state, amount and incomplete responses are checked',async()=>{
  for(const offset of [0,32,108,165]){const f=fixtures();f.vault[offset]^=1;await assert.rejects(read(f));}
  const f=fixtures();f.vault.writeBigUInt64LE(1n,64);await assert.rejects(read(f));
  for(const value of [[],[null]])await assert.rejects(read(fixtures(),(r,c)=>{if(c.method==='getMultipleAccounts')r.value=value;}));
  await assert.rejects(read(fixtures(),(r,c)=>{if(c.method==='getMultipleAccounts')r.context.slot=99;}));
});
test('wrong mint decimals and unsupported extensions fail closed',async()=>{
  const f=fixtures();f.mintData[44]=9;await assert.rejects(read(f));
  const ext=fixtures();ext.mintData=Buffer.concat([ext.mintData,Buffer.from([1,0,0,0])]);await assert.rejects(read(ext));
});
test('expired and complete empty results are inactive; duplicates and RPC errors unavailable',async()=>{
  const f=fixtures();f.data.writeBigInt64LE(BigInt(NOW),88);const calls=[];
  assert.equal((await read(f,undefined,calls)).activeLocks.length,0);assert.equal(calls.length,2);
  const empty=await read(fixtures(),(r,c)=>{if(c.method==='getProgramAccounts')r.value=[];});assert.deepEqual(empty.activeLocks,[]);
  await assert.rejects(read(fixtures(),(r,c)=>{if(c.method==='getProgramAccounts')r.value.push(r.value[0]);}));
  await assert.rejects(readVerifiedTimelocks(wallet.toBase58(),{fetchImpl:async()=>({ok:false,status:429})}),e=>e.retryAfterSeconds===30);
});
