import {createMonthlyClient} from './monthly-client.mjs';
const byId=id=>document.getElementById(id);
const COPY={
 it:{retrySafe:'Il pagamento non è stato completato. Puoi preparare una nuova proposta.',buy:'Abbonati · 0,2 SOL / 30 giorni',approve:'Approva nel wallet',check:'Controlla pagamento',intro:'Stake and Play: 30 giorni e 10 vite per partita.',details:'I tuoi 0,2 SOL acquistano MEMEZZO per il tuo wallet. I token restano accantonati per la durata dell’abbonamento e il loro valore può cambiare. Nessun rinnovo automatico.',review:'Controlla i dettagli prima di approvare',fee:'Commissione di rete',reserve:'Saldo SOL da conservare (non addebitato)',setup:'Configurazione account',min:'MEMEZZO minimi',end:'Scadenza',wait:'Preparazione in corso…',pending:'Risultato da verificare. Controlla il pagamento prima di riprovare.',success:'Abbonamento attivo.',error:'Non è stato possibile preparare il pagamento. Riprova.',funds:'Servono 0,2 SOL più le commissioni e la configurazione account.',unsupported:'Per acquistare il mensile, apri mezzopollo.it nel browser con Phantom o un wallet Solana compatibile.',photo:'Leaderboard sociale in preparazione.'},
 en:{retrySafe:'The payment did not complete. You can prepare a new quote.',buy:'Subscribe · 0.2 SOL / 30 days',approve:'Approve in wallet',check:'Check payment',intro:'Stake and Play: 30 days and 10 lives per round.',details:'Your 0.2 SOL buys MEMEZZO for your wallet. The tokens stay set aside for the subscription and their value can change. No automatic renewal.',review:'Review before approving',fee:'Network fee',reserve:'SOL balance to keep (not charged)',setup:'Account setup',min:'Minimum MEMEZZO',end:'Ends',wait:'Preparing…',pending:'Result not confirmed. Check the payment before trying again.',success:'Subscription active.',error:'The payment could not be prepared. Try again.',funds:'You need 0.2 SOL plus network and account setup fees.',unsupported:'To buy the monthly pass, open mezzopollo.it in a browser with Phantom or a compatible Solana wallet.',photo:'Social leaderboard in development.'},
 pl:{retrySafe:'Płatność nie została zrealizowana. Możesz przygotować nową propozycję.',buy:'Subskrybuj · 0,2 SOL / 30 dni',approve:'Zatwierdź w portfelu',check:'Sprawdź płatność',intro:'Stake and Play: 30 dni i 10 żyć na rozgrywkę.',details:'Twoje 0,2 SOL kupuje MEMEZZO dla Twojego portfela. Tokeny pozostają odłożone na czas abonamentu, a ich wartość może się zmieniać. Bez automatycznego odnowienia.',review:'Sprawdź przed zatwierdzeniem',fee:'Opłata sieciowa',reserve:'Pozostawione SOL (bez obciążenia)',setup:'Utworzenie kont',min:'Minimum MEMEZZO',end:'Wygasa',wait:'Przygotowywanie…',pending:'Wynik niepotwierdzony. Sprawdź płatność przed kolejną próbą.',success:'Abonament aktywny.',error:'Nie udało się przygotować płatności. Spróbuj ponownie.',funds:'Potrzebujesz 0,2 SOL oraz opłat sieciowych i utworzenia kont.',unsupported:'Aby kupić abonament, otwórz mezzopollo.it w przeglądarce z Phantom lub kompatybilnym portfelem Solana.',photo:'Ranking społecznościowy w przygotowaniu.'}
};
const copy=()=>COPY[window.MezzoLocale?.code]||COPY.en;
const client=createMonthlyClient({storage:{getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v),removeItem:k=>localStorage.removeItem(k)}});let quote=null,busy=false,shopEpoch=0;
const sol=n=>(Number(n)/1e9).toLocaleString(window.MezzoLocale?.locale||'en-US',{maximumFractionDigits:9});
const dialog=byId('monthlyDialog');
function status(text){byId('monthlyStatus').textContent=text;byId('monthlyDialogStatus').textContent=dialog.open?text:'';}
function render(){const c=copy();byId('monthlyReviewTitle').textContent=c.review;byId('monthlyCancel').textContent=({it:'Annulla',pl:'Anuluj'})[window.MezzoLocale?.code]||'Cancel';byId('monthlyCancel').disabled=busy;byId('monthlyBuy').textContent=c.buy;byId('monthlyApprove').textContent=c.approve;byId('monthlyCheck').textContent=c.check;byId('monthlyDetails').textContent=c.details;byId('monthlyIntro').textContent=c.intro;byId('monthlyBuy').disabled=busy;byId('monthlyApprove').disabled=busy;byId('monthlyCheck').disabled=busy;}
const ERRORS={
 it:{route_unavailable:'Acquisto temporaneamente non disponibile per questo mercato. Riprova più tardi.',token_unavailable:'Non è stato possibile verificare MEMEZZO. Riprova.',subscription_slots_full:'Non puoi preparare un altro abbonamento con questo wallet. Contatta l’assistenza.',simulation_failed:'Il controllo del pagamento non è riuscito. Prepara una nuova proposta.',quote_too_small:'La proposta di acquisto non è valida. Riprova.',transaction_too_large:'Il pagamento non può essere preparato con questa configurazione.',fee_unavailable:'Le commissioni di rete non sono disponibili. Riprova.',payment_mismatch:'La proposta è scaduta o non corrisponde ai dettagli previsti. Preparala di nuovo.',storage_unavailable:'Consenti il salvataggio dei dati del sito per recuperare eventuali pagamenti.',wallet_disconnected:'Collega il wallet prima di continuare.',verification_unavailable:'Verifica del pagamento non disponibile. Riprova senza pagare di nuovo.'},
 en:{route_unavailable:'Purchasing is temporarily unavailable on this market. Try later.',token_unavailable:'MEMEZZO could not be verified. Try again.',subscription_slots_full:'Another subscription cannot be prepared for this wallet. Contact support.',simulation_failed:'The payment check failed. Prepare a new quote.',quote_too_small:'The purchase quote is invalid. Try again.',transaction_too_large:'The payment cannot be prepared with this configuration.',fee_unavailable:'Network fees are unavailable. Try again.',payment_mismatch:'The quote expired or did not match the reviewed details. Prepare it again.',storage_unavailable:'Allow site storage so pending payments can be recovered.',wallet_disconnected:'Connect your wallet before continuing.',verification_unavailable:'Payment verification is unavailable. Check again without paying again.'}
};
function safePending(){try{return client.pending();}catch{return null;}}
async function operation(fn){if(busy)return;busy=true;render();try{await fn();}catch(e){status(e.message==='insufficient_sol'?copy().funds:e.message==='payment_pending'||safePending()?copy().pending:(ERRORS[window.MezzoLocale?.code]||ERRORS.en)[e.message]||copy().error);}finally{busy=false;render();}}
const exclusive=fn=>{if(!navigator.locks)throw Error('storage_unavailable');return navigator.locks.request('mp-monthly-payment',{mode:'exclusive'},fn);};
byId('monthlyBuy').onclick=()=>operation(async()=>{
 const epoch=shopEpoch;quote=null;
 byId('monthlyReview').textContent='';
 const provider=window.MezzoWallet?.getProvider();
 if(!provider&&document.documentElement.dataset.cherryWallet===''){
  status(window.MezzoLocale?.code==='it'?'Il wallet Cherry non è ancora collegato. Attendi che compaia «Wallet Cherry collegato» e riprova.':'The Cherry wallet is not connected yet. Wait for it to connect, then try again.');return;
 }
 if(!provider||provider.isMezzoMobile){status(copy().unsupported);return;}
 status(copy().wait);
 // Preparing a new pass does not require an existing entitlement lookup.
 if(!provider.isConnected)await provider.connect();
 const wallet=provider.publicKey?.toString();
 if(!provider.isConnected||!wallet)throw Error('wallet_disconnected');
 // An unsigned quote has no side effects. Keep the cross-tab lock for approval and recovery only.
 quote=await client.prepare(wallet, {cherry: provider.isMezzoCherry===true});
 if(epoch!==shopEpoch){quote=null;return;}
 if(provider.publicKey?.toString()!==wallet){quote=null;throw Error('wallet_disconnected');}
 status('');
 const c=copy();byId('monthlyReview').textContent=`0.2 SOL · 30 days · 2% slippage\n${c.min}: ${(BigInt(quote.minimumRaw)/1000000n).toLocaleString()}\n${c.fee}: ${sol(quote.feeLamports)} SOL\n${c.setup}: ${sol(quote.setupLamports)} SOL\n${c.reserve}: ${sol(quote.reserveLamports)} SOL\n${c.end}: ${new Date(quote.expiresAt*1000).toLocaleString()} (${new Date(quote.expiresAt*1000).toISOString()})`;
 dialog.showModal();
});
byId('monthlyApprove').onclick=()=>operation(async()=>{
 if(!quote)throw Error('quote_expired');
 await exclusive(()=>client.approve(quote,fn=>window.MezzoWallet.withPaymentSession(fn)));
 quote=null;dialog.close();status(copy().pending);
 const result=await client.recover();if(result?.confirmed){await window.MezzoShopAccess.connect();status(copy().success);}
});
byId('monthlyCheck').onclick=()=>operation(async()=>{const result=await exclusive(()=>client.recover());if(result?.confirmed){await window.MezzoShopAccess.connect();status(copy().success);}else if(result?.retrySafe)status(copy().retrySafe);else if(result)status(copy().pending);else{await window.MezzoShopAccess.connect();status('');}});
document.addEventListener('mezzopollo:language',render);
byId('monthlyCancel').onclick=()=>{if(!busy)dialog.close();};
dialog.addEventListener('cancel',ev=>{if(busy)ev.preventDefault();});
dialog.addEventListener('close',()=>{if(!dialog.open){quote=null;byId('monthlyDialogStatus').textContent='';}});
document.addEventListener('mezzopollo:shopclose',()=>{shopEpoch++;quote=null;if(dialog.open)dialog.close();byId('monthlyReview').textContent='';});
setInterval(()=>{const state=window.MezzoShopAccess?.getState();byId('monthlyCountdown').textContent=state?.eligible&&state.expiresAt?`${copy().end}: ${new Date(state.expiresAt*1000).toLocaleString()} · ${Math.max(0,Math.floor((state.expiresAt-Date.now()/1000)/86400))}d ${Math.max(0,Math.floor((state.expiresAt-Date.now()/1000)%86400/3600))}h`:'';},1000);
render();

