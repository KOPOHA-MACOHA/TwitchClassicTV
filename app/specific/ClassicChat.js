/* Chat composition for Twitch Classic. GPL-3.0-or-later.
 * Supports FFZ/BTTV modifier syntax and 7TV zero-width overlays without post-render replacement.
 */
var ClassicChat_modifiers = {
    'w!': 'wide',
    'h!': 'flip-x',
    'v!': 'flip-y',
    'z!': 'zero-space',
    'c!': 'cursed',
    'l!': 'left',
    'r!': 'right',
    'p!': 'party',
    's!': 'shake',
    ffzW: 'wide',
    ffzX: 'flip-x',
    ffzY: 'flip-y',
    ffzCursed: 'cursed'
};
function ClassicChat_escape(value) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function ClassicChat_image(token) {
    if (!ClassicFeatures_enabled('chat_images')) return null;
    try {
        var url = new URL(token);
        if (url.protocol !== 'https:' || url.username || url.password || !/\.(png|jpe?g|gif|webp|avif)$/i.test(url.pathname)) return null;
        return (
            '<span class="classic-chat-image"><img loading="lazy" decoding="async" referrerpolicy="no-referrer" src="' +
            ClassicChat_escape(url.href) +
            '" alt="' +
            ClassicChat_escape(token) +
            '" onerror="this.parentNode.classList.add(\'failed\');this.remove();"><span>' +
            ClassicChat_escape(token) +
            '</span></span>'
        );
    } catch (error) {
        return null;
    }
}
function ClassicChat_render(chunks, chatNumber, bits) {
    var result = [],
        pending = [],
        last = null,
        imageCount = 0,
        enabled = ClassicFeatures_enabled('emote_modifiers'),
        imagesEnabled = ClassicFeatures_enabled('chat_images');
    function flush() {
        if (pending.length) result.push({html: pending.map(ClassicChat_escape).join(' ')});
        pending = [];
    }
    function appendEmote(html, zero) {
        // z! is a zero-width overlay on the previous emote, never a zero-size
        // inline box at the start of a message (which can paint over the nick).
        if (
            pending.some(function (token) {
                return ClassicChat_modifiers[token] === 'zero-space';
            })
        ) {
            zero = true;
            pending = pending.filter(function (token) {
                return ClassicChat_modifiers[token] !== 'zero-space';
            });
        }
        if (zero && last) {
            pending.forEach(function (token) {
                html = '<span class="classic-emote-effect classic-emote-' + ClassicChat_modifiers[token] + '">' + html + '</span>';
            });
            pending = [];
            last.layers.push(html);
            return;
        }
        last = {
            html: html,
            layers: [],
            modifiers: pending.map(function (token) {
                return ClassicChat_modifiers[token];
            })
        };
        pending = [];
        result.push(last);
    }
    chunks.forEach(function (chunk) {
        if (Array.isArray(chunk)) {
            appendEmote(chunk[0], false);
            return;
        }
        String(chunk || '')
            .split(/\s+/)
            .forEach(function (token) {
                if (!token) return;
                var modifier = enabled && ClassicChat_modifiers[token],
                    emote = extraEmotes[chatNumber] && extraEmotes[chatNumber][token];
                if (modifier && token.slice(-1) === '!') {
                    pending.push(token);
                    return;
                }
                if (modifier && last) {
                    last.modifiers.push(modifier);
                    return;
                }
                if (emote) {
                    appendEmote(emote.chat_div, !!emote.chat_div_zero);
                    return;
                }
                flush();
                last = null;
                var cheer = bits ? findCheerInToken(token, chatNumber) : null,
                    image = imagesEnabled && imageCount < 2 && /^https:\/\//i.test(token) ? ClassicChat_image(token) : null;
                if (image) imageCount++;
                result.push({html: cheer || image || twemoji.parse(ClassicChat_escape(token), true, true)});
            });
    });
    flush();
    return (
        result
            .map(function (item) {
                if (!item.layers) return item.html;
                var html = item.html;
                if (item.layers.length)
                    html =
                        '<span class="classic-emote-stack">' +
                        html +
                        item.layers
                            .map(function (layer) {
                                return '<span class="classic-emote-layer">' + layer + '</span>';
                            })
                            .join('') +
                        '</span>';
                (item.modifiers || []).forEach(function (modifier) {
                    html = '<span class="classic-emote-effect classic-emote-' + modifier + '">' + html + '</span>';
                });
                return html;
            })
            .join(' ') + (bits ? ' ' + bits + ' bits' : '')
    );
}
