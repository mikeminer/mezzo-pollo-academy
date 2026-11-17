import { Connection, PublicKey, SystemProgram, TransactionInstruction, TransactionMessage, VersionedTransaction, ComputeBudgetProgram } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction, unpackMint } from '@solana/spl-token';
import { OnlinePumpSdk, PUMP_SDK, PUMP_PROGRAM_ID, GLOBAL_PDA, PUMP_FEE_CONFIG_PDA, PUMP_FEE_PROGRAM_ID, getBuyTokenAmountFromSolAmount, pumpIdl } from '@pump-fun/pump-sdk';
import BN from 'bn.js';
import { ACCESS_POLICY } from '../access-policy.mjs';
import { verifyMint,decodeLock,verifyVault } from '../timelock-chain.mjs';
export const MONTHLY_PRICE = 200000000n;
export const MONTHLY_SECONDS = 30 * 86400;
export const FRIDGE = new PublicKey('9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6');
const MINT = new PublicKey(ACCESS_POLICY.mint);
export const fail = code => { throw Object.assign(Error(code), {code}); };
const raw = n => {const b=Buffer.alloc(8);b.writeBigUInt64LE(BigInt(n));return b;};
export function lockAddress(wallet, id) {return PublicKey.findProgramAddressSync([Buffer.from('lock'),wallet.toBuffer(),MINT.toBuffer(),raw(id)],FRIDGE)[0];}
export function createMonthlyLock(wallet, id, minimum, expiresAt) {
 const address=lockAddress(wallet,id), userAta=getAssociatedTokenAddressSync(MINT,wallet,false,TOKEN_2022_PROGRAM_ID),vault=getAssociatedTokenAddressSync(MINT,address,true,TOKEN_2022_PROGRAM_ID);
 const keys=[{pubkey:wallet,isSigner:true,isWritable:true},{pubkey:MINT,isSigner:false,isWritable:false},{pubkey:userAta,isSigner:false,isWritable:true},{pubkey:address,isSigner:false,isWritable:true},{pubkey:vault,isSigner:false,isWritable:true},...[TOKEN_2022_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID,SystemProgram.programId].map(pubkey=>({pubkey,isSigner:false,isWritable:false}))];
 return new TransactionInstruction({programId:FRIDGE,keys,data:Buffer.concat([Buffer.from('abd85ca7a508995a','hex'),raw(minimum),raw(expiresAt),raw(id)])});
}
// The SDK supplies reviewed accounts/PDAs; the official exact-in IDL uses the same account list.
export function exactInInstruction(buy, minimum) {
 const legacy=pumpIdl.instructions.find(x=>x.name==='buy'), exact=pumpIdl.instructions.find(x=>x.name==='buy_exact_sol_in');
 if(JSON.stringify(legacy.accounts)!==JSON.stringify(exact.accounts)||!buy.programId.equals(PUMP_PROGRAM_ID)||buy.keys.length!==18)fail('route_unavailable');
 // Borsh OptionBool here is the one-byte tuple struct, not Option<bool>.
 return new TransactionInstruction({programId:buy.programId,keys:buy.keys,data:Buffer.concat([Buffer.from(exact.discriminator),raw(MONTHLY_PRICE),raw(minimum),Buffer.from([1,0])])});
}
export async function prepareMonthly({wallet:walletAddress,slippageBps=200}, {rpcUrl,now=()=>Math.floor(Date.now()/1000),connection}={}) {
 if(![100,200,500].includes(slippageBps))fail('invalid_slippage');
 const wallet=new PublicKey(walletAddress);
 if(!PublicKey.isOnCurve(wallet.toBytes()))fail('invalid_wallet');
 const conn=connection||new Connection(rpcUrl,{commitment:'confirmed',disableRetryOnRateLimit:true,fetch:(url,opts)=>fetch(url,{...opts,signal:AbortSignal.timeout(6000)})});
 // Reuse the strict mint/account verifier before constructing any purchase.
 const sdk=new OnlinePumpSdk(conn);
 const [state,global,feeConfig,owned,mintInfo,balance]=await Promise.all([
  sdk.fetchBuyState(MINT,wallet,TOKEN_2022_PROGRAM_ID),sdk.fetchGlobal(),sdk.fetchFeeConfig(),
  conn.getMultipleAccountsInfo([FRIDGE,PUMP_PROGRAM_ID,GLOBAL_PDA,PUMP_FEE_CONFIG_PDA]),conn.getAccountInfo(MINT),conn.getBalance(wallet),
 ]);
 if(!owned[0]?.executable||!owned[1]?.executable||!owned[2]?.owner.equals(PUMP_PROGRAM_ID)||!owned[3]?.owner.equals(PUMP_FEE_PROGRAM_ID))fail('route_unavailable');
 if(balance<Number(MONTHLY_PRICE)+1005000)fail('insufficient_sol');
 const curve=state.bondingCurve;
 if(!state.bondingCurveAccountInfo.owner.equals(PUMP_PROGRAM_ID)||curve.complete||curve.isMayhemMode||curve.isCashbackCoin||curve.isHolderReward||!curve.quoteMint.equals(SystemProgram.programId))fail('route_unavailable');
 verifyMint({...mintInfo,owner:mintInfo.owner.toBase58(),data:[mintInfo.data.toString('base64'),'base64']});
 const mint=unpackMint(MINT,mintInfo,TOKEN_2022_PROGRAM_ID);
 if(mint.decimals!==6||!mint.isInitialized)fail('token_unavailable');
 const expected=getBuyTokenAmountFromSolAmount({global,feeConfig,mintSupply:new BN(mint.supply.toString()),bondingCurve:curve,amount:new BN(MONTHLY_PRICE.toString()),quoteMint:state.quoteMint,creatorFeeBps:curve.creatorFeeBps});
 if(expected.lten(0)||expected.gte(curve.realTokenReserves))fail('route_unavailable');
 const ids=Array.from({length:64},(_,i)=>i+1),existing=await conn.getMultipleAccountsInfo(ids.map(id=>lockAddress(wallet,id)));
 const id=ids.find((_,i)=>existing[i]===null);if(!id)fail('subscription_slots_full');
 const base=await PUMP_SDK.getBuyInstructionRaw({user:wallet,mint:MINT,creator:curve.creator,amount:expected,solAmount:new BN(MONTHLY_PRICE.toString()),feeRecipient:global.feeRecipient,tokenProgram:TOKEN_2022_PROGRAM_ID,buybackFeeRecipient:global.buybackFeeRecipients[0]});
 const userAta=getAssociatedTokenAddressSync(MINT,wallet,false,TOKEN_2022_PROGRAM_ID);
 const prefix=[ComputeBudgetProgram.setComputeUnitLimit({units:400000}),createAssociatedTokenAccountIdempotentInstruction(wallet,userAta,wallet,MINT,TOKEN_2022_PROGRAM_ID)];
 const latest=await conn.getLatestBlockhash('confirmed');
 const compile=instructions=>new VersionedTransaction(new TransactionMessage({payerKey:wallet,recentBlockhash:latest.blockhash,instructions}).compileToV0Message());
 const probe=compile([...prefix,exactInInstruction(base,1n)]);
 const before=state.associatedUserAccountInfo?state.associatedUserAccountInfo.data.readBigUInt64LE(64):0n;
 const simulated=await conn.simulateTransaction(probe,{sigVerify:false,commitment:'confirmed',accounts:{encoding:'base64',addresses:[userAta.toBase58()]}});
 if(simulated.value.err)throw Object.assign(Error('simulation_failed'),{code:'simulation_failed',diagnostic:simulated.value});
 const after=simulated.value.accounts?.[0];if(!after?.data)fail('simulation_failed');
 const received=Buffer.from(after.data[0],'base64').readBigUInt64LE(64)-before;
 const minimum=received*BigInt(10000-slippageBps)/10000n;if(minimum<=0n)fail('quote_too_small');
 const createdAt=now(),expiresAt=createdAt+MONTHLY_SECONDS;
 const lock=createMonthlyLock(wallet,id,minimum,expiresAt);
 const transaction=compile([...prefix,exactInInstruction(base,minimum),lock]);
 const wire=transaction.serialize();if(wire.length>1232)fail('transaction_too_large');
 const [fee,rentLock,rentVault]=await Promise.all([conn.getFeeForMessage(transaction.message,'confirmed'),conn.getMinimumBalanceForRentExemption(105),conn.getMinimumBalanceForRentExemption(170)]);
 if(fee.value===null)fail('fee_unavailable');
 const requiredRent=rentLock+rentVault+(state.associatedUserAccountInfo?0:rentVault);
 if(balance<Number(MONTHLY_PRICE)+fee.value+requiredRent+1000000)fail('insufficient_sol');
 const simulation=await conn.simulateTransaction(transaction,{sigVerify:false,commitment:'confirmed',accounts:{encoding:'base64',addresses:[lock.keys[3].pubkey.toBase58(),lock.keys[4].pubkey.toBase58()]}});
 if(simulation.value.err)throw Object.assign(Error('simulation_failed'),{code:'simulation_failed',diagnostic:simulation.value});
 if(fee.value===null)fail('fee_unavailable');
 const post=simulation.value.accounts;
 const decoded=decodeLock({pubkey:lock.keys[3].pubkey.toBase58(),account:post?.[0]},wallet,MINT);
 verifyVault(post?.[1],decoded);
 if(decoded.amount!==minimum.toString()||decoded.unlockAt!==expiresAt)fail('simulation_failed');
 const setupLamports=simulation.value.preBalances[0]-simulation.value.postBalances[0]-Number(MONTHLY_PRICE)-fee.value;
 if(!Number.isSafeInteger(setupLamports)||setupLamports<0)fail('simulation_failed');
 if(balance<Number(MONTHLY_PRICE)+fee.value+setupLamports+1000000)fail('insufficient_sol');
 return {plan:'monthly',wallet:wallet.toBase58(),mint:MINT.toBase58(),priceLamports:MONTHLY_PRICE.toString(),days:30,expectedRaw:received.toString(),minimumRaw:minimum.toString(),slippageBps,createdAt,expiresAt,quoteExpiresAt:createdAt+30,lockId:String(id),deposit:lockAddress(wallet,id).toBase58(),feeLamports:String(fee.value),setupLamports:String(setupLamports),reserveLamports:'1000000',blockhash:latest.blockhash,lastValidBlockHeight:latest.lastValidBlockHeight,transaction:Buffer.from(wire).toString('base64'),route:'pump-bonding-curve'};
}
