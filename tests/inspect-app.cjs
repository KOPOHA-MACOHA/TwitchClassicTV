const {chromium}=require('playwright-core');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const page=await browser.newPage({viewport:{width:1920,height:1080}});const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/*',r=>{if(r.request().url().startsWith('http://127.0.0.1:8765/'))return r.continue();if(r.request().resourceType()==='script')return r.fulfill({body:'',contentType:'text/javascript'});return r.fulfill({contentType:'application/json',body:JSON.stringify({data:[],access_token:'fixture',expires_in:3600})});});
 await page.goto('http://127.0.0.1:8765/app/index.html');await page.waitForTimeout(1500);
 console.log(JSON.stringify({errors,state:await page.evaluate(()=>({ready:document.readyState,settings:typeof Settings_value,classic:typeof PlayClassic_open,controls:typeof Play_controls!=='undefined'?Object.keys(Play_controls).length:0,body:document.body.innerText.slice(0,400)}))}));
 await page.screenshot({path:'/workspace/SmartTwitchTV/tests/initial.png'});await browser.close();
})();
