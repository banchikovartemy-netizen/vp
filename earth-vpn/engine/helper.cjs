#!/usr/bin/node
// Installed root-owned in /opt/Earth VPN/resources/engine. No arbitrary file paths or commands.
const {spawn}=require('node:child_process');
const {config}=require('./config.cjs');
const fs=require('node:fs');let dir;process.on('exit',()=>{if(dir)fs.rmSync(dir,{recursive:true,force:true})});
if(process.getuid()!==0)process.exit(77);
let buf='',child,stopping=false;
function stop(){stopping=true;if(child){child.kill('SIGTERM');setTimeout(()=>child?.kill('SIGKILL'),4000).unref()}else process.exit(0)}
process.stdin.setEncoding('utf8');
process.stdin.on('data',s=>{if(child){if(s.includes('STOP'))stop();return}buf+=s;if(buf.length>32768)process.exit(1);if(!buf.includes('\n'))return;
try{const c=config(JSON.parse(buf.split('\n')[0]));dir=fs.mkdtempSync('/run/earth-vpn-');fs.chmodSync(dir,0o700);fs.writeFileSync(dir+'/config.json',JSON.stringify(c),{mode:0o600});child=spawn(__dirname+'/sing-box',['run','-c',dir+'/config.json'],{stdio:['ignore','pipe','pipe']});child.stdout.pipe(process.stdout);child.stderr.pipe(process.stderr);child.on('exit',code=>process.exit(stopping?0:code||1));}catch{console.error('Invalid VPN configuration');process.exit(1)}});
process.stdin.on('end',stop);process.on('SIGTERM',stop);process.on('SIGINT',stop);
