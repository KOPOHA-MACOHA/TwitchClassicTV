const {chromium} = require('playwright-core'),
    assert = require('assert/strict');
(async () => {
    const browser = await chromium.launch({
        executablePath:
            process.env.CHROMIUM_PATH || (require('fs').existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : chromium.executablePath()),
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage({viewport: {width: 1920, height: 1080}}),
        errors = [];
    page.on('pageerror', e => {
        errors.push(String(e));
        console.error(e.stack);
    });
    await page.route('**/*', r =>
        r.request().url().startsWith('http://127.0.0.1:8765/')
            ? r.continue()
            : r.fulfill({
                  contentType: r.request().resourceType() === 'script' ? 'text/javascript' : 'application/json',
                  body: r.request().resourceType() === 'script' ? '' : JSON.stringify({data: [], access_token: 'fixture', expires_in: 3600})
              })
    );
    try {
        await page.goto('http://127.0.0.1:8765/app/index.html?asset-test=1');
        await page.waitForFunction(() => typeof smartTwitchTV === 'object' && ClassicShell_navItems.length === 6);
        await page.keyboard.press('Escape');
        await page.evaluate(() => {
            Main_HideWelcomeDialog();
            Main_HideAboutDialog();
            Main_HideWarningDialog();
            Main_ExitCurrent(Main_values.Main_Go);
            ru_RULang();
            Settings_AppLang = 'ru_RU';
            window.syncCalls = [];
            window.nativeStarts = [];
            window.nativeFixes = [];
            window.nativeSeeks = [];
            window.delayed = [];
            window.serverPosition = 1200;
            window.serverUpdated = Date.now();
            window.syncMode = 'ok';
            window.nativeClock = 0;
            window.nativePlaying = false;
            window.nativePreview = false;
            window.writeEcho = true;
            window.metadataCalls = [];
            window.respond = (r, payload) =>
                smartTwitchTV[r.callback](JSON.stringify({status: 200, responseText: JSON.stringify(payload)}), r.key, r.success, r.failure, r.check);
            window.Android = new Proxy(
                {},
                {
                    get: (_, name) => {
                        if (name === 'getPlaybackState') return () => nativePlaying;
                        if (name === 'gettime' || name === 'getsavedtime') return () => nativeClock * 1000;
                        if (name === 'StartAuto')
                            return (...args) => {
                                if (nativePreview) {
                                    nativeFixes.push([0, 2]);
                                    nativePreview = false;
                                    return;
                                }
                                nativeStarts.push(args);
                                nativeClock = Number(args[3]) / 1000;
                                nativePlaying = true;
                            };
                        if (name === 'FixViewPosition')
                            return (...args) => {
                                nativeFixes.push(args);
                                nativePreview = false;
                            };
                        if (name === 'mseekTo')
                            return ms => {
                                nativeSeeks.push(ms);
                                nativeClock = ms / 1000;
                            };
                        if (name === 'ClearSidePanelPlayer')
                            return () => {
                                nativePreview = false;
                                nativePlaying = false;
                                nativeClock = 0;
                            };
                        if (name === 'stopVideo')
                            return () => {
                                nativePlaying = false;
                                nativeClock = 0;
                            };
                        if (name === 'BasexmlHttpGet')
                            return (url, timeout, body, method, headers, callback, check, key, success, failure) => {
                                let parsed;
                                try {
                                    parsed = JSON.parse(body);
                                } catch {}
                                if (success === 'PlayVod_get_vod_infoResult') {
                                    const video = String(Main_values.ChannelVod_vodId);
                                    metadataCalls.push({
                                        video,
                                        active: PlayVod_isOn,
                                        waiting: !!(ClassicVodSync.session && ClassicVodSync.session.waiting)
                                    });
                                    const info = {
                                        id: video,
                                        title: 'Metadata title',
                                        language: 'en',
                                        duration: '2h0m0s',
                                        createdAt: '2026-11-15T00:00:00Z',
                                        viewCount: 100,
                                        thumbnailURLs: ['https://fixture.test/thumb.jpg'],
                                        game: {id: '1', displayName: 'Game'},
                                        creator: {
                                            id: '789',
                                            login: 'fixture',
                                            displayName: 'Fixture',
                                            roles: {isPartner: false},
                                            profileImageURL: ''
                                        },
                                        moments: {
                                            edges: [
                                                {
                                                    node: {
                                                        type: 'GAME_CHANGE',
                                                        description: 'Game',
                                                        details: {game: {id: '1', displayName: 'Game'}},
                                                        positionMilliseconds: 0,
                                                        durationMilliseconds: 7200000
                                                    }
                                                }
                                            ]
                                        }
                                    };
                                    return setTimeout(
                                        () =>
                                            smartTwitchTV[callback](
                                                JSON.stringify({status: 200, responseText: JSON.stringify({data: {video: info}})}),
                                                key,
                                                success,
                                                failure,
                                                check
                                            ),
                                        0
                                    );
                                }
                                if (!parsed || !/^ClassicVodSync/.test(parsed.operationName || '')) return;
                                assertNativeCallback(success);
                                assertNativeCallback(failure);
                                const r = {
                                    url,
                                    body: parsed,
                                    method,
                                    headers: JSON.parse(headers),
                                    callback,
                                    check: Number(check),
                                    key,
                                    success,
                                    failure
                                };
                                syncCalls.push(r);
                                if (
                                    syncMode === 'silent' ||
                                    syncMode === 'delay' ||
                                    (syncMode === 'write-delay' && parsed.operationName === 'ClassicVodSyncWrite')
                                ) {
                                    delayed.push(r);
                                    return;
                                }
                                if (syncMode === 'auth')
                                    return setTimeout(
                                        () =>
                                            smartTwitchTV[callback](
                                                JSON.stringify({status: 200, responseText: JSON.stringify({errors: [{message: 'Unauthorized'}]})}),
                                                key,
                                                success,
                                                failure,
                                                check
                                            ),
                                        0
                                    );
                                if (syncMode === 'malformed')
                                    return setTimeout(
                                        () =>
                                            smartTwitchTV[callback](
                                                JSON.stringify({status: 200, responseText: 'not JSON'}),
                                                key,
                                                success,
                                                failure,
                                                check
                                            ),
                                        0
                                    );
                                if (parsed.operationName === 'ClassicVodSyncWrite') {
                                    if (syncMode !== 'ignore-write') serverPosition = parsed.variables.input.position;
                                    serverUpdated = Date.now();
                                    const video = writeEcho
                                        ? {
                                              id: parsed.variables.input.videoID,
                                              self: {viewingHistory: {position: serverPosition, updatedAt: new Date(serverUpdated).toISOString()}}
                                          }
                                        : {id: parsed.variables.input.videoID};
                                    return setTimeout(() => respond(r, {data: {updateUserViewedVideo: {video}}}), 0);
                                }
                                const video = {
                                    id: parsed.variables.id,
                                    self: {
                                        viewingHistory:
                                            serverPosition === null
                                                ? null
                                                : {position: serverPosition, updatedAt: new Date(serverUpdated).toISOString()}
                                    }
                                };
                                setTimeout(() => respond(r, {data: {video}}), 0);
                            };
                        if (name === 'XmlHttpGetFull')
                            return (url, timeout, body, method, headers, callback, check, c1, c2, c3, c4, c5, success, failure) => {
                                const response = {
                                    status: 200,
                                    checkResult: check,
                                    responseText: url.includes('/gql')
                                        ? JSON.stringify({
                                              data: {
                                                  videoPlaybackAccessToken: {value: '{"chansub":{"restricted_bitrates":[]}}', signature: 'fixture'}
                                              }
                                          })
                                        : url.includes('usher.ttvnw.net')
                                          ? '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=4000000,RESOLUTION=1920x1080,CODECS="avc1.64002a,mp4a.40.2"\nhttps://fixture.test/vod.m3u8\n'
                                          : JSON.stringify({data: []})
                                };
                                setTimeout(
                                    () =>
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
                                        ),
                                    0
                                );
                            };
                        return () => '';
                    }
                }
            );
            window.assertNativeCallback = name => {
                if (!name || typeof window[name] !== 'function') throw Error('Uncallable native callback ' + name);
            };
            Main_IsOn_OSInterface = true;
            Main_isStopped = false;
            AddUser_UsernameArray = [{id: '123', name: 'viewer', access_token: 'fixture-private-token'}];
            Main_values_History_data['123'] = {live: [], vod: [], clip: [], test: [], deleted: {live: {}, vod: {}, clip: {}}};
            Settings_value.vod_dialog.defaultValue = 0;
            Settings_value.show_vod_player.defaultValue = 0;
            Settings_value.show_live_player.defaultValue = 0;
            ClassicVodSync.readTimeout = 120;
            ClassicVodSync.requestTimeout = 180;
            window.prepareVod = (video = '456', explicit = 0, preview = false) => {
                ClassicVodSync_stop(false);
                Main_PreventClick(false, Main_PreventClickfun);
                Main_values.Main_Go = Main_Live;
                Main_values.ChannelVod_vodId = video;
                Main_values.Main_selectedChannel_id = '789';
                Main_values.Main_selectedChannel = 'fixture';
                Main_values.Main_selectedChannelDisplayname = 'Fixture';
                Main_values.Main_selectedChannelPartner = false;
                Main_values.Main_selectedChannelLogo = '';
                Main_values_Play_data = [
                    '',
                    'Fixture',
                    '',
                    'Game',
                    '100',
                    '',
                    'fixture',
                    video,
                    false,
                    'en',
                    'Video',
                    7200,
                    '2026-11-15T00:00:00Z',
                    100,
                    '789',
                    ''
                ];
                Play_data = JSON.parse(JSON.stringify(Play_data_base));
                Play_data.data = [
                    '',
                    'Fixture',
                    'Video',
                    'Game',
                    100,
                    '',
                    'fixture',
                    video,
                    false,
                    '',
                    false,
                    '',
                    '2026-11-15T00:00:00Z',
                    100,
                    '789',
                    'en',
                    null,
                    null,
                    '1'
                ];
                ChannelVod_title = 'Video';
                ChannelVod_game = 'Game';
                ChannelVod_language = 'en';
                ChannelVod_views = '100';
                ChannelVod_createdAt = '';
                Play_DurationSeconds = 7200;
                Play_PreviewId = null;
                Play_PreviewOffset = 0;
                Play_OpenRewind = false;
                PlayVod_replay = false;
                Play_isOn = false;
                PlayVod_isOn = false;
                PlayClip_isOn = false;
                Main_vodOffset = explicit;
                nativePlaying = false;
                nativePreview = false;
                nativeClock = 0;
                nativeStarts = [];
                if (preview) {
                    Play_PreviewId = preview === true ? video : String(preview);
                    nativePreview = true;
                    Play_PreviewOffset = 70;
                    Play_PreviewURL = 'https://fixture.test/promoted.m3u8';
                    Play_PreviewResponseText =
                        '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=4000000,RESOLUTION=1920x1080,CODECS="avc1.64002a,mp4a.40.2"\nhttps://fixture.test/vod.m3u8\n';
                    nativeClock = 70;
                    nativePlaying = true;
                }
                nativeFixes = [];
                nativeSeeks = [];
                Main_showScene2Doc();
                Main_PlayVodHandleKeyDown();
                PlayVod_Start();
            };
            prepareVod();
        });
        await page.waitForFunction(() => nativeStarts.length === 1);
        assert.equal(await page.evaluate(() => Number(nativeStarts[0][3])), 1200000, 'cloud resume reaches actual native StartAuto offset');
        assert.equal(await page.evaluate(() => ClassicVodSync.status.read), 'received');
        await page.waitForFunction(() => Main_history_Exist('vod', '456') >= 0 && PlayVod_ChaptersArray.length === 1);
        assert.ok(
            await page.evaluate(() => metadataCalls.every(r => r.active && !r.waiting)),
            'metadata loads after cloud preflight and is retained'
        );
        assert.equal(await page.evaluate(() => ChannelVod_title), 'Metadata title');
        await page.evaluate(() =>
            PlayVod_get_vod_infoResult({status: 200, responseText: JSON.stringify({data: {video: {id: '999', title: 'stale'}}})})
        );
        assert.equal(await page.evaluate(() => ChannelVod_title), 'Metadata title', 'stale metadata cannot overwrite the current video');

        await page.evaluate(() => {
            nativeClock = 1205;
            ClassicVodSync_poll();
        });
        await page.waitForFunction(() => ClassicVodSync.status.write === 'saved');
        assert.equal(await page.evaluate(() => serverPosition), 1205);
        assert.equal(await page.evaluate(() => ClassicVodSync_cache('123')['456'].dirty), false);
        // Backward seeks must remain backward; preserve the last queued edit across an in-flight write.
        await page.evaluate(() => {
            syncMode = 'write-delay';
            nativeClock = 1210;
            ClassicVodSync_sample(true);
            nativeClock = 300;
            ClassicVodSync_sample(true);
        });
        assert.equal(await page.evaluate(() => delayed.length), 1);
        await page.evaluate(() => {
            const r = delayed.shift();
            serverPosition = r.body.variables.input.position;
            respond(r, {
                data: {
                    updateUserViewedVideo: {
                        video: {id: '456', self: {viewingHistory: {position: serverPosition, updatedAt: new Date().toISOString()}}}
                    }
                }
            });
        });
        await page.waitForFunction(() => delayed.length === 1);
        assert.equal(await page.evaluate(() => delayed[0].body.variables.input.position), 300);
        await page.evaluate(() => {
            const r = delayed.shift();
            serverPosition = 300;
            respond(r, {
                data: {updateUserViewedVideo: {video: {id: '456', self: {viewingHistory: {position: 300, updatedAt: new Date().toISOString()}}}}}
            });
            syncMode = 'ok';
        });
        await page.waitForFunction(() => ClassicVodSync_cache('123')['456'].dirty === false);
        // The real seek handler, not just a direct call to the sync module.
        await page.evaluate(() => {
            PlayVod_TimeToJump = 250;
            PlayVod_jump();
        });
        await page.waitForFunction(() => serverPosition === 250);
        assert.equal(await page.evaluate(() => nativeClock), 250);
        // Native pause flush and background snapshot both use the actual current clock.
        await page.evaluate(() => {
            nativeClock = 305;
            nativePlaying = false;
            Play_PlayPauseChange(false, 2);
        });
        await page.waitForFunction(() => serverPosition === 305);
        await page.evaluate(() => {
            nativeClock = 310;
            ClassicVodSync_background();
        });
        await page.waitForFunction(() => serverPosition === 310);
        // A mutation's video ID alone is insufficient: a second read must confirm it.
        await page.evaluate(() => {
            writeEcho = false;
            nativeClock = 320;
            ClassicVodSync_sample(true);
        });
        await page.waitForFunction(() => ClassicVodSync.status.write === 'saved' && serverPosition === 320);
        assert.ok(
            await page.evaluate(
                () =>
                    syncCalls
                        .slice(-2)
                        .map(r => r.body.operationName)
                        .join(',') === 'ClassicVodSyncWrite,ClassicVodSyncRead'
            )
        );
        // An HTTP 200 without the changed server position must remain unconfirmed.
        await page.evaluate(() => {
            syncMode = 'ignore-write';
            nativeClock = 325;
            ClassicVodSync_sample(true);
        });
        await page.waitForFunction(() => ClassicVodSync.status.write === 'unconfirmed');
        assert.equal(await page.evaluate(() => ClassicVodSync_cache('123')['456'].dirty), true);
        // Leaving while a request is in flight sends the final queued position before discarding the session.
        await page.evaluate(() => {
            syncMode = 'write-delay';
            nativeClock = 330;
            ClassicVodSync_sample(true);
            nativeClock = 340;
            ClassicVodSync_stop(true);
        });
        await page.evaluate(() => {
            const r = delayed.shift();
            respond(r, {
                data: {updateUserViewedVideo: {video: {id: '456', self: {viewingHistory: {position: 330, updatedAt: new Date().toISOString()}}}}}
            });
        });
        await page.waitForFunction(() => delayed.length === 1);
        assert.equal(await page.evaluate(() => delayed[0].body.variables.input.position), 340);
        await page.evaluate(() => {
            const r = delayed.shift();
            respond(r, {
                data: {updateUserViewedVideo: {video: {id: '456', self: {viewingHistory: {position: 340, updatedAt: new Date().toISOString()}}}}}
            });
            syncMode = 'ok';
            writeEcho = true;
        });
        await page.waitForFunction(() => Object.keys(ClassicVodSync.requests).length === 0);
        // Newer remote backward seek supersedes this device's older checkpoint.
        await page.evaluate(() => {
            serverPosition = 100;
            serverUpdated = Date.now() + 2000;
            prepareVod();
        });
        await page.waitForFunction(() => nativeStarts.length === 1);
        assert.equal(await page.evaluate(() => Number(nativeStarts[0][3])), 100000);
        // Warm return from Home re-reads the account position before native restoration.
        await page.evaluate(() => {
            serverPosition = 80;
            serverUpdated = Date.now() + 3000;
            nativePlaying = false;
            PlayVod_Resume();
        });
        await page.waitForFunction(() => nativeStarts.length === 2);
        assert.equal(await page.evaluate(() => Number(nativeStarts[1][3])), 80000);
        // A newer unsent local edit is used without replaying an old queued write first.
        await page.evaluate(() => {
            ClassicVodSync_store('123', '456', {position: 50, updatedAt: Date.now() + 10000, dirty: true, revision: ++ClassicVodSync.sequence});
            serverPosition = 200;
            serverUpdated = Date.now();
            prepareVod();
        });
        await page.waitForFunction(() => nativeStarts.length === 1);
        assert.equal(await page.evaluate(() => Number(nativeStarts[0][3])), 50000);
        // Explicit link timestamps win over remote history and make no resume read.
        const before = await page.evaluate(() => syncCalls.length);
        await page.evaluate(() => prepareVod('457', 600));
        await page.waitForFunction(() => nativeStarts.length === 1);
        assert.equal(await page.evaluate(() => Number(nativeStarts[0][3])), 600000);
        assert.equal(await page.evaluate(() => syncCalls.length), before);
        // Starting over must skip the cloud position even when the old native clock is nonzero.
        const startOverReads = await page.evaluate(() => syncCalls.length);
        await page.evaluate(() => {
            Main_vodOffset = 0;
            PlayVod_Start(true);
        });
        await page.waitForFunction(() => nativeStarts.length === 2);
        assert.equal(await page.evaluate(() => Number(nativeStarts[1][3])), 1);
        assert.equal(await page.evaluate(() => syncCalls.length), startOverReads);
        // Valid zero is an intentional restart, never max(local, remote).
        await page.evaluate(() => {
            serverPosition = 0;
            serverUpdated = Date.now() + 20000;
            prepareVod();
        });
        await page.waitForFunction(() => nativeStarts.length === 1);
        assert.equal(await page.evaluate(() => Number(nativeStarts[0][3])), 1);
        // Silent/malformed/rejected requests do not trap the player or seek it after it starts.
        for (const mode of ['silent', 'malformed', 'auth']) {
            await page.evaluate(mode => {
                syncMode = mode;
                delayed = [];
                prepareVod('458');
            }, mode);
            await page.waitForFunction(() => nativeStarts.length === 1);
            assert.equal(await page.evaluate(() => Number(nativeStarts[0][3])), 0);
            assert.ok(await page.evaluate(() => ['timeout', 'malformed', 'auth'].includes(ClassicVodSync.status.read)));
            if (mode === 'silent') {
                await page.evaluate(() => {
                    const r = delayed.shift();
                    respond(r, {data: {video: {id: '458', self: {viewingHistory: {position: 2500, updatedAt: new Date().toISOString()}}}}});
                });
                assert.equal(await page.evaluate(() => nativeStarts.length), 1);
                assert.equal(await page.evaluate(() => nativeClock), 0);
            }
        }
        // Back while waiting exits immediately and invalidates late responses.
        await page.evaluate(() => {
            syncMode = 'delay';
            delayed = [];
            ClassicVodSync.readTimeout = 1000;
            prepareVod('459');
        });
        await page.keyboard.press('Escape');
        assert.equal(await page.evaluate(() => ClassicVodSync.session), null);
        assert.equal(await page.evaluate(() => PlayVod_isOn), false);
        assert.equal(await page.evaluate(() => nativeStarts.length), 0);
        await page.evaluate(() => {
            for (const r of delayed.splice(0))
                respond(r, {data: {video: {id: '459', self: {viewingHistory: {position: 1234, updatedAt: new Date().toISOString()}}}}});
        });
        assert.equal(await page.evaluate(() => nativeStarts.length), 0);
        // A timed-out write blocks retries for that video until another deliberate open.
        await page.evaluate(() => {
            syncMode = 'ok';
            ClassicVodSync.readTimeout = 120;
            serverPosition = 0;
            prepareVod('460');
        });
        await page.waitForFunction(() => nativeStarts.length === 1);
        await page.evaluate(() => {
            syncMode = 'silent';
            nativeClock = 5;
            ClassicVodSync_sample(true);
        });
        await page.waitForFunction(() => ClassicVodSync.status.write === 'timeout');
        const count = await page.evaluate(() => syncCalls.length);
        await page.evaluate(() => {
            nativeClock = 25;
            ClassicVodSync_sample(true);
        });
        assert.equal(await page.evaluate(() => syncCalls.length), count);
        assert.equal(await page.evaluate(() => ClassicVodSync_cache('123')['460'].position), 25);
        // Another account cannot consume responses or flush the previous account's pending edits.
        await page.evaluate(() => {
            ClassicVodSync_stop(false);
            syncMode = 'delay';
            delayed = [];
            ClassicVodSync.readTimeout = 1000;
            prepareVod('461');
            AddUser_UsernameArray = [{id: '999', name: 'other', access_token: 'other-private-token'}];
            Main_values_History_data['999'] = {live: [], vod: [], clip: [], test: [], deleted: {live: {}, vod: {}, clip: {}}};
            const r = delayed.shift();
            respond(r, {data: {video: {id: '461', self: {viewingHistory: {position: 3000, updatedAt: new Date().toISOString()}}}}});
        });
        await page.waitForFunction(() => nativeStarts.length === 1);
        assert.equal(await page.evaluate(() => Number(nativeStarts[0][3])), 0);
        assert.equal(await page.evaluate(() => ClassicVodSync.session), null);
        assert.equal(await page.evaluate(() => localStorage.getItem('classic_vod_resume_999')), null);
        // The default TV path promotes an already-playing thumbnail, rather than StartAuto.
        await page.evaluate(() => {
            syncMode = 'ok';
            serverPosition = 1500;
            serverUpdated = Date.now() + 5000;
            prepareVod('470', 0, true);
        });
        await page.waitForFunction(() => nativeFixes.length === 1);
        assert.equal(await page.evaluate(() => ClassicVodSync.status.read), 'received', 'thumbnail promotion must not report sync disabled');
        assert.equal(await page.evaluate(() => nativeStarts.length), 0, 'reuse the native thumbnail player');
        assert.equal(await page.evaluate(() => nativeClock), 1500, 'cloud position supersedes the thumbnail clock and offset');
        assert.equal(await page.evaluate(() => Play_PreviewId), null);
        await page.evaluate(() => {
            nativeClock = 1505;
            ClassicVodSync_poll();
        });
        await page.waitForFunction(() => ClassicVodSync.status.write === 'saved');
        assert.equal(await page.evaluate(() => serverPosition), 1505);
        // Going Back can mark the video as a thumbnail before the final shutdown flush.
        await page.evaluate(() => {
            nativeClock = 1510;
            PlayVod_SetPreview();
            ClassicVodSync_stop(true);
        });
        await page.waitForFunction(() => serverPosition === 1510);
        // No cloud checkpoint keeps the already-running preview position; it still starts reporting.
        await page.evaluate(() => {
            serverPosition = null;
            prepareVod('471', 0, true);
        });
        await page.waitForFunction(() => nativeFixes.length === 1);
        assert.equal(await page.evaluate(() => ClassicVodSync.status.read), 'empty');
        assert.equal(await page.evaluate(() => nativeClock), 70);
        assert.equal(await page.evaluate(() => nativeSeeks.length), 0);
        await page.evaluate(() => {
            nativeClock = 75;
            ClassicVodSync_poll();
        });
        await page.waitForFunction(() => ClassicVodSync.status.write === 'saved');
        // Explicit timestamps, including the native one-millisecond zero sentinel, win over preview time.
        const previewReads = await page.evaluate(() => syncCalls.length);
        await page.evaluate(() => prepareVod('472', 300, true));
        await page.waitForFunction(() => nativeFixes.length === 1);
        assert.equal(await page.evaluate(() => nativeClock), 300);
        assert.equal(await page.evaluate(() => syncCalls.length), previewReads);
        assert.equal(await page.evaluate(() => ClassicVodSync.status.read), 'explicit');
        await page.evaluate(() => {
            serverPosition = 0;
            prepareVod('473', 0, true);
        });
        await page.waitForFunction(() => nativeFixes.length === 1);
        assert.equal(await page.evaluate(() => nativeClock), 0.001);
        // A different thumbnail must be cleared before loading the selected VOD, never reported as its viewing.
        await page.evaluate(() => {
            serverPosition = 600;
            prepareVod('474', 0, '999999');
        });
        await page.waitForFunction(() => nativeStarts.length === 1);
        assert.equal(await page.evaluate(() => nativeClock), 600);
        assert.equal(await page.evaluate(() => nativeFixes.length), 0);
        // Settings are remote-accessible, opt-out works, storage never contains an OAuth credential.
        await page.evaluate(() => {
            ClassicVodSync_stop(false);
            PlayVod_isOn = false;
            Main_showSettings();
        });
        await page.keyboard.press('Enter');
        await page.keyboard.press('Enter');
        assert.match(await page.locator('#classic_preferences h1').innerText(), /Синхронизация записей/);
        await page.screenshot({path: 'tests/vod-sync-classic.png'});
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => ClassicFeatures_enabled('vod_sync')), false);
        const opted = await page.evaluate(() => syncCalls.length);
        await page.evaluate(() => {
            syncMode = 'ok';
            prepareVod('462');
        });
        await page.waitForFunction(() => nativeStarts.length === 1);
        assert.equal(await page.evaluate(() => syncCalls.length), opted);
        assert.equal(
            await page.evaluate(() =>
                Object.entries(localStorage)
                    .filter(([k]) => k.startsWith('classic_vod_resume_'))
                    .some(([, v]) => /private-token|access_token|Authorization/.test(v))
            ),
            false
        );
        assert.ok(
            await page.evaluate(() =>
                syncCalls.every(
                    r =>
                        r.url === 'https://gql.twitch.tv/gql' &&
                        r.method === 'POST' &&
                        r.success === 'ClassicVodSync_httpSuccess' &&
                        r.failure === 'ClassicVodSync_httpFailure'
                )
            )
        );
        assert.deepEqual(errors, []);
        console.log(
            'PASS: actual VOD startup and native callback dispatch, cloud read/write/readback, native preview promotion and final demotion flush, backward seeks, serialised final edits, pause/background, timeout fallback and late replies, zero/explicit positions, account isolation, opt-out and remote settings'
        );
    } catch (e) {
        console.error(
            'SYNC STATE',
            await page.evaluate(() => ({
                status: ClassicVodSync.status,
                session: ClassicVodSync.session && {
                    video: ClassicVodSync.session.video,
                    waiting: ClassicVodSync.session.waiting,
                    started: ClassicVodSync.session.started,
                    seen: ClassicVodSync.session.seen,
                    expected: ClassicVodSync.session.expected
                },
                requests: Object.keys(ClassicVodSync.requests),
                calls: syncCalls.map(r => r.body.operationName),
                starts: nativeStarts,
                mode: syncMode,
                delayed: delayed.length,
                vod: PlayVod_isOn,
                offset: Main_vodOffset
            }))
        );
        throw e;
    } finally {
        await browser.close();
    }
})().catch(e => {
    console.error(e);
    process.exitCode = 1;
});
