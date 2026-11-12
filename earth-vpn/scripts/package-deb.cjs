const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),stage=path.join(root,'deb-stage');
fs.rmSync(stage,{recursive:true,force:true});
for(const p of ['DEBIAN','opt','usr/share/applications','usr/bin'])fs.mkdirSync(path.join(stage,p),{recursive:true,mode:0o755});
fs.cpSync(path.join(root,'release/linux-unpacked'),path.join(stage,'opt/Earth VPN'),{recursive:true});
for(const p of ['control','postinst','postrm']){fs.copyFileSync(path.join(__dirname,p),path.join(stage,'DEBIAN',p));fs.chmodSync(path.join(stage,'DEBIAN',p),p==='control'?0o644:0o755)}
fs.copyFileSync(path.join(__dirname,'earth-vpn.desktop'),path.join(stage,'usr/share/applications/earth-vpn.desktop'));fs.chmodSync(path.join(stage,'usr/share/applications/earth-vpn.desktop'),0o644);fs.symlinkSync('/opt/Earth VPN/earth-vpn',path.join(stage,'usr/bin/earth-vpn'));
execFileSync('dpkg-deb',['--root-owner-group','-Zgzip','-z1','--build',stage,path.join(root,'release/Earth-VPN-1.0.0-amd64.deb')],{stdio:'inherit'});
