const str=(v,max=512)=>{if(typeof v!=='string'||!v||v.length>max||/[\x00-\x1f]/.test(v))throw Error('Invalid server field');return v};
function outbound(n){
 if(n.type!=='vless')throw Error('Supported protocol: VLESS only');
 const o={type:'vless',tag:'vpn',server:str(n.server),server_port:Number(n.server_port),uuid:str(n.uuid)};
 if(!Number.isInteger(o.server_port)||o.server_port<1||o.server_port>65535)throw Error('Invalid port');
 if(!/^[a-f0-9-]{36}$/i.test(o.uuid))throw Error('Invalid VLESS UUID');
 if(n.flow){if(n.flow!=='xtls-rprx-vision')throw Error('Unsupported VLESS flow');o.flow=n.flow}
 if(n.tls?.enabled){o.tls={enabled:true,server_name:str(n.tls.server_name||n.server)};
 if(n.tls.utls?.enabled)o.tls.utls={enabled:true,fingerprint:str(n.tls.utls.fingerprint||'chrome')};
 if(n.tls.reality?.enabled){o.tls.utls=o.tls.utls||{enabled:true,fingerprint:'chrome'};o.tls.reality={enabled:true,public_key:str(n.tls.reality.public_key),short_id:n.tls.reality.short_id||''};}}
 if(n.transport){const t=n.transport;if(t.type==='ws')o.transport={type:'ws',path:t.path||'/',headers:t.headers?.Host?{Host:str(t.headers.Host)}:{}};else if(t.type==='grpc')o.transport={type:'grpc',service_name:t.service_name||''};else if(t.type==='http')o.transport={type:'http',host:t.host||[],path:t.path||'/'};else throw Error('Unsupported transport: '+t.type)}
 return o;
}
function config(n){return {log:{level:'warn'},dns:{servers:[{type:'udp',tag:'remote',server:'1.1.1.1',detour:'vpn'},{type:'local',tag:'local'}],final:'remote',strategy:'prefer_ipv4'},inbounds:[{type:'tun',tag:'tun-in',interface_name:'earthvpn0',address:['172.29.0.1/30','fdfe:dcba:9876::1/126'],mtu:1400,auto_route:true,strict_route:true,stack:'gvisor'}],outbounds:[outbound(n),{type:'direct',tag:'direct'}],route:{auto_detect_interface:true,default_domain_resolver:'local',rules:[{action:'sniff'},{protocol:'dns',action:'hijack-dns'}],final:'vpn'}}}
module.exports={outbound,config};
