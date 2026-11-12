async function download(url,request=fetch){
 let current=new URL(url),response;
 if(current.protocol!=='https:')throw Error('Subscription URL must use HTTPS');
 const origin=current.origin,signal=AbortSignal.timeout(20000);
 for(let hop=0;hop<=4;hop++){
  try{response=await request(current,{signal,redirect:'manual',headers:{'User-Agent':'EarthVPN/1.1'}})}
  catch(e){throw Error('Subscription HTTPS request failed'+(e.cause?.code?' ('+e.cause.code+')':''))}
  if(![301,302,303,307,308].includes(response.status))break;
  const location=response.headers.get('location');await response.body?.cancel();
  if(!location)throw Error('Subscription redirect has no Location header');
  const next=new URL(location,current);
  if(next.protocol!=='https:'||next.origin!==origin)throw Error('Subscription redirect to a different origin was blocked');
  if(hop===4)throw Error('Too many subscription redirects');
  current=next;
 }
 if(!response.ok)throw Error('Subscription HTTP '+response.status);
 if(!response.body)throw Error('Empty subscription response');
 const reader=response.body.getReader(),chunks=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4*1024*1024){await reader.cancel();throw Error('Subscription exceeds 4 MiB')}chunks.push(value)}
 return Buffer.concat(chunks).toString('utf8');
}
module.exports={download};
