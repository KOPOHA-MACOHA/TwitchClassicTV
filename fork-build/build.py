#!/usr/bin/env python3
"""Package the modified open-source UI with the upstream 3.0.379 native player."""
from pathlib import Path
import hashlib,subprocess,zipfile,argparse,struct,zlib
root=Path(__file__).resolve().parent.parent
p=argparse.ArgumentParser();p.add_argument('--kitchen',type=Path,required=True);p.add_argument('--input',type=Path,default=root/'upstream-379.apk');p.add_argument('--output',type=Path,default=root/'Twitch-Classic-0.11.apk');args=p.parse_args()
assert hashlib.file_digest(args.input.open('rb'),'sha256').hexdigest()=='60c405bbec86501497360767f9e843e7e0fe788e030244d5ec4d63eebf973d99','Unexpected native base APK'
work=root/'fork-build/out';work.mkdir(exist_ok=True)
with zipfile.ZipFile(work/'classic-source.zip','w',zipfile.ZIP_DEFLATED) as z:
 for folder in [root/'app',root/'apk',root/'release/githubio/css']:
  for f in folder.rglob('*'):
   if f.is_file():z.write(f,str(f.relative_to(root)))
 for f in [root/'LICENSE',root/'research/reyohoho-extension.md',root/'research/watch-accounting.md',root/'tests/features-browser.cjs',root/'tests/startup-browser.cjs',root/'tests/chat-presentation-browser.cjs',root/'fork-build/Patches.kt',root/'fork-build/build.py',root/'fork-build/README.md',root/'tests/classic-browser.cjs',root/'tests/shell-browser.cjs',root/'tests/native-auth-browser.cjs',root/'tests/player-navigation-browser.cjs',root/'fork-build/render-branding.cjs',root/'fork-build/validate.py']:
  z.write(f,str(f.relative_to(root)))
with zipfile.ZipFile(work/'classic-ui.zip','w',zipfile.ZIP_DEFLATED) as z:
 for folder in [root/'app',root/'release/githubio/css']:
  for f in folder.rglob('*'):
   if f.is_file():z.write(f,'assets/'+str(f.relative_to(root)))
 # The pinned release shortens resource paths. Retain its IDs and adaptive icon references.
 branding={'res/Ko.png':'classic_icon','res/MB.png':'classic_splash','res/Nv.png':'classic_banner','res/OA.png':'classic_banner','res/4J.png':'classic_splash'}
 for destination,name in branding.items():
  z.write(root/'apk/app/src/main/res/drawable-nodpi'/(name+'.png'),destination)
 def png_chunk(kind,data):
  return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
 # A solid adaptive background is generated independently of the icon image.
 purple=b'\x89PNG\r\n\x1a\n'+png_chunk(b'IHDR',struct.pack('>IIBBBBB',1,1,8,6,0,0,0))+png_chunk(b'IDAT',zlib.compress(b'\x00\x91\x46\xff\xff'))+png_chunk(b'IEND',b'')
 z.writestr('res/1B.png',purple)
 z.writestr('res/aK.xml','<layer-list xmlns:android="http://schemas.android.com/apk/res/android" android:opacity="opaque"><item android:drawable="#9146ff"/><item><bitmap android:src="@mipmap/ic_splash" android:gravity="center"/></item></layer-list>')
 z.write(root/'LICENSE','assets/LICENSE')
 z.write(work/'classic-source.zip','assets/classic-source.zip')
 for n in ['Patches.kt','build.py']:
  z.write(root/'fork-build'/n,'assets/classic-build-source/'+n)
k=args.kitchen.resolve();morphe=k/'bin/morphe/morphe-desktop-1.20.0-all.jar'
def run(*cmd):subprocess.run(list(map(str,cmd)),check=True)
run(k/'bin/kotlin24/kotlinc/bin/kotlinc','-Xskip-prerelease-check','-jvm-target','17','-cp',morphe,'-d',work/'classes',root/'fork-build/Patches.kt')
with zipfile.ZipFile(work/'classic.mpp','w') as z:
 z.writestr('META-INF/MANIFEST.MF','Manifest-Version: 1.0\r\nPatcher-Version: 2.1.0\r\n\r\n')
 for f in (work/'classes').rglob('*'):
  if f.is_file():z.write(f,f.relative_to(work/'classes'))
 z.write(work/'classic-ui.zip','classic-ui.zip')
run('java','-jar',morphe,'patch','-p',work/'classic.mpp','--validate','-r',root/'fork-build/patch-result.json','-o',args.output.resolve(),args.input.resolve())
