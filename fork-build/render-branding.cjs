// Rasterize the official bundled Twitch vectors. No remote requests.
const {chromium} = require('playwright-core'),
    fs = require('fs'),
    path = require('path');
(async () => {
    const root = path.resolve(__dirname, '..'),
        out = path.join(root, 'apk/app/src/main/res/drawable-nodpi');
    fs.mkdirSync(out, {recursive: true});
    const svg = fs.readFileSync(path.join(root, 'app/branding/twitch-glitch.svg'), 'utf8');
    const wordmark = fs.readFileSync(path.join(root, 'app/branding/twitch-wordmark.svg'), 'utf8');
    const browser = await chromium.launch({
        executablePath: process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : chromium.executablePath()),
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    try {
        for (const [name, width, height, body, bg] of [
            ['classic_background', 1, 1, '', '#9146ff'],
            ['classic_icon', 512, 512, `<div style="width:257.14px;height:300px">${svg}</div>`, '#9146ff'],
            // Adaptive icons expose only the central 72/108 of the foreground.
            // Keep the whole symbol inside Android's central 66dp safe circle.
            ['classic_foreground', 1080, 1080, `<div style="width:411.43px;height:480px">${svg}</div>`, 'transparent'],
            ['classic_splash', 256, 256, `<div style="width:154.29px;height:180px">${svg}</div>`, 'transparent'],
            [
                'classic_banner',
                320,
                180,
                `<div style="display:flex;flex-direction:column;align-items:center;gap:15px"><div style="width:222px;height:74px">${wordmark}</div><div style="font:600 11px Arial;letter-spacing:2px;padding-left:2px">CLASSIC</div></div>`,
                '#9146ff'
            ],
            ['splash-preview', 1920, 1080, `<div style="width:154.29px;height:180px">${svg}</div>`, '#9146ff']
        ]) {
            const page = await browser.newPage({viewport: {width, height}, deviceScaleFactor: 1});
            await page.setContent(
                `<html><head><style>svg{display:block;width:100%;height:100%}</style></head><body style="margin:0;width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;background:${bg};color:white">${body}</body></html>`
            );
            await page.screenshot({
                path: name === 'splash-preview' ? path.join(root, 'tests/splash-classic.png') : path.join(out, name + '.png'),
                omitBackground: bg === 'transparent'
            });
            await page.close();
        }
        for (const [resource, name] of [
            ['drawable-xhdpi/ic_launcher_adaptive_fore.png', 'classic_foreground'],
            ['drawable-xhdpi/ic_launcher_adaptive_back.png', 'classic_background'],
            ['drawable-xhdpi/banner.png', 'classic_banner'],
            ['mipmap-nodpi/app_icon.png', 'classic_icon'],
            ['mipmap-nodpi/ic_launcher.png', 'classic_icon'],
            ['mipmap-nodpi/ic_splash.png', 'classic_splash']
        ])
            fs.copyFileSync(path.join(out, name + '.png'), path.join(root, 'apk/app/src/main/res', resource));
        fs.copyFileSync(path.join(out, 'classic_banner.png'), path.join(root, 'apk/app/src/debug/res/drawable-xhdpi/banner.png'));
    } finally {
        await browser.close();
    }
})();
