/* Compact chat chrome and Twitch-supplied name colours. GPL-3.0-or-later. */
function ClassicChatPresentation_apply() {
    var modern = PlayClassic_enabled();
    [0, 1].forEach(function (number) {
        var container = document.getElementById('chat_container' + number),
            inner = document.getElementById('chat_inner_container' + number),
            counter = document.getElementById('chat_loggedin' + number),
            header = document.getElementById('classic_chat_header' + number);
        if (!container || !inner || !counter) return;
        if (!header) {
            header = document.createElement('div');
            header.id = 'classic_chat_header' + number;
            header.className = 'classic-chat-header';
            var title = document.createElement('span');
            title.className = 'classic-chat-title';
            header.appendChild(title);
            container.insertBefore(header, inner);
        }
        header.querySelector('.classic-chat-title').textContent = ClassicShell_ru() ? 'Чат' : 'Chat';
        if (modern) header.appendChild(counter);
        else inner.insertBefore(counter, inner.firstChild);
        var holder = document.getElementById('chat_box_holder' + number);
        holder.style.height = modern || counter.classList.contains('hide') ? '' : 'calc(100% - 2.9vh)';
        if (counter.hasAttribute('data-count'))
            ClassicChatPresentation_counter(
                number,
                counter.dataset.count === '' ? null : Number(counter.dataset.count),
                counter.dataset.countType,
                counter.dataset.countLabel || counter.title
            );
        if (modern) document.getElementById('chat_container_name' + number).style.top = '';
    });
}
function ClassicChatPresentation_counter(number, count, type, label) {
    var counter = document.getElementById('chat_loggedin' + number);
    if (!counter) return;
    counter.dataset.count = count === null ? '' : String(count);
    counter.dataset.countType = type;
    counter.dataset.countLabel = String(label).replace(/&nbsp;/g, ' ');
    counter.title = counter.dataset.countLabel;
    counter.setAttribute('aria-label', counter.title);
    if (!PlayClassic_enabled()) {
        counter.innerHTML = label;
        return;
    }
    counter.replaceChildren();
    var icon = document.createElement('span');
    icon.className = 'classic-chat-count-icon';
    icon.setAttribute('aria-hidden', 'true');
    if (type === 'viewers')
        icon.innerHTML =
            '<svg viewBox="0 0 20 20" fill="none"><path d="M1.5 10s3-5.5 8.5-5.5 8.5 5.5 8.5 5.5-3 5.5-8.5 5.5S1.5 10 1.5 10Z" stroke="currentColor" stroke-width="1.6"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.6"/></svg>';
    else icon.className += ' icon-users';
    var value = document.createElement('span');
    value.className = 'classic-chat-count-value';
    value.textContent = count === null ? '…' : Main_formatNumber(count);
    counter.appendChild(icon);
    counter.appendChild(value);
    if (type === 'viewers' && count !== null && counter.dataset.connectedCount !== undefined && ClassicFeatures_enabled('connected_chatters')) {
        var connected = document.createElement('span');
        connected.className = 'classic-chat-connected-count';
        connected.textContent = ' (' + Main_formatNumber(Number(counter.dataset.connectedCount)) + ')';
        counter.appendChild(connected);
        label =
            counter.dataset.countLabel + '; ' + (ClassicShell_ru() ? 'Подключены к чату: ' : 'Connected to chat: ') + counter.dataset.connectedCount;
    }

    counter.title = String(label).replace(/&nbsp;/g, ' ');
    counter.setAttribute('aria-label', counter.title);
    counter.dataset.countType = type;
}
function ClassicChatPresentation_nameColor(color, name) {
    if (typeof color === 'string' && /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(color)) return color;
    // Twitch may omit a colour. Keep the fallback stable rather than changing it per message.
    var hash = 0,
        text = String(name || '').toLowerCase();
    for (var i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    return defaultColors[hash % defaultColors.length];
}

function ClassicChatPresentation_refreshCount(number) {
    var counter = document.getElementById('chat_loggedin' + number);
    if (counter && counter.hasAttribute('data-count'))
        ClassicChatPresentation_counter(
            number,
            counter.dataset.count === '' ? null : Number(counter.dataset.count),
            counter.dataset.countType,
            counter.dataset.countLabel || ''
        );
}
function ClassicChatPresentation_resetCounts(number) {
    var counter = document.getElementById('chat_loggedin' + number);
    if (counter) delete counter.dataset.connectedCount;
    if (!number) ClassicChatPresentation_overlayCount();
}
function ClassicChatPresentation_connected(number, count) {
    if (!Number.isFinite(count) || count < 0) return;
    var counter = document.getElementById('chat_loggedin' + number);
    if (!counter) return;
    counter.dataset.connectedCount = String(count);
    ClassicChatPresentation_refreshCount(number);
    if (!number) ClassicChatPresentation_overlayCount();
}
function ClassicChatPresentation_overlayCount() {
    var target = document.getElementById('stream_live_viewers'),
        counter = document.getElementById('chat_loggedin0');
    if (!target) return;
    var old = target.querySelector('.classic-chat-connected-count');
    if (old) old.remove();
    if (
        !counter ||
        counter.dataset.connectedCount === undefined ||
        !ClassicFeatures_enabled('connected_chatters') ||
        !PlayClassic_enabled() ||
        !Play_isOn ||
        Play_MultiEnable ||
        String(Play_data.data[14]) !== String(ChatLive_selectedChannel_id[0])
    )
        return;
    var extra = document.createElement('span');
    extra.className = 'classic-chat-connected-count';
    extra.textContent = ' (' + Main_formatNumber(Number(counter.dataset.connectedCount)) + ')';
    extra.title = ClassicShell_ru() ? 'Подключены к чату' : 'Connected to chat';
    target.appendChild(extra);
}

// Cache by colour, not by user/message. No DOM measurement or image filters in
// the chat hot path. The source colour remains on each nick for exact restoration.
var ClassicChatPresentation_colourCache = {},
    ClassicChatPresentation_colourCacheSize = 0;
function ClassicChatPresentation_readableColor(source) {
    if (!ClassicFeatures_enabled('readable_nicks')) return source;
    var hex = source.slice(1);
    if (hex.length === 3)
        hex = hex
            .split('')
            .map(function (c) {
                return c + c;
            })
            .join('');
    var key = hex.toLowerCase();
    if (ClassicChatPresentation_colourCache[key]) return ClassicChatPresentation_colourCache[key];
    var rgb = [0, 2, 4].map(function (i) {
        return parseInt(hex.slice(i, i + 2), 16);
    });
    function luminance(values) {
        return values
            .map(function (v) {
                v /= 255;
                return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
            })
            .reduce(function (sum, v, i) {
                return sum + v * [0.2126, 0.7152, 0.0722][i];
            }, 0);
    }
    var minimum = 4.5 * (luminance([24, 24, 27]) + 0.05) - 0.05;
    var adjusted = source;
    if (luminance(rgb) < minimum) {
        var low = 0,
            high = 1;
        // Mixing with white preserves the hue. Find the least brightening that
        // meets 4.5:1 on the dark chat background, including originally black nicks.
        for (var i = 0; i < 12; i++) {
            var mix = (low + high) / 2;
            if (
                luminance(
                    rgb.map(function (v) {
                        return v + (255 - v) * mix;
                    })
                ) < minimum
            )
                low = mix;
            else high = mix;
        }
        adjusted =
            '#' +
            rgb
                .map(function (v) {
                    return Math.ceil(v + (255 - v) * high)
                        .toString(16)
                        .padStart(2, '0');
                })
                .join('');
    }
    if (ClassicChatPresentation_colourCacheSize >= 512) {
        ClassicChatPresentation_colourCache = {};
        ClassicChatPresentation_colourCacheSize = 0;
    }
    ClassicChatPresentation_colourCache[key] = adjusted;
    ClassicChatPresentation_colourCacheSize++;
    return adjusted;
}
function ClassicChatPresentation_nickAttributes(color, name) {
    var source = ClassicChatPresentation_nameColor(color, name);
    return 'data-twitch-color="' + source + '" style="color: ' + ClassicChatPresentation_readableColor(source) + ';"';
}
function ClassicChatPresentation_refreshNickColors() {
    document.querySelectorAll('[data-twitch-color]').forEach(function (element) {
        var source = element.dataset.twitchColor;
        if (/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(source)) element.style.color = ClassicChatPresentation_readableColor(source);
    });
}
