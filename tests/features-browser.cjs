const {chromium} = require('playwright-core');
const assert = require('assert/strict');
(async () => {
    const browser = await chromium.launch({
        executablePath:
            process.env.CHROMIUM_PATH || (require('fs').existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : chromium.executablePath()),
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage({viewport: {width: 1920, height: 1080}}),
        errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.route('**/*', r => {
        if (r.request().url().startsWith('http://127.0.0.1:8765/')) return r.continue();
        if (r.request().resourceType() === 'script') return r.fulfill({body: '', contentType: 'text/javascript'});
        if (r.request().resourceType() === 'image')
            return r.fulfill({
                contentType: 'image/svg+xml',
                body: '<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56"><circle cx="28" cy="28" r="24" fill="#bf94ff"/></svg>'
            });
        return r.fulfill({contentType: 'application/json', body: JSON.stringify({data: [], access_token: 'fixture', expires_in: 3600})});
    });
    try {
        await page.goto('http://127.0.0.1:8765/app/index.html?asset-test=1');
        await page.waitForFunction(() => typeof ClassicChat_render === 'function' && typeof Main_values !== 'undefined' && !!Main_values.Main_Go);
        await page.keyboard.press('Escape');
        // Huge zero-width layers and z! must never paint over the nickname.
        for (const message of [
            'w! Base Overlay',
            'Base Overlay ffzW',
            'Base z! Overlay',
            'z! Base',
            'Overlay',
            'w! Wide Tail',
            'w! Wide Overlay Tail'
        ]) {
            const bounds = await page.evaluate(async message => {
                ClassicFeatures_set('emote_modifiers', true);
                const image =
                    'data:image/svg+xml,' +
                    encodeURIComponent(
                        '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#9146ff"/></svg>'
                    );
                const base = '<img class="emoticon" style="width:40px;height:40px" src="' + image + '">';
                extraEmotes[0] = {
                    Base: {chat_div: base},
                    Wide: {chat_div: base.replace('width:40px', 'width:240px')},
                    Overlay: {chat_div: base.replace('width:40px', 'width:800px'), chat_div_zero: base}
                };
                const fixture = document.createElement('div');
                fixture.id = 'zero_geometry';
                fixture.style.cssText = 'position:fixed;left:40px;top:40px;font:24px Inter;background:#18181b;color:white;z-index:999';
                fixture.innerHTML = '<span id="zero_nick">Nickname: </span>' + ClassicChat_render([message], 0, 0);
                document.body.appendChild(fixture);
                await Promise.all([...fixture.querySelectorAll('img')].map(i => i.decode()));
                const nick = fixture.querySelector('#zero_nick').getBoundingClientRect(),
                    stack = fixture.querySelector('.classic-emote-stack');
                const rect = e => {
                    const r = e.getBoundingClientRect();
                    return {left: r.left, right: r.right, width: r.width};
                };
                const wide = fixture.querySelector('.classic-emote-wide');
                const tail = document.createElement('span');
                tail.textContent = ' NEXT';
                fixture.appendChild(tail);
                const result = {
                    wide: wide ? rect(wide) : null,
                    tail: rect(tail),
                    nickRight: nick.right,
                    images: [...fixture.querySelectorAll('img')].map(rect),
                    stack: stack ? rect(stack) : null,
                    zero: fixture.querySelectorAll('.classic-emote-zero-space').length
                };
                return result;
            }, message);
            assert.equal(bounds.zero, 0, message);
            for (const image of bounds.images) assert.ok(image.left >= bounds.nickRight - 1, JSON.stringify({message, bounds}));
            if (bounds.wide) {
                assert.ok(
                    bounds.images[0].left >= bounds.wide.left - 1 && bounds.images[0].right <= bounds.wide.right + 1,
                    JSON.stringify({message, bounds})
                );
                assert.ok(bounds.tail.left >= bounds.wide.right - 1, JSON.stringify({message, bounds}));
            }
            if (bounds.stack) {
                assert.equal(bounds.images.length, 2);
                assert.ok(Math.abs(bounds.images[0].width - bounds.images[1].width) < 1, JSON.stringify({message, bounds}));
                assert.ok(
                    bounds.images[1].left >= bounds.stack.left - 1 && bounds.images[1].right <= bounds.stack.right + 1,
                    JSON.stringify({message, bounds})
                );
                if (message.includes('w!') || message.includes('ffzW'))
                    assert.ok(Math.abs(bounds.stack.width - (message.includes('Wide') ? 480 : 80)) < 1, JSON.stringify({message, bounds}));
            }
            await page.evaluate(() => document.getElementById('zero_geometry').remove());
        }
        // A media preview starts below the nick/badges and does not move their baseline.
        const mediaLayout = await page.evaluate(async () => {
            ClassicFeatures_set('chat_images', true);
            const host = document.createElement('div');
            host.id = 'media_layout';
            host.style.cssText = 'position:fixed;top:100px;left:20px;width:700px;z-index:999;background:#18181b;color:white';
            const badge = '<img class="badge" style="width:24px;height:24px" src="https://fixture.test/badge.png">';
            for (const [id, message] of [
                ['plain', 'Before'],
                ['media', 'Before https://example.test/a.png https://example.test/b.webp After']
            ]) {
                const line = document.createElement('div');
                line.id = 'media_' + id;
                line.className = 'chat_line';
                line.style.cssText = 'font:24px/1.4 Inter';
                line.innerHTML =
                    badge +
                    '<span class="classic-chat-nick">Nickname:</span> <span class="message">' +
                    ClassicChat_render([message], 0, 0) +
                    '</span>';
                host.appendChild(line);
            }
            document.body.appendChild(host);
            await Promise.all([...host.querySelectorAll('img')].map(i => i.decode()));
            const rect = e => {
                const r = e.getBoundingClientRect();
                return {top: r.top, bottom: r.bottom, left: r.left, height: r.height};
            };
            const plain = host.querySelector('#media_plain'),
                line = host.querySelector('#media_media');
            const result = {
                plain: rect(plain),
                line: rect(line),
                plainNick: rect(plain.querySelector('.classic-chat-nick')),
                nick: rect(line.querySelector('.classic-chat-nick')),
                plainBadge: rect(plain.querySelector('.badge')),
                badge: rect(line.querySelector('.badge')),
                images: [...line.querySelectorAll('.classic-chat-image')].map(rect)
            };
            host.remove();
            ClassicFeatures_set('chat_images', false);
            return result;
        });
        assert.ok(
            Math.abs(mediaLayout.plainNick.top - mediaLayout.plain.top - (mediaLayout.nick.top - mediaLayout.line.top)) < 1,
            JSON.stringify(mediaLayout)
        );
        assert.ok(
            Math.abs(mediaLayout.plainBadge.top - mediaLayout.plain.top - (mediaLayout.badge.top - mediaLayout.line.top)) < 1,
            JSON.stringify(mediaLayout)
        );
        assert.ok(mediaLayout.images[0].top >= Math.max(mediaLayout.nick.bottom, mediaLayout.badge.bottom), JSON.stringify(mediaLayout));
        assert.ok(mediaLayout.images[1].top >= mediaLayout.images[0].bottom, JSON.stringify(mediaLayout));
        const chat = await page.evaluate(() => {
            Main_HideWelcomeDialog();
            Main_HideWarningDialog();
            const base = '<img class="emoticon" style="width:1em" src="https://cdn.7tv.app/emote/base/1x.webp">';
            extraEmotes[0] = {Base: {chat_div: base}, Overlay: {chat_div: base.replace('width:1em', 'width:20em'), chat_div_zero: base}};
            const el = document.createElement('div');
            el.id = 'feature_fixture';
            el.style.fontSize = '24px';
            document.body.appendChild(el);
            el.innerHTML = ChatLive_extraMessageTokenize(['w! ', [base], ' ffzX Overlay text s! Base'], 0, 0);
            const first = el.querySelector('.classic-emote-wide');
            const result = {
                stackWidth: el.querySelector('.classic-emote-stack').getBoundingClientRect().width,
                stack: el.querySelectorAll('.classic-emote-stack').length,
                layers: el.querySelector('.classic-emote-stack').children.length,
                flip: !!el.querySelector('.classic-emote-flip-x'),
                shake: !!el.querySelector('.classic-emote-shake'),
                wideTransform: getComputedStyle(first.querySelector('.classic-emote-stretch-content')).transform,
                text: el.textContent
            };
            ClassicFeatures_set('emote_modifiers', false);
            result.disabled = ChatLive_extraMessageTokenize(['w! Base ffzX'], 0, 0);
            ClassicFeatures_set('emote_modifiers', true);
            const before = ClassicChat_render(['https://example.test/image.png'], 0, 0);
            ClassicFeatures_set('chat_images', true);
            const after = ClassicChat_render(
                ['https://example.test/image.png https://example.test/a.webp https://example.test/b.jpg javascript:evil https://example.test/x.svg'],
                0,
                0
            );
            result.imagesBefore = before.includes('classic-chat-image');
            result.imagesAfter = (after.match(/loading="lazy"/g) || []).length;
            result.svg = after.includes('src="https://example.test/x.svg"');
            result.escape = ClassicChat_render(['<img src=x onerror=evil()> &lt;script&gt;'], 0, 0);
            result.proxyDefault = ClassicFeatures_enabled('emote_proxy');
            ClassicFeatures_set('emote_proxy', true);
            result.proxy = ClassicFeatures_proxyUrl('https://cdn.7tv.app/emote/test/1x.webp');
            result.twitch = ClassicFeatures_proxyUrl('https://gql.twitch.tv/gql');
            result.other = ClassicFeatures_proxyUrl('https://example.test/test');
            ClassicFeatures_set('emote_proxy', false);
            ChatLive_loadEmotesseven_tv(
                {
                    emotes: [
                        {
                            name: 'CombinedFlags',
                            data: {
                                name: 'CombinedFlags',
                                id: 'id',
                                flags: 768,
                                host: {url: '//cdn.7tv.app/emote/id', files: [{name: '1x.webp', format: 'WEBP', width: 28, height: 28}]}
                            }
                        }
                    ]
                },
                0,
                true
            );
            result.combinedFlags = !!extraEmotes[0].CombinedFlags.chat_div_zero;
            result.liveTimer = getComputedStyle(document.getElementById('stream_live_time')).display;
            result.watchTimer = getComputedStyle(document.getElementById('stream_watching_time')).display;
            el.remove();
            return result;
        });
        assert.ok(chat.stackWidth < 100, String(chat.stackWidth));
        assert.equal(chat.stack, 1);
        assert.equal(chat.layers, 2);
        assert.equal(chat.flip, true);
        assert.equal(chat.shake, true);
        assert.match(chat.wideTransform, /matrix\(2,/);
        assert.equal(chat.text.trim(), 'text');
        assert.match(chat.disabled, /w!/);
        assert.match(chat.disabled, /ffzX/);
        assert.equal(chat.imagesBefore, false);
        assert.equal(chat.imagesAfter, 2);
        assert.equal(chat.svg, false);
        assert.ok(!chat.escape.includes('<img'));
        assert.equal(chat.proxyDefault, false);
        assert.match(chat.proxy, /ext\.rte\.net\.ru:8443/);
        assert.equal(chat.twitch, 'https://gql.twitch.tv/gql');
        assert.equal(chat.other, 'https://example.test/test');
        assert.equal(chat.combinedFlags, true);
        assert.notEqual(chat.liveTimer, 'none');
        assert.notEqual(chat.watchTimer, 'none');
        await page.evaluate(() => {
            Main_showSettings();
            ClassicFeatures_menu('chat');
        });
        assert.equal(await page.locator('#classic_preferences_rows button').count(), 5);
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => ClassicFeatures_enabled('emote_modifiers')), false);
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => ClassicFeatures_enabled('emote_modifiers')), true);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => ClassicFeatures_enabled('emote_proxy')), true);
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => ClassicFeatures_enabled('emote_proxy')), false);
        assert.equal(await page.evaluate(() => document.activeElement === document.querySelectorAll('#classic_preferences_rows button')[3]), true);
        await page.keyboard.press('Escape');
        await page.keyboard.press('Escape');
        // Exercise the real native callback-name bridge, not a replacement FullxmlHttpGet.
        const watch = await page.evaluate(() => {
            window.fixtureRequests = [];
            window.fixtureNow = 1000000;
            window.fixturePlayback = true;
            window.savedNow = Date.now;
            Date.now = () => fixtureNow;
            window.Android = new Proxy(
                {},
                {
                    get: (_, name) =>
                        name === 'getPlaybackState'
                            ? () => fixturePlayback
                            : name === 'BasexmlHttpGet'
                              ? function (url, timeout, body, method, headers, callback, check, key, success, failure) {
                                    if (typeof window[success] !== 'function' || typeof window[failure] !== 'function')
                                        throw Error('Unnamed callback');
                                    fixtureRequests.push({url, body, method, headers, callback, check, key, success, failure});
                                }
                              : () => ''
                }
            );
            window.fixtureReply = function (r, body, status = 200) {
                smartTwitchTV[r.callback](
                    JSON.stringify({status, responseText: typeof body === 'string' ? body : JSON.stringify(body)}),
                    r.key,
                    r.success,
                    r.failure,
                    r.check
                );
            };
            Main_IsOn_OSInterface = true;
            Main_isStopped = false;
            Play_isOn = true;
            Play_Playing = true;
            PlayVod_isOn = false;
            PlayClip_isOn = false;
            Play_EndDialogEnter = 0;
            Play_MultiEnable = false;
            PlayExtra_PicturePicture = false;
            AddUser_UsernameArray = [{id: '123', name: 'viewer', access_token: 'private-fixture-token'}];
            Play_data.data = [
                '',
                'Streamer',
                'Stream',
                'Game',
                100,
                'en',
                'streamer',
                'broadcast',
                false,
                '',
                false,
                '',
                '2026-11-15T00:00:00Z',
                100,
                '456'
            ];
            HttpGetSetUserHeader();
            window.tick = function (count) {
                for (let i = 0; i < count; i++) {
                    fixtureNow += 5000;
                    PlayChannelPoints_SendMinuteWatched();
                }
            };
            PlayChannelPoints_Start();
            Main_clearInterval(PlayChannelPoints_IntervalId);
            fixtureReply(fixtureRequests[0], '<script src="https://assets.twitch.tv/config/settings.fixture.js"></script>');
            fixtureReply(
                fixtureRequests[1],
                'var settings={"spade_url":"https://spade.twitch.tv/track","beacon_url":"https://beacon.twitch.tv/track"}'
            );
            tick(11);
            const before = fixtureRequests.filter(r => r.url.includes('/track')).length;
            tick(1);
            const report = fixtureRequests.find(r => r.url.includes('/track'));
            const payload = JSON.parse(atob(decodeURIComponent(report.body.slice(5))));
            const bonus = fixtureRequests.find(r => r.body && r.body.includes('availableClaim'));
            fixtureReply(bonus, {data: {user: {id: '456', channel: {self: {communityPoints: {balance: 100, availableClaim: {id: 'claim-id'}}}}}}});
            const claim = fixtureRequests.find(r => r.body && r.body.includes('claimCommunityPoints'));
            fixtureReply(claim, {data: {claimCommunityPoints: {currentPoints: 150, error: null}}});
            fixtureReply(report, '', 204);
            fixturePlayback = false;
            tick(20);
            const paused = fixtureRequests.filter(r => r.url.includes('/track')).length;
            fixturePlayback = true;
            tick(1);
            Main_isStopped = true;
            tick(20);
            Main_isStopped = false;
            const background = fixtureRequests.filter(r => r.url.includes('/track')).length;
            fixtureNow += 600000;
            PlayChannelPoints_SendMinuteWatched();
            const slept = fixtureRequests.filter(r => r.url.includes('/track')).length;
            PlayVod_isOn = true;
            tick(12);
            PlayVod_isOn = false;
            const vod = fixtureRequests.filter(r => r.url.includes('/track')).length;
            const rejected = !PlayChannelPoints_TrustedUrl('https://twitch.tv.evil.test/track');
            PlayChannelPoints_Stop();
            // A late claim from the previous channel must do nothing.
            const count = fixtureRequests.length;
            fixtureReply(bonus, {data: {user: {id: '456', channel: {self: {communityPoints: {balance: 100, availableClaim: {id: 'old'}}}}}}});
            const lateIgnored = count === fixtureRequests.length;
            Date.now = savedNow;
            return {
                before,
                payload,
                paused,
                background,
                slept,
                vod,
                rejected,
                lateIgnored,
                claim: JSON.parse(claim.body).query,
                reported: !!PlayChannelPoints_LastReport,
                headers: report.headers
            };
        });
        assert.equal(watch.before, 0);
        assert.equal(watch.payload.event, 'minute-watched');
        assert.equal(watch.payload.properties.user_id, 123);
        assert.equal(watch.payload.properties.channel_id, '456');
        for (const name of ['paused', 'background', 'slept', 'vod']) assert.equal(watch[name], 1, name);
        assert.equal(watch.rejected, true);
        assert.equal(watch.lateIgnored, true);
        assert.match(watch.claim, /claim-id/);
        assert.equal(watch.reported, true);
        assert.ok(!watch.headers.includes('private-fixture-token'));
        const raid = await page.evaluate(() => {
            Play_isOn = true;
            PlayVod_isOn = false;
            PlayClip_isOn = false;
            window.fixtureRequests = [];
            window.WebSocket = function (url) {
                this.url = url;
                this.readyState = 1;
                this.close = () => {};
            };
            PlayRaid_SetChannel('456');
            PlayRaid_onMessage({data: JSON.stringify({metadata: {message_type: 'session_welcome'}, payload: {session: {id: 'session'}}})});
            const sub = fixtureRequests[0];
            fixtureReply(sub, {data: [{id: 'subscription', condition: {from_broadcaster_user_id: '456'}}]}, 202);
            window.raidOpened = 0;
            Main_openStream = () => {
                raidOpened++;
            };
            Play_SavePlayData = () => {};
            PlayRaid_HandleRaid({from_broadcaster_user_id: 'other', to_broadcaster_user_login: 'target'});
            const ignored = fixtureRequests.length === 1;
            PlayRaid_HandleRaid({from_broadcaster_user_id: '456', to_broadcaster_user_login: 'target', to_broadcaster_user_name: 'Target'});
            const target = fixtureRequests[fixtureRequests.length - 1];
            const stream = {
                id: 'new-broadcast',
                user_id: '999',
                user_login: 'target',
                user_name: 'Target',
                title: 'Target live',
                game_name: 'Game',
                viewer_count: 100,
                thumbnail_url: '',
                started_at: '2026-11-15T00:00:00Z',
                language: 'en',
                type: 'live'
            };
            fixtureReply(target, {data: [stream]});
            const opened = raidOpened;
            PlayRaid_Close();
            fixtureReply(target, {data: [stream]});
            return {body: JSON.parse(sub.body), ignored, opened, afterClose: raidOpened};
        });
        assert.equal(raid.body.type, 'channel.raid');
        assert.equal(raid.body.condition.from_broadcaster_user_id, '456');
        assert.equal(raid.ignored, true);
        assert.equal(raid.opened, 1);
        assert.equal(raid.afterClose, 1);
        assert.deepEqual(errors, []);
        console.log(
            'PASS: combined 7TV flags, zero-width layers across native emotes, prefix/suffix modifiers, bounded opt-in images, proxy off/no Twitch auth forwarding, both overlay timers; native callback dispatch, active-minute telemetry, bonus claims, paused/background/sleep/VOD exclusion, stale claims, raid subscription/switch/stale-response checks'
        );
    } finally {
        await browser.close();
    }
})().catch(error => {
    console.error(error);
    process.exit(1);
});
