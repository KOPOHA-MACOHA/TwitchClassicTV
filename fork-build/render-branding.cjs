// Rasterize the bundled Twitch Glitch vector for Android resources. No remote requests.
const {chromium} = require('playwright-core'),
    fs = require('fs'),
    path = require('path');
(async () => {
    const root = path.resolve(__dirname, '..'),
        out = path.join(root, 'apk/app/src/main/res/drawable-nodpi');
    fs.mkdirSync(out, {recursive: true});
    const svg = fs.readFileSync(path.join(root, 'app/branding/twitch-glitch.svg'), 'utf8');
    const browser = await chromium.launch({executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']});
    try {
        for (const [name, width, height, body, bg] of [
            ['classic_icon', 512, 512, `<div style="width:300px;height:300px">${svg}</div>`, '#9146ff'],
            ['classic_splash', 256, 256, `<div style="width:180px;height:180px">${svg}</div>`, 'transparent'],
            [
                'classic_banner',
                320,
                180,
                `<div style="width:70px;height:70px;margin-right:20px">${svg}</div><div><strong style="font:700 40px Arial;letter-spacing:0">twitch</strong><div style="font:12px Arial;letter-spacing:2px;margin-top:5px">CLASSIC</div></div>`,
                '#9146ff'
            ],
            ['splash-preview', 1920, 1080, `<div style="width:180px;height:180px">${svg}</div>`, '#9146ff']
        ]) {
            const page = await browser.newPage({viewport: {width, height}, deviceScaleFactor: 1});
            await page.setContent(
                `<html><body style="margin:0;width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;background:${bg};color:white">${body}</body></html>`
            );
            await page.screenshot({
                path: name === 'splash-preview' ? path.join(root, 'tests/splash-classic.png') : path.join(out, name + '.png'),
                omitBackground: bg === 'transparent'
            });
            await page.close();
        }
    } finally {
        await browser.close();
    }
})();
