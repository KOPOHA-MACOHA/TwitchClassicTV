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
        await page.goto('http://127.0.0.1:8765/app/index.html');
        await page.waitForFunction(() => typeof ClassicChat_render === 'function' && !!ScreenObj[Main_Live].tableDoc);
        await page.keyboard.press('Escape');
        await page.evaluate(() => {
            Main_HideWelcomeDialog();
            Main_HideWarningDialog();
            ClassicFeatures_set('emote_modifiers', true);
            const emote = (name, width, color) =>
                '<img data-emote="' +
                name +
                '" class="emoticon" style="width:' +
                width +
                'px;height:40px" src="data:image/svg+xml,' +
                encodeURIComponent(
                    '<svg xmlns="http://www.w3.org/2000/svg" width="' +
                        width +
                        '" height="40"><rect width="100%" height="100%" fill="' +
                        color +
                        '"/></svg>'
                ) +
                '">';
            extraEmotes[0] = {
                Left: {chat_div: emote('left', 40, '#00aaff')},
                Right: {chat_div: emote('right', 40, '#00aaff')},
                Base: {chat_div: emote('base', 40, '#ff3333')},
                Wide: {chat_div: emote('wide', 80, '#ff3333')},
                Overlay: {chat_div: emote('overlay', 800, '#44ff99'), chat_div_zero: 'yes'}
            };
        });
        const messages = [
            'Left Base Overlay Right',
            'Left w! Wide Overlay Right',
            'Left Wide Overlay ffzW Right',
            'Left w! Wide Overlay w! Wide Overlay Right',
            'Left h! w! Wide Overlay Right',
            'Left w! l! Wide Overlay Right',
            'Left l! Wide Overlay Right',
            'Left r! Wide Overlay Right',
            'Left c! Wide Overlay Right',
            'Left s! Wide Overlay Right',
            'Left p! Wide Overlay Right',
            'Left v! Wide Overlay Right',
            'Left z! Overlay Right',
            'Left Base Overlay Base Overlay Right',
            'Left w! Wide Overlay c! Base Overlay s! Base Overlay Right'
        ];
        for (const width of [200, 420])
            for (const message of messages) {
                await page.evaluate(
                    async ({width, message}) => {
                        document.getElementById('layout_fixture')?.remove();
                        const fixture = document.createElement('div');
                        fixture.id = 'layout_fixture';
                        fixture.className = 'chat_line';
                        fixture.style.cssText =
                            'position:fixed;top:20px;left:20px;z-index:999;width:' + width + 'px;font:24px/1.4 Inter;background:#18181b;color:white';
                        fixture.innerHTML =
                            '<span id="layout_nick">Nickname: </span><span id="layout_message">Before ' +
                            ClassicChat_render([message], 0, 0) +
                            ' After</span>';
                        document.body.appendChild(fixture);
                        await Promise.all([...fixture.querySelectorAll('img')].map(i => i.decode()));
                    },
                    {width, message}
                );
                // Sample several phases of the shake animation, including after line wrapping.
                for (let phase = 0; phase < 4; phase++) {
                    await page.waitForTimeout(43);
                    const layout = await page.evaluate(() => {
                        const message = document.getElementById('layout_message');
                        const rect = e => {
                            const r = e.getBoundingClientRect();
                            return {left: r.left, right: r.right, top: r.top, bottom: r.bottom};
                        };
                        const roots = [];
                        for (const image of message.querySelectorAll('img')) {
                            let root = image;
                            while (root.parentElement !== message) root = root.parentElement;
                            if (!roots.includes(root)) roots.push(root);
                        }
                        const imagePaint = [];
                        for (const image of message.querySelectorAll('img')) {
                            let paint = rect(image),
                                parent = image.parentElement;
                            while (parent && parent !== message) {
                                const css = getComputedStyle(parent);
                                if (css.overflowX === 'hidden' || css.overflowX === 'clip') {
                                    const clip = rect(parent);
                                    paint = {
                                        left: Math.max(paint.left, clip.left),
                                        right: Math.min(paint.right, clip.right),
                                        top: Math.max(paint.top, clip.top),
                                        bottom: Math.min(paint.bottom, clip.bottom)
                                    };
                                }
                                parent = parent.parentElement;
                            }
                            let root = image;
                            while (root.parentElement !== message) root = root.parentElement;
                            imagePaint.push({root: roots.indexOf(root), paint, name: image.dataset.emote});
                        }
                        const words = [];
                        const walker = document.createTreeWalker(message, NodeFilter.SHOW_TEXT);
                        while (walker.nextNode()) {
                            const node = walker.currentNode;
                            if (!node.textContent.trim()) continue;
                            const range = document.createRange();
                            range.selectNodeContents(node);
                            for (const r of range.getClientRects()) words.push({left: r.left, right: r.right, top: r.top, bottom: r.bottom});
                        }
                        return {boxes: roots.map(rect), nick: rect(document.getElementById('layout_nick')), imagePaint, words};
                    });
                    const overlaps = (a, b) =>
                        Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.8 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.8;
                    for (const image of layout.imagePaint) {
                        assert.ok(!overlaps(image.paint, layout.nick), JSON.stringify({message, width, image, nick: layout.nick}));
                        for (let i = 0; i < layout.boxes.length; i++)
                            if (i !== image.root)
                                assert.ok(
                                    !overlaps(image.paint, layout.boxes[i]),
                                    JSON.stringify({message, width, image, neighbor: layout.boxes[i]})
                                );
                        for (const word of layout.words) assert.ok(!overlaps(image.paint, word), JSON.stringify({message, width, image, word}));
                    }
                }
            }
        await page.screenshot({path: 'tests/emote-layout.png'});
        assert.deepEqual(errors, []);
        console.log(
            'PASS: zero-width/modifier compositions do not overlap nicknames, surrounding words or other emotes; square/wide bases, flips/rotation/stretch/shake, multiple compositions, wrapping and animation phases'
        );
    } finally {
        await browser.close();
    }
})().catch(e => {
    console.error(e);
    process.exit(1);
});
