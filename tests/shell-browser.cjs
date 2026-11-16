const {chromium} = require('playwright-core'),
    assert = require('assert/strict');
const {PNG} = require('pngjs');
// Inspect the real Android foreground, including every antialiased edge pixel.
// Android launchers may crop it to a circle, squircle, rounded square or teardrop.
const fs = require('fs'),
    path = require('path');
const brandingRoot = path.join(__dirname, '../apk/app/src/main/res/drawable-nodpi');
const foreground = PNG.sync.read(fs.readFileSync(path.join(brandingRoot, 'classic_foreground.png')));
assert.equal(foreground.width, 1080);
assert.equal(foreground.height, 1080);
let ink = 0;
for (let y = 0; y < foreground.height; y++)
    for (let x = 0; x < foreground.width; x++) {
        if (foreground.data[(y * foreground.width + x) * 4 + 3]) {
            ink++;
            assert.ok(Math.hypot(x + 0.5 - 540, y + 0.5 - 540) <= 330, 'whole Glitch fits adaptive safe circle');
        }
    }
assert.ok(ink > 20000, 'foreground contains the actual symbol');
for (const name of ['classic_icon', 'classic_banner', 'classic_background']) {
    const png = PNG.sync.read(fs.readFileSync(path.join(brandingRoot, name + '.png')));
    assert.deepEqual(Array.from(png.data.slice(0, 4)), [145, 70, 255, 255], 'official Twitch purple background');
    if (name === 'classic_icon') assert.equal(png.width, png.height, 'settings icon is square');
}
(async () => {
    const browser = await chromium.launch({
        executablePath:
            process.env.CHROMIUM_PATH || (require('fs').existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : chromium.executablePath()),
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage({viewport: {width: 1920, height: 1080}, locale: 'ru-RU'}),
        errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.route('**/*', r => {
        const u = new URL(r.request().url());
        if (u.origin === 'http://127.0.0.1:8765') return r.continue();
        if (r.request().resourceType() === 'script') return r.fulfill({body: '', contentType: 'text/javascript'});
        if (u.hostname === 'fixture.test')
            return r.fulfill({
                contentType: 'image/svg+xml',
                body:
                    '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><defs><linearGradient id="g"><stop stop-color="#293464"/><stop offset="1" stop-color="#702e80"/></linearGradient></defs><rect width="1280" height="720" fill="url(#g)"/><circle cx="930" cy="240" r="130" fill="#d58097"/><path d="M0 660L440 170L800 720M450 720L1000 330L1280 600" fill="#242439"/><text x="55" y="90" font-family="Arial" font-size="40" fill="white">TEST STREAM ' +
                    u.pathname +
                    '</text></svg>'
            });
        return r.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({data: [], pagination: {}, access_token: 'fixture', expires_in: 3600})
        });
    });
    try {
        await page.goto('http://127.0.0.1:8765/app/index.html');
        await page.waitForFunction(() => typeof ScreenObj !== 'undefined' && ScreenObj[1] && ScreenObj[1].tableDoc);
        await page.keyboard.press('Escape');
        await page.evaluate(() => {
            Main_HideWelcomeDialog();
            Main_HideWarningDialog();
            Main_HideAboutDialog();
            ru_RULang();
            Settings_AppLang = 'ru_RU';
            Main_SetStringsMain();
            Main_values.Main_Go = Main_Live;
            ScreensObj_SetTopLable(STR_LIVE);
            var s = ScreenObj[Main_Live];
            s.tableDoc.replaceChildren();
            s.DataObj = {};
            s.Cells = [];
            s.idObject = {};
            s.tempHtml = [];
            s.row_id = 0;
            s.column_id = 0;
            s.data_cursor = 0;
            s.itemsCount = 0;
            s.posX = 0;
            s.posY = 0;
            s.offsettop = 0;
            s.currY = 0;
            s.emptyContent = false;
            s.status = false;
            s.BannerCreated = true;
            s.TopRowCreated = true;
            s.dataEnded = true;
            s.isQuery = false;
            s.useHelix = true;
            s.FirstRunEnd = false;
            const names = ['Northlight', 'PixelGarden', 'MiraLive', 'Orbit', 'Arcadia', 'EveningTalk', 'NeonCrew', 'Luma'];
            s.data = names.map((name, i) => ({
                id: String(100 + i),
                user_id: String(200 + i),
                user_login: name.toLowerCase(),
                user_name: name,
                title: ['Исследуем новый мир', 'Рейтинговые матчи с друзьями', 'Вечерний эфир · общаемся', 'Проходим сюжет без спойлеров'][i % 4],
                game_name: ['Minecraft', 'VALORANT', 'Just Chatting', 'Cyberpunk 2077'][i % 4],
                game_id: String(300 + i),
                viewer_count: 1500 + i * 438,
                thumbnail_url: 'https://fixture.test/' + i,
                started_at: '2026-11-14T15:00:00Z',
                language: 'ru',
                type: 'live',
                is_mature: false
            }));
            Screens_loadDataSuccess(Main_Live);
            Main_ShowElementWithEle(s.ScrollDoc);
            Main_HideLoadDialog();
            Main_HideWarningDialog();
            Main_addEventListener('keydown', s.key_fun);
        });
        await page.waitForTimeout(350);
        assert.equal(await page.locator('#classic_nav button').count(), 6);
        const logo = page.locator('.classic-brand img');
        await logo.evaluate(img => img.decode());
        assert.equal(await logo.getAttribute('src'), 'branding/twitch-wordmark.svg');
        assert.equal(await logo.getAttribute('alt'), 'Twitch');
        assert.equal(await page.locator('.classic-brand span').count(), 0);
        assert.deepEqual(await page.evaluate(() => [1, 2, 5, 11, 14, 21, 22, 25, 101, 112].map(Main_GetViewerStrings)), [
            'зритель',
            'зрителя',
            'зрителей',
            'зрителей',
            'зрителей',
            'зритель',
            'зрителя',
            'зрителей',
            'зритель',
            'зрителей'
        ]);
        assert.equal(await page.evaluate(() => Main_formatNumber(12345678)), '12\u00a0345\u00a0678');
        assert.equal(await page.evaluate(() => Main_GetViewsStrings(22)), ' просмотра');
        assert.equal(await page.locator('#side_panel_new_holder').isVisible(), false);
        assert.equal(await page.evaluate(() => ScreenObj[Main_Live].ColumnsCount), 4);
        await page.screenshot({path: 'tests/home-classic.png'});
        const selectedThumb = page.locator('#screens_holder .stream_thumbnail_focused .stream_thumbnail_live_img').first();
        const thumb = PNG.sync.read(await selectedThumb.screenshot());
        for (const [x, y] of [
            [Math.floor(thumb.width / 2), 1],
            [Math.floor(thumb.width / 2), thumb.height - 2],
            [1, Math.floor(thumb.height / 2)],
            [thumb.width - 2, Math.floor(thumb.height / 2)]
        ]) {
            const at = (y * thumb.width + x) * 4;
            assert.deepEqual(Array.from(thumb.data.slice(at, at + 3)), [145, 70, 255]);
        }

        const table = await page.evaluate(() => ScreenObj[Main_Live].table);
        const cards = await page.locator('#' + table + ' .stream_thumbnail_live_holder').count();
        assert.equal(cards, 8);
        const rects = await page.evaluate(() => {
            var s = ScreenObj[Main_Live];
            return [
                document
                    .getElementById(s.ids[3] + '0_0')
                    .getBoundingClientRect()
                    .toJSON(),
                document
                    .getElementById(s.ids[3] + '1_0')
                    .getBoundingClientRect()
                    .toJSON()
            ];
        });
        assert.ok(rects[1].y >= rects[0].bottom - 2, JSON.stringify(rects));
        assert.equal(
            await page.evaluate(() => {
                const s = ScreenObj[Main_Live];
                const html = Screens_createCellLive(
                    'badge_fixture',
                    s.ids,
                    s.DataObj['0_0'].slice(),
                    Main_Live,
                    null,
                    'https://fixture.test/vod',
                    true
                );
                delete s.DataObj.badge_fixture;
                return html.includes('classic-live-card');
            }),
            false
        );
        // Real key events, using the app's registered native screen handler.
        await page.keyboard.press('ArrowUp');
        assert.equal(await page.evaluate(() => ClassicShell_navActive), true);
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowRight');
        assert.equal(await page.evaluate(() => ClassicShell_navIndex), 4);
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('#classic_preferences').count(), 1);
        assert.equal(await page.locator('#classic_preferences_rows button').count(), 8);
        assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById('settings_scroll')).visibility), 'hidden');
        await page.screenshot({path: 'tests/settings-classic.png'});
        await page.keyboard.press('ArrowUp');
        assert.equal(await page.evaluate(() => ClassicShell_navActive), true);
        await page.keyboard.press('ArrowDown');
        assert.equal(await page.evaluate(() => ClassicShell_navActive), false);
        assert.equal(
            await page.evaluate(() => document.activeElement === document.querySelectorAll('#classic_preferences_rows button')[ClassicShell_cursor]),
            true
        );

        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('#classic_preferences h1').textContent(), 'Видео и воспроизведение');
        await page.keyboard.press('Enter');
        assert.ok((await page.locator('#classic_preferences h1').textContent()).toLowerCase().includes('качество'));
        const qualityBefore = await page.evaluate(() => Settings_value.default_quality.defaultValue);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        assert.equal(
            await page.evaluate(() => Settings_value.default_quality.defaultValue),
            Math.min(qualityBefore + 1, await page.evaluate(() => Settings_value.default_quality.values.length - 1))
        );
        assert.equal(
            await page.evaluate(() => Number(localStorage.getItem('default_quality'))),
            await page.evaluate(() => Settings_value.default_quality.defaultValue + 1)
        );
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#classic_preferences_rows button').count(), 8);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('#classic_preferences_rows button').count(), 5);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        await page.locator('#dialog_settings').waitFor({state: 'visible'});
        assert.ok(await page.locator('#chat_line_animation_div').isVisible());
        await page.screenshot({path: 'tests/chat-settings-classic.png'});

        await page.keyboard.press('ArrowUp');
        assert.equal(await page.evaluate(() => ClassicShell_navActive), true);
        await page.keyboard.press('ArrowDown');
        assert.equal(await page.evaluate(() => document.activeElement.id === Settings_DialogValue[0] + '_div'), true);
        const first = await page.evaluate(() => Settings_DialogValue[0]);
        const before = await page.evaluate(key => Settings_value[key].defaultValue, first);
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('#classic_value_popup').count(), 1);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        assert.equal(
            await page.evaluate(key => Settings_value[key].defaultValue, first),
            Math.min(before + 1, await page.evaluate(key => Settings_value[key].values.length - 1, first))
        );
        assert.equal(await page.locator('#classic_value_popup').count(), 0);
        // Every chat row stays reachable and scrolls into view.
        const count = await page.evaluate(() => Settings_DialogValue.length);
        for (let i = 1; i < count; i++) await page.keyboard.press('ArrowDown');
        const bounds = await page.evaluate(() => {
            const e = document.getElementById(Settings_DialogValue[Settings_DialogPos] + '_div'),
                r = e.getBoundingClientRect();
            return {y: r.y, bottom: r.bottom, height: innerHeight};
        });
        assert.ok(bounds.y >= 0 && bounds.bottom <= bounds.height, JSON.stringify(bounds));
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#dialog_settings').isVisible(), false);
        assert.equal(
            await page.evaluate(() => document.activeElement === document.querySelectorAll('#classic_preferences_rows button')[ClassicShell_cursor]),
            true
        );
        assert.ok((await page.locator('#classic_preferences_rows .is-focused').innerText()).includes('Оформление чата'));

        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#classic_preferences_rows button').count(), 8);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#classic_preferences').count(), 0);
        // Enter activates one stream; no long-press refresh or key-up double action.
        await page.waitForTimeout(100);
        await page.evaluate(() => {
            window.opened = 0;
            ScreenObj[Main_Live].OpenLiveStream = () => opened++;
        });
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => opened), 1);

        // Back from a root grid reaches the header, then opens the real exit dialog.
        await page.keyboard.press('Escape');
        assert.equal(await page.evaluate(() => ClassicShell_navActive), true);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#main_dialog_exit').isVisible(), true);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#main_dialog_exit').isVisible(), false);

        // Account must allow reaching the header and returning without restarting authorization.
        await page.route('https://id.twitch.tv/oauth2/device?**', r =>
            r.fulfill({
                contentType: 'application/json',
                body: JSON.stringify({
                    device_code: 'fixture-device',
                    user_code: 'ABCD1234',
                    verification_uri: 'https://www.twitch.tv/activate?device-code=ABCD1234',
                    interval: 30,
                    expires_in: 1800
                })
            })
        );
        await page.evaluate(() => {
            ClassicShell_navIndex = 5;
            ClassicShell_focusNav();
        });
        await page.keyboard.press('Enter');
        await page.locator('.qr-login-code svg').waitFor();
        const codeRequest = await page.evaluate(() => AddUser_CodeRequest);
        await page.keyboard.press('ArrowUp');
        assert.equal(await page.evaluate(() => ClassicShell_navActive), true);
        await page.keyboard.press('ArrowDown');
        assert.equal(await page.evaluate(() => AddUser_CodeRequest), codeRequest);
        await page.keyboard.press('ArrowUp');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('#classic_preferences').count(), 1);
        assert.equal(await page.evaluate(() => AddUser_RequestPending), false);
        await page.keyboard.press('Escape');
        await page.evaluate(() => Main_showExitDialog());
        await page.screenshot({path: 'tests/exit-classic.png'});
        assert.match(await page.locator('#main_dialog_exit_text').innerText(), /Twitch Classic/);
        assert.equal(
            await page.evaluate(() => getComputedStyle(document.querySelector('#main_dialog_exit>.dialog_exit')).borderRadius !== '0px'),
            true
        );
        await page.keyboard.press('Escape');
        // Following is one page: a live section above offline channels, with no selector.
        let livePages = 0,
            channelPages = 0;
        await page.route('https://api.twitch.tv/helix/streams/followed?**', r => {
            livePages++;
            if (new URL(r.request().url()).searchParams.has('after'))
                return r.fulfill({contentType: 'application/json', body: JSON.stringify({data: [], pagination: {}})});
            return r.fulfill({
                contentType: 'application/json',
                body: JSON.stringify({
                    data: [
                        {
                            id: 'live1',
                            user_id: 'live1',
                            user_login: 'live_channel',
                            user_name: 'LiveChannel',
                            title: 'В эфире',
                            game_name: 'Just Chatting',
                            viewer_count: 12345678,
                            thumbnail_url: 'https://fixture.test/live',
                            started_at: '2026-11-14T15:00:00Z',
                            language: 'ru',
                            type: 'live',
                            game_id: 'game'
                        }
                    ],
                    pagination: {cursor: 'next-streams'}
                })
            });
        });
        await page.route('https://gql.twitch.tv/gql', r => {
            const query = r.request().postData() || '';
            if (query.includes('ClassicContinueWatching'))
                return r.fulfill({
                    contentType: 'application/json',
                    body: JSON.stringify({data: {currentUser: {id: 'viewer1', viewedVideos: {edges: []}}}})
                });
            if (query.includes('ChannelFollows')) {
                channelPages++;
                if (channelPages % 2 === 0) {
                    assert.ok(JSON.parse(query).query.includes(JSON.stringify('last\"cursor')));
                    return r.fulfill({
                        contentType: 'application/json',
                        body: JSON.stringify({data: {currentUser: {follows: {pageInfo: {hasNextPage: false}, edges: []}}}})
                    });
                }
                return r.fulfill({
                    contentType: 'application/json',
                    body: JSON.stringify({
                        data: {
                            currentUser: {
                                follows: {
                                    pageInfo: {hasNextPage: true},
                                    edges: [
                                        {
                                            cursor: 'last\"cursor',
                                            node: {
                                                id: 'offline1',
                                                login: 'offline_channel',
                                                displayName: 'OfflineChannel',
                                                profileImageURL: 'https://fixture.test/avatar',
                                                roles: {isPartner: false},
                                                stream: null
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    })
                });
            }
            if (query.includes('videos(') || query.includes('clips(')) {
                const clip = query.includes('clips('),
                    kind = clip ? 'clips' : 'videos';
                return r.fulfill({
                    contentType: 'application/json',
                    body: JSON.stringify({
                        data: {
                            user: {
                                [kind]: {
                                    pageInfo: {hasNextPage: false},
                                    edges: Array.from({length: 8}, (_, i) => ({
                                        cursor: 'item' + i,
                                        node: {
                                            id: 'item' + i,
                                            title: 'Запись ' + i,
                                            slug: 'clip' + i,
                                            duration: '1h0m0s',
                                            durationSeconds: 30,
                                            viewCount: 1234567,
                                            language: 'ru',
                                            game: {id: 'game', displayName: 'Just Chatting'},
                                            createdAt: '2026-11-14T15:00:00Z',
                                            thumbnailURLs: ['https://fixture.test/vod' + i],
                                            thumbnailURL: 'https://fixture.test/clip' + i,
                                            creator: {id: 'offline1', login: 'offline_channel', displayName: 'OfflineChannel'},
                                            broadcaster: {id: 'offline1', login: 'offline_channel', displayName: 'OfflineChannel'},
                                            video: {id: 'vod' + i},
                                            videoOffsetSeconds: 0
                                        }
                                    }))
                                }
                            }
                        }
                    })
                });
            }
            if (query.includes('bannerImageURL'))
                return r.fulfill({
                    contentType: 'application/json',
                    body: JSON.stringify({data: {user: {bannerImageURL: 'https://fixture.test/banner', followers: {totalCount: 107644}}}})
                });
            return r.fulfill({contentType: 'application/json', body: JSON.stringify({data: []})});
        });
        await page.route('https://api.twitch.tv/helix/users?id=offline1', r =>
            r.fulfill({
                contentType: 'application/json',
                body: JSON.stringify({
                    data: [
                        {
                            id: 'offline1',
                            login: 'offline_channel',
                            display_name: 'OfflineChannel',
                            description: 'Описание офлайн-канала',
                            profile_image_url: 'https://fixture.test/avatar',
                            broadcaster_type: ''
                        }
                    ]
                })
            })
        );
        await page.evaluate(() => {
            AddUser_UsernameArray = [
                {id: 'viewer1', name: 'viewer', display_name: 'Viewer', access_token: 'fixture', logo: 'https://fixture.test/avatar'}
            ];
            ClassicShell_navIndex = 0;
            ClassicShell_focusNav();
        });
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => FollowingClassic.liveDone && FollowingClassic.channelsDone && !ClassicContinue.loading);
        assert.equal(await page.locator('#classic_following').count(), 0);
        assert.equal(await page.locator('.following-stream-card').count(), 1);
        assert.equal(await page.locator('.following-channel-card').count(), 1);
        assert.equal(livePages, 2);
        assert.equal(channelPages, 2);
        // Following is also a root page. Back must not cycle header <-> cards.
        for (const key of ['Escape', 'Backspace']) {
            await page.keyboard.press(key);
            assert.equal(await page.evaluate(() => ClassicShell_navActive), true);
            assert.equal(await page.locator('#main_dialog_exit').isVisible(), false);
            await page.keyboard.press(key);
            assert.equal(await page.locator('#main_dialog_exit').isVisible(), true);
            assert.match(await page.locator('#main_dialog_exit_text').innerText(), /Twitch Classic/);
            await page.keyboard.press(key);
            assert.equal(await page.locator('#main_dialog_exit').isVisible(), false);
            assert.equal(await page.evaluate(() => FollowingClassic.active && !ClassicShell_navActive), true);
            assert.equal(await page.locator('.following-stream-card').count(), 1);
        }
        const sections = await page.locator('#classic_following_page h2').allTextContents();
        assert.deepEqual(sections, ['Продолжить просмотр', 'В эфире', 'Не в эфире']);
        await page.screenshot({path: 'tests/following-classic.png'});
        await page.evaluate(() => {
            FollowingClassic.cursor = FollowingClassic.rows.findIndex(row => row.section === 'live');
            FollowingClassic_focus(true);
        });
        const playCount = await page.evaluate(() => window.openCalls || 0);
        await page.keyboard.down('Enter');
        await page.waitForFunction(
            () => FollowingClassic.holdLong && FollowingClassic.liveDone && FollowingClassic.channelsDone && !ClassicContinue.loading
        );
        await page.keyboard.up('Enter');
        assert.equal(livePages, 4);
        assert.equal(channelPages, 4);
        assert.equal(await page.evaluate(() => Play_isOn), false);
        assert.equal(await page.evaluate(() => FollowingClassic.active), true);
        assert.equal(await page.locator('.following-stream-card').count(), 1);
        assert.equal(await page.locator('.following-channel-card').count(), 1);

        await page.keyboard.press('ArrowUp');
        assert.equal(await page.evaluate(() => FollowingClassic.rows[FollowingClassic.cursor].key), 'continue:retry');
        await page.keyboard.press('ArrowUp');
        assert.equal(await page.evaluate(() => ClassicShell_navActive), true);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        assert.equal(await page.evaluate(() => FollowingClassic.rows[FollowingClassic.cursor].section), 'offline');
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => Main_values.Main_Go === Main_ChannelContent && ChannelContent_status);
        assert.equal(await page.locator('#stream_table_channel_content').isVisible(), false);
        assert.ok((await page.locator('#classic_channel_page').innerText()).includes('Канал сейчас не в эфире'));
        assert.deepEqual(await page.locator('#classic_channel_page .classic-channel-tab').allTextContents(), [
            'Главная',
            'Видео',
            'Клипы',
            'Отслеживать'
        ]);
        assert.equal(await page.locator('#classic_channel_page .classic-channel-tab.active').textContent(), 'Главная');
        const homeChrome = await page.evaluate(() => {
            const root = document.querySelector('#classic_channel_page .classic-channel-chrome'),
                selectors = [
                    '.classic-channel-header',
                    '.classic-channel-avatar',
                    '.classic-channel-identity h1',
                    '.classic-channel-identity p',
                    '.classic-channel-tabs'
                ];
            return selectors.map(s => {
                const r = root.querySelector(s).getBoundingClientRect();
                return {x: r.x, y: r.y, w: r.width, h: r.height};
            });
        });
        await page.screenshot({path: 'tests/channel-classic.png'});
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('Enter');
        await page.waitForFunction(
            () => Main_values.Main_Go === Main_ChannelVod && ScreenObj[Main_ChannelVod].itemsCount === 8 && ScreenObj[Main_ChannelVod].status
        );
        async function verifyChannelGrid(file) {
            const bounds = await page.evaluate(() => {
                const k = Main_values.Main_Go,
                    s = ScreenObj[k],
                    tab = document.getElementById('classic_channel_tabs').getBoundingClientRect(),
                    filter = s.tableDoc.querySelector('.classic-filter-tabs').getBoundingClientRect(),
                    card = s.tableDoc.querySelector('.classic-video-card').getBoundingClientRect();
                return {tabBottom: tab.bottom, filterTop: filter.top, filterBottom: filter.bottom, filterHeight: filter.height, cardTop: card.top};
            });
            const identity = await page.evaluate(() => {
                const root = document.getElementById('classic_channel_grid_chrome'),
                    selectors = [
                        '.classic-channel-header',
                        '.classic-channel-avatar',
                        '.classic-channel-identity h1',
                        '.classic-channel-identity p',
                        '.classic-channel-tabs'
                    ];
                return {
                    description: root.querySelector('.classic-channel-identity p').textContent,
                    boxes: selectors.map(s => {
                        const r = root.querySelector(s).getBoundingClientRect();
                        return {x: r.x, y: r.y, w: r.width, h: r.height};
                    })
                };
            });
            assert.equal(identity.description, 'Описание офлайн-канала');
            identity.boxes.forEach((r, i) =>
                Object.keys(r).forEach(k => assert.ok(Math.abs(r[k] - homeChrome[i][k]) < 1, JSON.stringify({r, home: homeChrome[i]})))
            );
            assert.ok(bounds.filterHeight > 40, JSON.stringify(bounds));
            assert.ok(bounds.filterTop >= bounds.tabBottom - 1, JSON.stringify(bounds));
            assert.ok(bounds.cardTop >= bounds.filterBottom - 1, JSON.stringify(bounds));
            await page.screenshot({path: file});
        }
        await verifyChannelGrid('tests/channel-videos-classic.png');
        const nativePreview = await page.evaluate(() => {
            const image = document.querySelector('#' + ScreenObj[Main_ChannelVod].table + ' .stream_img'),
                rect = ClassicPages_previewRect(image),
                frame = image.parentElement.getBoundingClientRect();
            const calls = [],
                prior = Main_IsOn_OSInterface,
                oldAndroid = window.Android;
            window.Android = {StartScreensPlayer: (...a) => calls.push(a), ScreenPlayerRestore: (...a) => calls.push(a)};
            Settings_value.preview_screen_sizes.defaultValue = 1;
            Main_IsOn_OSInterface = true;
            OSInterface_StartScreensPlayer('fixture', '', 0, rect.bottom, rect.right, rect.left, 1080, 3);
            OSInterface_ScreenPlayerRestore(rect.bottom, rect.right, rect.left, 1080, 3);
            Main_IsOn_OSInterface = prior;
            window.Android = oldAndroid;
            return {inset: rect.left > frame.left && rect.right < frame.right && rect.bottom < frame.bottom, calls};
        });
        assert.equal(nativePreview.inset, true);
        assert.ok(nativePreview.calls.every(a => a[a.length - 1] === false));

        await page.evaluate(() => {
            const k = Main_values.Main_Go;
            ScreenObj[k].posY = -1;
            ScreenObj[k].posX = 0;
            Screens_addFocus(true, k);
        });
        await page.keyboard.press('ArrowUp');
        assert.equal(await page.evaluate(() => ChannelClassic_tabFocus), true);
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('Enter');
        await page.waitForFunction(
            () => Main_values.Main_Go === Main_ChannelClip && ScreenObj[Main_ChannelClip].itemsCount === 8 && ScreenObj[Main_ChannelClip].status
        );
        await verifyChannelGrid('tests/channel-clips-classic.png');

        for (const [width, height] of [
            [1280, 720],
            [1920, 1080]
        ]) {
            await page.setViewportSize({width, height});
            const bounds = await page.locator('#classic_nav').evaluate(nav => {
                const elements = [nav.querySelector('.classic-brand'), ...nav.querySelectorAll('button')];
                return elements.map(el => {
                    const r = el.getBoundingClientRect();
                    return {left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height};
                });
            });
            assert.ok(
                bounds.every(r => r.left >= 0 && r.right <= width && r.top >= 0 && r.bottom <= height * 0.095),
                'header fits TV viewport'
            );
            for (let i = 1; i < bounds.length; i++) assert.ok(bounds[i].left >= bounds[i - 1].right, 'header items do not overlap');
            assert.ok(Math.abs(bounds[0].width / bounds[0].height - 3) < 0.01, 'official wordmark keeps its aspect ratio');
        }

        assert.deepEqual(errors, []);
        console.log(
            'PASS: full source shell, four-column cards, no sidebar, real remote key navigation, settings categories, persisted default quality, nested chat settings and scrolling, one stream action per OK'
        );
    } finally {
        await browser.close();
    }
})().catch(e => {
    console.error(e);
    process.exit(1);
});
