/* Twitch account Continue Watching shelf. GPL-3.0-or-later. */
var ClassicContinue = {account: null, updated: 0, items: [], loading: false, error: false, cached: false, menu: null, request: 0};
var ClassicContinue_query =
    'query ClassicContinueWatching($first:Int!){currentUser{id viewedVideos(first:$first){edges{history{position updatedAt}node{id title lengthSeconds isDeleted status previewThumbnailURL(width:640,height:360) createdAt viewCount language owner{id login displayName profileImageURL(width:70)}}}}}}';
function ClassicContinue_invalidate() {
    ClassicContinue.updated = 0;
}
function ClassicContinue_parse(user, account) {
    if (!user || String(user.id) !== String(account) || !user.viewedVideos || !Array.isArray(user.viewedVideos.edges)) throw Error('History');
    var hidden = {};
    try {
        hidden = JSON.parse(localStorage.getItem('classic_continue_hidden_' + account)) || {};
    } catch (error) {
        /* Empty hidden list. */
    }
    var seen = {};
    return user.viewedVideos.edges
        .slice(0, 50)
        .map(function (edge) {
            if (!edge || !edge.node || !edge.history) return null;
            var video = edge.node,
                position = edge.history.position,
                duration = video.lengthSeconds,
                id = String(video.id || '');
            if (
                !/^\d+$/.test(id) ||
                seen[id] ||
                video.isDeleted ||
                video.status === 'FAILED' ||
                video.status === 'UNPROCESSED' ||
                typeof position !== 'number' ||
                !isFinite(position) ||
                position <= 0 ||
                typeof duration !== 'number' ||
                !isFinite(duration) ||
                duration <= 0 ||
                duration - position <= Math.min(30, duration * 0.02)
            )
                return null;
            seen[id] = true;
            var updated = Date.parse(edge.history.updatedAt) || 0,
                hide = hidden[id];
            if (hide && hide.position === position && hide.updatedAt === updated) return null;
            var owner = video.owner || {};
            return {
                id: id,
                title: String(video.title || ''),
                duration: duration,
                position: Math.floor(position),
                updatedAt: updated,
                image: video.previewThumbnailURL || '',
                createdAt: video.createdAt || '',
                views: Number(video.viewCount) || 0,
                language: video.language || '',
                channel: {
                    id: String(owner.id || ''),
                    login: String(owner.login || ''),
                    displayName: String(owner.displayName || owner.login || ''),
                    image: owner.profileImageURL || ''
                }
            };
        })
        .filter(Boolean)
        .sort(function (a, b) {
            return b.updatedAt - a.updatedAt;
        });
}
function ClassicContinue_load(force) {
    if (!FollowingClassic.active || !AddUser_UserHasToken() || !Main_isScene1DocVisible()) return;
    var account = String(AddUser_UsernameArray[0].id);
    if (!force && ClassicContinue.account === account && ClassicContinue.updated && Date.now() - ClassicContinue.updated < 20000) return;
    ClassicContinue.account = account;
    ClassicContinue.updated = Date.now();
    ClassicContinue.loading = true;
    ClassicContinue.error = false;
    ClassicContinue.cached = false;
    var request = ++ClassicContinue.request;
    // A failed request may use this account's last shelf, never another account's data.
    ClassicContinue.items = [];
    try {
        var stored = JSON.parse(localStorage.getItem('classic_continue_cache_' + account));
        if (stored && Array.isArray(stored.edges)) ClassicContinue.items = ClassicContinue_parse({id: account, viewedVideos: stored}, account);
    } catch (error) {
        /* No offline cache. */
    }
    HttpGetSetUserHeader();
    var headers = Main_OAuth_User_Headers.concat([
        ['Content-Type', 'application/json'],
        ['Cache-Control', 'no-cache']
    ]);
    ClassicPages_request(
        FollowingClassic,
        PlayClip_BaseUrl,
        headers,
        'POST',
        JSON.stringify({operationName: 'ClassicContinueWatching', query: ClassicContinue_query, variables: {first: 50}}),
        function (result) {
            if (request !== ClassicContinue.request || !AddUser_UserHasToken() || String(AddUser_UsernameArray[0].id) !== account) return;
            var user = result.data && result.data.currentUser;
            ClassicContinue.items = ClassicContinue_parse(user, account);
            ClassicContinue.loading = false;
            ClassicContinue.error = false;
            ClassicContinue.cached = false;
            try {
                Main_setItem('classic_continue_cache_' + account, JSON.stringify(user.viewedVideos));
            } catch (error) {
                /* Optional cache. */
            }
            FollowingClassic_render();
        },
        function () {
            if (request !== ClassicContinue.request || ClassicContinue.account !== account) return;
            ClassicContinue.loading = false;
            ClassicContinue.error = true;
            ClassicContinue.cached = ClassicContinue.items.length > 0;
            FollowingClassic_render();
        }
    );
}
function ClassicContinue_render(panel) {
    if (ClassicContinue.account !== String(FollowingClassic.account)) return;
    if (!ClassicContinue.items.length && !ClassicContinue.error && !ClassicContinue.loading) return;
    var ru = ClassicShell_ru(),
        section = ClassicPages_el('section', 'following-section classic-continue-section');
    section.appendChild(ClassicPages_el('h2', '', ru ? 'Продолжить просмотр' : 'Continue watching'));
    var grid = ClassicPages_el('div', 'classic-continue-grid');
    ClassicContinue.items.slice(0, 5).forEach(function (item, index) {
        var key = 'continue:' + item.id,
            button = ClassicPages_el('button', 'following-stream-card classic-continue-card');
        button.type = 'button';
        button.dataset.focusKey = key;
        var frame = ClassicPages_el('div', 'following-card-frame');
        frame.appendChild(ClassicPages_image(item.image, 'following-thumb', IMG_404_VIDEO));
        var progress = ClassicPages_el('div', 'classic-continue-progress'),
            fill = ClassicPages_el('span', '');
        fill.style.width = (100 * item.position) / item.duration + '%';
        progress.appendChild(fill);
        frame.appendChild(progress);
        button.appendChild(frame);
        button.appendChild(ClassicPages_el('strong', 'following-stream-title', item.title));
        button.appendChild(ClassicPages_el('span', 'following-stream-channel', item.channel.displayName));
        button.appendChild(
            ClassicPages_el(
                'span',
                'following-stream-meta',
                (ru ? 'Осталось ' : 'Remaining ') + Play_timeS(Math.max(0, item.duration - item.position))
            )
        );
        button.setAttribute(
            'aria-label',
            item.channel.displayName + ' — ' + item.title + '; ' + (ru ? 'Продолжить с ' : 'Resume at ') + Play_timeS(item.position)
        );
        button.onclick = function () {
            ClassicContinue_open(item, button);
        };
        grid.appendChild(button);
        FollowingClassic.rows.push({key: key, node: button, section: 'continue', item: item});
    });
    section.appendChild(grid);
    if (ClassicContinue.loading) section.appendChild(ClassicPages_el('p', 'following-status', ru ? 'Обновление…' : 'Updating…'));
    else if (ClassicContinue.cached)
        section.appendChild(
            ClassicPages_el(
                'p',
                'following-status',
                ru ? 'Нет связи с Twitch. Показаны последние данные.' : 'Twitch is unavailable. Showing cached history.'
            )
        );
    if (ClassicContinue.error) {
        var retry = ClassicPages_el('button', 'following-retry', ru ? 'Обновить историю Twitch' : 'Retry Twitch history');
        retry.type = 'button';
        retry.onclick = function () {
            ClassicContinue_load(true);
            FollowingClassic_render();
        };
        section.appendChild(retry);
        FollowingClassic.rows.push({key: 'continue:retry', node: retry, section: 'retry'});
    }
    panel.appendChild(section);
}
function ClassicContinue_open(item, button) {
    if (!AddUser_UserHasToken() || String(AddUser_UsernameArray[0].id) !== ClassicContinue.account) return;
    FollowingClassic_stopPreview();
    var screen = ScreenObj[Main_UserLive],
        cell = 'continue_' + item.id;
    button.id = screen.ids[0] + cell;
    var image = button.querySelector('img');
    if (image) image.id = screen.ids[1] + cell;
    var data = [
        item.image,
        item.channel.displayName,
        Main_videoCreatedAt(item.createdAt),
        '',
        Main_formatNumber(item.views),
        '[' + item.language.toUpperCase() + ']',
        item.channel.login,
        item.id,
        null,
        item.language,
        item.title,
        item.duration,
        item.createdAt,
        item.views,
        item.channel.id,
        item.channel.image,
        ''
    ];
    screen.DataObj[cell] = data;
    // Do not turn a possibly stale shelf position into an explicit timestamp.
    // VOD preflight must fetch the account again before choosing the actual start.
    Main_vodOffset = ClassicFeatures_enabled('vod_sync') ? 0 : item.position;
    ClassicVodSync.nextContinue = {account: ClassicContinue.account, video: item.id, position: item.position};
    Play_SetUserHeader();
    Main_OpenVodStart(data, cell, screen.ids, FollowingClassic_key, 'ContinueWatching');
}
function ClassicContinue_hide(item) {
    var hidden = {};
    try {
        hidden = JSON.parse(localStorage.getItem('classic_continue_hidden_' + ClassicContinue.account)) || {};
    } catch (error) {
        /* Empty hidden list. */
    }
    hidden[item.id] = {position: item.position, updatedAt: item.updatedAt};
    var keys = Object.keys(hidden);
    keys.slice(0, Math.max(0, keys.length - 200)).forEach(function (id) {
        delete hidden[id];
    });
    Main_setItem('classic_continue_hidden_' + ClassicContinue.account, JSON.stringify(hidden));
    ClassicContinue.items = ClassicContinue.items.filter(function (other) {
        return other.id !== item.id;
    });
    FollowingClassic.focusKey = null;
    FollowingClassic_render();
}
function ClassicContinue_closeMenu() {
    if (!ClassicContinue.menu) return;
    ClassicContinue.menu.remove();
    ClassicContinue.menu = null;
    window.removeEventListener('keydown', ClassicContinue_menuKey, true);
    if (FollowingClassic.active && Main_isScene1DocVisible()) FollowingClassic_focus(false);
}
function ClassicContinue_context(item) {
    ClassicContinue_closeMenu();
    var ru = ClassicShell_ru(),
        menu = ClassicPages_el('div', 'classic-continue-menu');
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-modal', 'true');
    var box = ClassicPages_el('div', 'classic-continue-menu-box');
    box.appendChild(ClassicPages_el('h2', '', item.title));
    [
        [
            ru ? 'Продолжить просмотр' : 'Resume watching',
            function () {
                ClassicContinue_closeMenu();
                var row = FollowingClassic.rows.find(function (r) {
                    return r.key === 'continue:' + item.id;
                });
                if (row) row.node.click();
            }
        ],
        [
            ru ? 'Скрыть на этом ТВ' : 'Hide on this TV',
            function () {
                ClassicContinue_closeMenu();
                ClassicContinue_hide(item);
            }
        ],
        [ru ? 'Отмена' : 'Cancel', ClassicContinue_closeMenu]
    ].forEach(function (action) {
        var b = ClassicPages_el('button', '', action[0]);
        b.type = 'button';
        b.onclick = action[1];
        box.appendChild(b);
    });
    menu.appendChild(box);
    document.body.appendChild(menu);
    ClassicContinue.menu = menu;
    ClassicContinue.menuFocus = 0;
    ClassicContinue_menuFocus();
    window.addEventListener('keydown', ClassicContinue_menuKey, true);
}
function ClassicContinue_menuFocus() {
    var buttons = ClassicContinue.menu.querySelectorAll('button');
    buttons.forEach(function (b, i) {
        b.classList.toggle('is-focused', i === ClassicContinue.menuFocus);
    });
    buttons[ClassicContinue.menuFocus].focus();
}
function ClassicContinue_menuKey(event) {
    if (!ClassicContinue.menu) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.keyCode === KEY_RETURN || event.keyCode === KEY_KEYBOARD_BACKSPACE) ClassicContinue_closeMenu();
    else if (event.keyCode === KEY_UP || event.keyCode === KEY_DOWN) {
        ClassicContinue.menuFocus = Math.max(0, Math.min(2, ClassicContinue.menuFocus + (event.keyCode === KEY_UP ? -1 : 1)));
        ClassicContinue_menuFocus();
    } else if (event.keyCode === KEY_ENTER && !event.repeat) ClassicContinue.menu.querySelectorAll('button')[ClassicContinue.menuFocus].click();
}
