const {chromium} = require('playwright-core'),
    assert = require('assert/strict'),
    fs = require('fs');
const current = JSON.parse(fs.readFileSync('fork-build/version.json', 'utf8')).name;
const latest = current
    .split('.')
    .map((v, i) => (i === 1 ? String(Number(v) + 1) : v))
    .join('.');
(async () => {
    const browser = await chromium.launch({
        executablePath: process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : chromium.executablePath()),
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage({viewport: {width: 1920, height: 1080}, locale: 'ru-RU'}),
        errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    let mode = 'new',
        checks = 0;
    const url = 'https://github.com/KOPOHA-MACOHA/TwitchClassicTV/releases/download/v' + latest + '/Twitch-Classic-' + latest + '.apk';
    await page.route('**/*', r => {
        if (r.request().url().startsWith('http://127.0.0.1:8765/')) return r.continue();
        if (r.request().url().endsWith('/repos/KOPOHA-MACOHA/TwitchClassicTV/releases/latest')) {
            checks++;
            assert.equal(r.request().headers().authorization, undefined);
            if (mode === 'failure') return r.fulfill({status: 503, body: 'down'});
            const name = mode === 'old' ? '0.9' : latest;
            return r.fulfill({
                contentType: 'application/json',
                body: JSON.stringify({
                    tag_name: 'v' + name,
                    draft: false,
                    prerelease: false,
                    body: 'Описание новой версии. <img src=x onerror=evil()>',
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
        await page.goto('http://127.0.0.1:8765/app/index.html?asset-test=1');
        await page.waitForFunction(() => typeof ClassicUpdates === 'object' && !!ScreenObj[Main_Live].tableDoc);
        await page.keyboard.press('Escape');
        await page.evaluate(() => {
            Main_HideWelcomeDialog();
            Main_HideWarningDialog();
            Main_HideAboutDialog();
            ru_RULang();
            Settings_AppLang = 'ru_RU';
            Main_SetStringsMain();
            window.nativeUpdates = [];
            window.Android = new Proxy(
                {},
                {
                    get: (_, name) => {
                        if (name === 'BasexmlHttpGet')
                            return function (url, timeout, body, method, headers, callback, id, key, success, failure) {
                                fetch(url, {headers: headers ? JSON.parse(headers) : undefined})
                                    .then(async r => ({status: r.status, responseText: await r.text()}))
                                    .then(r => smartTwitchTV[callback](JSON.stringify(r), key, success, failure, id));
                            };
                        return function (...args) {
                            if (name === 'UpdateAPK') nativeUpdates.push(args);
                            return '';
                        };
                    }
                }
            );
            Main_showSettings();
        });
        const rows = await page.locator('#classic_preferences_rows button').count();
        for (let i = 1; i < rows; i++) await page.keyboard.press('ArrowDown');
        assert.match(await page.locator('#classic_preferences_rows .is-focused').innerText(), /Проверить обновления/);
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => ClassicUpdates.state === 'available');
        assert.equal(await page.locator('#classic_update_prompt').isVisible(), true);
        assert.equal(await page.locator('#update_dialog').isVisible(), false);
        assert.match(await page.locator('#classic_update_title').innerText(), /Доступно обновление/);
        assert.ok((await page.locator('.classic-update-versions').innerText()).includes(latest));
        assert.equal(await page.locator('.classic-update-notes img').count(), 0);
        assert.equal(await page.locator('#classic_update_prompt button.is-focused').innerText(), 'Обновить');
        await page.screenshot({path: 'tests/update-prompt-classic.png'});
        await page.keyboard.press('ArrowRight');
        assert.equal(await page.locator('#classic_update_prompt button.is-focused').innerText(), 'Позже');
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('#classic_update_prompt').count(), 0);
        assert.match(await page.locator('#classic_preferences_rows .is-focused').innerText(), /Проверить обновления/);
        const previous = checks;
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => !ClassicUpdates.checking);
        assert.equal(checks, previous + 1);
        await page.evaluate(() => {
            Main_IsOn_OSInterface = true;
        });
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => ClassicUpdates.state), 'downloading');
        assert.deepEqual(await page.evaluate(() => nativeUpdates.map(a => a[0])), [url]);
        await page.evaluate(() => {
            Main_IsOn_OSInterface = false;
        });
        await page.keyboard.press('Escape');
        await page.keyboard.press('Escape');
        // Exercise the real startup entry point with legacy update preferences disabled.
        mode = 'new';
        const beforeBoot = checks;
        await page.evaluate(() => {
            Settings_value.update_background.defaultValue = 1;
            Settings_value.update_show.defaultValue = 2;
            Main_IsOn_OSInterface = true;
            Main_isStopped = false;
            ClassicUpdates.checked = Date.now();
            ClassicUpdates.startupAttempted = false;
            // The app is already initialized in this fixture. Keep unrelated initialization
            // from restarting playback/network workers while exercising Main_initWindowsEnd.
            const names = [
                'Users_RemoveCursorSet',
                'Main_CheckDevice',
                'Main_SetStringsMain',
                'Chat_Preinit',
                'Play_PreStart',
                'UserLiveFeed_Prepare',
                'Screens_InitScreens',
                'Main_SetUpdateclock',
                'Main_SetHistoryworker',
                'Main_SetStringsSecondary'
            ];
            const saved = names.map(n => window[n]);
            names.forEach(n => (window[n] = () => {}));
            Main_initWindowsEnd();
            names.forEach((n, i) => (window[n] = saved[i]));
        });
        await page.waitForFunction(() => !!ClassicUpdates.dialog && !ClassicUpdates.checking);
        assert.equal(checks, beforeBoot + 1);
        assert.match(await page.locator('#classic_update_title').innerText(), /Доступно обновление/);
        await page.keyboard.press('Escape');
        await page.evaluate(() => ClassicUpdates_startup());
        assert.equal(checks, beforeBoot + 1);
        assert.equal(await page.locator('#classic_update_prompt').count(), 0);
        const beforeResume = checks;
        await page.evaluate(() => {
            ClassicUpdates.lastLaunchCheck = Date.now() - 10000;
            ClassicUpdates_resume();
        });
        await page.waitForFunction(() => !!ClassicUpdates.dialog && !ClassicUpdates.checking);
        assert.equal(checks, beforeResume + 1);
        await page.keyboard.press('Escape');
        await page.evaluate(() => ClassicUpdates_resume());
        assert.equal(checks, beforeResume + 1);
        // Manual checks still work after a failed request, and old versions do not prompt.
        await page.evaluate(() => {
            Main_IsOn_OSInterface = false;
        });
        mode = 'hostile';
        await page.evaluate(() => ClassicUpdates_manual());
        await page.waitForFunction(() => !ClassicUpdates.checking);
        assert.equal(await page.evaluate(() => ClassicUpdates.state), 'failure');
        assert.equal(await page.evaluate(() => version.ApkUrl), url);
        mode = 'failure';
        await page.evaluate(() => ClassicUpdates_check(true));
        await page.waitForFunction(() => !ClassicUpdates.checking);
        assert.equal(await page.evaluate(() => ClassicUpdates.state), 'failure');
        mode = 'old';
        await page.evaluate(() => ClassicUpdates_check(true));
        await page.waitForFunction(() => !ClassicUpdates.checking);
        assert.equal(await page.evaluate(() => Main_HasUpdate), false);
        assert.match(await page.locator('#classic_update_title').innerText(), /последняя версия/);
        await page.keyboard.press('Escape');
        assert.equal(await page.evaluate(() => ClassicUpdates_newer('0.9', '0.12')), false);
        assert.deepEqual(errors, []);
        console.log(
            'PASS: remote-accessible settings check, modern update/later dialog, native installer, startup prompt despite disabled legacy preferences/recent cache, one check per boot, retry/current/error states and fork-only URLs'
        );
    } finally {
        await browser.close();
    }
})().catch(e => {
    console.error(e);
    process.exit(1);
});
