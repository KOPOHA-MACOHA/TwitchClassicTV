const {chromium}=require('playwright-core'),assert=require('assert/strict'),fs=require('fs');
const {PNG}=require('/workspace/smarttv-test-tools/node_modules/pngjs');const jsQR=require('/workspace/smarttv-test-tools/node_modules/jsqr');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const page=await browser.newPage({viewport:{width:1920,height:1080},locale:'ru-RU'}),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(String(e)));
 const uri='https://www.twitch.tv/activate?public=true&device-code=ABC12345';
 await page.route('**/*',r=>{
  const u=new URL(r.request().url());if(u.origin==='http://127.0.0.1:8765')return r.continue();
  if(r.request().resourceType()==='script')return r.fulfill({body:'',contentType:'text/javascript'});
  if(u.hostname==='id.twitch.tv'&&u.pathname==='/oauth2/device'){requests.push('device');return r.fulfill({contentType:'application/json',body:JSON.stringify({device_code:'private-device-fixture',user_code:'ABC12345',verification_uri:uri,interval:7,expires_in:1800})});}
  if(u.hostname==='id.twitch.tv'&&u.pathname==='/oauth2/token'&&u.searchParams.get('grant_type')==='urn:ietf:params:oauth:grant-type:device_code'){requests.push('poll');return r.fulfill({status:400,contentType:'application/json',body:JSON.stringify({message:'authorization_pending'})});}
  return r.fulfill({contentType:'application/json',body:JSON.stringify({data:[],access_token:'fixture',expires_in:3600})});
 });
 try{
 await page.goto('http://127.0.0.1:8765/app/index.html');await page.waitForFunction(()=>typeof Play_controls!=='undefined'&&Object.keys(Play_controls).length>40);
 await page.keyboard.press('Escape');
 await page.evaluate(()=>{ru_RULang();Play_MakeControls();Play_SetControlsVisibility('ShowInLive');});
 const visible=await page.evaluate(()=>Object.keys(Play_controls).filter(k=>Play_controls[k].visible).map(Number));
 assert.deepEqual(visible,await page.evaluate(()=>[Play_controlsQuality,Play_controlsChat,Play_controlsSettings]));
 // Test the source modal, its category hierarchy and key-up suppression on close.
 await page.evaluate(()=>{Play_isOn=true;PlayVod_isOn=false;PlayClip_isOn=false;PlayClassic_open();});
 await page.locator('#classic_settings').waitFor();assert.equal(await page.locator('#classic_settings_rows button').count(),8);
 await page.screenshot({path:'/workspace/SmartTwitchTV/tests/player-settings.png'});
 await page.evaluate(()=>PlayClassic_handleKeyDown({keyCode:KEY_ENTER}));assert.ok(await page.locator('#classic_settings_rows').innerText());
 await page.evaluate(()=>PlayClassic_handleKeyDown({keyCode:KEY_RETURN}));assert.equal(await page.locator('#classic_settings_rows button').count(),8);
 await page.evaluate(()=>PlayClassic_handleKeyDown({keyCode:KEY_RETURN}));assert.equal(await page.locator('#classic_settings').count(),0);
 assert.equal(await page.evaluate(()=>PlayClassic_ignoreKeyUp({keyCode:KEY_RETURN})),true);
 // Actual quality handler, with only the native OS call replaced by a spy.
 await page.evaluate(()=>{Play_data.qualities=[{id:'Auto',position:-1,band:'',codec:''},{id:'1080p60 source',position:0,band:'',codec:''},{id:'720p',position:1,band:'',codec:''}];Play_data.qualityPlaying='720p';Play_data.quality='720p';Play_data.qualityIndex=2;window.qualityCalls=[];OSInterface_SetQuality=position=>qualityCalls.push(position);PlayClassic_quality();});
 assert.equal(await page.locator('#classic_settings_rows button').count(),3);await page.locator('#classic_settings_rows button').nth(1).click();assert.equal(await page.evaluate(()=>Play_data.qualityPlaying),'1080p60 source');assert.deepEqual(await page.evaluate(()=>qualityCalls),[0]);
 // A value selected in the drawer must apply, not merely update its preview label.
 await page.evaluate(()=>{window.speedCalls=[];OSInterface_setPlaybackSpeed=value=>speedCalls.push(value);PlayClassic_open();PlayClassic_values(Play_controlsSpeed);});
 await page.locator('#classic_settings_rows button').nth(9).click();assert.deepEqual(await page.evaluate(()=>speedCalls),[1.5]);assert.equal(await page.evaluate(()=>Play_CurrentSpeed),9);
 // Chat shortcut opens the grouped drawer; its show/hide row retains the native action.
 await page.evaluate(()=>{Play_PanelCounter=Play_controlsChat;Play_BottomOptionsPressed(1);});
 assert.equal(await page.locator('#classic_settings_title').textContent(),await page.evaluate(()=>STR_CHAT_OPTIONS));
 await page.evaluate(()=>PlayClassic_rows.find(r=>r.text===STR_CHAT_SHOW).action());assert.equal(await page.locator('#classic_settings_rows button').count(),3);await page.evaluate(()=>PlayClassic_close());
 // Original volume arrays are sparse and use a configurable arrow step.
 await page.evaluate(()=>{window.volumeCalls=[];OSInterface_SetVolumes=()=>volumeCalls.push(Play_volumes[0]);OSInterface_ApplyAudio=()=>{};Settings_VolumeScale=5;PlayClassic_open();PlayClassic_audio();});
 assert.ok((await page.locator('#classic_settings_rows').innerText()).includes(await page.evaluate(()=>STR_VOLUME)));
 await page.evaluate(()=>PlayClassic_values(Play_controlsAudioVol0));assert.equal(await page.locator('#classic_settings_rows button').count(),101);
 await page.locator('#classic_settings_rows button').nth(35).click();assert.equal(await page.evaluate(()=>Play_volumes[0]),35);assert.deepEqual(await page.evaluate(()=>volumeCalls),[35]);await page.evaluate(()=>PlayClassic_close());
 await page.evaluate(()=>{Play_data.qualityPlaying='1440p60';Play_data.qualities=[{id:'Auto',position:-1,band:'',codec:''},{id:'1440p60',position:0,band:'',codec:''},{id:'1080p60',position:1,band:'',codec:''}];Play_controls[Play_controlsQuality].values=['1080p'];PlayClassic_open();});
 assert.equal(await page.evaluate(()=>PlayClassic_rows.find(r=>r.group==='quality').value),'1440p60');
 await page.evaluate(()=>PlayClassic_quality());assert.equal(await page.locator('#classic_settings_rows button.is-current').count(),1);assert.ok((await page.locator('#classic_settings_rows button.is-current').innerText()).includes('1440p60'));await page.evaluate(()=>PlayClassic_close());
 await page.evaluate(()=>{Play_data.qualityPlaying='Auto';Play_ShowVideoQuality(0,'1080p60');PlayClassic_open();});
 assert.ok((await page.evaluate(()=>PlayClassic_rows.find(r=>r.group==='quality').value)).includes('1080p60'));await page.evaluate(()=>PlayClassic_quality());assert.ok((await page.locator('#classic_settings_rows button.is-current').innerText()).includes( await page.evaluate(()=>STR_AUTO)));await page.evaluate(()=>PlayClassic_close());
 await page.evaluate(()=>{Play_isOn=false;Main_ExitCurrent(Main_values.Main_Go);AddUser_init();});await page.locator('.qr-login-code svg').waitFor();
 assert.equal(await page.evaluate(()=>AddUser_DeviceCodeTimeout),7);
 await page.evaluate(()=>{Main_HideWarningDialog();Main_HideWelcomeDialog();Main_HideAboutDialog();});
 const png=PNG.sync.read(await page.locator('.qr-login-code').screenshot({path:'/workspace/SmartTwitchTV/tests/login-qr.png'}));const decoded=jsQR(new Uint8ClampedArray(png.data),png.width,png.height);assert.ok(decoded,'QR is decodable');assert.equal(decoded.data,uri);assert.ok(!decoded.data.includes('private-device-fixture'));
 await page.screenshot({path:'/workspace/SmartTwitchTV/tests/login-screen.png'});
 await page.evaluate(()=>{AddUser_DeviceCodeExpiresAt=Date.now()-1;AddUser_getCodeCheck(0);});assert.ok((await page.locator('#add_user_text_counter').textContent()).includes('Код истёк'));assert.equal(await page.evaluate(()=>AddUser_DeviceCode),null);
 await page.evaluate(()=>AddUser_handleKeyDown({keyCode:KEY_ENTER}));await page.waitForFunction(()=>AddUser_DeviceCode!==null);assert.ok(requests.filter(r=>r==='device').length>=2);
 await page.evaluate(()=>AddUser_exit());assert.equal(await page.evaluate(()=>AddUser_DeviceCode),null);
 assert.equal(await page.evaluate(()=>AddUser_renderCode('https://example.com/activate','x')),false);
 assert.equal(await page.evaluate(()=>AddUser_renderCode('https://www.twitch.tv/evil','x')),false);
 assert.equal(await page.evaluate(()=>AddUser_renderCode('invalid','x')),false);
 assert.deepEqual(errors,[]);
 console.log('PASS: real app boot, three primary controls, grouped settings/back, native quality/speed/volume handlers, chat drawer, locally decoded QR, server interval, expiry/renewal/cancel and verification URL validation');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
