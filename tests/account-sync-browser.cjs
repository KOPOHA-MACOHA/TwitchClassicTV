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
    let account = '123',
        mode = 'ok',
        catalogueCalls = 0,
        heldResolve,
        holdNext = false;
    const node = (id, position, status = 'RECORDED') => ({
        id,
        title: 'Video ' + id,
        lengthSeconds: status === 'RECORDING' ? 100 : 7200,
        status,
        createdAt: '2026-11-17T01:00:00Z',
        owner: {id: '456', login: 'streamer', displayName: 'Streamer'},
        self: {viewingHistory: {position, updatedAt: '2026-11-17T10:00:00Z'}}
    });
    page.on('pageerror', e => errors.push(String(e)));
    await page.route('**/*', async r => {
        if (r.request().url().startsWith('http://127.0.0.1:8765/')) return r.continue();
        if (r.request().resourceType() === 'script') return r.fulfill({contentType: 'text/javascript', body: ''});
        let body;
        try {
            body = JSON.parse(r.request().postData());
        } catch {}
        const reply = data => r.fulfill({contentType: 'application/json', body: JSON.stringify(data)});
        if (body?.operationName === 'ClassicContinueWatching') return reply({data: {currentUser: {id: account, viewedVideos: {edges: []}}}});
        if (body?.operationName === 'ClassicContinueCandidates') {
            catalogueCalls++;
            if (holdNext) {
                holdNext = false;
                heldResolve(r);
                return;
            }
            if (mode === 'error') return r.fulfill({status: 503, body: 'Unavailable'});
            let edges =
                account === '123'
                    ? body.variables.after
                        ? [{node: node('902', 1200)}]
                        : [{node: node('900', 80, 'RECORDING')}, {node: node('901', 7200)}, {node: node('903', 0)}]
                    : [];
            return reply({
                data: {
                    currentUser: {
                        id: account,
                        followedVideos: {
                            pageInfo: {hasNextPage: account === '123' && (!body.variables.after || mode === 'repeat'), endCursor: 'next'},
                            edges
                        }
                    }
                }
            });
        }
        if (body?.operationName === 'ClassicContinueKnown') {
            if (mode === 'error') return r.fulfill({status: 503, body: 'Unavailable'});
            const data = {currentUser: {id: account}};
            for (const m of body.query.matchAll(/v(\d+):video\(id:"(\d+)"\)/g))
                data['v' + m[1]] = m[2] === '777' ? {...node('777', 300), owner: {id: '888', login: 'unfollowed', displayName: 'Unfollowed'}} : null;
            return reply({data});
        }
        if (String(body?.query).includes('ChannelFollows'))
            return reply({data: {currentUser: {follows: {pageInfo: {hasNextPage: false}, edges: []}}}});
        return reply({data: [], pagination: {}, access_token: 'fixture', expires_in: 3600});
    });
    try {
        await page.goto('http://127.0.0.1:8765/app/index.html?asset-test=1');
        await page.waitForFunction(() => typeof ClassicLiveSync === 'object' && ClassicShell_navItems.length === 6);
        await page.keyboard.press('Escape');
        await page.evaluate(() => {
            Main_HideWelcomeDialog();
            Main_HideWarningDialog();
            Main_HideAboutDialog();
            ru_RULang();
            Settings_AppLang = 'ru_RU';
            Main_SetStringsMain();
            AddUser_UsernameArray = [{id: '123', name: 'viewer', access_token: 'fixture'}];
            Main_values_History_data['123'] = {
                live: [],
                vod: [{id: '777', data: [], date: 1}],
                clip: [],
                deleted: {live: {}, vod: {}, clip: {}},
                blocked: {live: {}, vod: {}, clip: {}, game: {}}
            };
            FollowingClassic_init();
        });
        await page.waitForFunction(() => !ClassicContinue.loading && ClassicContinue.recovered);
        assert.deepEqual((await page.evaluate(() => ClassicContinue.items.map(i => i.id))).sort(), ['777', '900', '902']);
        assert.equal(
            await page.evaluate(() => ClassicContinue.all.some(i => i.id === '901')),
            true,
            'completed history imports, without putting it in Continue'
        );
        assert.equal(
            await page.evaluate(() => ClassicContinue.items.some(i => i.id === '903')),
            false,
            'unwatched catalogue entries never become history'
        );
        assert.ok((await page.locator('.classic-continue-section').innerText()).includes('По сохранённым позициям'));
        assert.equal(catalogueCalls, 2);
        mode = 'error';
        await page.evaluate(() => ClassicContinue_load(true));
        await page.waitForFunction(() => !ClassicContinue.loading);
        assert.equal(await page.evaluate(() => ClassicContinue.cached), true, 'failed recovery retains this account cache');
        assert.equal(await page.locator('.classic-continue-card').count(), 3);
        mode = 'repeat';
        catalogueCalls = 0;
        await page.evaluate(() => ClassicContinue_load(true));
        await page.waitForFunction(() => !ClassicContinue.loading);
        assert.ok(catalogueCalls <= 3, 'non-progressing cursors terminate');
        assert.equal(await page.evaluate(() => ClassicContinue.partial), true);
        mode = 'ok';
        holdNext = true;
        const heldPromise = new Promise(resolve => (heldResolve = resolve));
        await page.evaluate(() => ClassicContinue_load(true));
        const held = await heldPromise;
        account = '999';
        await page.evaluate(() => {
            AddUser_UsernameArray = [{id: '999', name: 'other', access_token: 'other'}];
            FollowingClassic_reload();
        });
        await page.waitForFunction(() => ClassicContinue.account === '999' && !ClassicContinue.loading);
        await held.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({
                data: {currentUser: {id: '123', followedVideos: {pageInfo: {hasNextPage: false}, edges: [{node: node('900', 80, 'RECORDING')}]}}}
            })
        });
        await page.waitForTimeout(30);
        assert.equal(await page.locator('.classic-continue-card').count(), 0, 'late recovery never leaks another account');
        const live = await page.evaluate(() => {
            FollowingClassic_exit();
            Main_hideScene1Doc();
            Main_showScene2Doc();
            AddUser_UsernameArray = [{id: '123', name: 'viewer', access_token: 'fixture'}];
            window.nativeCalls = [];
            window.fixturePlaying = true;
            window.fixtureNow = Date.UTC(2026, 10, 17, 10, 0, 0);
            const originalNow = Date.now;
            Date.now = () => fixtureNow;
            Android = new Proxy(
                {},
                {
                    get: (_, name) =>
                        name === 'getPlaybackState'
                            ? () => fixturePlaying
                            : name === 'BasexmlHttpGet'
                              ? function (url, timeout, body, method, headers, callback, check, key, success, failure) {
                                    nativeCalls.push({url, body, method, headers, callback, check, key, success, failure});
                                }
                              : () => ''
                }
            );
            Main_IsOn_OSInterface = true;
            Main_isStopped = false;
            Play_isOn = true;
            PlayVod_isOn = false;
            PlayClip_isOn = false;
            Play_Playing = true;
            Play_PreviewId = null;
            Play_data.data = Array(17).fill('');
            Play_data.data[7] = '789';
            Play_data.data[14] = '456';
            ChatLive_Latency[0] = 20000;
            const reply = (r, data) =>
                smartTwitchTV[r.callback](JSON.stringify({status: 200, responseText: JSON.stringify(data)}), r.key, r.success, r.failure, r.check);
            const writes = () => nativeCalls.filter(r => JSON.parse(r.body || '{}').operationName === 'ClassicVodSyncWrite');
            ClassicLiveSync_start();
            clearInterval(ClassicLiveSync.timer);
            const metadata = nativeCalls.find(r => JSON.parse(r.body || '{}').operationName === 'ClassicLiveArchive');
            reply(metadata, {
                data: {
                    currentUser: {id: '123'},
                    user: {
                        id: '456',
                        stream: {id: '789', createdAt: new Date(fixtureNow - 600000).toISOString(), archiveVideo: {id: '9000', lengthSeconds: 600}}
                    }
                }
            });
            const tick = n => {
                for (let i = 0; i < n; i++) {
                    fixtureNow += 5000;
                    ClassicLiveSync_poll();
                }
            };
            tick(7);
            const first = JSON.parse(writes()[0].body).variables.input;
            reply(writes()[0], {
                data: {
                    updateUserViewedVideo: {
                        video: {id: '9000', self: {viewingHistory: {position: first.position, updatedAt: new Date(fixtureNow).toISOString()}}}
                    }
                }
            });
            tick(1);
            fixturePlaying = false;
            Play_Playing = false;
            ClassicLiveSync_flush();
            const second = JSON.parse(writes()[1].body).variables.input;
            reply(writes()[1], {
                data: {
                    updateUserViewedVideo: {
                        video: {id: '9000', self: {viewingHistory: {position: second.position, updatedAt: new Date(fixtureNow).toISOString()}}}
                    }
                }
            });
            fixtureNow += 600000;
            ClassicLiveSync_poll();
            ClassicLiveSync_flush();
            const pausedCount = writes().length;
            fixturePlaying = true;
            Play_Playing = true;
            Main_isStopped = true;
            tick(8);
            if (writes().length !== pausedCount) throw Error('Background live playback was recorded');
            Main_isStopped = false;
            Play_data.data[14] = '777';
            ClassicLiveSync_poll();
            const stopped = ClassicLiveSync.session === null;
            // An absent archive must not turn a broadcast/channel ID into a VOD mutation.
            fixturePlaying = true;
            Play_Playing = true;
            Play_data.data[14] = '456';
            ClassicLiveSync_start();
            clearInterval(ClassicLiveSync.timer);
            const meta2 = nativeCalls.filter(r => JSON.parse(r.body || '{}').operationName === 'ClassicLiveArchive').at(-1);
            reply(meta2, {
                data: {
                    currentUser: {id: '123'},
                    user: {id: '456', stream: {id: '789', createdAt: new Date(fixtureNow - 600000).toISOString(), archiveVideo: null}}
                }
            });
            tick(8);
            const absentCount = writes().length;
            ClassicLiveSync_stop(true);
            Date.now = originalNow;
            Main_IsOn_OSInterface = false;
            Play_isOn = false;
            return {first, second, pausedCount, stopped, absentCount};
        });
        assert.equal(live.first.videoID, '9000');
        assert.equal(live.first.videoType, 'VOD');
        assert.equal(live.first.position, 615, 'broadcast elapsed time minus delay, not 30 watched seconds');
        assert.equal(live.second.position, 620, 'pause flush uses the last played point');
        assert.equal(live.pausedCount, 2);
        assert.equal(live.absentCount, 2);
        assert.equal(live.stopped, true);
        assert.deepEqual(errors, []);
        console.log(
            'PASS: empty-index recovery, paginated watched-only catalogue, known unfollowed videos, partial cache and account isolation; live archive identity, confirmed writes, delay, pause/background and missing-archive exclusion'
        );
    } finally {
        await browser.close();
    }
})().catch(e => {
    console.error(e);
    process.exitCode = 1;
});
