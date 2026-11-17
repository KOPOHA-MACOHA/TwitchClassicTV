const {chromium} = require('playwright-core'),
    assert = require('assert/strict');
(async () => {
    const browser = await chromium.launch({
        executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage({viewport: {width: 1920, height: 1080}}),
        errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.route('**/*', r =>
        r.request().url().startsWith('http://127.0.0.1:8765/')
            ? r.continue()
            : r.fulfill({
                  contentType: r.request().resourceType() === 'script' ? 'text/javascript' : 'application/json',
                  body: r.request().resourceType() === 'script' ? '' : '{"data":[],"pagination":{}}'
              })
    );
    try {
        await page.goto('http://127.0.0.1:8765/app/index.html?asset-test=1');
        await page.waitForFunction(() => ClassicShell_navItems.length === 6);
        await page.keyboard.press('Escape');
        await page.evaluate(() => {
            Main_HideWelcomeDialog();
            Main_HideWarningDialog();
            Main_HideAboutDialog();
            window.nativeRequests = [];
            window.nativeEvents = [];
            window.nativeVisible = false;
            window.holdNative = true;
            window.fixtureReply = r => {
                const token = r.url.includes('/gql'),
                    body = token
                        ? JSON.stringify({data: {streamPlaybackAccessToken: {value: '{"chansub":{"restricted_bitrates":[]}}', signature: 'fixture'}}})
                        : '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=4000000,RESOLUTION=1920x1080,CODECS="avc1.64002a,mp4a.40.2"\nhttps://fixture.test/live.m3u8\n';
                smartTwitchTV[r.callback](
                    JSON.stringify({status: 200, checkResult: r.check, responseText: body}),
                    r.check,
                    String(r.c1),
                    String(r.c2),
                    String(r.c3),
                    String(r.c4),
                    String(r.c5),
                    r.success,
                    r.failure
                );
            };
            Android = new Proxy(
                {},
                {
                    get: (_, name) => {
                        if (name === 'XmlHttpGetFull')
                            return function (url, timeout, body, method, headers, callback, check, c1, c2, c3, c4, c5, success, failure) {
                                const r = {url, body, callback, check, c1, c2, c3, c4, c5, success, failure};
                                nativeRequests.push(r);
                                if (!holdNative && /^PlayHLS_/.test(callback)) setTimeout(() => fixtureReply(r), 0);
                            };
                        if (name === 'StartScreensPlayer' || name === 'ScreenPlayerRestore')
                            return (...args) => {
                                nativeVisible = true;
                                nativeEvents.push({name, args});
                            };
                        if (name === 'ClearSidePanelPlayer')
                            return () => {
                                nativeVisible = false;
                                nativeEvents.push({name, dialogVisible: Main_isExitDialogVisible()});
                            };
                        return () => '';
                    }
                }
            );
            window.setupPreviewFixture = () => {
                Main_showScene1Doc();
                Main_HideLoadDialog();
                Main_values.Main_Go = Main_Live;
                ClassicShell_navActive = false;
                FollowingClassic.active = false;
                Play_isOn = false;
                PlayVod_isOn = false;
                PlayClip_isOn = false;
                Main_isStopped = false;
                const screen = ScreenObj[Main_Live];
                screen.posX = 0;
                screen.posY = 0;
                screen.focusPos = '0_0';
                screen.HasAnimateThumb = false;
                screen.PreviewEnable = true;
                screen.status = true;
                screen.DataObj['0_0'] = [
                    'https://fixture.test/thumb',
                    'Streamer',
                    'Title',
                    'Game',
                    10,
                    '[EN]',
                    'streamer',
                    '12345',
                    null,
                    'en',
                    '',
                    0,
                    '2026-11-17T00:00:00Z',
                    10,
                    '456',
                    'en',
                    ''
                ];
                const holder = document.getElementById('screens_holder');
                let image = document.getElementById(screen.ids[1] + '0_0');
                if (!image) {
                    const frame = document.createElement('div');
                    frame.style.cssText = 'width:320px;height:180px';
                    frame.id = screen.ids[0] + '0_0';
                    image = document.createElement('img');
                    image.id = screen.ids[1] + '0_0';
                    frame.appendChild(image);
                    holder.appendChild(frame);
                }
                return screen.DataObj['0_0'];
            };
            Main_IsOn_OSInterface = true;
            Play_SetUserHeader();
            const previewData = setupPreviewFixture();
            Main_Scene2Doc.style.opacity = 0;
            const hiddenPopup = document.createElement('div');
            hiddenPopup.id = 'preview_test_dialog';
            hiddenPopup.textContent = 'Hidden player popup';
            Main_Scene2Doc.appendChild(hiddenPopup);
            if (ClassicPreview_blocked()) throw Error('Invisible player dialog blocked browsing previews');
            hiddenPopup.remove();
            Screens_LoadPreviewStart(Main_Live, previewData);
            window.oldPreviewRequest = nativeRequests.find(r => r.callback === 'PlayHLS_GetTokenResult');
            if (!oldPreviewRequest)
                throw Error(
                    JSON.stringify({
                        blocked: ClassicPreview_blocked(),
                        dialogs: [...document.querySelectorAll('[id*=dialog]')].filter(n => n.getClientRects().length).map(n => n.id),
                        requests: nativeRequests.map(r => r.callback)
                    })
                );
            Main_showExitDialog();
        });
        assert.equal(await page.locator('#main_dialog_exit').isVisible(), true);
        assert.equal(await page.evaluate(() => nativeVisible), false);
        // Even after closing the popup and returning to the SAME card, its old response is cancelled.
        await page.evaluate(() => {
            Main_HideExitDialog();
            setupPreviewFixture();
            fixtureReply(oldPreviewRequest);
        });
        await page.evaluate(() => {
            const playlist = nativeRequests.find(r => r.callback === 'PlayHLS_PlayListUrlResult' && r.check === oldPreviewRequest.check);
            if (!playlist) throw Error('No native playlist continuation');
            fixtureReply(playlist);
        });
        assert.equal(
            await page.evaluate(() => nativeEvents.some(e => e.name === 'StartScreensPlayer')),
            false,
            'late pre-dialog reply cannot revive a thumbnail'
        );
        await page.evaluate(() => {
            ClassicPreview_stop();
            setupPreviewFixture();
            holdNative = false;
            Screens_LoadPreviewStart(Main_Live, ScreenObj[Main_Live].DataObj['0_0']);
        });
        await page.waitForFunction(() => nativeVisible);
        await page.evaluate(() => Main_showExitDialog());
        assert.equal(await page.evaluate(() => nativeVisible), false, 'an already playing thumbnail is cleared before the popup shows');
        assert.equal(await page.evaluate(() => nativeEvents.filter(e => e.name === 'ClearSidePanelPlayer').at(-1).dialogVisible), false);
        const before = await page.evaluate(() => nativeEvents.filter(e => e.name === 'ScreenPlayerRestore').length);
        await page.evaluate(() => {
            Screens_LoadPreviewRestore(Main_Live);
            ChannelContent_LoadPreviewRestore();
        });
        assert.equal(
            await page.evaluate(() => nativeEvents.filter(e => e.name === 'ScreenPlayerRestore').length),
            before,
            'focus updates cannot restore behind a modal'
        );
        await page.evaluate(() => {
            Main_HideExitDialog();
            setupPreviewFixture();
            Screens_LoadPreviewStart(Main_Live, ScreenObj[Main_Live].DataObj['0_0']);
        });
        await page.waitForFunction(() => nativeVisible);
        await page.evaluate(() => ClassicShell_focusNav());
        assert.equal(await page.evaluate(() => nativeVisible), false, 'moving up to tabs clears native preview');
        await page.evaluate(() => {
            ClassicShell_navIndex = 2;
            ClassicShell_activateNav();
        });
        assert.equal(await page.evaluate(() => nativeVisible), false, 'tab transition does not carry its preview');
        await page.evaluate(() => {
            Main_hideScene1Doc();
            Main_showScene2Doc();
            Play_isOn = true;
            PlayVod_isOn = false;
            nativeVisible = true;
            const before = nativeEvents.filter(e => e.name === 'ClearSidePanelPlayer').length;
            ClassicPreview_stop();
            if (nativeEvents.filter(e => e.name === 'ClearSidePanelPlayer').length !== before) throw Error('Full playback was cleared');
            Main_IsOn_OSInterface = false;
            Play_isOn = false;
        });
        assert.deepEqual(errors, []);
        console.log(
            'PASS: actual native preview token/playlist startup, late response after popup close, immediate modal/tab clearing, blocked restores and protected full playback'
        );
    } finally {
        await browser.close();
    }
})().catch(e => {
    console.error(e);
    process.exitCode = 1;
});
