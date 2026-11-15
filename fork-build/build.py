#!/usr/bin/env python3
"""Package the fork UI with the pinned upstream 3.0.379 native player."""
from pathlib import Path
import argparse, hashlib, json, os, shutil, struct, subprocess, zipfile, zlib
root = Path(__file__).resolve().parent.parent
release = json.loads((root/'fork-build/version.json').read_text())
p = argparse.ArgumentParser()
p.add_argument('--kitchen', type=Path, help='Optional existing ReTwitch kitchen; otherwise run bootstrap.py first')
p.add_argument('--input', type=Path, default=root/'upstream-379.apk')
p.add_argument('--output', type=Path, default=root/('Twitch-Classic-'+release['name']+'.apk'))
p.add_argument('--keystore', type=Path, default=os.environ.get('CLASSIC_KEYSTORE'))
p.add_argument('--release', action='store_true', help='Require the existing private signing key')
args = p.parse_args()
assert hashlib.file_digest(args.input.open('rb'),'sha256').hexdigest() == '60c405bbec86501497360767f9e843e7e0fe788e030244d5ec4d63eebf973d99', 'Unexpected native base APK'
if args.release and (not args.keystore or not args.keystore.is_file()): p.error('Release builds require CLASSIC_KEYSTORE or --keystore. Do not generate a new key.')
version_js = "/* Generated from fork-build/version.json. GPL-3.0-or-later. */\nvar ClassicBuild = " + json.dumps({'name':release['name'],'code':release['code'],'repository':'KOPOHA-MACOHA/TwitchClassicTV'},ensure_ascii=False) + ';\n'
(root/'app/general/classic-version.js').write_text(version_js)
work = root/'fork-build/out'; work.mkdir(exist_ok=True)
with zipfile.ZipFile(work/'classic-source.zip','w',zipfile.ZIP_DEFLATED) as z:
 for folder in ['app','apk','release/githubio/css','tests','research','fork-build','.github']:
  for f in (root/folder).rglob('*'):
   if f.is_file() and f.suffix in {'.js','.cjs','.css','.html','.xml','.java','.kt','.gradle','.properties','.md','.svg','.woff2','.txt','.json','.py','.yml','.yaml','.png','.sh','.jar','.pro'} and not any(part in {'out','build','.gradle','assets','__pycache__'} for part in f.relative_to(root/folder).parts) and not f.name.startswith(('upload','validation','patch-result','release-import')) and f.name != 'native-preview-check.apk':
    if folder == 'tests' and f.suffix == '.png': continue
    if folder == 'fork-build' and f.suffix == '.jar': continue
    z.write(f,str(f.relative_to(root)))
 for name in ['LICENSE','README.md','package.json','.gitignore']: z.write(root/name,name)
with zipfile.ZipFile(work/'classic-ui.zip','w',zipfile.ZIP_DEFLATED) as z:
 for folder in ['app','release/githubio/css']:
  for f in (root/folder).rglob('*'):
   if f.is_file(): z.write(f,'assets/'+str(f.relative_to(root)))
 branding = {'res/Ko.png':'classic_icon','res/MB.png':'classic_splash','res/Nv.png':'classic_banner','res/OA.png':'classic_banner','res/4J.png':'classic_splash'}
 for dest,name in branding.items(): z.write(root/'apk/app/src/main/res/drawable-nodpi'/(name+'.png'),dest)
 def chunk(kind,data): return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
 purple=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',1,1,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(b'\x00\x91\x46\xff\xff'))+chunk(b'IEND',b'')
 z.writestr('res/1B.png',purple)
 z.writestr('res/aK.xml','<layer-list xmlns:android="http://schemas.android.com/apk/res/android" android:opacity="opaque"><item android:drawable="#9146ff"/><item><bitmap android:src="@mipmap/ic_splash" android:gravity="center"/></item></layer-list>')
 z.write(root/'LICENSE','assets/LICENSE');z.write(work/'classic-source.zip','assets/classic-source.zip')
 for name in ['Patches.kt','build.py','version.json']: z.write(root/'fork-build'/name,'assets/classic-build-source/'+name)
if args.kitchen:
 k=args.kitchen.resolve(); morphe=k/'bin/morphe/morphe-desktop-1.20.0-all.jar'; kotlinc=k/'bin/kotlin24/kotlinc/bin/kotlinc'
else: morphe=root/'.classic-tools/morphe.jar'; kotlinc=root/'.classic-tools/kotlinc/bin/kotlinc'
def run(*cmd): subprocess.run(list(map(str,cmd)),check=True)
classes=work/'classes'
if classes.exists(): shutil.rmtree(classes)
run(kotlinc,'-Xskip-prerelease-check','-jvm-target','17','-cp',morphe,'-d',classes,root/'fork-build/Patches.kt')
with zipfile.ZipFile(work/'classic.mpp','w') as z:
 z.writestr('META-INF/MANIFEST.MF','Manifest-Version: 1.0\r\nPatcher-Version: 2.1.0\r\n\r\n')
 z.writestr('classic-build.properties','versionName=3.0.379-classic'+release['name']+'\nversionCode='+str(release['code'])+'\n')
 for f in classes.rglob('*'):
  if f.is_file(): z.write(f,f.relative_to(classes))
 z.write(work/'classic-ui.zip','classic-ui.zip')
cmd=['java','-jar',str(morphe),'patch','-p',str(work/'classic.mpp'),'--validate','-r',str(root/'fork-build/patch-result.json'),'-o',str(args.output.resolve()),str(args.input.resolve())]
if args.keystore:
 cmd += ['--keystore', str(args.keystore.resolve()), '--keystore-entry-alias', (os.environ.get('CLASSIC_KEY_ALIAS') or 'Morphe')]
 for flag, variable in [('--keystore-password','CLASSIC_STORE_PASSWORD'),('--keystore-entry-password','CLASSIC_KEY_PASSWORD')]:
  if os.environ.get(variable): cmd += [flag, os.environ[variable]]
# Never include the signing command (and its passwords) in an exception/log.
result = subprocess.run(cmd)
if result.returncode: raise SystemExit('APK patch/sign failed; inspect Morphe error above. Exit code: ' + str(result.returncode))
