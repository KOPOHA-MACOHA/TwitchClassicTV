/* Remote navigation for the player chat. GPL-3.0-or-later. */
var ClassicChatScroll = {active: false, paused: false, observer: null, anchor: null, anchorTop: 0};

function ClassicChatScroll_available() {
    return PlayClassic_enabled() && Main_isScene2DocVisible() && Play_isChatShown();
}

function ClassicChatScroll_render() {
    var container = document.getElementById('chat_container0');
    var button = document.getElementById('classic_chat_resume');
    container.classList.toggle('classic-chat-scroll-focus', ClassicChatScroll.active);
    container.classList.toggle('classic-chat-scroll-footer', ClassicChatScroll.active || ClassicChatScroll.paused);
    button.hidden = !ClassicChatScroll.active && !ClassicChatScroll.paused;
    button.textContent = ClassicChatScroll.paused
        ? ClassicShell_ru() ? 'К новым сообщениям' : 'Jump to latest'
        : ClassicShell_ru() ? '↑ Листать чат · Назад — плеер' : '↑ Scroll chat · Back — player';
    button.setAttribute('aria-disabled', String(!ClassicChatScroll.paused));
}

function ClassicChatScroll_enter() {
    if (!ClassicChatScroll_available()) return false;
    PlayClassic_close();
    Play_clearHidePanel();
    Play_ForceHidePannel();
    ClassicChatScroll.active = true;
    ClassicChatScroll_render();
    document.getElementById('classic_chat_resume').focus({preventScroll: true});
    return true;
}

function ClassicChatScroll_anchor(holder) {
    var children = Chat_div[0].children;
    var top = holder.getBoundingClientRect().top;
    // Rows are ordered oldest to newest on screen, even with the rotated viewport.
    var low = 0, high = children.length;
    while (low < high) {
        var mid = Math.floor((low + high) / 2);
        if (children[mid].getBoundingClientRect().bottom <= top) low = mid + 1;
        else high = mid;
    }
    ClassicChatScroll.anchor = children[low] || null;
    if (ClassicChatScroll.anchor) ClassicChatScroll.anchorTop = ClassicChatScroll.anchor.getBoundingClientRect().top - top;
}

function ClassicChatScroll_preserve() {
    if (!ClassicChatScroll.paused) return;
    var holder = document.getElementById('chat_box_holder0');
    var anchor = ClassicChatScroll.anchor;
    if (!anchor || anchor.parentNode !== Chat_div[0]) {
        // The history buffer can fill in a busy stream. Keep the oldest line still available.
        holder.scrollTop = holder.scrollHeight;
        ClassicChatScroll_anchor(holder);
        return;
    }
    var change = ClassicChatScroll.anchorTop - (anchor.getBoundingClientRect().top - holder.getBoundingClientRect().top);
    if (Math.abs(change) >= 1) holder.scrollTop += change;
}

function ClassicChatScroll_move(direction) {
    var holder = document.getElementById('chat_box_holder0');
    if (!ClassicChatScroll.paused && (direction < 0 || holder.scrollHeight <= holder.clientHeight)) return;
    if (ClassicChatScroll.paused) ClassicChatScroll_preserve();
    holder.scrollTop += direction * Math.max(48, holder.clientHeight * 0.22);
    if (!ClassicChatScroll.paused && holder.scrollTop > 0) {
        ClassicChatScroll.paused = true;
        ClassicChatScroll.observer = new ResizeObserver(ClassicChatScroll_preserve);
        ClassicChatScroll.observer.observe(Chat_div[0]);
        ClassicChatScroll.observer.observe(holder);
        ClassicChatScroll_render();
    }
    if (ClassicChatScroll.paused) ClassicChatScroll_anchor(holder);
}

function ClassicChatScroll_resume() {
    if (ClassicChatScroll.observer) ClassicChatScroll.observer.disconnect();
    ClassicChatScroll.observer = null;
    ClassicChatScroll.paused = false;
    ClassicChatScroll.anchor = null;
    document.getElementById('chat_box_holder0').scrollTop = 0;
    ClassicChatScroll_render();
}

function ClassicChatScroll_reset() {
    if (!ClassicChatScroll.active && !ClassicChatScroll.paused) return;
    ClassicChatScroll.active = false;
    ClassicChatScroll_resume();
}

function ClassicChatScroll_key(event, kind) {
    if (!ClassicChatScroll.active) return false;
    if (!ClassicChatScroll_available()) {
        ClassicChatScroll_reset();
        return false;
    }
    var key = event.keyCode;
    PlayClassic_consumedKey = key;
    event.preventDefault();
    event.stopPropagation();
    Play_screeOn();
    if (key === KEY_UP || key === KEY_DOWN) ClassicChatScroll_move(key === KEY_UP ? 1 : -1);
    else if (key === KEY_ENTER && !event.repeat && !PlayClassic_waitForRelease && ClassicChatScroll.paused) {
        ClassicChatScroll_resume();
        Chat_Clean(0);
    } else if ((key === KEY_RETURN || key === KEY_KEYBOARD_BACKSPACE) && !event.repeat) {
        ClassicChatScroll.active = false;
        ClassicChatScroll_render();
        document.getElementById('classic_chat_resume').blur();
        if (kind === 1) Play_showPanel();
        else if (kind === 2) PlayVod_showPanel(true);
        else PlayClip_showPanel();
        PlayClassic_focusRow({y: 2, key: Play_controlsChat});
    }
    return true;
}
