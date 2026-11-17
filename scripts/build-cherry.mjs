import {build} from 'esbuild';
await build({stdin:{contents:"export {CherryMiniApp,isInsideCherry} from '@cherrydotfun/miniapp-sdk';",resolveDir:process.cwd()},bundle:true,platform:'browser',format:'esm',minify:true,legalComments:'eof',outfile:'vendor/cherry.mjs'});
