export function arcadeTweetUrl({score,tier}) {
  if(!Number.isSafeInteger(score)||score<0||!['medium','easy','god','hard'].includes(tier)) throw Error('Invalid Arcade result');
  const url=new URL('https://x.com/intent/post');
  url.searchParams.set('text',`MezzoPollo Arcade · ${tier} · ${score} points!`);
  url.searchParams.set('hashtags','mezzopollo');
  url.searchParams.set('url','https://mezzopollo.it/');
  return url.href;
}
const COPY={
 it:['Condividi su X','Scarica la foto del tuo punteggio e allegala a un post su X con #mezzopollo, oppure pubblicala nella pagina Pump.fun di MEMEZZO, per avere la possibilità di essere contattato per un premio in SOL. Il premio non è garantito.'],
 pl:['Udostępnij na X','Pobierz zdjęcie wyniku i dołącz je do posta na X z #mezzopollo lub opublikuj je na stronie MEMEZZO na Pump.fun, aby mieć szansę na kontakt w sprawie nagrody w SOL. Nagroda nie jest gwarantowana.'],
 en:['Share on X','Download your score photo and attach it to a post on X with #mezzopollo, or publish it on the MEMEZZO Pump.fun page, for a chance to be contacted about a SOL prize. A prize is not guaranteed.'],
};
if(typeof window!=='undefined') {
 let result=null;
 const render=()=>{
  const panel=document.getElementById('arcadeShareInvite');
  panel.hidden=!result;if(!result)return;
  const [label,message]=COPY[window.MezzoLocale?.code]||COPY.en;
  document.getElementById('arcadeShareText').textContent=message;
  const download=document.getElementById('arcadeDownload');
  download.textContent=window.MezzoLocale?.code==='it'?'Scarica foto punteggio':window.MezzoLocale?.code==='pl'?'Pobierz zdjęcie wyniku':'Download score photo';
  download.hidden=!result.image;if(result.image)download.href=result.image;
  document.getElementById('arcadeSharePump').textContent=window.MezzoLocale?.code==='it'?'Pubblica su Pump.fun':window.MezzoLocale?.code==='pl'?'Opublikuj na Pump.fun':'Post on Pump.fun';
  const link=document.getElementById('arcadeShareX');link.textContent=label;link.href=arcadeTweetUrl(result);
 };
 window.MezzoArcadeShare=Object.freeze({show(value){result=value;render();}});
 document.addEventListener('mezzopollo:language',render);
}
