const YAML=require('yaml'),countries=require('./countries.json'),{outbound}=require('./config.cjs');
function country(name){
 if(/automatic|best.?ping|global|special|auto.?select|自动|选择/i.test(name))return null;
 const flag=Array.from(name).filter(c=>c.codePointAt(0)>=0x1f1e6&&c.codePointAt(0)<=0x1f1ff).slice(0,2);
 if(flag.length===2){const code=flag.map(c=>String.fromCharCode(c.codePointAt(0)-0x1f1e6+65)).join('');if(countries[code])return code}
 const clean=name.toLowerCase();
 for(const [code,c]of Object.entries(countries))if(c.names.some(x=>x.length>3&&clean.includes(x.toLowerCase()))||new RegExp('(^|[^a-z])'+code+'([^a-z]|$)','i').test(name))return code;
 return null;
}
function parse(text){
 let raw=text.trim(),items=[],groups=[],errors=[];
 if(!raw.startsWith('{')&&!raw.startsWith('[')&&!raw.includes('proxies:')&&!raw.includes('vless://')){try{raw=Buffer.from(raw.replace(/\s/g,''),'base64').toString('utf8')}catch{}}
 if(raw.includes('vless://')&&!raw.startsWith('{')&&!raw.includes('proxies:')){
 for(const line of raw.split(/\r?\n/).filter(Boolean)){try{const u=new URL(line);if(u.protocol!=='vless:')throw Error('Unsupported protocol: '+u.protocol);const p=u.searchParams,security=p.get('security');if(security&&!['tls','reality','none'].includes(security))throw Error('Unsupported security');
 const n={type:'vless',name:decodeURIComponent(u.hash.slice(1))||u.hostname,server:u.hostname.replace(/^\[|\]$/g,''),server_port:Number(u.port),uuid:decodeURIComponent(u.username),flow:p.get('flow')||undefined};
 if(security==='tls'||security==='reality')n.tls={enabled:true,server_name:p.get('sni')||u.hostname,utls:{enabled:true,fingerprint:p.get('fp')||'chrome'},...(security==='reality'?{reality:{enabled:true,public_key:p.get('pbk'),short_id:p.get('sid')||''}}:{})};
 const t=p.get('type');if(t&&t!=='tcp')n.transport=t==='ws'?{type:t,path:p.get('path')||'/',headers:{Host:p.get('host')||u.hostname}}:{type:t,service_name:p.get('serviceName')||''};
 items.push(n);}catch(e){errors.push(e.message)}}
 }else{
 let data;try{data=YAML.parse(raw)}catch{throw Error('Subscription is not valid JSON/YAML or a VLESS list')}
 if(Array.isArray(data?.outbounds)){for(const n of data.outbounds){if(['selector','urltest'].includes(n.type)){groups.push(n.tag);continue}if(['direct','block','dns'].includes(n.type))continue;items.push({...n,name:n.tag})}}
 else if(Array.isArray(data?.proxies)){groups=(data['proxy-groups']||[]).map(g=>g.name);for(const p of data.proxies){const r=p['reality-opts'];items.push({type:p.type,name:p.name,server:p.server,server_port:p.port,uuid:p.uuid,flow:p.flow,tls:p.tls?{enabled:true,server_name:p.servername||p.sni||p.server,utls:{enabled:true,fingerprint:p['client-fingerprint']||'chrome'},...(r?{reality:{enabled:true,public_key:r['public-key'],short_id:r['short-id']||''}}:{})}:undefined,transport:p.network&&p.network!=='tcp'?p.network==='ws'?{type:'ws',path:p['ws-opts']?.path,headers:p['ws-opts']?.headers}:p.network==='grpc'?{type:'grpc',service_name:p['grpc-opts']?.['grpc-service-name']}:{type:p.network}:undefined})}}
 else throw Error('Unsupported subscription: expected VLESS links, sing-box outbounds or Clash proxies');
 }
 const nodes=[];for(const item of items)try{const o=outbound(item);nodes.push({...o,id:String(nodes.length),name:item.name||item.server,country:country(item.name||'')})}catch(e){errors.push(e.message)}
 if(!nodes.length)throw Error('No supported real servers. '+[...new Set(errors)].join('; '));
 return {nodes,groups,warnings:[...new Set(errors)]};
}
module.exports={parse,country};
