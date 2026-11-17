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
                  body: r.request().resourceType() === 'script' ? '' : '{"data":[]}'
              })
    );
    try {
        await page.goto('http://127.0.0.1:8765/app/index.html?asset-test=1');
        await page.waitForFunction(() => typeof ClassicGiant_prepare === 'function' && !!ScreenObj[Main_Live].tableDoc);
        await page.keyboard.press('Escape');
        await page.evaluate(() => {
            Main_HideWelcomeDialog();
            Main_HideWarningDialog();
            Main_HideAboutDialog();
            ru_RULang();
            Settings_AppLang = 'ru_RU';
            Main_SetStringsMain();
            Main_hideScene1Doc();
            Main_showScene2Doc();
            Chat_div[0].replaceChildren();
            document.getElementById('chat_container0').classList.remove('hide');
            document.getElementById('chat_box_holder0').style.width = '280px';
            AddUser_UsernameArray = [{id: '123', name: 'viewer', access_token: 'private-fixture-token'}];
            window.requests = [];
            Android = new Proxy(
                {},
                {
                    get: (_, name) =>
                        name === 'BasexmlHttpGet'
                            ? function (url, timeout, body, method, headers, callback, check, key, success, failure) {
                                  requests.push({url, body, method, headers, callback, check, key, success, failure});
                              }
                            : () => ''
                }
            );
            Main_IsOn_OSInterface = true;
            window.reply = function (r, data) {
                smartTwitchTV[r.callback](
                    JSON.stringify({status: 200, responseText: JSON.stringify(data)}),
                    String(r.key),
                    r.success,
                    r.failure,
                    Number(r.check)
                );
            };
            window.rewards = function (channel, marked = true) {
                return {
                    data: {
                        user: {
                            id: channel,
                            channel: {
                                communityPointsSettings: {
                                    customRewards: [
                                        {id: 'giant', title: marked ? 'Giant' : 'Ordinary', prompt: marked ? 'FFZ:GE' : 'Nothing'},
                                        {id: 'title', title: 'FFZ:GE', prompt: ''},
                                        {id: 'plain', title: 'Ordinary', prompt: ''}
                                    ]
                                }
                            }
                        }
                    }
                };
            };
            window.send = function (id, text, reward = 'giant', channel = '456') {
                ChatLive_loadChatSuccess(
                    {
                        tags: {
                            'display-name': 'Viewer',
                            'user-id': 'viewer',
                            color: '#ff6600',
                            mod: '0',
                            id,
                            'room-id': channel,
                            'custom-reward-id': reward
                        },
                        params: ['#streamer', text]
                    },
                    0,
                    false
                );
            };
            ChatLive_Playing = true;
            Play_ChatDelayPosition = 0;
            ChatLive_LineAddCounter[0] = 0;
            ChatLive_selectedChannel[0] = 'streamer';
            ChatLive_selectedChannel_id[0] = '456';
            ChatLive_Highlight_AtStreamer = false;
            ChatLive_Highlight_FromStreamer = false;
            ChatLive_Highlight_Mod = false;
            ChatLive_Highlight_AtUser = false;
            ChatLive_Highlight_User_send = false;
            ChatLive_Show_TimeStamp = false;
            ChatLive_ShowBadges = false;
            ChatLive_HideBots = false;
            const image = (name, width) =>
                '<img class="emoticon" data-name="' +
                name +
                '" style="height:28px;width:' +
                width +
                'px" src="data:image/svg+xml,' +
                encodeURIComponent(
                    '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="28"><rect width="100%" height="100%" fill="red"/></svg>'
                ) +
                '">';
            extraEmotes[0] = {
                Base: {chat_div: image('base', 28)},
                Wide: {chat_div: image('wide', 112)},
                Overlay: {chat_div: image('overlay', 280), chat_div_zero: true}
            };
            if (!ClassicFeatures_enabled('giant_emotes')) throw Error('Default must be on');
            ClassicGiant_load('456');
            send('late', 'Before Base Overlay after');
        });
        assert.equal(await page.locator('.classic-giant-emote').count(), 0);
        await page.evaluate(() =>
            reply(
                requests.find(r => JSON.parse(r.body || '{}').operationName === 'ClassicGiantRewards'),
                rewards('456')
            )
        );
        const debug = await page.evaluate(() => ({
            html: document.getElementById('late')?.outerHTML,
            lines: document.querySelectorAll('.classic-reward-message').length,
            cache: ClassicGiant.channels
        }));
        assert.equal(await page.locator('#late .classic-giant-emote').count(), 1, JSON.stringify(debug));
        assert.equal(await page.locator('#late .classic-giant-emote .classic-emote-layer').count(), 1);
        await page.evaluate(() => {
            send('wide', 'Before w! Base Overlay after');
            send('normal', 'Base', 'plain');
            send('empty', 'No emotes here');
            send('title', 'Base', 'title');
            send('unmarked', 'Base', '', '456');
        });
        assert.equal(await page.locator('#normal .classic-giant-emote').count(), 0);
        assert.equal(await page.locator('#empty .classic-giant-emote').count(), 0);
        assert.equal(await page.locator('#title .classic-giant-emote').count(), 1);
        assert.equal(await page.locator('#unmarked .classic-giant-emote').count(), 0);
        assert.equal(await page.locator('#wide .classic-giant-emote .classic-emote-wide').count(), 1);
        await page.evaluate(async () => {
            await Promise.all([...Chat_div[0].querySelectorAll('img')].map(i => i.decode()));
        });
        const geometry = await page.evaluate(() => {
            const message = document.getElementById('wide'),
                giant = message.querySelector('.classic-giant-emote'),
                img = giant.querySelector('img'),
                nick = message.parentElement.querySelector('.classic-chat-nick');
            return {
                giant: giant.getBoundingClientRect().toJSON(),
                image: img.getBoundingClientRect().toJSON(),
                nick: nick.getBoundingClientRect().toJSON(),
                message: message.parentElement.getBoundingClientRect().toJSON()
            };
        });
        assert.ok(geometry.image.height > 60 && geometry.image.height <= 128);
        assert.ok(geometry.giant.top >= geometry.nick.bottom, 'giant is below the nick/badges line');
        assert.ok(geometry.giant.right <= geometry.message.right + 1, 'narrow chat contains wide composition');
        await page.evaluate(() => {
            ClassicFeatures_set('giant_emotes', false);
        });
        assert.equal(await page.locator('.classic-giant-emote').count(), 0);
        assert.ok(
            (await page.locator('#wide').innerHTML()).indexOf('classic-emote-wide') < (await page.locator('#wide').innerHTML()).indexOf('after'),
            'turning off restores original position'
        );
        await page.evaluate(() => ClassicFeatures_set('giant_emotes', true));
        assert.equal(await page.locator('#wide .classic-giant-emote').count(), 1);
        // Channel IDs isolate reward maps, even when two channels use the same reward ID.
        await page.evaluate(() => {
            send('other', 'Base', 'giant', '789');
            const r = requests.find(r => JSON.parse(r.body || '{}').variables?.id === '789');
            reply(r, rewards('789', false));
        });
        assert.equal(await page.locator('#other .classic-giant-emote').count(), 0);
        // Timeout ignores a late native callback; no malformed metadata can activate emotes.
        await page.evaluate(() => {
            ClassicGiant_load('999');
            const r = requests.find(r => JSON.parse(r.body || '{}').variables?.id === '999');
            ClassicGiant_failure(null, '999', r.check);
            reply(r, rewards('999'));
            send('timed', 'Base', 'giant', '999');
        });
        assert.equal(await page.locator('#timed .classic-giant-emote').count(), 0);
        await page.evaluate(() => {
            ChatLive_ClearChat = true;
            ChatLive_CleanMessage({tags: {'target-msg-id': 'wide'}});
        });
        assert.equal(await page.locator('.classic-giant-emote .classic-emote-wide').count(), 0, 'deletion clears enlarged content too');
        await page.evaluate(() => send('extreme', 'w! Wide Overlay'));
        await page.evaluate(async () => {
            await Promise.all([...document.getElementById('extreme').querySelectorAll('img')].map(i => i.decode()));
            ClassicGiant_refresh();
        });
        for (const width of [280, 160]) {
            const bounds = await page.evaluate(width => {
                Chat_div[0].style.width = width + 'px';
                ClassicGiant_refresh();
                const giant = document.querySelector('#extreme .classic-giant-emote');
                return {frame: giant.getBoundingClientRect().toJSON(), root: giant.firstElementChild.getBoundingClientRect().toJSON()};
            }, width);
            assert.ok(bounds.root.right <= bounds.frame.right + 1, 'full wide composition scales into narrow chat');
        }
        await page.evaluate(() => {
            ClassicFeatures_set('giant_emotes', false);
            if (document.querySelector('#extreme .classic-emote-wide').style.zoom) throw Error('Giant scale leaked to ordinary emotes');
            ClassicFeatures_set('giant_emotes', true);
            Main_IsOn_OSInterface = false;
            Main_showScene1Doc();
            Main_showSettings();
            ClassicFeatures_menu('chat');
        });
        // The setting is part of the regular remote-controlled preferences screen.
        assert.ok((await page.locator('#classic_preferences_rows').innerText()).includes('Гигаэмоуты'));
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => ClassicFeatures_enabled('giant_emotes')), false);
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => ClassicFeatures_enabled('giant_emotes')), true);
        assert.deepEqual(errors, []);
        console.log(
            'PASS: native reward metadata and actual IRC renderer, FFZ:GE title/prompt, last composed emote on its own line, zero-width/wide containment, live toggle restoration, channel isolation, timeouts and deletion'
        );
    } finally {
        await browser.close();
    }
})().catch(e => {
    console.error(e);
    process.exitCode = 1;
});
