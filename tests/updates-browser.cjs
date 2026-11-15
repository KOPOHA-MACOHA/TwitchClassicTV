const {chromium} = require('playwright-core'),
    assert = require('assert/strict');
(async () => {
    const browser = await chromium.launch({
        executablePath:
            process.env.CHROMIUM_PATH || (require('fs').existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : chromium.executablePath()),
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage(),
        errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    let mode = 'new',
        checks = 0;
    await page.route('**/*', r => {
        if (r.request().url().startsWith('http://127.0.0.1:8765/')) return r.continue();
        if (r.request().url().endsWith('/repos/KOPOHA-MACOHA/TwitchClassicTV/releases/latest')) {
            checks++;
            assert.equal(r.request().headers().authorization, undefined);
            if (mode === 'failure') return r.fulfill({status: 503, body: 'down'});
            const name = mode === 'old' ? '0.9' : '0.14';
            return r.fulfill({
                contentType: 'application/json',
                body: JSON.stringify({
                    tag_name: 'v' + name,
                    draft: false,
                    prerelease: false,
                    body: '<img src=x onerror=evil()>',
                    assets: [
                        {
                            name: 'Twitch-Classic-' + name + '.apk',
                            browser_download_url:
                                mode === 'hostile'
                                    ? 'https://other.test/evil.apk'
                                    : 'https://github.com/KOPOHA-MACOHA/TwitchClassicTV/releases/download/v' +
                                      name +
                                      '/Twitch-Classic-' +
                                      name +
                                      '.apk'
                        }
                    ]
                })
            });
        }
        return r.fulfill({
            contentType: r.request().resourceType() === 'script' ? 'text/javascript' : 'application/json',
            body: r.request().resourceType() === 'script' ? '' : '{"data":[]}'
        });
    });
    try {
        await page.goto('http://127.0.0.1:8765/app/index.html');
        await page.waitForFunction(() => typeof ClassicUpdates === 'object' && !!ScreenObj[Main_Live].tableDoc);
        await page.keyboard.press('Escape');
        await page.evaluate(() => {
            Main_HideWelcomeDialog();
            Main_HideWarningDialog();
            Main_HideAboutDialog();
            window.nativeUpdates = [];
            window.Android = new Proxy(
                {},
                {
                    get: (_, name) =>
                        function (...args) {
                            if (name === 'UpdateAPK') nativeUpdates.push(args);
                            return '';
                        }
                }
            );
            ClassicUpdates.checked = 0;
            ClassicUpdates.checking = false;
            Main_CheckUpdate(true);
        });
        await page.waitForFunction(() => !ClassicUpdates.checking);
        assert.equal(await page.evaluate(() => Main_HasUpdate), true);
        assert.equal(await page.evaluate(() => Main_IsWebupdate), false);
        assert.match(await page.evaluate(() => version.ApkUrl), /TwitchClassicTV\/releases\/download\/v0.14\/Twitch-Classic-0.14.apk$/);
        assert.ok((await page.evaluate(() => version.changelog[0].changes[0])).startsWith('&lt;img'));
        await page.evaluate(() => {
            Main_IsOn_OSInterface = true;
            Main_UpdateCursor = 0;
            Main_UpdateDialogKeyEnter();
            Main_IsOn_OSInterface = false;
        });
        assert.equal(
            (await page.evaluate(() => nativeUpdates))[0][0],
            'https://github.com/KOPOHA-MACOHA/TwitchClassicTV/releases/download/v0.14/Twitch-Classic-0.14.apk'
        );
        assert.equal(await page.evaluate(() => ClassicUpdates_newer('0.9', '0.12')), false);
        assert.equal(await page.evaluate(() => ClassicUpdates_newer('0.14', '0.12')), true);
        const current = checks;
        await page.evaluate(() => Main_CheckUpdate(false));
        assert.equal(checks, current);
        mode = 'hostile';
        await page.evaluate(() => Main_CheckUpdate(true));
        await page.waitForFunction(() => !ClassicUpdates.checking);
        assert.ok(!(await page.evaluate(() => version.ApkUrl)).includes('other.test'));
        mode = 'failure';
        await page.evaluate(() => Main_CheckUpdate(true));
        await page.waitForFunction(() => !ClassicUpdates.checking);
        assert.equal(await page.evaluate(() => Main_Ischecking), false);
        mode = 'old';
        await page.evaluate(() => Main_CheckUpdate(true));
        await page.waitForFunction(() => !ClassicUpdates.checking);
        assert.equal(await page.evaluate(() => Main_HasUpdate), false);
        assert.deepEqual(errors, []);
        console.log(
            'PASS: fork-only release update URL, numeric version ordering, escaped notes, no Twitch token to GitHub, rate limiting, failure recovery and native APK installer handoff'
        );
    } finally {
        await browser.close();
    }
})().catch(e => {
    console.error(e);
    process.exit(1);
});
