const {chromium} = require('playwright-core'),
    assert = require('assert/strict');
(async () => {
    const browser = await chromium.launch({executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']});
    const page = await browser.newPage({viewport: {width: 1920, height: 1080}}),
        errors = [];
    page.on('pageerror', e => {
        errors.push(String(e));
        console.log('PAGEERROR', e.stack);
    });
    await page.route('**/*', r =>
        r.request().url().startsWith('http://127.0.0.1:8765/')
            ? r.continue()
            : r.fulfill({
                  contentType: r.request().resourceType() === 'script' ? 'text/javascript' : 'application/json',
                  body: r.request().resourceType() === 'script' ? '' : JSON.stringify({data: [], access_token: 'fixture', expires_in: 3600})
              })
    );
    async function ready() {
        await page.waitForFunction(
            () => typeof ClassicPlayback === 'object' && typeof Play_controls === 'object' && Object.keys(Play_controls).length === 48
        );
        await page.keyboard.press('Escape');
    }
    try {
        await page.goto('http://127.0.0.1:8765/app/index.html?asset-test=1');
        await ready();
        await page.evaluate(() => {
            Main_HideWelcomeDialog();
            Main_HideWarningDialog();
            Main_HideAboutDialog();
            window.nativeCalls = [];
            window.nativePlaying = false;
            window.nativeMode = 'success';
            window.Android = new Proxy(
                {},
                {
                    get: (_, name) => {
                        if (name === 'getPlaybackState') return () => nativePlaying;
                        if (name === 'XmlHttpGetFull')
                            return function (url, timeout, body, method, headers, callback, check, c1, c2, c3, c4, c5, success, failure) {
                                nativeCalls.push({name, url, callback, check, success});
                                if (nativeMode === 'silent') return;
                                const data = url.includes('/gql')
                                    ? {data: {streamPlaybackAccessToken: {value: '{"chansub":{"restricted_bitrates":[]}}', signature: 'fixture'}}}
                                    : null;
                                const response = {
                                    status: 200,
                                    checkResult: check,
                                    responseText: data
                                        ? JSON.stringify(data)
                                        : '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=4000000,RESOLUTION=1920x1080,CODECS="avc1.64002a,mp4a.40.2"\nhttps://fixture.test/live.m3u8\n'
                                };
                                setTimeout(() => smartTwitchTV[callback](JSON.stringify(response), check, c1, c2, c3, c4, c5, success, failure), 0);
                            };
                        if (name === 'StartAuto')
                            return function (...args) {
                                nativeCalls.push({name, args});
                            };
                        if (name === 'BasexmlHttpGet')
                            return function () {
                                nativeCalls.push({name});
                            };
                        return function (...args) {
                            nativeCalls.push({name, args});
                            return '';
                        };
                    }
                }
            );
            Main_IsOn_OSInterface = true;
            Main_isStopped = false;
            Main_values.Main_Go = Main_Live;
            PlayVod_isOn = false;
            PlayClip_isOn = false;
            Play_MultiEnable = false;
            PlayExtra_PicturePicture = false;
            Play_PreviewId = null;
            Play_PreviewURL = '';
            Play_data = JSON.parse(JSON.stringify(Play_data_base));
            Play_data.data = [
                '',
                'Fixture',
                'Stream',
                'Game',
                100,
                '[EN]',
                'fixture',
                '12345',
                false,
                '',
                false,
                '',
                '2026-11-15T00:00:00Z',
                100,
                '456',
                'en',
                null,
                null,
                '1'
            ];
            Play_SetUserHeader();
            // Failures that escaped Play_onPlayer in 0.6 must not stop core startup or remote controls.
            PlayChannelPoints_Start = () => {
                throw Error('fixture points failure');
            };
            PlayRaid_SetChannel = () => {
                throw Error('fixture websocket failure');
            };
            ChatLive_Init = () => {
                throw Error('fixture chat failure');
            };
            Main_values_History_data['123'] = {live: [], vod: [], clip: [], test: [], deleted: {live: {}, vod: {}, clip: {}}};
            AddUser_UsernameArray = [{id: '123', name: 'viewer', access_token: 'fixture-token'}];
            FollowingClassic.account = '123';
            FollowingClassic.updated = Date.now();
            FollowingClassic.liveDone = true;
            FollowingClassic.channelsDone = true;
            FollowingClassic.channels = [];
            FollowingClassic.live = [
                {
                    id: '12345',
                    user_id: '456',
                    user_login: 'fixture',
                    user_name: 'Fixture',
                    title: 'Stream',
                    game_name: 'Game',
                    viewer_count: 100,
                    thumbnail_url: 'https://fixture.test/live.jpg',
                    started_at: '2026-11-15T00:00:00Z',
                    language: 'en',
                    game_id: '1',
                    type: 'live'
                }
            ];
            Settings_value.show_live_player.defaultValue = 1;
            DefaultPreviewDelay = 0;
            Settings_PreviewDelay[Settings_Obj_default('show_feed_player_delay')] = 0;
            Main_ExitCurrent(Main_values.Main_Go);
            Main_showScene1Doc();
            FollowingClassic_init();
        });
        await page.waitForFunction(() => nativeCalls.some(c => c.name === 'StartScreensPlayer'));
        assert.equal(await page.evaluate(() => Play_PreviewId), '456');
        assert.equal(
            await page.evaluate(() => !!document.getElementById(ScreenObj[Main_UserLive].ids[1] + '0_0').classList.contains('opacity_zero')),
            true
        );
        // Re-selecting the active Following tab must not restore a stale sidebar key handler.
        await page.keyboard.press('ArrowUp');
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => nativeCalls.filter(c => c.name === 'StartScreensPlayer').length === 2);
        await page.keyboard.press('Enter');
        try {
            await page.waitForFunction(() => nativeCalls.some(c => c.name === 'StartAuto'), null, {timeout: 5000});
        } catch (e) {
            console.log(
                await page.evaluate(() => ({
                    calls: nativeCalls,
                    logs: nativeCalls.filter(c => c.name === 'LongLog').map(c => c.args),
                    play: Play_isOn,
                    active: ClassicPlayback.active,
                    fail: ClassicPlayback.failures,
                    scene1: Main_isScene1DocVisible(),
                    scene2: Main_isScene2DocVisible(),
                    data: Play_data.data,
                    go: Main_values.Main_Go,
                    preview: Play_PreviewId
                }))
            );
            throw e;
        }
        assert.equal(await page.evaluate(() => ClassicPlayback.active), true);
        assert.equal(await page.evaluate(() => ClassicPlayback.services), false);
        assert.equal(await page.evaluate(() => nativeCalls.filter(c => c.name === 'XmlHttpGetFull').length), 6);
        await page.evaluate(() => {
            nativePlaying = true;
            ClassicPlayback_poll();
        });
        await page.waitForFunction(() => ClassicPlayback.failures.points && ClassicPlayback.failures.raids);
        assert.equal(await page.evaluate(() => Play_isOn), true);
        const clears = await page.evaluate(() => nativeCalls.filter(c => c.name === 'ClearSidePanelPlayer').length);
        await page.evaluate(() => Screens_StartLoad(Main_UserLive));
        assert.equal(await page.evaluate(() => nativeCalls.filter(c => c.name === 'ClearSidePanelPlayer').length), clears);
        assert.equal(await page.evaluate(() => Play_isOn), true);

        assert.equal(await page.evaluate(() => localStorage.getItem('classic_pending_playback')), null);
        await page.keyboard.press('ArrowUp');
        assert.equal(await page.evaluate(() => !!Play_isPanelShowing()), true);
        // Silent playlist request: Back must work even with the legacy global key blocker present.
        await page.evaluate(() => {
            ClassicPlayback_stop();
            nativeMode = 'silent';
            nativePlaying = false;
            Play_isOn = false;
            Main_showScene1Doc();
            Main_hideScene2Doc();
            Main_openStream();
        });
        await page.waitForFunction(() => ClassicPlayback.active);
        await page.evaluate(() => Main_PreventClick(true, Main_PreventClickfun));
        await page.keyboard.press('Escape');
        assert.equal(await page.evaluate(() => ClassicPlayback.active), false);
        assert.equal(await page.evaluate(() => Play_isOn), false);
        assert.equal(await page.evaluate(() => Main_isScene1DocVisible()), 1);
        assert.equal(await page.evaluate(() => Main_values.Play_WasPlaying), 0);
        assert.equal(await page.evaluate(() => localStorage.getItem('classic_pending_playback')), null);
        // No-response timeout also returns to browsing, without relying on a network callback.
        await page.evaluate(() => {
            Main_openStream();
        });
        await page.waitForFunction(() => ClassicPlayback.active);
        await page.evaluate(() => {
            ClassicPlayback.started = Date.now() - ClassicPlayback.timeout - 1;
            ClassicPlayback_poll();
        });
        assert.equal(await page.evaluate(() => Main_isScene1DocVisible()), 1);
        assert.equal(await page.evaluate(() => Play_isOn), false);
        // Persist an interrupted startup, then run the real app boot again.
        await page.evaluate(() => {
            Main_values.Play_WasPlaying = 1;
            Main_SaveValues();
            localStorage.setItem('classic_pending_playback', 'live');
        });
        await page.reload();
        await ready();
        assert.equal(await page.evaluate(() => Main_values.Play_WasPlaying), 0);
        assert.equal(await page.evaluate(() => Play_isOn), false);
        assert.equal(await page.evaluate(() => localStorage.getItem('classic_pending_playback')), null);
        assert.deepEqual(errors, []);
        console.log(
            'PASS: full live startup via native token/playlist callbacks reaches StartAuto; points/websocket/chat failures isolated; remote input, loading Back with global key blocker, timeout and real boot recovery from interrupted startup'
        );
    } finally {
        await browser.close();
    }
})().catch(e => {
    console.error(e);
    process.exit(1);
});
