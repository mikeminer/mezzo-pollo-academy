import {communityError} from './community-errors.mjs';
import {cherryProfile,scoreMessage} from './community-protocol.mjs';
const el=id=>document.getElementById(id);
const COPY={
 it:{title:'Abbonamento · Classifica sociale',disclosure:'Più alto è il punteggio, più in alto appari nella classifica. Chi la consulta può aprire il tuo profilo e seguirti su Cherry. I punteggi sono condivisi dai giocatori.',load:'Mostra classifica',empty:'Ancora nessun punteggio condiviso. Puoi essere il primo!',share:'Fatti conoscere: pubblica il punteggio e il tuo profilo Cherry nella community degli abbonati. Il tuo indirizzo wallet e il punteggio saranno pubblici.',publish:'Prepara pubblicazione',approve:'Firma e pubblica',ready:'Conferma nel wallet la pubblicazione. È una firma di messaggio, senza pagamento.',done:'Punteggio pubblicato! Il profilo apre Cherry.',error:'Operazione non completata. Controlla l’abbonamento e riprova. Per firmare usa Phantom o un wallet compatibile nel browser.',wait:'Caricamento…'},
 en:{title:'Subscription · Social leaderboard',disclosure:'A higher score puts you higher on the leaderboard. Anyone viewing it can open your profile and follow you on Cherry. Scores are shared by players.',load:'Load leaderboard',empty:'No shared scores yet. Be the first!',share:'Meet the community: publish your score and Cherry profile for other subscribers. Your wallet address and score will be public.',publish:'Prepare publication',approve:'Sign and publish',ready:'Confirm publication in your wallet. This is a message signature, with no payment.',done:'Score published! The profile opens Cherry.',error:'Could not complete. Check your subscription and try again. Use Phantom or a compatible browser wallet to sign.',wait:'Loading…'},
 pl:{title:'Abonament · Ranking społecznościowy',disclosure:'Im wyższy wynik, tym wyżej pojawisz się w rankingu. Osoby przeglądające ranking mogą otworzyć Twój profil i obserwować Cię na Cherry. Wyniki udostępniają gracze.',load:'Pokaż ranking',empty:'Jeszcze nie ma wyników. Bądź pierwszy!',share:'Poznaj społeczność: opublikuj wynik i profil Cherry dla innych abonentów. Adres portfela i wynik będą publiczne.',publish:'Przygotuj publikację',approve:'Podpisz i opublikuj',ready:'Potwierdź publikację w portfelu. To podpis wiadomości, bez płatności.',done:'Wynik opublikowany! Profil otwiera Cherry.',error:'Nie udało się zakończyć. Sprawdź abonament i spróbuj ponownie. Do podpisania użyj Phantom lub kompatybilnego portfela w przeglądarce.',wait:'Wczytywanie…'}
};
const copy=()=>COPY[window.MezzoLocale?.code]||COPY.en;
let result=null,challenge=null,busy=false;
function render(){const c=copy();for(const [id,key]of [['communityTitle','title'],['communityDisclosure','disclosure'],['communityRefresh','load'],['communityShareText','share'],['communityPublish','publish'],['communityApprove','approve']])el(id).textContent=c[key];}
async function api(body){const response=await fetch('/api/community',{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(20000)});let data;try{data=await response.json();}catch{throw Error('community_unavailable');}if(!response.ok)throw Error(data.error||'community_unavailable');return data;}
async function operation(statusId,fn){if(busy)return;busy=true;for(const id of ['communityRefresh','communityPublish','communityApprove'])el(id).disabled=true;el(statusId).textContent=copy().wait;try{await fn();}catch(error){el(statusId).textContent=communityError(error,window.MezzoLocale?.code);}finally{busy=false;for(const id of ['communityRefresh','communityPublish','communityApprove'])el(id).disabled=false;}}
el('communityRefresh').onclick=()=>operation('communityStatus',async()=>{
 const data=await api();if(data.scoreAuthority!=='player-reported'||!Array.isArray(data.scores))throw Error('invalid_list');
 const list=document.createDocumentFragment();
 for(const row of data.scores.slice(0,100)){
  if(!/^\d{1,8}$/.test(String(row.score)))continue;
  const link=document.createElement('a');link.href=cherryProfile(row.wallet);link.target='_blank';link.rel='noopener noreferrer';link.textContent=`${row.wallet.slice(0,6)}…${row.wallet.slice(-4)} · ${Number(row.score).toLocaleString()}`;
  link.title=row.wallet;const item=document.createElement('li');item.append(link);list.append(item);
 }
 el('communityScores').replaceChildren(list);el('communityStatus').textContent=data.scores.length?'':copy().empty;
});
el('communityPublish').onclick=()=>operation('communityPublishStatus',async()=>{
 challenge=null;el('communityApprove').hidden=true;
 const provider=window.MezzoWallet?.getProvider();if(!result)throw Error('missing_score');if(!provider||provider.isMezzoMobile)throw Error('unsupported_wallet');
 await window.MezzoShopAccess.connect();
 if(provider.publicKey?.toString()!==result.wallet)throw Error('wallet_changed');
 const c=await api({action:'challenge',wallet:result.wallet,score:result.score});
 if(c.wallet!==result.wallet||c.score!==result.score||c.message!==scoreMessage(c)||c.expiresAt<=Date.now()/1000||c.expiresAt>Date.now()/1000+305)throw Error('invalid_challenge');
 challenge=c;el('communityApprove').hidden=false;el('communityPublishStatus').textContent=copy().ready;
});
el('communityApprove').onclick=()=>operation('communityPublishStatus',async()=>{
 const c=challenge;if(!c||c.expiresAt<=Date.now()/1000||c.message!==scoreMessage(c))throw Error('expired');
 // Separate click preserves the mobile wallet activation gesture; the server challenge is already reviewed.
 const signed=await window.MezzoWallet.withPaymentSession(async provider=>{
  if(provider.publicKey?.toString()!==c.wallet||!provider.isConnected||typeof provider.signMessage!=='function')throw Error('wallet_changed');
  return provider.signMessage(new TextEncoder().encode(c.message),'utf8');
 });
 if(!(signed?.signature instanceof Uint8Array)||signed.signature.length!==64)throw Error('invalid_signature');
 await api({action:'publish',id:c.id,signature:btoa(String.fromCharCode(...signed.signature))});
 challenge=null;el('communityApprove').hidden=true;el('communityPublishStatus').textContent=copy().done;
});
window.MezzoCommunity=Object.freeze({show(value){result=value;challenge=null;el('communityShare').hidden=!value;el('communityApprove').hidden=true;el('communityPublishStatus').textContent='';}});
document.addEventListener('mezzopollo:language',render);render();
