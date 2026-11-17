import { PublicKey, VersionedTransaction, TransactionMessage } from './vendor/solana-transaction.mjs';
import { ACCESS_POLICY } from './access-policy.mjs';
const PUMP='6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',FRIDGE='9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6';
const ATA='ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',SYSTEM='11111111111111111111111111111111';
const pk=x=>new PublicKey(x),equal=(a,b)=>a.toBase58()===b;
const invalid=()=>{throw Error('payment_mismatch')};
const u64=(data,at)=>new DataView(data.buffer,data.byteOffset,data.byteLength).getBigUint64(at,true);
const same=(data,prefix)=>prefix.every((x,i)=>data[i]===x);
export function validateMonthlyTransaction(record,wallet,now=Math.floor(Date.now()/1000)) {
 if(record?.wallet!==wallet||record.plan!=='monthly'||record.priceLamports!=='200000000'||record.days!==30||record.mint!==ACCESS_POLICY.mint||record.route!=='pump-bonding-curve'||record.slippageBps!==200||!Number.isSafeInteger(record.createdAt)||record.createdAt>now+5||record.quoteExpiresAt<=now||record.expiresAt!==record.createdAt+30*86400||record.quoteExpiresAt!==record.createdAt+30||!/^\d+$/.test(record.minimumRaw)||BigInt(record.minimumRaw)<=0n||!/^\d+$/.test(record.lockId)||BigInt(record.lockId)<1n||BigInt(record.lockId)>64n)invalid();
 const bytes=Uint8Array.from(atob(record.transaction),c=>c.charCodeAt(0));if(bytes.length>1232)invalid();
 const tx=VersionedTransaction.deserialize(bytes);
 const canonical=tx.serialize();if(canonical.length!==bytes.length||canonical.some((v,i)=>v!==bytes[i]))invalid();
 if(tx.version!==0||tx.signatures.length!==1||tx.signatures.some(s=>s.some(Boolean))||tx.message.addressTableLookups.length||tx.message.header.numRequiredSignatures!==1||!equal(tx.message.staticAccountKeys[0],wallet)||tx.message.recentBlockhash!==record.blockhash)invalid();
 const ix=TransactionMessage.decompile(tx.message).instructions;
 if(ix.length!==4)invalid();
 const [compute,ata,buy,lock]=ix;
 if(!equal(compute.programId,'ComputeBudget111111111111111111111111111111')||compute.data.length!==5||compute.data[0]!==2||new DataView(compute.data.buffer,compute.data.byteOffset,5).getUint32(1,true)!==400000||compute.keys.length)invalid();
 const token=pk(ACCESS_POLICY.tokenProgram),mint=pk(ACCESS_POLICY.mint),user=pk(wallet),program=pk(FRIDGE);
 const userAta=PublicKey.findProgramAddressSync([user.toBytes(),token.toBytes(),mint.toBytes()],pk(ATA))[0];
 if(!equal(ata.programId,ATA)||ata.data.length!==1||ata.data[0]!==1||ata.keys.length!==6)invalid();
 const ataKeys=[wallet,userAta.toBase58(),wallet,ACCESS_POLICY.mint,SYSTEM,ACCESS_POLICY.tokenProgram];
 if(ata.keys.some((k,i)=>!equal(k.pubkey,ataKeys[i])))invalid();
 if(!equal(buy.programId,PUMP)||buy.keys.length!==18||buy.data.length!==26||!same(buy.data,[56,252,116,8,158,223,205,95])||u64(buy.data,8)!==200000000n||u64(buy.data,16)!==BigInt(record.minimumRaw)||buy.data[24]!==1||buy.data[25]!==0||!equal(buy.keys[2].pubkey,ACCESS_POLICY.mint)||!buy.keys[5].pubkey.equals(userAta)||!equal(buy.keys[6].pubkey,wallet)||!equal(buy.keys[7].pubkey,SYSTEM)||!equal(buy.keys[8].pubkey,ACCESS_POLICY.tokenProgram))invalid();
 // Reviewed mainnet route accounts (2026-11-17). Any protocol fee/creator change
 // fails closed until reviewed again; the server cannot substitute destinations.
 const fixed={0:'4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf',1:'62qc2CNXwrYqQScmEdiZFFAnJR262PxWEuNQtxfafNgV',3:'F2Mi9UnmGxXMFn8ANriqMKBmG7jbgCgQkcFNjpPWHdMb',4:'EL33FLZAni6W61gzhCspq47tpLWTTZUfMcLW7tcF34s2',9:'8BxQmfovd8Mp4zyfxY69Zb5kx89arpeEMihrgYQijZCT',10:'Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1',11:PUMP,12:'Hq2wp8uJ9jCPsYgNHex8RtqdvMPfVGoYwjvF1ATiwn2Y',14:'8Wf5TiAheLUqBrKXeYg2JtAFFMWtKdG2BSFgqUcPVwTt',15:'pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ',16:'3rsrNi7ntmotWiS71nhC5kNnyuxPpJLpVY8qZMFynKKR',17:'5YxQFdt3Tr9zJLvkFccqXVUwhdTWJQc1fFg2YPbxvxeD'};
 for(const [i,key]of Object.entries(fixed))if(!equal(buy.keys[i].pubkey,key))invalid();
 const volume=PublicKey.findProgramAddressSync([new TextEncoder().encode('user_volume_accumulator'),user.toBytes()],pk(PUMP))[0];
 if(!buy.keys[13].pubkey.equals(volume))invalid();
 const writable=new Set([1,3,4,5,6,9,13,17]);
 if(buy.keys.some((k,i)=>k.isSigner!==(i===6)||k.isWritable!==writable.has(i)))invalid();
 if(ata.keys.some((k,i)=>k.isSigner!==[0,2].includes(i)||k.isWritable!==[0,1,2].includes(i)))invalid();
 if(lock.keys.some((k,i)=>k.isSigner!==(i===0)||k.isWritable!==[0,2,3,4].includes(i)))invalid();
 if(!equal(lock.programId,FRIDGE)||lock.keys.length!==8||lock.data.length!==32||!same(lock.data,[171,216,92,167,165,8,153,90])||u64(lock.data,8)!==BigInt(record.minimumRaw)||u64(lock.data,16)!==BigInt(record.expiresAt)||u64(lock.data,24)!==BigInt(record.lockId))invalid();
 const address=PublicKey.findProgramAddressSync([new TextEncoder().encode('lock'),user.toBytes(),mint.toBytes(),lock.data.subarray(24,32)],program)[0];
 const vault=PublicKey.findProgramAddressSync([address.toBytes(),token.toBytes(),mint.toBytes()],pk(ATA))[0];
 const lockKeys=[wallet,ACCESS_POLICY.mint,userAta.toBase58(),address.toBase58(),vault.toBase58(),ACCESS_POLICY.tokenProgram,ATA,SYSTEM];
 if(record.deposit!==address.toBase58()||lock.keys.some((k,i)=>!equal(k.pubkey,lockKeys[i])))invalid();
 // No additional signer, independent transfer, delegate, claim or account closure exists.
 return tx;
}
