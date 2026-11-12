const {app,BrowserWindow,ipcMain}=require('electron'),fs=require('node:fs/promises'),path=require('node:path'),net=require('node:net'),{spawn}=require('node:child_process'),{parse}=require('./subscription.cjs');
let win,store={nodes:[],groups:[],warnings:[]},proc,state={status:'DISCONNECTED'},closing=false;
const location=()=>path.join(app.getPath('userData'),'subscription.json');
const send=s=>{state=s;win?.webContents.send('state',s)};
const safe=fn=>async(...args)=>{try{return {ok:true,data:await fn(...args.slice(1))}}catch(e){return {ok:false,error:e.message}}};
async function stop(){if(!proc){send({status:'DISCONNECTED'});return}const p=proc;await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('VPN shutdown timeout; do not start another tunnel')),7000);p.once('exit',()=>{clearTimeout(t);resolve()});p.stdin.write('STOP\n');p.stdin.end()});send({status:'DISCONNECTED'})}
let pending=Promise.resolve();const serial=fn=>(...a)=>{const run=pending.then(()=>fn(...a));pending=run.catch(()=>{});return run};
app.whenReady().then(async()=>{try{store=JSON.parse(await fs.readFile(location(),'utf8'))}catch{}
win=new BrowserWindow({width:1440,height:950,minWidth:900,minHeight:650,backgroundColor:'#020409',title:'Earth VPN',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());
await win.loadFile(path.join(__dirname,'../dist/index.html'));
});
ipcMain.handle('load',safe(async()=>({...store,state})));
ipcMain.handle('update',safe(serial(async url=>{const u=new URL(url);if(u.protocol!=='https:')throw Error('Subscription URL must use HTTPS');let res;try{res=await fetch(u,{signal:AbortSignal.timeout(20000),redirect:'error',headers:{'User-Agent':'EarthVPN/1.0'}})}catch{throw Error('HTTPS request failed (redirects are disabled; use final subscription URL)')}if(!res.ok)throw Error('Subscription HTTP '+res.status);const reader=res.body.getReader();let chunks=[],size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4*1024*1024){await reader.cancel();throw Error('Subscription exceeds 4 MiB')}chunks.push(value)}const next=parse(Buffer.concat(chunks).toString('utf8'));await fs.mkdir(app.getPath('userData'),{recursive:true,mode:0o700});await fs.writeFile(location(),JSON.stringify(next),{mode:0o600});await stop();store=next;return store})));
ipcMain.handle('ping',safe(async()=>{let i=0;const results={};await Promise.all(Array.from({length:8},async()=>{while(i<store.nodes.length){const n=store.nodes[i++];results[n.id]=await new Promise(resolve=>{const start=performance.now(),s=net.connect({host:n.server,port:n.server_port});let done=false;const finish=v=>{if(done)return;done=true;s.destroy();resolve(v)};s.setTimeout(3500,()=>finish(null));s.once('connect',()=>finish(Math.round(performance.now()-start)));s.once('error',()=>finish(null))})}}));return results}));
ipcMain.handle('connect',safe(serial(async id=>{const n=store.nodes.find(n=>n.id===id);if(!n)throw Error('Server not found');await stop();send({status:'CONNECTING',id});
const engine=app.isPackaged?path.join(process.resourcesPath,'engine'):path.join(__dirname,'../engine');
if(!app.isPackaged||engine!=='/opt/Earth VPN/resources/engine'){send({status:'ERROR',error:'Privileged TUN requires the installed .deb (root-owned helper).'});throw Error(state.error)}
proc=spawn('/usr/bin/pkexec',['/usr/bin/node',path.join(engine,'helper.cjs')],{stdio:['pipe','pipe','pipe']});
const p=proc;let err='';p.stderr.on('data',b=>{err=(err+b.toString()).slice(-2000)});p.on('error',()=>{if(proc===p)proc=null;send({status:'ERROR',error:'Cannot start pkexec. Install polkit and authenticate on the Ubuntu desktop.'})});p.on('exit',code=>{if(proc===p)proc=null;if(state.status!=='DISCONNECTED')send(code===0?{status:'DISCONNECTED'}:{status:'ERROR',error:'VPN engine exited ('+code+'). '+err.replace(/[a-f0-9]{8}-[a-f0-9-]{27}/gi,'[redacted]')})});p.stdin.on('error',()=>{});p.stdin.write(JSON.stringify(n)+'\n');
const timer=setInterval(()=>{if(proc!==p){clearInterval(timer);return}if(require('node:fs').existsSync('/sys/class/net/earthvpn0')){clearInterval(timer);send({status:'CONNECTED',id:n.id})}},300);setTimeout(()=>{clearInterval(timer);if(proc===p&&state.status==='CONNECTING'){send({status:'ERROR',error:'TUN did not start in time; authentication or network permissions may be missing.'});p.stdin.end('STOP\n')}},90000).unref();
})));
ipcMain.handle('disconnect',safe(serial(stop)));
app.on('before-quit',e=>{if(proc&&!closing){e.preventDefault();closing=true;stop().catch(()=>{}).finally(()=>app.quit())}});
app.on('window-all-closed',()=>app.quit());
