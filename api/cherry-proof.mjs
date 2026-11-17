import {CHERRY_APP_ID} from '../server/cherry-config.mjs';
export default function(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Content-Type','application/json');
 const appId=CHERRY_APP_ID;
 res.statusCode=req.method!=='GET'&&req.method!=='HEAD'?405:appId?200:404;
 res.end(req.method==='HEAD'?'':JSON.stringify(res.statusCode===200?{appId}:{error:'unavailable'}));
}
