const {chromium} = require('playwright-core'),
    assert = require('assert/strict');
const {PNG} = require('pngjs');
(async () => {
    const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || (require('fs').existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : chromium.executablePath()), headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']});
    const page = await browser.newPage({viewport: {width: 1920, height: 1080}, locale: 'ru-RU'}),
        errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.route('**/*', r => {
        if (r.request().url().startsWith('http://127.0.0.1:8765')) return r.continue();
        if (r.request().resourceType() === 'script') return r.fulfill({body: '', contentType: 'text/javascript'});
        return r.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({data: [], pagination: {}, access_token: 'fixture', expires_in: 3600})
        });
    });
    try {
        await page.goto('http://127.0.0.1:8765/app/index.html');
        await page.waitForFunction(() => typeof Play_controlsSettings !== 'undefined' && Object.keys(Play_controls).length === 48);
        await page.keyboard.press('Escape');
        await page.evaluate(() => {
            Main_HideWelcomeDialog();
            Main_HideWarningDialog();
            Main_ExitCurrent(Main_values.Main_Go);
            ru_RULang();
            Settings_AppLang = 'ru_RU';
            Play_MakeControls();
            Main_hideScene1Doc();
            Main_showScene2Doc();
            Play_isOn = true;
            PlayVod_isOn = false;
            PlayClip_isOn = false;
            Play_MultiEnable = false;
            PlayExtra_PicturePicture = false;
            Play_isFullScreen = true;
            Play_isFullScreenOld = true;
            Settings_value.show_chatters.defaultValue = 0;
            Play_data.data = [
                '',
                'Fixture',
                'Test stream',
                'Game',
                '100',
                'en',
                'fixture',
                'stream1',
                false,
                '',
                false,
                '1h',
                '2026-11-14T15:00:00Z',
                100,
                'channel1',
                'en',
                null,
                null,
                'game1'
            ];
            Play_data.qualities = [
                {id: 'Auto', position: -1, band: '', codec: ''},
                {id: '1440p60', position: 0, band: '', codec: ''},
                {id: '1080p60', position: 1, band: '', codec: ''}
            ];
            Play_data.qualityPlaying = '1440p60';
            Play_data.quality = '1440p60';
            Play_data.qualityIndex = 1;
            Play_controls[Play_controlsQuality].values = ['1080p'];
            window.androidCalls = [];
            window.Android = new Proxy(
                {},
                {
                    get: (_, name) =>
                        function (...args) {
                            androidCalls.push({name, args});
                            return '';
                        }
                }
            );
            Play_PanneInfoDoclId.style.opacity = 1;
            PlayVod_PanelY = 2;
            Play_PanelCounter = Play_controlsSettings;
            Play_SetControlsVisibility('ShowInLive');
            Main_PlayHandleKeyDown();
        });
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('#classic_settings_rows button').count(), 8);
        assert.equal(await page.locator('#classic_settings_title').textContent(), 'Настройки');
        assert.ok(!(await page.locator('#classic_settings_rows').innerText()).includes('Дополнительно'));
        assert.ok((await page.locator('#classic_settings_rows button').first().innerText()).includes('1440p60'));
        await page.screenshot({path: 'tests/player-groups-classic.png'});
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#classic_settings').count(), 0);
        // The actual bottom quality control must open and stay open after keyup/default browser actions.
        await page.evaluate(() => {
            Play_PanelCounter = Play_controlsQuality;
            PlayVod_PanelY = 2;
            Play_PanneInfoDoclId.style.opacity = 1;
        });
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('#classic_settings_rows button').count(), 3);
        assert.match(await page.locator('#classic_settings_rows button.is-current').innerText(), /1440p60/);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('#classic_settings').count(), 0);
        assert.equal(await page.evaluate(() => Play_data.qualityPlaying), '1080p60');
        await page.evaluate(() => {
            Play_PanelCounter = Play_controlsSettings;
            Play_PanneInfoDoclId.style.opacity = 1;
        });
        await page.keyboard.press('Enter');
        assert.match(await page.locator('#classic_settings_rows button').first().innerText(), /1080p60/);
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('#classic_settings_rows button').count(), 3);
        assert.match(await page.locator('#classic_settings_rows button.is-current').innerText(), /1080p60/);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#classic_settings_rows button').count(), 8);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('#classic_settings_title').textContent(), 'Компоновка');
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('#classic_settings_rows button').count(), 3);
        await page.evaluate(() => (Main_IsOn_OSInterface = true));
        const cursor = await page.evaluate(() => PlayClassic_cursor);
        if (cursor !== 1) await page.keyboard.press(cursor === 0 ? 'ArrowDown' : 'ArrowUp');
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => Play_isFullScreen), false);
        assert.equal(await page.evaluate(() => Play_isChatShown()), true);
        assert.equal(await page.evaluate(() => androidCalls.some(c => c.name === 'mupdatesize' && c.args[0] === false)), true);
        assert.equal(await page.evaluate(() => localStorage.getItem('Play_isFullScreen')), 'false');
        assert.match(await page.locator('#classic_settings_rows button').first().innerText(), /Раздельно/);
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => PlayClassic_cursor), 1);
        await page.keyboard.press('ArrowUp');
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => Play_isFullScreen), true);
        assert.equal(await page.evaluate(() => Play_isChatShown()), true);
        assert.equal(await page.evaluate(() => androidCalls.some(c => c.name === 'mupdatesize' && c.args[0] === true)), true);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#classic_settings_rows button').count(), 8);
        assert.equal(await page.evaluate(() => document.activeElement === document.querySelectorAll('#classic_settings_rows button')[1]), true);
        // Show chat must change visibility and layout together, including hiding from split mode.
        await page.evaluate(() => {
            PlayClassic_close();
            PlayClassic_chat();
        });
        await page.keyboard.press('Enter');
        assert.deepEqual(await page.locator('#classic_settings_rows button span:first-child').allTextContents(), [
            'Да — поверх видео',
            'Нет',
            'Разделение — рядом с видео'
        ]);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => Play_isChatShown()), false);
        assert.equal(await page.evaluate(() => Play_isFullScreen), true);
        await page.keyboard.press('Enter');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => Play_isFullScreen), false);
        assert.equal(await page.evaluate(() => Play_isChatShown()), true);
        assert.match(await page.locator('#classic_settings_rows button').first().innerText(), /Разделение/);
        await page.keyboard.press('Enter');
        await page.keyboard.press('ArrowUp');
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => Play_isFullScreen), true);
        assert.equal(await page.evaluate(() => Play_isChatShown()), false);
        assert.equal(await page.evaluate(() => localStorage.getItem('ChatEnable')), 'false');
        await page.keyboard.press('Enter');
        await page.keyboard.press('ArrowUp');
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => Play_isFullScreen), true);
        assert.equal(await page.evaluate(() => Play_isChatShown()), true);
        // Native overlay nodes use the modern theme and preserve configured chat sizing.
        await page.evaluate(() => {
            PlayClassic_close();
            Main_IsOn_OSInterface = false;
            Play_PanneInfoDoclId.style.opacity = 1;
            document.getElementById('stream_info_name').textContent = 'Fixture';
            document.getElementById('stream_info_title').textContent = 'Вечерняя трансляция';
            document.getElementById('stream_info_game').textContent = 'Just Chatting';
            Play_data.data[12] = new Date(Date.now() - 7200000).toISOString();
            Play_data.watching_time = Date.now() - 1800000;
            Play_RefreshWatchingTime();
            Play_Controls_Holder.style.opacity = 1;
            document.getElementById('scene2').style.background = 'linear-gradient(135deg, #253756, #161523 65%, #3c294c)';
            document.getElementById('chat_container0').classList.remove('hide');
            const chat = document.getElementById('chat_box0');
            chat.replaceChildren();
            for (let i = 0; i < 6; i++) {
                let row = document.createElement('div');
                row.className = 'chat_line chat_line_slim';
                let name = document.createElement('span');
                name.style.color = i % 2 ? '#bf94ff' : '#57c7ff';
                name.textContent = ['Зритель', 'Mira', 'Pixel'][i % 3] + ': ';
                row.appendChild(name);
                let message = document.createElement('span');
                message.className = 'message';
                message.textContent = ['Привет!', 'Хорошего эфира :)', 'Проверяем читаемость чата и перенос длинного сообщения на несколько строк'][
                    i % 3
                ];
                row.appendChild(message);
                chat.appendChild(row);
            }
        });
        assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#chat_box0 .chat_line')).textShadow), 'none');
        const toolbar = await page.evaluate(() => {
            const visible = [...document.querySelectorAll('#controls_holder .controls_button_holder')].filter(
                e => getComputedStyle(e).display !== 'none'
            );
            return visible.map(e => {
                const b = e.getBoundingClientRect(),
                    t = e.querySelector('.controls_button_title').getBoundingClientRect();
                return {left: b.left, right: b.right, titleLeft: t.left, titleRight: t.right};
            });
        });
        assert.equal(toolbar.length, 3);
        for (let i = 0; i < toolbar.length; i++) {
            assert.ok(toolbar[i].titleLeft >= toolbar[i].left - 1);
            assert.ok(toolbar[i].titleRight <= toolbar[i].right + 1);
            if (i) assert.ok(toolbar[i].left >= toolbar[i - 1].right);
        }
        const geometry = await page.evaluate(() => {
            const button = document.getElementById('pause_button');
            button.classList.add('progress_bar_div_focus');
            const b = button.getBoundingClientRect();
            Play_ProgresBarrElm.style.transition = 'none';
            Play_ProgresBarrBufferElm.style.transition = 'none';
            Play_BufferSize = 20;
            PlayVod_ProgressBarrUpdate(50, 100, true);
            PlayClassic_updateDelay(true, 12.3);
            const bar = document.getElementById('progress_bar_inner_container').getBoundingClientRect();
            return {button: {w: b.width, h: b.height}, bar: {x: bar.x, y: bar.y, w: bar.width, h: bar.height}};
        });
        assert.ok(Math.abs(geometry.button.w - geometry.button.h) < 1, JSON.stringify(geometry));
        assert.match(await page.locator('#classic_live_delay').innerText(), /Отставание: 00:12/);
        const screenshot = await page.screenshot({path: 'tests/player-overlay-classic.png'}),
            png = PNG.sync.read(screenshot);
        function color(fraction) {
            const p = (Math.floor(geometry.bar.y + geometry.bar.h / 2) * png.width + Math.floor(geometry.bar.x + geometry.bar.w * fraction)) * 4;
            return [...png.data.subarray(p, p + 3)];
        }
        const colors = [color(0.1), color(0.6), color(0.9)];
        function difference(a, b) {
            return a.reduce((sum, n, i) => sum + Math.abs(n - b[i]), 0);
        }
        assert.ok(difference(colors[0], colors[1]) > 80, JSON.stringify(colors));
        assert.ok(difference(colors[1], colors[2]) > 80, JSON.stringify(colors));
        assert.ok(difference(colors[0], colors[2]) > 80, JSON.stringify(colors));

        assert.match(await page.locator('#stream_live_time').innerText(), /В эфире/);
        assert.match(await page.locator('#stream_watching_time').innerText(), /Смотришь/);
        // Groups must not lose any original standalone player action.
        const missing = await page.evaluate(() => {
            const covered = [].concat(
                ...Object.values(PlayClassic_groups()),
                Object.keys(Play_controls)
                    .filter(k => Play_controls[k].ShowInChat)
                    .map(Number),
                [Play_controlsBack, Play_controlsSettings, Play_controlsAudio, Play_controlsPreview, Play_controlsChatSettings]
            );
            return Object.keys(Play_controls)
                .map(Number)
                .filter(k => covered.indexOf(k) === -1);
        });
        assert.deepEqual(missing, []);
        await page.evaluate(() => {
            PlayClassic_close();
            Main_IsOn_OSInterface = false;
            Main_clearAllPlayerEvents();
        });

        for (const mode of [2, 3]) {
            await page.evaluate(mode => {
                Play_isOn = false;
                PlayVod_isOn = mode === 2;
                PlayClip_isOn = mode === 3;
                Play_PanneInfoDoclId.style.opacity = 1;
                PlayVod_PanelY = 2;
                Play_PanelCounter = Play_controlsSettings;
                if (mode === 2) {
                    PlayVod_qualities = Play_data.qualities;
                    PlayVod_qualityPlaying = '1080p60';
                    PlayVod_quality = '1080p60';
                    Main_PlayVodHandleKeyDown();
                } else {
                    PlayClip_qualities = Play_data.qualities;
                    PlayClip_qualityPlaying = '1440p60';
                    PlayClip_quality = '1440p60';
                    Main_PlayClipHandleKeyDown();
                }
                Play_SetControlsVisibility(mode === 2 ? 'ShowInVod' : 'ShowInClip');
            }, mode);
            await page.keyboard.press('Enter');
            assert.equal(await page.locator('#classic_settings_title').textContent(), 'Настройки');
            await page.keyboard.press('Escape');
            await page.evaluate(() => (Play_PanelCounter = Play_controlsQuality));
            await page.keyboard.press('Enter');
            assert.equal(await page.locator('#classic_settings_rows button').count(), 3);
            assert.match(await page.locator('#classic_settings_rows button.is-current').innerText(), mode === 2 ? /1080p60/ : /1440p60/);
            await page.keyboard.press('Escape');
            await page.evaluate(() => PlayClassic_close());
        }
        async function pressAction(key) {
            await page.keyboard.press(key);
            const focus = await page.evaluate(() => {
                const expected = !PlayVod_PanelY
                    ? 'progress_bar_div'
                    : PlayVod_PanelY === 2
                      ? Play_controls[Play_PanelCounter].button.id
                      : PlayClip_EnterPos === -1
                        ? 'back_button'
                        : PlayClip_EnterPos === 1
                          ? 'next_button'
                          : 'pause_button';
                const selected = [
                    ...document.querySelectorAll(
                        '#controls_holder .progress_bar_div_focus, #pause_next_div .progress_bar_div_focus, #progress_bar_div.progress_bar_div_focus'
                    )
                ].map(e => e.id);
                return {expected, selected};
            });
            assert.deepEqual(focus.selected, [focus.expected], `One focused action after ${key}: ${JSON.stringify(focus)}`);
        }
        // Real remote handlers must follow the visual row in live, VOD and clips.
        for (const mode of [1, 2, 3]) {
            await page.evaluate(mode => {
                Play_isOn = mode === 1;
                PlayVod_isOn = mode === 2;
                PlayClip_isOn = mode === 3;
                PlayClip_HasBack = mode === 3;
                PlayClip_HasNext = mode === 3;
                PlayClip_EnterPos = 0;
                PlayVod_PanelY = 1;
                Play_PanneInfoDoclId.style.opacity = 1;
                Play_SetControlsVisibility(mode === 1 ? 'ShowInLive' : mode === 2 ? 'ShowInVod' : 'ShowInClip');
                if (mode === 1) Main_PlayHandleKeyDown();
                else if (mode === 2) Main_PlayVodHandleKeyDown();
                else Main_PlayClipHandleKeyDown();
                Play_BottomIconsFocus();
            }, mode);
            const state = () => page.evaluate(() => ({y: PlayVod_PanelY, clip: PlayClip_EnterPos, key: Play_PanelCounter}));
            if (mode === 3) {
                await pressAction('ArrowLeft');
                assert.equal((await state()).clip, -1);
                await pressAction('ArrowRight');
                assert.equal((await state()).clip, 0);
                await pressAction('ArrowRight');
                assert.equal((await state()).clip, 1);
            }
            await pressAction('ArrowRight');
            assert.equal((await state()).y, 2);
            assert.equal((await state()).key, await page.evaluate(() => Play_controlsQuality));
            for (const key of ['Play_controlsQuality', 'Play_controlsChat', 'Play_controlsSettings']) {
                assert.equal((await state()).key, await page.evaluate(key => window[key], key));
                const before = await state();
                await pressAction('ArrowUp');
                assert.equal((await state()).y, 0);
                assert.equal(await page.locator('#progress_bar_div').evaluate(e => e.classList.contains('progress_bar_div_focus')), true);
                await pressAction('ArrowDown');
                assert.deepEqual(await state(), before);
                assert.equal(await page.locator('#pause_next_div').evaluate(e => e.classList.contains('opacity_zero')), false);
                await pressAction('ArrowRight');
            }
            await pressAction('ArrowLeft');
            await pressAction('ArrowLeft');
            await pressAction('ArrowLeft');
            if (mode === 3) await pressAction('ArrowLeft');
            assert.equal((await state()).y, 1);
            assert.equal((await state()).clip, 0);
            await pressAction('ArrowUp');
            assert.equal((await state()).y, 0);
            await pressAction('ArrowDown');
            assert.equal((await state()).y, 1);
            for (const viewport of [
                {width: 1280, height: 720},
                {width: 1920, height: 1080},
                {width: 3840, height: 2160}
            ]) {
                await page.setViewportSize(viewport);
                const geometry = await page.evaluate(() => {
                    // Seek text must not push the track into the buttons.
                    document.getElementById('progress_bar_jump_to').textContent = '01:23:45 → 01:25:00';
                    const rect = id => {
                        const b = document.getElementById(id).getBoundingClientRect();
                        return {top: b.top, bottom: b.bottom, left: b.left, right: b.right};
                    };
                    return {
                        bar: rect('progress_bar_holder'),
                        pause: rect('pause_button'),
                        controls: [...document.querySelectorAll('#controls_holder .controls_button_holder')]
                            .filter(e => getComputedStyle(e).display !== 'none')
                            .map(e => rect(e.querySelector('.controls_button').id))
                    };
                });
                for (const b of geometry.controls) {
                    assert.ok(geometry.bar.bottom + viewport.height * 0.02 < b.top, JSON.stringify(geometry));
                    assert.ok(Math.abs(geometry.pause.top - b.top) < 2, JSON.stringify(geometry));
                }
                assert.ok(geometry.pause.right < geometry.controls[0].left);
            }
            await page.setViewportSize({width: 1920, height: 1080});
        }
        assert.deepEqual(errors, []);
        console.log(
            'PASS: actual player keydown/keyup, root menu stays open, working bottom quality button, consistent current-quality label and checkmark, no catch-all duplicates, native split/overlay resize calls and persisted layout, restored submenu focus, all original controls reachable'
        );
    } finally {
        await browser.close();
    }
})().catch(e => {
    console.error(e);
    process.exit(1);
});