const MEMBERSHIP_COPY={"it":{"title":"Cosa include l’abbonamento","benefits":["30 giorni di gioco, con 10 vite a partita.","Classifica sociale: condividi il punteggio, scala la classifica e fatti seguire su Cherry dagli altri giocatori.","I tuoi 0,2 SOL acquistano MEMEZZO, scambiato sul mercato Pump.fun. A parità di SOL, un prezzo più basso permette di ottenere più token: chi entra prima può accantonarne di più se il prezzo al momento dell’acquisto è più basso.","Invita altri utenti di Cherry a giocare: più giocatori significa più persone con cui confrontarti e farti conoscere."],"redeem":"Riscatta MEMEZZO","text":"Il riscatto direttamente nel gioco non è ancora disponibile. Serviranno lo stesso wallet usato per il pass, la scadenza dei 30 giorni e una rotta di scambio compatibile."},"en":{"title":"What your subscription includes","benefits":["30 days of play, with 10 lives per round.","Social leaderboard: share your score, climb the board and let other players follow you on Cherry.","Your 0.2 SOL buys MEMEZZO, traded on Pump.fun. The same SOL buys more tokens at a lower price: early players can set aside more if the price is lower when they buy.","Invite other Cherry users to play so you have more people to compete with and get to know."],"redeem":"Redeem MEMEZZO","text":"In-game redemption is not available yet. You will need the wallet used to buy the pass, a completed 30-day term and a compatible swap route."},"pl":{"title":"Co obejmuje abonament","benefits":["30 dni gry i 10 żyć na rozgrywkę.","Ranking społecznościowy: udostępnij wynik, awansuj w rankingu i daj innym możliwość obserwowania Cię na Cherry.","Za 0,2 SOL kupujesz MEMEZZO, którym handluje się na Pump.fun. Przy niższej cenie za tę samą kwotę SOL kupisz więcej tokenów, więc wcześniejsi gracze mogą odłożyć więcej, jeśli kupią taniej.","Zaproś innych użytkowników Cherry, by mieć z kim rywalizować i kogo poznać."],"redeem":"Odbierz MEMEZZO","text":"Odbiór w grze nie jest jeszcze dostępny. Potrzebujesz portfela użytego do zakupu, upływu 30 dni i zgodnej trasy wymiany."}};
function renderMembership(){
 const words=MEMBERSHIP_COPY[window.MezzoLocale?.code]||MEMBERSHIP_COPY.en;
 byId('monthlyBenefitsTitle').textContent=words.title;
 byId('monthlyBenefits').replaceChildren(...words.benefits.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
 byId('monthlyRedeemTitle').textContent=words.redeem;
 byId('monthlyRedeemText').textContent=words.text;
}
document.addEventListener('mezzopollo:language',renderMembership);
renderMembership();
