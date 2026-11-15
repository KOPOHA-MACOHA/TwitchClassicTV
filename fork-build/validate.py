from pathlib import Path
import zipfile,hashlib,io,sys,json
sys.path.insert(0,'/tmp/tv-python')
from loguru import logger
logger.remove()
from androguard.core.apk import APK
root=Path(__file__).resolve().parent.parent
release=json.loads((root/'fork-build/version.json').read_text())
path=root/('Twitch-Classic-'+release['name']+'.apk')
a=APK(str(path));b=APK(str(root/'upstream-379.apk'))
assert a.get_package()=='org.tvmod.classic'
assert a.get_androidversion_code()==str(release['code'])
ns={'a':'http://schemas.android.com/apk/res/android'}
m=a.get_android_manifest_xml();assert m.find('application').get('{'+ns['a']+'}label')=='Twitch Classic'
assert m.xpath('//category[@a:name="android.intent.category.LEANBACK_LAUNCHER"]',namespaces=ns)
auth=set(m.xpath('//provider/@a:authorities',namespaces=ns));old=set(b.get_android_manifest_xml().xpath('//provider/@a:authorities',namespaces=ns));assert not auth&old
with zipfile.ZipFile(path) as z:
 for rel in ['app/specific/PlayHLS.js','app/specific/ClassicUpdates.js','app/specific/ClassicMulti.js','app/styles/multi.css','app/general/classic-version.js','app/specific/ClassicChatPresentation.js','app/styles/presentation.css','app/styles/fonts.css','app/fonts/Inter-latin.woff2','app/fonts/Inter-cyrillic.woff2','app/fonts/Inter-LICENSE.txt','app/specific/ChatLive.js','app/specific/ChatVod.js','app/specific/ClassicPlayback.js','app/specific/Play.js','app/specific/Main.js','app/specific/ClassicFeatures.js','app/specific/ClassicChat.js','app/specific/PlayChannelPoints.js','app/specific/PlayAutoClaim.js','app/specific/PlayRaid.js','app/styles/chat-features.css','app/specific/ClassicPages.js','app/styles/pages.css','app/styles/player.css','app/specific/ClassicShell.js','app/styles/shell.css','app/specific/PlayClassic.js','app/styles/classic.css','app/thirdparty/qrcode.js','app/thirdparty/qrcode-LICENSE','app/specific/AddUser.js']:
  assert z.read('assets/'+rel)==(root/rel).read_bytes(),rel
 with zipfile.ZipFile(io.BytesIO(z.read('assets/classic-source.zip'))) as src:
  assert src.read('app/specific/PlayClassic.js')==(root/'app/specific/PlayClassic.js').read_bytes()
  assert 'apk/app/build.gradle' in src.namelist()
print('PASS: separate app ID, TV launcher, disjoint provider authorities, packaged UI and corresponding source')
print('SHA256',hashlib.file_digest(path.open('rb'),'sha256').hexdigest())
print('APK bytes',path.stat().st_size)


# Restore byte-for-byte native player code from the user-confirmed working 0.4.
expected_native={'classes.dex': '67de27243c77f2e34355ecade17ab856a753594f9c422108a0e878a493a609bf', 'classes2.dex': '3854ad5a5550dadc9c2555340a577fea2bcca8cccdfe3b37318c0597224b5e09', 'classes3.dex': '871e780fe51cfec0cf28080741e24b0aaa00b31a555ec45c2635bbd8c1628f3b'}
with zipfile.ZipFile(path) as z:
 for name,digest in expected_native.items():
  assert hashlib.sha256(z.read(name)).hexdigest()==digest,name
print('PASS: all native DEX files match the working 0.4 byte for byte')
