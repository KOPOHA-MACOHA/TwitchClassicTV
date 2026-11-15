const {chromium} = require('playwright-core');
const assert = require('assert/strict');
(async () => {
    const browser = await chromium.launch({
        executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage({viewport: {width: 1920, height: 1080}, locale: 'ru-RU'}),
        errors = [];
    page.on('pageerror', e => errors.push(e.stack || String(e)));
    await page.route('**/*', r => {
        if (r.request().url().startsWith('http://127.0.0.1:8765/')) return r.continue();
        if (r.request().resourceType() === 'script') return r.fulfill({body: '', contentType: 'text/javascript'});
        if (r.request().resourceType() === 'image')
            return r.fulfill({
                contentType: 'image/svg+xml',
                body: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#593a91"/></svg>'
            });
        return r.fulfill({contentType: 'application/json', body: JSON.stringify({data: [], pagination: {}})});
    });
    try {
        await page.goto('http://127.0.0.1:8765/app/index.html?asset-test=1');
        await page.waitForFunction(() => typeof ClassicMulti !== 'undefined' && ScreenObj[Main_Live].tableDoc);
        await page.keyboard.press('Escape');
        await page.evaluate(() => {
            Main_HideWelcomeDialog();
            Main_HideWarningDialog();
            Main_HideAboutDialog();
            Main_ExitCurrent(Main_values.Main_Go);
            ru_RULang();
            Settings_AppLang = 'ru_RU';
            Main_hideScene1Doc();
            Main_showScene2Doc();
            Play_MakeControls();
            Play_isOn = true;
            PlayVod_isOn = false;
            PlayClip_isOn = false;
            PlayExtra_PicturePicture = false;
            Play_MultiEnable = false;
            Play_MaxInstances = 4;
            Play_data = JSON.parse(JSON.stringify(Play_data_base));
            window.fixtureStream = i => ({
                id: 'stream' + i,
                user_id: 'user' + i,
                user_login: 'channel' + i,
                user_name: 'Channel ' + i,
                title: 'Вечерний эфир ' + i,
                game_name: 'Just Chatting',
                viewer_count: 1200 + i,
                thumbnail_url: 'https://fixture.test/thumb' + i + '.jpg',
                started_at: '2026-11-15T00:00:00Z',
                language: 'ru',
                game_id: '1',
                type: 'live'
            });
            Play_data.data = ScreensObj_LiveCellArray(fixtureStream(0));
            Play_data.quality = 'Auto';
            Play_data.qualityPlaying = 'Auto';
            Play_data.AutoUrl = 'https://fixture.test/main.m3u8';
            Play_data.playlist = '#EXTM3U\n';
            Play_PreviewId = null;
            Main_isStopped = false;
            AddUser_UsernameArray = [{id: 'viewer', name: 'viewer', access_token: 'fixture-token'}];
            Main_values_History_data.viewer = {live: [], vod: [], clip: [], test: [], deleted: {live: {}, vod: {}, clip: {}}};
            window.nativeCalls = [];
            window.nativeSlots = ['user0', null, null, null];
            window.transportMode = 'success';
            window.delayed = [];
            window.Android = new Proxy(
                {},
                {
                    get: (_, name) => {
                        if (name === 'BasexmlHttpGet')
                            return function (url, timeout, body, method, headers, callback, check, key, success, failure) {
                                nativeCalls.push({name, url, callback, check});
                                if (callback !== 'Main_CheckFullxmlHttpGet') return;
                                const followed = url.includes('streams/followed'),
                                    data = Array.from({length: 6}, (_, i) => fixtureStream(i + (followed ? 0 : 10)));
                                const result = {status: 200, responseText: JSON.stringify({data, pagination: {}})};
                                setTimeout(() => smartTwitchTV[callback](JSON.stringify(result), key, success, failure, check), 0);
                            };
                        if (name === 'XmlHttpGetFull')
                            return function (url, timeout, body, method, headers, callback, check, c1, c2, c3, c4, c5, success, failure) {
                                nativeCalls.push({name, url, callback, check, success});
                                if (!['PlayHLS_GetTokenResult', 'PlayHLS_PlayListUrlResult'].includes(callback)) return;
                                const reply = () => {
                                    const token = url.includes('/gql');
                                    const response = {
                                        status: transportMode === 'failure' ? 403 : 200,
                                        checkResult: check,
                                        // Tools.ResponseObj has no URL on the Android wire.
                                        responseText: token
                                            ? JSON.stringify({
                                                  data: {
                                                      streamPlaybackAccessToken: {
                                                          value: '{"chansub":{"restricted_bitrates":[]}}',
                                                          signature: 'fixture'
                                                      }
                                                  }
                                              })
                                            : '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=4000000,RESOLUTION=1920x1080,CODECS="avc1.64002a,mp4a.40.2"\nhttps://fixture.test/live.m3u8\n'
                                    };
                                    smartTwitchTV[callback](
                                        JSON.stringify(response),
                                        check,
                                        String(c1),
                                        String(c2),
                                        String(c3),
                                        String(c4),
                                        String(c5),
                                        success,
                                        failure
                                    );
                                };
                                if (transportMode === 'silent' || (transportMode === 'hold-playlists' && callback === 'PlayHLS_PlayListUrlResult'))
                                    delayed.push(reply);
                                else setTimeout(reply, 0);
                            };
                        if (name === 'mMethodUrlHeaders')
                            return function (url) {
                                nativeCalls.push({name, url});
                                return JSON.stringify({
                                    status: 200,
                                    checkResult: 0,
                                    responseText: url.includes('/gql')
                                        ? JSON.stringify({
                                              data: {
                                                  streamPlaybackAccessToken: {value: '{"chansub":{"restricted_bitrates":[]}}', signature: 'fixture'}
                                              }
                                          })
                                        : '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=4000000\nhttps://fixture.test/live.m3u8\n'
                                });
                            };
                        if (name === 'EnableMultiStream')
                            return function (big, offset) {
                                nativeCalls.push({name, args: [big, offset]});
                                if (big && offset) {
                                    let shift = ((offset % 4) + 4) % 4;
                                    nativeSlots = nativeSlots.slice(shift).concat(nativeSlots.slice(0, shift));
                                }
                            };
                        if (name === 'mClearSmallPlayer')
                            return function () {
                                nativeCalls.push({name});
                                nativeSlots[1] = null;
                            };
                        if (name === 'StartMultiStream')
                            return function (slot, ...args) {
                                nativeCalls.push({name, args: [slot, ...args]});
                                nativeSlots[slot] = Play_MultiArray[slot].data[14];
                            };
                        return function (...args) {
                            nativeCalls.push({name, args});
                            return '';
                        };
                    }
                }
            );
            Main_IsOn_OSInterface = true;
            Play_SetUserHeader();
            Main_PlayHandleKeyDown();
            Play_controls[Play_MultiStream].enterKey();
        });
        await page.waitForFunction(() => ClassicMulti.active && !ClassicMulti.loading);
        assert.equal(await page.locator('#classic_multi .classic-multi-slot').count(), 4);
        assert.equal(await page.locator('#classic_multi .classic-multi-stream').count(), 6);
        assert.equal(await page.locator('#classic_multi [data-multi-id="stream:user0"]').isDisabled(), true);
        assert.equal(await page.evaluate(() => ClassicMulti.selected), 1);
        assert.equal(await page.locator('#dialog_multi_help').isVisible(), false);
        // Real remote input selects an empty slot then a channel; native named HLS callbacks reach StartMultiStream.
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => ClassicMulti.cursor), 'stream:user1');
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => ClassicMulti.error || nativeCalls.some(c => c.name === 'StartMultiStream' && c.args[0] === 1));
        assert.equal(await page.evaluate(() => ClassicMulti.error), '', 'Android does not echo the request URL; a valid playlist must still start');
        const firstStart = await page.evaluate(() => nativeCalls.find(c => c.name === 'StartMultiStream' && c.args[0] === 1));
        assert.match(firstStart.args[1], /^https:\/\/usher\.ttvnw\.net\/api\/channel\/hls\/channel1\.m3u8\?/);
        assert.equal(
            firstStart.args[1],
            await page.evaluate(() => nativeCalls.find(c => c.name === 'XmlHttpGetFull' && c.url.includes('/channel/hls/channel1.m3u8')).url)
        );

        assert.equal(await page.evaluate(() => Play_MultiArray[1].data[14]), 'user1');
        assert.equal(await page.evaluate(() => ClassicMulti.selected), 2);
        await page.keyboard.press('Enter');
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => nativeCalls.some(c => c.name === 'StartMultiStream' && c.args[0] === 2));
        assert.equal(await page.evaluate(() => Play_MultiArray[2].data[14]), 'user2');
        await page.keyboard.press('Enter');
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => nativeCalls.some(c => c.name === 'StartMultiStream' && c.args[0] === 3));
        assert.equal(await page.evaluate(() => Play_MultiIsFull()), true);
        assert.deepEqual(await page.evaluate(() => nativeSlots), ['user0', 'user1', 'user2', 'user3']);
        // Spatial navigation always has one focus and all controls/cards fit inside the panel.
        for (const key of ['ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowUp']) {
            await page.keyboard.press(key);
            assert.equal(await page.locator('#classic_multi .is-focused').count(), 1);
        }
        await page.screenshot({path: 'tests/multistream-classic.png'});
        const geometry = await page.evaluate(() => {
            const p = document.getElementById('classic_multi').getBoundingClientRect(),
                a = document.querySelector('.classic-multi-aside').getBoundingClientRect(),
                b = document.querySelector('.classic-multi-content').getBoundingClientRect();
            return {inside: p.top >= 0 && p.bottom <= innerHeight && p.left >= 0 && p.right <= innerWidth, noOverlap: a.right < b.left};
        });
        assert.deepEqual(geometry, {inside: true, noOverlap: true});
        // Selective audio, native/JS rotation to main, arbitrary-slot removal keep the two models in sync.
        await page.evaluate(() => {
            ClassicMulti_selectSlot(2);
            ClassicMulti_audio(2);
        });
        assert.deepEqual(await page.evaluate(() => Play_audio_enable), [0, 0, 1, 0]);
        await page.evaluate(() => ClassicMulti_makeMain(2));
        assert.equal(await page.evaluate(() => Play_MultiArray[0].data[14]), 'user2');
        assert.equal(await page.evaluate(() => nativeSlots[0]), 'user2');
        await page.evaluate(() => ClassicMulti_remove(3));
        assert.equal(await page.evaluate(() => nativeSlots[3]), null);
        assert.equal(await page.evaluate(() => Play_MultiArray[3].data.length), 0);
        assert.equal(await page.evaluate(() => nativeSlots[0]), 'user2');
        assert.equal(await page.evaluate(() => nativeSlots[2]), 'user0');
        // Failure while replacing an occupied slot preserves the old stream and allows retry.
        await page.evaluate(() => {
            ClassicMulti.selected = 0;
            transportMode = 'failure';
            ClassicMulti_add(fixtureStream(4));
        });
        await page.waitForFunction(() => ClassicMulti.error && !ClassicMulti.pending);
        assert.equal(await page.evaluate(() => Play_MultiArray[0].data[14]), 'user2');
        // A cancelled request cannot launch a player from a late native response.
        await page.evaluate(() => {
            transportMode = 'silent';
            ClassicMulti_add(fixtureStream(5));
        });
        await page.keyboard.press('Escape');
        assert.equal(await page.evaluate(() => ClassicMulti.pending), null);
        await page.evaluate(() => {
            transportMode = 'success';
            delayed.splice(0).forEach(reply => reply());
        });
        assert.equal(await page.evaluate(() => Play_MultiArray[0].data[14]), 'user2');
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#classic_multi').count(), 0);
        await page.keyboard.press('ArrowUp');
        assert.equal(await page.locator('#classic_multi').count(), 1);
        await page.waitForFunction(() => !ClassicMulti.loading);
        await page.evaluate(() => {
            ClassicMulti.cursor = 'source:live';
            ClassicMulti_focus();
        });
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => !ClassicMulti.loading && ClassicMulti.streams[0].user_id === 'user10');
        assert.equal(await page.locator('#classic_multi .classic-multi-stream').count(), 6);
        // Interleaved consumers must recover their own URLs, not a shared last URL.
        await page.evaluate(() => {
            window.hlsResults = [];
            window.fixturePipelineCapture = function fixturePipelineCapture(body, slot, id) {
                hlsResults.push({body: JSON.parse(body), slot, id});
            };
            transportMode = 'hold-playlists';
            PlayHLS_GetPlayListAsync(true, 'channel20', 20001, 2, fixturePipelineCapture);
            PlayHLS_GetPlayListAsync(true, 'channel21', 20002, 3, fixturePipelineCapture);
        });
        await page.waitForFunction(() => delayed.length === 2);
        await page.evaluate(() => {
            transportMode = 'success';
            delayed
                .splice(0)
                .reverse()
                .forEach(reply => reply());
        });
        const concurrent = await page.evaluate(() => hlsResults);
        assert.deepEqual(
            concurrent.map(r => r.id),
            [20002, 20001]
        );
        assert.ok(concurrent[0].body.url.includes('/channel21.m3u8?'));
        assert.ok(concurrent[1].body.url.includes('/channel20.m3u8?'));
        const sync = await page.evaluate(() => JSON.parse(PlayHLS_GetPlayListSyncToken(true, 'channel22', false)));
        assert.ok(sync.url.includes('/channel22.m3u8?'));
        assert.match(sync.responseText, /^#EXTM3U/);
        // Closing the mode also removes the panel and invalidates requests.
        await page.evaluate(() => Play_controls[Play_MultiStream].enterKey());
        assert.equal(await page.evaluate(() => Play_MultiEnable), false);
        assert.equal(await page.locator('#classic_multi').count(), 0);
        assert.deepEqual(errors, []);
        console.log(
            'PASS: actual multistream entry and Up, four-slot picker, live/followed lists, native HLS callback startup, audio/main/remove, replacement failure and late-response cancellation, one remote focus and contained layout'
        );
    } catch (e) {
        console.error(
            'DEBUG',
            await page.evaluate(() => ({errors: window.fixtureErrors, multi: ClassicMulti, calls: window.nativeCalls?.slice(-15)}))
        );
        console.error(errors);
        throw e;
    } finally {
        await browser.close();
    }
})().catch(e => {
    console.error(e);
    process.exit(1);
});
