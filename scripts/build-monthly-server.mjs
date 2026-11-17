import {build} from 'esbuild';
await build({
 stdin:{contents:"export {prepareMonthly,lockAddress} from './server/monthly-purchase.mjs'; export {Connection,PublicKey} from '@solana/web3.js';",resolveDir:new URL('..',import.meta.url).pathname},
 platform:'node',target:'node22',format:'cjs',bundle:true,minify:true,
 external:['bufferutil','utf-8-validate','node-gyp-build'],
 outfile:new URL('../server/monthly-runtime.cjs',import.meta.url).pathname,
});
