#!/usr/bin/env python3
"""Download and verify the pinned public native base and build tools."""
import argparse, hashlib, os, subprocess, zipfile
from pathlib import Path
root = Path(__file__).resolve().parent.parent
cache = root / '.classic-tools'
files = [
 ('morphe.jar', 'https://github.com/MorpheApp/morphe-desktop/releases/download/v1.20.0/morphe-desktop-1.20.0-all.jar', '679f579b3ad743ac0ca697ef71e57430d00be59411b04494afd1845c43fb79f0'),
 ('kotlin.zip', 'https://github.com/JetBrains/kotlin/releases/download/v2.4.0/kotlin-compiler-2.4.0.zip', 'ba1b9e6eb6ddc3275079224f2e9ea4a2b02eef7d59ce2d38404f04b22613c20a'),
]
parser=argparse.ArgumentParser();parser.add_argument('--base-only',action='store_true');args=parser.parse_args()
if args.base_only: files=[]
cache.mkdir(exist_ok=True)
for name, url, digest in files + [('../upstream-379.apk', 'https://github.com/fgl27/SmartTwitchTV/releases/download/379/SmartTV_twitch_3_0_379.apk', '60c405bbec86501497360767f9e843e7e0fe788e030244d5ec4d63eebf973d99')]:
 path = cache / name
 if not path.exists() or hashlib.file_digest(path.open('rb'), 'sha256').hexdigest() != digest:
  temp = path.with_suffix('.download')
  subprocess.run(['curl','--fail','--location','--retry','3','--max-time','300',url,'--output',str(temp)],check=True)
  if hashlib.file_digest(temp.open('rb'),'sha256').hexdigest() != digest:
   temp.unlink(); raise SystemExit('Checksum mismatch: ' + name)
  temp.replace(path)
if not args.base_only and not (cache/'kotlinc/bin/kotlinc').exists():
 with zipfile.ZipFile(cache/'kotlin.zip') as z: z.extractall(cache)
if not args.base_only:
 for path in (cache/'kotlinc/bin').iterdir(): path.chmod(path.stat().st_mode | 0o111)
print('Pinned base APK and build tools verified.')
