export default function(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Content-Type','application/json');
 const appId=process.env.CHERRY_APP_ID?.trim() || 'app_3c3a9a0010ea';
 res.statusCode=req.method!=='GET'&&req.method!=='HEAD'?405:appId?200:404;
 res.end(req.method==='HEAD'?'':JSON.stringify(res.statusCode===200?{appId}:{error:'unavailable'}));
}
