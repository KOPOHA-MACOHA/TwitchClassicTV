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
    page.on('pageerror', e => errors.push(String(e)));
    await page.route('**/*', r =>
        r.request().url().startsWith('http://127.0.0.1:8765/')
            ? r.continue()
            : r.fulfill({
                  contentType: r.request().resourceType() === 'script' ? 'text/javascript' : 'application/json',
                  body: r.request().resourceType() === 'script' ? '' : JSON.stringify({data: [], access_token: 'fixture', expires_in: 3600})
              })
    );
    try {
        await page.goto('http://127.0.0.1:8765/app/index.html');
        await page.waitForFunction(
            () => typeof ClassicChatPresentation_apply === 'function' && typeof Play_controls === 'object' && Object.keys(Play_controls).length === 48
        );
        await page.keyboard.press('Escape');
        await page.evaluate(async () => {
            Main_HideWelcomeDialog();
            Main_HideWarningDialog();
            Main_HideAboutDialog();
            ru_RULang();
            Settings_AppLang = 'ru_RU';
            Main_SetStringsMain();
            Play_MakeControls();
            await document.fonts.load('400 24px Inter', 'Привет Twitch');
            await document.fonts.load('700 24px Inter', 'Привет Twitch');
            Main_hideScene1Doc();
            Main_showScene2Doc();
            document.getElementById('scene2').style.background = 'linear-gradient(135deg,#26344e,#101016)';
            document.getElementById('chat_container0').classList.remove('hide');
            document.getElementById('chat_container1').classList.remove('hide');
            Chat_Id[0] = 123;
            Chat_Id[1] = 124;
            ClassicFeatures_set('readable_nicks', false);
            Settings_value.show_chatters.defaultValue = 2;
            ChatLive_loadChatters(0, 123);
            ChatLive_loadChattersViewersSuccess(JSON.stringify({data: [{viewer_count: 1234567}]}), 0, 123);
            Settings_value.show_chatters.defaultValue = 1;
            ChatLive_isShared[1] = false;
            ChatLive_loadChatters(1, 124);
            ChatLive_loadChattersSuccess({status: 200, responseText: JSON.stringify({data: {channels: [{chatters: {count: 4321}}]}})}, 1, 124);
            // The same real renderers must retain chosen colours despite the old preference and highlights.
            window.rendered = [];
            ChatLive_LineAdd = obj => rendered.push(obj);
            Play_ChatDelayPosition = 0;
            ChatLive_Custom_Nick_Color = true;
            ChatLive_Highlight_Mod = true;
            ChatLive_Highlight_FromStreamer = true;
            ChatLive_Highlight_AtUser = true;
            ChatLive_User_Regex_Search = /@viewer/i;
            ChatLive_Highlight_AtStreamer = false;
            ChatLive_Show_TimeStamp = false;
            ChatLive_HideBots = false;
            ChatLive_selectedChannel[0] = 'streamer';
            ChatLive_selectedChannel_id[0] = '456';
            ChatLive_ShowBadges = false;
            ChatLive_ShowBadgesMod = false;
            ChatLive_ShowBadgesVIP = false;
            extraEmotes[0] = {};
            for (const [name, color, mod, text] of [
                ['Moderator', '#123456', '1', 'Hello'],
                ['Streamer', '#FF00CC', '0', 'Hello'],
                ['Viewer', '#00FF00', '0', 'Hi @viewer']
            ]) {
                ChatLive_loadChatSuccess(
                    {tags: {'display-name': name, 'user-id': name, color, mod, id: name}, params: ['#streamer', text]},
                    0,
                    false
                );
            }
            window.liveRendered = rendered.slice();
            window.vodRendered = [];
            Chat_MessageVectorNext = obj => vodRendered.push(obj);
            Chat_cursor = 'old';
            Chat_comment_ids = {};
            ChatLive_Highlight_AtUser = false;
            ChatLive_Highlight_FromStreamer = false;
            Chat_loadChatSuccess(
                JSON.stringify({
                    data: {
                        video: {
                            comments: {
                                edges: [
                                    {
                                        cursor: 'next',
                                        node: {
                                            id: 'vod-message',
                                            contentOffsetSeconds: 1,
                                            commenter: {id: '999', displayName: 'VodViewer', login: 'vodviewer'},
                                            message: {userColor: '#7F12AB', fragments: [{text: 'Hello VOD'}], userBadges: []}
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }),
                123
            );
            const box = document.getElementById('chat_box0');
            box.replaceChildren();
            liveRendered.forEach(row => {
                const line = document.createElement('div');
                line.className = 'chat_line';
                line.innerHTML = row.message;
                box.appendChild(line);
            });
        });
        const result = await page.evaluate(() => {
            const rect = e => {
                let r = e.getBoundingClientRect();
                return {x: r.x, y: r.y, w: r.width, h: r.height, bottom: r.bottom, right: r.right};
            };
            return {
                headers: [0, 1].map(n => {
                    const header = document.getElementById('classic_chat_header' + n),
                        counter = document.getElementById('chat_loggedin' + n),
                        title = header.querySelector('.classic-chat-title');
                    return {
                        header: rect(header),
                        counter: rect(counter),
                        title: rect(title),
                        inner: rect(document.getElementById('chat_inner_container' + n)),
                        holder: rect(document.getElementById('chat_box_holder' + n)),
                        type: counter.dataset.countType,
                        text: counter.textContent,
                        label: counter.getAttribute('aria-label'),
                        parent: counter.parentNode.id
                    };
                }),
                fonts: document.fonts.check('400 24px Inter', 'Привет Twitch') && document.fonts.check('700 24px Inter', 'Привет Twitch'),
                nickFonts: [...document.querySelectorAll('.classic-chat-nick')].map(e => getComputedStyle(e).fontFamily),
                live: liveRendered.map(row => {
                    let el = document.createElement('div');
                    el.innerHTML = row.message;
                    return {color: el.querySelector('.classic-chat-nick').style.color, mod: row.mod, streamer: row.fromstreamer, atuser: row.atuser};
                }),
                vod: vodRendered.map(row => {
                    let el = document.createElement('div');
                    el.innerHTML = row.message;
                    return el.querySelector('.classic-chat-nick').style.color;
                }),
                fallback: ClassicChatPresentation_nameColor(null, 'viewer') === ClassicChatPresentation_nameColor(true, 'viewer')
            };
        });
        assert.equal(result.fonts, true);
        assert.ok(result.nickFonts.every(f => f.includes('Inter')));
        for (const h of result.headers) {
            assert.ok(Math.abs(h.counter.y - h.title.y) < 4, JSON.stringify(h));
            assert.ok(h.title.right < h.counter.x, JSON.stringify(h));
            assert.ok(h.counter.right <= h.header.right, JSON.stringify(h));
            assert.ok(Math.abs(h.inner.y - h.header.bottom) < 1, JSON.stringify(h));
            assert.ok(Math.abs(h.holder.h - h.inner.h) < 1, JSON.stringify(h));
        }
        assert.equal(result.headers[0].text.trim(), '1,234,567');
        assert.equal(result.headers[0].type, 'viewers');
        assert.match(result.headers[0].label, /1,234,567/);
        assert.equal(result.headers[1].text.trim(), '4,321');
        assert.equal(result.headers[1].type, 'chatters');
        assert.deepEqual(
            result.live.map(v => v.color),
            ['rgb(18, 52, 86)', 'rgb(255, 0, 204)', 'rgb(0, 255, 0)']
        );
        assert.equal(result.live[0].mod, true);
        assert.equal(result.live[1].streamer, true);
        assert.equal(result.live[2].atuser, true);
        assert.deepEqual(result.vod, ['rgb(127, 18, 171)']);
        assert.equal(result.fallback, true);
        // Exact source colours remain available; only dark paints change when enabled.
        const colours = await page.evaluate(() => {
            ClassicFeatures_set('readable_nicks', true);
            return {
                dark: ClassicChatPresentation_readableColor('#123456'),
                bright: ClassicChatPresentation_readableColor('#00FF00'),
                black: ClassicChatPresentation_readableColor('#000'),
                source: document.querySelector('.classic-chat-nick').dataset.twitchColor,
                paint: document.querySelector('.classic-chat-nick').style.color
            };
        });
        const luminance = hex =>
            hex
                .slice(1)
                .match(/../g)
                .map(c => parseInt(c, 16) / 255)
                .map(v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
                .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
        for (const color of [colours.dark, colours.black]) assert.ok((luminance(color) + 0.05) / (luminance('#18181b') + 0.05) >= 4.5, color);
        assert.equal(colours.bright, '#00FF00');
        assert.equal(colours.source, '#123456');
        assert.notEqual(colours.paint, 'rgb(18, 52, 86)');
        await page.evaluate(() => ClassicFeatures_set('readable_nicks', false));
        assert.equal(
            await page
                .locator('.classic-chat-nick')
                .first()
                .evaluate(e => e.style.color),
            'rgb(18, 52, 86)'
        );

        await page.screenshot({path: 'tests/chat-presentation.png'});
        await page.evaluate(() => {
            Settings_value.classic_player.defaultValue = 0;
            PlayClassic_applyMode();
        });
        assert.equal(await page.evaluate(() => document.getElementById('chat_loggedin0').parentNode.id), 'chat_inner_container0');
        await page.evaluate(() => {
            Settings_value.classic_player.defaultValue = 1;
            PlayClassic_applyMode();
        });
        assert.equal(await page.evaluate(() => document.getElementById('chat_loggedin0').parentNode.id), 'classic_chat_header0');
        // The extension's parentheses mean connected chat users, not extra video viewers.
        await page.evaluate(() => {
            Settings_value.show_chatters.defaultValue = 2;
            Chat_Id[0] = 900;
            ClassicFeatures_set('connected_chatters', true);
            ClassicChatPresentation_resetCounts(0);
            ChatLive_loadChattersViewersSuccess(JSON.stringify({data: [{viewer_count: 1800}]}), 0, 900);
            ChatLive_loadChattersSuccess({status: 200, responseText: JSON.stringify({data: {channels: [{chatters: {count: 932}}]}})}, 0, 900);
        });
        assert.equal((await page.locator('#chat_loggedin0').innerText()).replace(/\s/g, ''), '1,800(932)');
        assert.match(await page.locator('#chat_loggedin0').getAttribute('aria-label'), /Подключены к чату: 932/);
        await page.evaluate(() => {
            ChatLive_loadChattersSuccess({status: 200, responseText: JSON.stringify({data: {channels: [{chatters: {count: 999}}]}})}, 0, 899);
            ChatLive_loadChattersViewersSuccess(JSON.stringify({data: [{viewer_count: 2000}]}), 0, 900);
        });
        assert.equal((await page.locator('#chat_loggedin0').innerText()).replace(/\s/g, ''), '2,000(932)');
        await page.evaluate(() => ClassicFeatures_set('connected_chatters', false));
        assert.equal((await page.locator('#chat_loggedin0').innerText()).replace(/\s/g, ''), '2,000');
        await page.evaluate(() => {
            ClassicFeatures_set('connected_chatters', true);
            ClassicChatPresentation_resetCounts(0);
            ChatLive_loadChattersSuccess({status: 200, responseText: JSON.stringify({data: {channels: [{chatters: {count: 0}}]}})}, 0, 900);
            ChatLive_loadChattersViewersSuccess(JSON.stringify({data: [{viewer_count: 2001}]}), 0, 900);
        });
        assert.equal((await page.locator('#chat_loggedin0').innerText()).replace(/\s/g, ''), '2,001(0)');
        await page.evaluate(() => ChatLive_resetChatters(0));
        assert.equal(await page.locator('#chat_loggedin0').isVisible(), false);
        assert.deepEqual(errors, []);
        console.log(
            'PASS: offline Inter Latin/Cyrillic regular/bold, one-row headers for both chats, correct viewer/chatter semantics, no counter space below header, original live/VOD nickname colours with highlights, deterministic missing-colour fallback, mode toggling and counter reset'
        );
    } finally {
        await browser.close();
    }
})().catch(e => {
    console.error(e);
    process.exit(1);
});
