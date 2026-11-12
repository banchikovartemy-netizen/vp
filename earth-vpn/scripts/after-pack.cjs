const fs=require('node:fs'),path=require('node:path');
module.exports=async({appOutDir})=>{function walk(p){const st=fs.lstatSync(p);if(st.isSymbolicLink())return;if(st.isDirectory()){fs.chmodSync(p,0o755);for(const f of fs.readdirSync(p))walk(path.join(p,f))}else fs.chmodSync(p,st.mode&0o111?0o755:0o644)}walk(appOutDir)};
