const {test}=require('node:test'),assert=require('node:assert/strict'),{spawn,execFile}=require('node:child_process'),http=require('node:http');
test('real local VLESS data transfer through sing-box',async()=>{
 const uuid='11111111-1111-4111-8111-111111111111',children=[];
 const server=http.createServer((q,r)=>r.end('EARTH-VLESS-OK'));await new Promise(r=>server.listen(23003,'127.0.0.1',r));
 const tmp=require('node:fs').mkdtempSync('/tmp/earth-engine-');let num=0;const launch=c=>{const f=tmp+'/'+(num++)+'.json';require('node:fs').writeFileSync(f,JSON.stringify(c));const p=spawn('engine/sing-box',['run','-c',f],{stdio:['ignore','ignore','inherit']});children.push(p);return p};
 try{
 launch({inbounds:[{type:'vless',listen:'127.0.0.1',listen_port:23001,users:[{uuid}]}],outbounds:[{type:'direct',tag:'direct'}]});
 launch({inbounds:[{type:'mixed',listen:'127.0.0.1',listen_port:23002}],outbounds:[{type:'vless',tag:'vpn',server:'127.0.0.1',server_port:23001,uuid}]});
 await new Promise(r=>setTimeout(r,600));
 const result=await new Promise((resolve,reject)=>execFile('curl',['--noproxy','','--proxy','socks5h://127.0.0.1:23002','--max-time','5','http://127.0.0.1:23003'],(e,out)=>e?reject(e):resolve(out)));assert.equal(result,'EARTH-VLESS-OK');
 }finally{for(const p of children)p.kill('SIGTERM');await new Promise(r=>server.close(r));require('node:fs').rmSync(tmp,{recursive:true})}
});
