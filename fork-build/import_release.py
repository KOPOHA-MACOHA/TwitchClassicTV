#!/usr/bin/env python3
"""Import an existing signed release; no signing key is uploaded to CI."""
import hashlib, html, json, re, subprocess
from pathlib import Path
from urllib.parse import urlparse
root=Path(__file__).resolve().parent.parent
release=json.loads((root/'fork-build/version.json').read_text())
manifest=json.loads((root/'fork-build/release-import.json').read_text())
assert manifest['version']==release['name']
page=manifest['download_page']
assert urlparse(page).scheme=='https' and urlparse(page).netloc=='tmpfiles.org'
assert re.fullmatch(r'[0-9a-f]{64}',manifest['sha256'])
page_file=root/'artifacts/import-page.html';page_file.parent.mkdir(exist_ok=True)
subprocess.run(['curl','-fsSL','--retry','3','--max-time','60',page,'-o',str(page_file)],check=True)
filename='Twitch-Classic-'+release['name']+'.apk'
links=[html.unescape(v) for v in re.findall(r'href=["\x27]([^"\x27]+)',page_file.read_text())]
link=next(v for v in links if '/dl/' in v and filename.lower() in v.lower())
if link.startswith('/'):link='https://tmpfiles.org'+link
assert urlparse(link).scheme=='https' and urlparse(link).netloc=='tmpfiles.org'
apk=root/filename
subprocess.run(['curl','-fsSL','--retry','3','--max-time','180',link,'-o',str(apk)],check=True)
assert hashlib.file_digest(apk.open('rb'),'sha256').hexdigest()==manifest['sha256'],'APK hash mismatch'
subprocess.run(['python','fork-build/validate.py'],cwd=root,check=True)
