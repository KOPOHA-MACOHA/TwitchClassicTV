const {chromium} = require('playwright-core'),
    assert = require('assert/strict');
(async () => {
    const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || (require('fs').existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : chromium.executablePath()), headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']});
    const page = await browser.newPage({viewport: {width: 1920, height: 1080}}),
        errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.route('**/*', r => {
        if (r.request().url().startsWith('http://127.0.0.1:8765/')) return r.continue();
        if (r.request().resourceType() === 'script') return r.fulfill({body: '', contentType: 'text/javascript'});
        return r.fulfill({contentType: 'application/json', body: JSON.stringify({data: [], access_token: 'fixture', expires_in: 3600})});
    });
    try {
        // The asset URL branch exposes the exact smartTwitchTV callback entry point used by Java.
        await page.goto('http://127.0.0.1:8765/app/index.html?asset-test=1');
        await page.waitForFunction(
            () => typeof smartTwitchTV === 'object' && typeof ClassicShell_navItems !== 'undefined' && ClassicShell_navItems.length === 6
        );
        await page.keyboard.press('Escape');
        await page.evaluate(() => {
            Main_HideWelcomeDialog();
            Main_HideWarningDialog();
            Main_ExitCurrent(Main_values.Main_Go);
            window.bridgeRequests = [];
            window.bridgeMode = 'success';
            window.savedAuthUser = null;
            window.Android = new Proxy(
                {},
                {
                    get: (_, name) =>
                        name === 'BasexmlHttpGet'
                            ? function (url, timeout, body, method, headers, callback, checkResult, key, success, failure) {
                                  if (!success || typeof window[success] !== 'function' || !failure || typeof window[failure] !== 'function')
                                      throw Error('Native callbacks must have globally callable names');
                                  const request = {callback, checkResult, key, success, failure};
                                  bridgeRequests.push(request);
                                  if (bridgeMode === 'silent') return;
                                  let payload = {
                                      status: 200,
                                      responseText: JSON.stringify({
                                          device_code: 'private-fixture',
                                          user_code: 'ABCD1234',
                                          verification_uri: 'https://www.twitch.tv/activate?device-code=ABCD1234',
                                          interval: 20,
                                          expires_in: 1800
                                      })
                                  };
                                  if (url.includes('/token?'))
                                      payload = {status: 400, responseText: JSON.stringify({message: 'authorization_pending'})};
                                  if (bridgeMode === 'malformed') payload.responseText = 'invalid JSON';
                                  if (bridgeMode === 'http_error') payload = {status: 503, responseText: 'Unavailable'};
                                  setTimeout(() => smartTwitchTV[callback](JSON.stringify(payload), key, success, failure, checkResult), 0);
                              }
                            : function () {
                                  return '';
                              }
                }
            );
            Main_IsOn_OSInterface = true;
            AddUser_init();
        });
        await page.locator('.qr-login-code svg').waitFor();
        assert.equal(await page.locator('.qr-login-user-code').textContent(), 'ABCD1234');
        assert.equal(await page.evaluate(() => Main_isElementShowing('dialog_loading')), false);
        await page.evaluate(() => AddUser_getCodeCheck(0));
        await page.waitForFunction(() => bridgeRequests.length === 2);
        assert.equal(
            await page.evaluate(() => bridgeRequests.every(r => r.success === 'AddUser_httpSuccess' && r.failure === 'AddUser_httpFailure')),
            true
        );
        // Complete the token/user lookup through the same Android-name dispatch, without storing a real account.
        await page.evaluate(() => {
            AddUser_SaveNewUser = text => {
                savedAuthUser = JSON.parse(text).data[0].login;
            };
            AddUser_getUserToken();
            const r = bridgeRequests[bridgeRequests.length - 1];
            smartTwitchTV[r.callback](
                JSON.stringify({status: 200, responseText: JSON.stringify({data: [{login: 'fixture-user'}]})}),
                r.key,
                r.success,
                r.failure,
                r.checkResult
            );
        });
        assert.equal(await page.evaluate(() => savedAuthUser), 'fixture-user');
        // A native request that never calls back must leave the spinner and permit retry.
        await page.evaluate(() => {
            AddUser_exit();
            bridgeMode = 'silent';
            AddUser_RequestTimeoutMs = 60;
            AddUser_init();
        });
        await page.locator('.qr-login-retry').waitFor();
        assert.equal(await page.evaluate(() => Main_isElementShowing('dialog_loading')), false);
        const old = await page.evaluate(() => bridgeRequests[bridgeRequests.length - 1]);
        await page.evaluate(
            r =>
                smartTwitchTV[r.callback](
                    JSON.stringify({
                        status: 200,
                        responseText: JSON.stringify({device_code: 'late', user_code: 'OLD', verification_uri: 'https://www.twitch.tv/activate'})
                    }),
                    r.key,
                    r.success,
                    r.failure,
                    r.checkResult
                ),
            old
        );
        assert.equal(await page.locator('.qr-login-code svg').count(), 0);
        await page.evaluate(() => {
            bridgeMode = 'success';
            AddUser_RequestTimeoutMs = 15000;
        });
        await page.keyboard.press('Enter');
        await page.locator('.qr-login-code svg').waitFor();
        for (const mode of ['malformed', 'http_error']) {
            await page.evaluate(mode => {
                AddUser_exit();
                bridgeMode = mode;
                AddUser_init();
            }, mode);
            await page.locator('.qr-login-retry').waitFor();
            assert.equal(await page.evaluate(() => Main_isElementShowing('dialog_loading')), false);
        }
        await page.evaluate(() => {
            AddUser_exit();
            Main_IsOn_OSInterface = false;
        });
        assert.deepEqual(errors, []);
        console.log(
            'PASS: actual FullxmlHttpGet -> OSInterface -> Android callback names -> smartTwitchTV dispatch; device QR/code, token polling, user lookup, no-response timeout, retry, malformed/HTTP errors and ignored late callbacks'
        );
    } finally {
        await browser.close();
    }
})().catch(e => {
    console.error(e);
    process.exit(1);
});
