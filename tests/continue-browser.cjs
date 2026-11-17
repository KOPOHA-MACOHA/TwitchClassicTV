const {chromium} = require('playwright-core'),
    assert = require('assert/strict');
(async () => {
    const browser = await chromium.launch({
        executablePath:
            process.env.CHROMIUM_PATH || (require('fs').existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : chromium.executablePath()),
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage({viewport: {width: 1920, height: 1080}, locale: 'ru-RU'}),
        errors = [];
    let account = '123',
        mode = 'ok',
        historyRequests = 0,
        readRequests = 0,
        phonePosition = 999;
    let liveBarrier = Promise.resolve(), releaseLive;
    function delayLive() { liveBarrier = new Promise(resolve => { releaseLive = resolve; }); }
    const requestedWindows = [];
    function history() {
        return [
            ...Array.from({length: 7}, (_, i) => ({
                history: {position: 600 + i * 10, updatedAt: new Date(Date.UTC(2026, 0, 8 - i)).toISOString()},
                node: {
                    id: String(100 + i),
                    title: i === 0 ? 'Длинное название записи <текст>' : 'Запись ' + i,
                    lengthSeconds: 7200,
                    isDeleted: false,
                    status: 'RECORDED',
                    previewThumbnailURL: 'https://fixture.test/thumb.svg',
                    createdAt: '2026-01-01T00:00:00Z',
                    viewCount: 100,
                    language: 'ru',
                    owner: {id: '900', login: 'not_followed', displayName: 'Не из подписок', profileImageURL: ''}
                }
            })),
            {history: {position: 7200, updatedAt: new Date().toISOString()}, node: {id: '200', title: 'Completed', lengthSeconds: 7200}},
            {history: {position: 0, updatedAt: new Date().toISOString()}, node: {id: '201', title: 'Not started', lengthSeconds: 7200}},
            {
                history: {position: 150, updatedAt: new Date().toISOString()},
                node: {id: '202', title: 'Deleted', lengthSeconds: 7200, isDeleted: true}
            },
            {history: {position: 7190, updatedAt: new Date().toISOString()}, node: {id: '203', title: 'Almost complete', lengthSeconds: 7200}},
            {history: {position: 100, updatedAt: '2025-01-01T00:00:00Z'}, node: {id: '104', title: 'Duplicate', lengthSeconds: 7200}}
        ];
    }
    page.on('pageerror', e => {
        errors.push(String(e));
        console.error(e.stack);
    });
    await page.route('**/*', async r => {
        const url = r.request().url();
        if (url.startsWith('http://127.0.0.1:8765/')) return r.continue();
        if (r.request().resourceType() === 'script') return r.fulfill({body: '', contentType: 'text/javascript'});
        if (url.includes('fixture.test'))
            return r.fulfill({
                contentType: 'image/svg+xml',
                body: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#35353b"/><circle cx="320" cy="180" r="75" fill="#9146ff"/></svg>'
            });
        let body;
        try {
            body = JSON.parse(r.request().postData());
        } catch {}
        if (body && body.operationName === 'ClassicContinueWatching') {
            historyRequests++;
            requestedWindows.push(body.variables.first);
            assert.ok(body.query.includes('excludeHiddenChannels:$excludeHidden'));
            let edges = account === '123' ? history() : [];
            if (mode === 'cap' && body.variables.first === 1000)
                return r.fulfill({contentType: 'application/json', body: JSON.stringify({errors: [{message: 'Limit exceeds maximum'}]})});
            if (mode === 'cap' && body.variables.first === 20) edges = [];
            if (mode === 'official-empty' && body.variables.first === 20) edges = [];
            if (mode === 'broad')
                edges =
                    body.variables.first === 20
                        ? []
                        : [
                              ...history(),
                              {
                                  history: {position: 500, updatedAt: '2026-11-16T10:00:00Z'},
                                  node: {id: '901', title: 'Live archive pending duration', lengthSeconds: null}
                              },
                              {
                                  history: {position: 601, updatedAt: '2026-11-16T09:00:00Z'},
                                  node: {id: '902', title: 'Broadcast still recording', lengthSeconds: 600, status: 'RECORDING'}
                              },
                              {
                                  node: {
                                      id: '903',
                                      title: 'Self history fallback',
                                      lengthSeconds: 1000,
                                      self: {viewingHistory: {position: 400, updatedAt: '2026-11-16T08:00:00Z'}}
                                  }
                              }
                          ];
            if (mode === 'partial')
                return r.fulfill({
                    contentType: 'application/json',
                    body: JSON.stringify({
                        data: {currentUser: {id: account, viewedVideos: {edges}}},
                        errors: [{message: 'Optional field unavailable'}]
                    })
                });
            if (mode === 'wrong')
                return r.fulfill({
                    contentType: 'application/json',
                    body: JSON.stringify({data: {currentUser: {id: 'intruder', viewedVideos: {edges: history()}}}})
                });
            if (mode === 'empty') edges = [];
            if (mode === 'error') return r.fulfill({status: 503, body: 'Unavailable'});
            return r.fulfill({
                contentType: 'application/json',
                body: JSON.stringify({data: {currentUser: {id: account, viewedVideos: {edges}}}})
            });
        }
        if (body && body.operationName === 'ClassicVodSyncRead') {
            readRequests++;
            return r.fulfill({
                contentType: 'application/json',
                body: JSON.stringify({
                    data: {
                        video: {id: body.variables.id, self: {viewingHistory: {position: 700, updatedAt: '2026-01-01T00:00:00Z'}}},
                        currentUser: {
                            id: account,
                            viewedVideos: {
                                edges: [{node: {id: body.variables.id}, history: {position: phonePosition, updatedAt: new Date().toISOString()}}]
                            }
                        }
                    }
                })
            });
        }
        if (body && String(body.query).includes('ChannelFollows'))
            return r.fulfill({
                contentType: 'application/json',
                body: JSON.stringify({
                    data: {
                        currentUser: {
                            follows: {
                                pageInfo: {hasNextPage: false},
                                edges: [
                                    {
                                        node: {
                                            id: '500',
                                            login: 'offline',
                                            displayName: 'Офлайн',
                                            profileImageURL: 'https://fixture.test/avatar.svg',
                                            stream: null
                                        }
                                    }
                                ]
                            }
                        }
                    }
                })
            });
        if (url.includes('streams/followed')) {
            await liveBarrier;
            return r.fulfill({
                contentType: 'application/json',
                body: JSON.stringify({
                    data: [
                        {
                            id: '300',
                            user_id: '400',
                            user_login: 'live',
                            user_name: 'Live',
                            title: 'Эфир',
                            game_name: 'Game',
                            viewer_count: 10,
                            thumbnail_url: 'https://fixture.test/live.svg',
                            started_at: '2026-01-01T00:00:00Z',
                            language: 'ru',
                            type: 'live'
                        }
                    ],
                    pagination: {}
                })
            });
        }
        return r.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({data: [], pagination: {}, access_token: 'fixture', expires_in: 3600})
        });
    });
    try {
        await page.goto('http://127.0.0.1:8765/app/index.html?asset-test=1');
        await page.waitForFunction(() => typeof ClassicContinue === 'object' && ClassicShell_navItems.length === 6);
        await page.keyboard.press('Escape');
        delayLive();
        await page.evaluate(edges => {
            window.raceOpens = [];
            window.raceFocus = [];
            window.originalRaceVod = Main_OpenVodStart;
            window.originalRaceLive = Main_OpenLiveStream;
            Main_OpenVodStart = (data, cell) => raceOpens.push(cell);
            Main_OpenLiveStream = () => raceOpens.push('live');
            document.addEventListener('focusin', event => {
                if (event.target.dataset.focusKey) raceFocus.push(event.target.dataset.focusKey);
            });
            localStorage.setItem('classic_continue_cache_123', JSON.stringify({edges}));
            Main_HideWelcomeDialog();
            Main_HideWarningDialog();
            Main_HideAboutDialog();
            Main_ExitCurrent(Main_values.Main_Go);
            ru_RULang();
            Settings_AppLang = 'ru_RU';
            Main_SetStringsMain();
            AddUser_UsernameArray = [{id: '123', name: 'viewer', access_token: 'fixture-private-token'}];
            Main_values_History_data['123'] = {
                live: [],
                vod: [],
                clip: [],
                test: [],
                blocked: {live: {}, vod: {}, clip: {}, game: {}},
                deleted: {live: {}, vod: {}, clip: {}}
            };
            FollowingClassic_init();
        }, history());
        await page.waitForFunction(
            () => ClassicContinue.items.length === 7 && !ClassicContinue.loading && FollowingClassic.channelsDone && !FollowingClassic.liveDone
        );
        assert.equal(await page.evaluate(() => FollowingClassic.focusKey), 'live:loading');
        assert.equal(await page.evaluate(() => document.activeElement.dataset.focusKey), 'live:loading');
        assert.equal(await page.evaluate(() => raceFocus.some(key => key.startsWith('continue:'))), false,
            'cached and fresh history must not take initial focus while live streams are pending');
        await page.keyboard.down('Enter');
        releaseLive();
        await page.waitForFunction(() => FollowingClassic.liveDone);
        await page.evaluate(() => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Enter', keyCode: KEY_ENTER, bubbles: true, repeat: true
        })));
        await page.keyboard.up('Enter');
        assert.equal(await page.evaluate(() => FollowingClassic.focusKey), 'live:400');
        assert.deepEqual(await page.evaluate(() => raceOpens), [], 'OK on loading must not activate a newly arrived card');
        // An intentional selection below the loading row wins over the late live response.
        delayLive();
        await page.evaluate(() => {
            FollowingClassic.focusKey = null;
            FollowingClassic_reload();
        });
        await page.waitForFunction(() => !ClassicContinue.loading && FollowingClassic.channelsDone && !FollowingClassic.liveDone);
        await page.keyboard.press('ArrowDown');
        assert.equal(await page.evaluate(() => FollowingClassic.focusKey), 'continue:100');
        await page.keyboard.down('Enter');
        releaseLive();
        await page.waitForFunction(() => FollowingClassic.liveDone);
        await page.keyboard.up('Enter');
        assert.equal(await page.evaluate(() => FollowingClassic.focusKey), 'continue:100');
        assert.deepEqual(await page.evaluate(() => raceOpens), ['continue_100'], 'OK retains its target through a render');
        await page.keyboard.down('Enter');
        await page.keyboard.press('ArrowRight');
        await page.keyboard.up('Enter');
        assert.deepEqual(await page.evaluate(() => raceOpens), ['continue_100'], 'moving selection cancels the held OK target');
        await page.evaluate(() => {
            Main_OpenVodStart = originalRaceVod;
            Main_OpenLiveStream = originalRaceLive;
            ClassicVodSync.nextContinue = null;
            FollowingClassic.cursor = FollowingClassic.rows.findIndex(row => row.section === 'live');
            FollowingClassic_focus(true);
        });
        assert.equal(await page.locator('.classic-continue-card').count(), 5);
        assert.deepEqual(await page.locator('#classic_following_page h2').allTextContents(), ['В эфире', 'Продолжить просмотр', 'Не в эфире']);
        assert.equal(await page.locator('.classic-continue-card').first().locator('.following-stream-channel').innerText(), 'Не из подписок');
        assert.equal(
            await page.locator('.classic-continue-card').first().locator('.following-stream-title').innerText(),
            'Длинное название записи <текст>'
        );
        assert.ok(!(await page.locator('.classic-continue-section').innerText()).includes('Completed'));
        const boxes = await page.locator('.classic-continue-card').evaluateAll(nodes => nodes.map(el => el.getBoundingClientRect().toJSON()));
        for (let i = 1; i < boxes.length; i++) assert.ok(boxes[i].left >= boxes[i - 1].right && Math.abs(boxes[i].top - boxes[0].top) < 1);
        assert.ok(boxes[4].right <= 1920);
        assert.ok((await page.locator('.classic-continue-card').first().locator('.following-stream-meta').innerText()).includes('Осталось'));
        await page.evaluate(() => {
            FollowingClassic.cursor = FollowingClassic.rows.findIndex(r => r.section === 'continue');
            FollowingClassic_focus(true);
        });
        await page.screenshot({path: 'tests/continue-classic.png'});
        await page.keyboard.press('ArrowRight');
        assert.equal(await page.evaluate(() => FollowingClassic.focusKey), 'continue:101');
        await page.keyboard.press('ArrowDown');
        assert.equal(await page.evaluate(() => FollowingClassic.focusKey), 'continue:history');
        await page.keyboard.press('ArrowUp');
        assert.ok((await page.evaluate(() => FollowingClassic.focusKey)).startsWith('continue:'));
        // Long OK is context for continuation cards; the normal live-card refresh is unchanged.
        await page.keyboard.down('Enter');
        await page.waitForFunction(() => !!ClassicContinue.menu);
        await page.keyboard.up('Enter');
        assert.equal(await page.locator('.classic-continue-menu button').count(), 3);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('.classic-continue-menu').count(), 0);
        const hiddenId = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('classic_continue_hidden_123')))[0]);
        assert.equal(await page.locator('.classic-continue-card').count(), 5, 'next unfinished video fills the fifth slot');
        assert.ok(!(await page.evaluate(() => ClassicContinue.items.map(i => i.id))).includes(hiddenId));
        await page.evaluate(() => {
            ClassicContinue_load(true);
        });
        await page.waitForFunction(() => !ClassicContinue.loading);
        assert.ok(!(await page.evaluate(() => ClassicContinue.items.map(i => i.id))).includes(hiddenId), 'hiding survives refresh');
        assert.deepEqual(requestedWindows.slice(0, 2), [20, 1000]);
        assert.equal(
            await page.evaluate(() => Main_values_History_data['123'].vod.some(r => r.id === '200' && r.watched === 7200)),
            true,
            'completed videos imported to full history'
        );
        assert.equal(await page.evaluate(() => Main_values_History_data['123'].vod.length), 10);
        // Official window empty, but the expanded account request still populates the shelf.
        mode = 'official-empty';
        await page.evaluate(() => ClassicContinue_load(true));
        await page.waitForFunction(() => !ClassicContinue.loading);
        assert.equal(await page.locator('.classic-continue-card').count(), 5);
        assert.equal(await page.evaluate(() => ClassicContinue.error), false);
        mode = 'cap';
        await page.evaluate(() => ClassicContinue_load(true));
        await page.waitForFunction(() => !ClassicContinue.loading);
        assert.equal(await page.evaluate(() => ClassicContinue.error), false, 'rejected large window falls back to 100');
        assert.equal(await page.locator('.classic-continue-card').count(), 5);
        assert.ok(requestedWindows.includes(100));
        mode = 'broad';
        await page.evaluate(() => ClassicContinue_load(true));
        await page.waitForFunction(() => !ClassicContinue.loading);
        assert.ok((await page.evaluate(() => ClassicContinue.items.map(i => i.id))).includes('901'));
        assert.ok((await page.evaluate(() => ClassicContinue.items.map(i => i.id))).includes('902'));
        assert.ok((await page.evaluate(() => ClassicContinue.items.map(i => i.id))).includes('903'));
        assert.ok((await page.locator('.classic-continue-card').first().innerText()).includes('Просмотрено'));
        assert.equal(await page.locator('.classic-continue-progress span[style*="NaN"]').count(), 0);
        assert.equal(await page.evaluate(() => Main_values_History_data['123'].vod.find(r => r.id === '903').watched), 400);
        // The history action opens the existing complete VOD grid, with both completed and unfinished rows.
        await page.evaluate(() => ClassicContinue_history());
        await page.waitForFunction(() => Main_values.Main_Go === Main_HistoryVod && ScreenObj[Main_HistoryVod].status);
        assert.ok((await page.locator('#stream_table_historyvod').innerText()).includes('Completed'));
        assert.ok((await page.locator('#stream_table_historyvod').innerText()).includes('Live archive pending duration'));
        await page.evaluate(() => ClassicShell_goScreen(Main_UserLive));
        await page.waitForFunction(() => FollowingClassic.active && !ClassicContinue.loading);
        mode = 'partial';
        await page.evaluate(() => ClassicContinue_load(true));
        await page.waitForFunction(() => !ClassicContinue.loading);
        assert.equal(await page.evaluate(() => ClassicContinue.error), false, 'valid history survives unrelated GraphQL errors');
        mode = 'ok';
        // Capture the real opener after it maps server metadata to the existing VOD fields.
        await page.evaluate(() => {
            window.openedContinue = null;
            Settings_value.vod_dialog.defaultValue = 2; // Continue is explicit user intent, even if ordinary VODs start over.
            Main_openVod = function () {
                ClassicVodSync_open(function () {
                    openedContinue = {
                        id: Main_values.ChannelVod_vodId,
                        position: ClassicVodSync_position(0),
                        explicit: Main_vodOffset,
                        title: ChannelVod_title
                    };
                });
            };
            FollowingClassic.cursor = FollowingClassic.rows.findIndex(r => r.section === 'continue');
            FollowingClassic_focus(true);
        });
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => !!openedContinue);
        assert.equal(await page.evaluate(() => openedContinue.position), phonePosition, 'new phone position wins over the displayed shelf position');
        assert.equal(await page.evaluate(() => openedContinue.explicit), 0);
        assert.ok(readRequests > 0);
        // A failure in account history preserves live/offline channels and offers account-local cached data.
        mode = 'error';
        await page.evaluate(() => {
            ClassicVodSync_stop(false);
            ClassicContinue_load(true);
        });
        await page.waitForFunction(() => ClassicContinue.error && !ClassicContinue.loading);
        assert.equal(await page.locator('.following-stream-card:not(.classic-continue-card)').count(), 1);
        assert.equal(await page.locator('.following-channel-card').count(), 1);
        assert.equal(await page.locator('.classic-continue-card').count(), 5);
        assert.ok((await page.locator('.classic-continue-section').innerText()).includes('последние данные'));
        // Another signed-in account must not see the previous viewer's cached shelf or hiding list.
        account = '999';
        mode = 'ok';
        await page.evaluate(() => {
            AddUser_UsernameArray = [{id: '999', name: 'other', access_token: 'other-private-token'}];
            FollowingClassic_reload();
        });
        await page.waitForFunction(() => ClassicContinue.account === '999' && !ClassicContinue.loading);
        assert.equal(await page.locator('.classic-continue-section').count(), 1, 'empty account never silently hides the shelf');
        assert.ok((await page.locator('.classic-continue-section').innerText()).includes('Twitch не вернул'));
        assert.equal(await page.locator('.classic-continue-card').count(), 0);
        assert.equal(
            await page.evaluate(() => JSON.parse(localStorage.getItem('classic_continue_status_999')).text.includes('незаконченных 0')),
            true
        );
        mode = 'wrong';
        await page.evaluate(() => ClassicContinue_load(true));
        await page.waitForFunction(() => !ClassicContinue.loading);
        assert.equal(await page.evaluate(() => ClassicContinue.error), true);
        assert.equal(await page.locator('.classic-continue-card').count(), 0, 'wrong account responses never leak history');
        // Late automatic-preview replies are also ignored after disabling the VOD option.
        await page.evaluate(() => {
            Settings_value.show_vod_player.defaultValue = 0;
            const before = Play_PreviewId;
            Screens_LoadPreviewResult(JSON.stringify({status: 200}), Main_ChannelVod, 0);
            UserLiveFeed_CheckIfIsLiveResult(JSON.stringify({status: 200}), UserLiveFeedobj_UserVodPos, 0);
            if (Play_PreviewId !== before) throw Error('A late reply started a disabled VOD preview');
        });
        // VOD previews default off, but live previews keep their independent preference.
        const preview = await page.evaluate(() => {
            Play_HideBufferDialog(); // The stubbed VOD opener above intentionally never finishes playback startup.
            const calls = [];
            window.Android = new Proxy(
                {},
                {
                    get:
                        (_, name) =>
                        (...args) => {
                            calls.push({name, args});
                            return '';
                        }
                }
            );
            Main_IsOn_OSInterface = true;
            if (Settings_value.show_vod_player.defaultValue !== 0) throw Error('VOD previews must default off');
            Settings_value.show_live_player.defaultValue = 1;
            ScreenObj[Main_UserLive].SetPreviewEnable();
            ScreenObj[Main_ChannelVod].SetPreviewEnable();
            const off = ScreenObj[Main_ChannelVod].PreviewEnable,
                live = ScreenObj[Main_UserLive].PreviewEnable;
            const screen = ScreenObj[Main_ChannelVod];
            screen.posY = 0;
            screen.posX = 0;
            const img = document.createElement('img');
            img.id = screen.ids[1] + '0_0';
            img.style.cssText = 'width:320px;height:180px';
            document.body.appendChild(img);
            ChatLive_Playing = false;
            Settings_value.show_vod_player.defaultValue = 1;
            screen.SetPreviewEnable();
            Screens_LoadPreviewRestore(Main_ChannelVod);
            const vodPaused = !calls.some(c => c.name === 'PlayPause');
            const oldY = ScreenObj[Main_UserLive].posY,
                oldX = ScreenObj[Main_UserLive].posX;
            ScreenObj[Main_UserLive].posY = 0;
            ScreenObj[Main_UserLive].posX = 0;
            Screens_LoadPreviewRestore(Main_UserLive);
            ScreenObj[Main_UserLive].posY = oldY;
            ScreenObj[Main_UserLive].posX = oldX;
            img.remove();
            Main_IsOn_OSInterface = false;
            return {
                off,
                live,
                vodPaused,
                liveStarted: calls.some(c => c.name === 'PlayPause' && c.args[0] === true),
                blocked: ClassicPreview_blocked(),
                nav: ClassicShell_navActive,
                scene: Main_isScene1DocVisible(),
                dialogs: [...document.querySelectorAll('[role=dialog],[id*=dialog]')].filter(n => n.getClientRects().length).map(n => n.id)
            };
        });
        assert.equal(!!preview.off, false);
        assert.equal(!!preview.live, true);
        assert.equal(preview.vodPaused, true);
        assert.equal(preview.liveStarted, true, JSON.stringify(preview));
        assert.ok(historyRequests >= 4);
        assert.deepEqual(errors, []);
        console.log(
            'PASS: official/expanded/fallback account history, completed-history import, unknown-duration and recording archives, self-history and partial data, visible empty state, five-card continuation, fresh resume, remote/context navigation, cache/account isolation, paused VOD and live autoplay'
        );
    } finally {
        await browser.close();
    }
})().catch(e => {
    console.error(e);
    process.exitCode = 1;
});
