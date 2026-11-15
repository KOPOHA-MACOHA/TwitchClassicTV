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
                counter.title
            );
        if (modern) document.getElementById('chat_container_name' + number).style.top = '';
    });
}
function ClassicChatPresentation_counter(number, count, type, label) {
    var counter = document.getElementById('chat_loggedin' + number);
    if (!counter) return;
    counter.dataset.count = count === null ? '' : String(count);
    counter.dataset.countType = type;
    counter.title = String(label).replace(/&nbsp;/g, ' ');
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
