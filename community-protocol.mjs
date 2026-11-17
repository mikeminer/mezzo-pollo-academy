export function cherryProfile(wallet){
 if(typeof wallet!=='string'||!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet))throw Error('invalid_wallet');
 return `https://chat.cherry.fun/solana/${encodeURIComponent(wallet)}`;
}
export function scoreMessage({wallet,score,id,expiresAt}){
 cherryProfile(wallet);
 if(!Number.isSafeInteger(score)||score<0||score>10000000||typeof id!=='string'||!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(id)||!Number.isSafeInteger(expiresAt))throw Error('invalid_challenge');
 return `mezzopollo.it requests a signature to publish your shared game score.\nURI: https://mezzopollo.it/\nWallet: ${wallet}\nScore: ${score}\nAction: publish-social-score\nNetwork: solana:mainnet\nNonce: ${id}\nExpires: ${expiresAt}\nThis is not a transaction and does not authorize payments.`;
}
