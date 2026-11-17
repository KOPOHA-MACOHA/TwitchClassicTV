/* Modern following/channel presentation. GPL-3.0-or-later. Native playback and channel APIs remain authoritative. */
var ClassicPages_requests = {},
    ClassicPages_requestId = 0;
function ClassicPages_el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}
function ClassicPages_image(url, className, fallback) {
    var image = ClassicPages_el('img', className);
    image.alt = '';
    image.src = url || fallback || IMG_404_LOGO;
    image.onerror = function () {
        image.onerror = null;
        if (fallback) image.src = fallback;
        else image.style.visibility = 'hidden';
    };
    return image;
}
function ClassicPages_request(owner, url, headers, method, body, success, failure, timeoutMs) {
    var id = ++ClassicPages_requestId;
    ClassicPages_requests[id] = {owner: owner, generation: owner.generation, success: success, failure: failure};
    ClassicPages_requests[id].timer = window.setTimeout(function () {
        ClassicPages_failure(null, 0, id);
    }, timeoutMs || 15000);
    try {
        FullxmlHttpGet(url, headers, ClassicPages_result, ClassicPages_failure, 0, id, method, body);
    } catch (error) {
        ClassicPages_failure(null, 0, id);
    }
}
function ClassicPages_take(id) {
    var request = ClassicPages_requests[id];
    if (!request) return null;
    delete ClassicPages_requests[id];
    clearTimeout(request.timer);
    return request.owner.active && request.owner.generation === request.generation ? request : null;
}
function ClassicPages_result(result, key, id) {
    var request = ClassicPages_take(id);
    if (!request) return;
    try {
        if (result.status !== 200) throw Error('HTTP');
        request.success(JSON.parse(result.responseText));
    } catch (error) {
        request.failure();
    }
}
function ClassicPages_failure(result, key, id) {
    var request = ClassicPages_take(id);
    if (request) request.failure();
}
function ClassicPages_cancel(owner) {
    owner.generation++;
    Object.keys(ClassicPages_requests).forEach(function (id) {
        var request = ClassicPages_requests[id];
        if (request.owner === owner) {
            clearTimeout(request.timer);
            delete ClassicPages_requests[id];
        }
    });
}

var FollowingClassic = {
    active: false,
    generation: 0,
    account: null,
    updated: 0,
    live: [],
    channels: [],
    liveDone: false,
    channelsDone: false,
    liveError: false,
    channelsError: false,
    focusKey: null,
    rows: [],
    cursor: 0
};
function FollowingClassic_init() {
    if (!AddUser_UserHasToken()) {
        ClassicShell_account();
        return;
    }
    Main_values.Main_Go = Main_UserLive;
    FollowingClassic.active = true;
    HttpGetSetUserHeader();
    Main_clearTimeout(ScreenObj[Main_UserLive].AutoRefreshId);
    Main_HideLoadDialog();
    Main_HideWarningDialog();
    ScreensObj_SetTopLable(ClassicShell_words().following);
    var old = document.getElementById('UserLive_scroll');
    if (old) Main_HideElementWithEle(old);
    var panel = document.getElementById('classic_following_page');
    if (!panel) {
        panel = ClassicPages_el('section', 'classic-following-page');
        panel.id = 'classic_following_page';
        document.getElementById('screens_holder').appendChild(panel);
    }
    panel.classList.remove('hide');
    Main_removeEventListener('keydown', ScreenObj[Main_UserLive].key_fun);
    Main_addEventListener('keydown', FollowingClassic_key);
    Main_addEventListener('keyup', FollowingClassic_keyUp);
    if (
        FollowingClassic.account !== AddUser_UsernameArray[0].id ||
        !FollowingClassic.liveDone ||
        !FollowingClassic.channelsDone ||
        Date.now() - FollowingClassic.updated > 60000
    )
        FollowingClassic_reload();
    else {
        ClassicContinue_load(false);
        FollowingClassic_render();
    }
    ClassicShell_syncNav();
}
function FollowingClassic_exit() {
    FollowingClassic.active = false;
    ClassicContinue_closeMenu();
    ClassicContinue_invalidate();
    FollowingClassic_cancelHold();
    FollowingClassic_stopPreview();
    Main_removeEventListener('keyup', FollowingClassic_keyUp);
    ClassicPages_cancel(FollowingClassic);
    Main_removeEventListener('keydown', FollowingClassic_key);
    var panel = document.getElementById('classic_following_page');
    if (panel) panel.classList.add('hide');
}
function FollowingClassic_reload() {
    if (!Main_isScene1DocVisible() || Main_isStopped) {
        FollowingClassic.updated = 0;
        return;
    }
    FollowingClassic_stopPreview();
    FollowingClassic_cancelHold();
    if (FollowingClassic.account !== AddUser_UsernameArray[0].id) FollowingClassic.focusKey = null;
    FollowingClassic.pendingFocus = FollowingClassic.focusKey === 'live:loading' ? null : FollowingClassic.focusKey;
    ClassicPages_cancel(FollowingClassic);
    FollowingClassic.account = AddUser_UsernameArray[0].id;
    FollowingClassic.updated = Date.now();
    FollowingClassic.live = [];
    FollowingClassic.channels = [];
    FollowingClassic.liveDone = false;
    FollowingClassic.channelsDone = false;
    FollowingClassic.liveError = false;
    FollowingClassic.channelsError = false;
    HttpGetSetUserHeader();
    FollowingClassic_render();
    FollowingClassic_livePage(null);
    FollowingClassic_channelPage(null);
    ClassicContinue_load(true);
}
function FollowingClassic_livePage(cursor) {
    var url =
        Main_helix_api +
        'streams/followed?user_id=' +
        encodeURIComponent(FollowingClassic.account) +
        '&first=100' +
        (cursor ? '&after=' + encodeURIComponent(cursor) : '');
    ClassicPages_request(
        FollowingClassic,
        url,
        Main_Bearer_User_Headers,
        null,
        null,
        function (result) {
            if (!Array.isArray(result.data)) throw Error('Streams');
            FollowingClassic.live = FollowingClassic.live.concat(result.data);
            var next = result.pagination && result.pagination.cursor;
            if (next && next !== cursor) {
                FollowingClassic_livePage(next);
                return;
            }
            FollowingClassic.liveDone = true;
            FollowingClassic_render();
        },
        function () {
            FollowingClassic.liveDone = true;
            FollowingClassic.liveError = true;
            FollowingClassic_render();
        }
    );
}
function FollowingClassic_channelPage(cursor) {
    var payload = JSON.parse(userChannelQuery);
    payload.query = payload.query.replace('%y', cursor ? 'cursor: ' + JSON.stringify(cursor) : '');
    var query = JSON.stringify(payload);
    ClassicPages_request(
        FollowingClassic,
        PlayClip_BaseUrl,
        Main_OAuth_User_Headers,
        'POST',
        query,
        function (result) {
            var connection = result.data && result.data.currentUser && result.data.currentUser.follows;
            if (!connection || !Array.isArray(connection.edges)) throw Error('Follows');
            connection.edges.forEach(function (edge) {
                if (
                    edge &&
                    edge.node &&
                    !FollowingClassic.channels.some(function (channel) {
                        return channel.id === edge.node.id;
                    })
                )
                    FollowingClassic.channels.push(edge.node);
            });
            var last = connection.edges[connection.edges.length - 1],
                next = last && last.cursor;
            if (connection.pageInfo && connection.pageInfo.hasNextPage && next && next !== cursor) {
                FollowingClassic_channelPage(next);
                return;
            }
            FollowingClassic.channelsDone = true;
            FollowingClassic.channels.sort(function (a, b) {
                return String(a.displayName).localeCompare(String(b.displayName));
            });
            FollowingClassic_render();
        },
        function () {
            FollowingClassic.channelsDone = true;
            FollowingClassic.channelsError = true;
            FollowingClassic_render();
        }
    );
}
function FollowingClassic_render() {
    var panel = document.getElementById('classic_following_page');
    if (!panel || !FollowingClassic.active) return;
    var focused = FollowingClassic.pendingFocus || FollowingClassic.focusKey,
        ru = ClassicShell_ru();
    panel.replaceChildren();
    FollowingClassic.rows = [];
    var screen = ScreenObj[Main_UserLive];
    screen.DataObj = {};
    screen.Cells = [];
    screen.itemsCount = FollowingClassic.live.length;
    screen.ColumnsCount = 4;
    screen.HasAnimateThumb = false;
    screen.HasSwitches = false;
    screen.status = true;
    screen.dataEnded = true;
    screen.SetPreviewEnable();
    var live = ClassicPages_el('section', 'following-section');
    live.appendChild(ClassicPages_el('h2', '', ru ? 'В эфире' : 'Live now'));
    var grid = ClassicPages_el('div', 'following-live-grid');
    FollowingClassic.live.forEach(function (stream, index) {
        var key = 'live:' + stream.user_id,
            button = ClassicPages_el('button', 'following-stream-card');
        button.type = 'button';
        var cellId = Math.floor(index / 4) + '_' + (index % 4);
        button.id = screen.ids[0] + cellId;
        screen.DataObj[cellId] = ScreensObj_LiveCellArray(stream);
        button.dataset.focusKey = key;
        var frame = ClassicPages_el('div', 'following-card-frame');
        frame.appendChild(
            ClassicPages_image(stream.thumbnail_url && stream.thumbnail_url.replace('{width}x{height}', '640x360'), 'following-thumb', IMG_404_VIDEO)
        );
        frame.id = screen.ids[5] + cellId;
        frame.querySelector('img').id = screen.ids[1] + cellId;
        frame.appendChild(ClassicPages_el('span', 'following-live-badge', 'LIVE'));
        button.appendChild(frame);
        button.appendChild(ClassicPages_el('strong', 'following-stream-title', stream.title));
        button.appendChild(ClassicPages_el('span', 'following-stream-channel', stream.user_name));
        button.appendChild(
            ClassicPages_el(
                'span',
                'following-stream-meta',
                (stream.game_name || '') + ' · ' + Main_formatNumber(stream.viewer_count) + ' ' + Main_GetViewerStrings(stream.viewer_count)
            )
        );
        button.onclick = function () {
            FollowingClassic_stopPreview();
            FollowingClassic_setPosition(index);
            Play_SetUserHeader();
            var data = ScreensObj_LiveCellArray(stream);
            ScreenObj[Main_UserLive].DataObj[cellId] = data;
            Main_OpenLiveStream(data, cellId, screen.ids, FollowingClassic_key, false, 'Following');
        };
        grid.appendChild(button);
        FollowingClassic.rows.push({key: key, node: button, section: 'live', index: index});
    });
    live.appendChild(grid);
    FollowingClassic_status(
        live,
        FollowingClassic.liveDone,
        FollowingClassic.liveError,
        FollowingClassic.live.length,
        ru ? 'Сейчас никто не в эфире' : 'No followed channels are live',
        'live:loading'
    );
    panel.appendChild(live);
    ClassicContinue_render(panel);
    var offline = ClassicPages_el('section', 'following-section');
    offline.appendChild(ClassicPages_el('h2', '', ru ? 'Не в эфире' : 'Offline'));
    var channels = ClassicPages_el('div', 'following-offline-grid'),
        liveIds = {};
    FollowingClassic.live.forEach(function (stream) {
        liveIds[stream.user_id] = true;
    });
    FollowingClassic.channels
        .filter(function (channel) {
            return !channel.stream && !liveIds[channel.id];
        })
        .forEach(function (channel) {
            var key = 'offline:' + channel.id,
                button = ClassicPages_el('button', 'following-channel-card');
            button.type = 'button';
            button.dataset.focusKey = key;
            button.appendChild(ClassicPages_image(channel.profileImageURL, 'following-avatar', IMG_404_LOGO));
            button.appendChild(ClassicPages_el('strong', '', channel.displayName));
            button.appendChild(ClassicPages_el('small', '', ru ? 'Видео и клипы' : 'Videos and clips'));
            button.onclick = function () {
                FollowingClassic_openChannel(channel);
            };
            channels.appendChild(button);
            FollowingClassic.rows.push({key: key, node: button, section: 'offline'});
        });
    offline.appendChild(channels);
    FollowingClassic_status(
        offline,
        FollowingClassic.channelsDone,
        FollowingClassic.channelsError,
        channels.children.length,
        ru ? 'Нет каналов вне эфира' : 'No offline followed channels'
    );
    panel.appendChild(offline);
    var restored = FollowingClassic.rows.findIndex(function (row) {
        return row.key === focused;
    });
    if (restored >= 0 || (FollowingClassic.liveDone && FollowingClassic.channelsDone && !ClassicContinue.loading))
        FollowingClassic.pendingFocus = null;
    FollowingClassic.cursor = Math.max(0, restored);
    var selected = FollowingClassic.rows[FollowingClassic.cursor];
    if (FollowingClassic.holdDown && (!selected || selected.key !== FollowingClassic.holdKey)) FollowingClassic_cancelHold();
    if (!ClassicShell_navActive && Main_isScene1DocVisible() && !ClassicPreview_blocked()) FollowingClassic_focus(false);
}
function FollowingClassic_status(section, done, error, count, empty, loadingKey) {
    if (!done) {
        var loading = ClassicPages_el('p', 'following-status', ClassicShell_ru() ? 'Загрузка…' : 'Loading…');
        if (loadingKey) {
            loading.tabIndex = -1;
            loading.dataset.focusKey = loadingKey;
            loading.setAttribute('aria-busy', 'true');
            FollowingClassic.rows.push({key: loadingKey, node: loading, section: 'loading'});
        }
        section.appendChild(loading);
    } else if (error) {
        var retry = ClassicPages_el('button', 'following-retry', ClassicShell_ru() ? 'Не удалось загрузить. Повторить' : 'Could not load. Retry');
        retry.type = 'button';
        retry.onclick = FollowingClassic_reload;
        section.appendChild(retry);
        FollowingClassic.rows.push({key: 'retry:' + FollowingClassic.rows.length, node: retry, section: 'retry'});
    } else if (!count) section.appendChild(ClassicPages_el('p', 'following-status', empty));
}
function FollowingClassic_focus(scroll) {
    if (ClassicShell_navActive || Main_isExitDialogVisible()) return;
    FollowingClassic.rows.forEach(function (row, index) {
        row.node.classList.toggle('is-focused', index === FollowingClassic.cursor);
        row.node.tabIndex = index === FollowingClassic.cursor ? 0 : -1;
    });
    var row = FollowingClassic.rows[FollowingClassic.cursor];
    if (row) {
        if (!FollowingClassic.pendingFocus) FollowingClassic.focusKey = row.key;
        row.node.focus({preventScroll: true});
        if (scroll) row.node.scrollIntoView({block: 'nearest'});
        FollowingClassic_preview(row);
    }
}
function FollowingClassic_key(event) {
    event.preventDefault();
    var key = event.keyCode,
        row = FollowingClassic.rows[FollowingClassic.cursor];
    if (key === KEY_ENTER && (!row || row.section === 'loading' || (event.repeat && !FollowingClassic.holdDown))) return;
    if (key !== KEY_ENTER) FollowingClassic_cancelHold();
    if ([KEY_ENTER, KEY_LEFT, KEY_RIGHT, KEY_UP, KEY_DOWN].indexOf(key) !== -1) {
        FollowingClassic.pendingFocus = null;
        if (row) FollowingClassic.focusKey = row.key;
    }
    if (key === KEY_RETURN || key === KEY_KEYBOARD_BACKSPACE) {
        if (event.repeat) return;
        ClassicShell_navIndex = 0;
        ClassicShell_focusNav();
        return;
    }
    if (key === KEY_ENTER) {
        if (!FollowingClassic.holdDown) {
            FollowingClassic.holdDown = true;
            FollowingClassic.holdLong = false;
            FollowingClassic.holdKey = row ? row.key : null;
            FollowingClassic.holdTimer = window.setTimeout(function () {
                if (!FollowingClassic.holdDown || !FollowingClassic.active || Main_isStopped || !Main_isScene1DocVisible()) return;
                FollowingClassic.holdLong = true;
                if (row && row.section === 'continue') ClassicContinue_context(row.item);
                else FollowingClassic_reload();
            }, 650);
        }
        return;
    }
    if (key === KEY_2) {
        FollowingClassic_reload();
        return;
    }
    if (key === KEY_UP && (!row || FollowingClassic.cursor === 0)) {
        ClassicShell_navIndex = 0;
        ClassicShell_focusNav();
        return;
    }
    if ([KEY_LEFT, KEY_RIGHT, KEY_UP, KEY_DOWN].indexOf(key) !== -1 && row) {
        var current = row.node.getBoundingClientRect(),
            target = -1,
            score = Infinity;
        FollowingClassic.rows.forEach(function (candidate, index) {
            if (index === FollowingClassic.cursor) return;
            var rect = candidate.node.getBoundingClientRect(),
                dx = (rect.left + rect.right - current.left - current.right) / 2,
                dy = (rect.top + rect.bottom - current.top - current.bottom) / 2;
            var vertical = key === KEY_UP || key === KEY_DOWN;
            if (
                vertical
                    ? key === KEY_UP
                        ? rect.bottom > current.top + 2
                        : rect.top < current.bottom - 2
                    : Math.abs(dy) > Math.min(current.height, rect.height) / 2 || (key === KEY_LEFT ? dx >= 0 : dx <= 0)
            )
                return;
            var cost = vertical ? Math.abs(dy) * 10 + Math.abs(dx) : Math.abs(dx) + Math.abs(dy) * 10;
            if (cost < score) {
                score = cost;
                target = index;
            }
        });
        if (target >= 0) {
            FollowingClassic.cursor = target;
            FollowingClassic_focus(true);
        } else if (key === KEY_UP) {
            ClassicShell_navIndex = 0;
            ClassicShell_focusNav();
        }
    }
}
function FollowingClassic_openChannel(channel) {
    Main_values.Main_selectedChannel_id = channel.id;
    Main_values.Main_selectedChannel = channel.login;
    Main_values.Main_selectedChannelDisplayname = channel.displayName;
    Main_values.Main_selectedChannelLogo = channel.profileImageURL;
    Main_values.Main_BeforeChannel = Main_UserLive;
    Main_values.Main_BeforeChannelisSet = true;
    ChannelContent_UserChannels = true;
    FollowingClassic_exit();
    Main_values.Main_Go = Main_ChannelContent;
    Main_SwitchScreen();
}

var ChannelClassic_active = false,
    ChannelClassic_tabFocus = false,
    ChannelClassic_tabIndex = 0,
    ChannelClassic_cursor = 0;
function ChannelClassic_render() {
    var container = document.getElementById('channel_content_scroll'),
        panel = document.getElementById('classic_channel_page');
    if (!panel) {
        panel = ClassicPages_el('section', 'classic-channel-page');
        panel.id = 'classic_channel_page';
        container.appendChild(panel);
    }
    panel.replaceChildren();
    var ru = ClassicShell_ru();
    panel.appendChild(ChannelClassic_chrome(Main_ChannelContent));
    ChannelClassic_syncFollow();
    var hero = ClassicPages_el('div', 'classic-channel-hero');
    if (ChannelContent_responseText && ChannelContent_responseText[0]) {
        var stream = ChannelContent_responseText[0],
            button = ClassicPages_el('button', 'classic-channel-watch');
        button.type = 'button';
        button.appendChild(
            ClassicPages_image(stream.thumbnail_url.replace('{width}x{height}', '960x540'), 'classic-channel-live-thumb', IMG_404_VIDEO)
        );
        var copy = ClassicPages_el('div', 'classic-channel-live-copy');
        copy.appendChild(ClassicPages_el('span', 'following-live-badge', 'LIVE'));
        copy.appendChild(ClassicPages_el('h2', '', stream.title));
        copy.appendChild(ClassicPages_el('p', '', stream.game_name));
        copy.appendChild(ClassicPages_el('strong', '', ru ? 'Смотреть эфир' : 'Watch live'));
        button.appendChild(copy);
        button.onclick = function () {
            ChannelContent_cursorY = 1;
            ChannelContent_keyEnter();
        };
        hero.appendChild(button);
    } else {
        hero.appendChild(ClassicPages_el('h2', '', ru ? 'Канал сейчас не в эфире' : 'This channel is offline'));
        hero.appendChild(ClassicPages_el('p', '', ru ? 'Откройте видео или клипы в строке выше.' : 'Open videos or clips using the tabs above.'));
    }
    panel.appendChild(hero);
    ChannelContent_cursorY = 0;
    ChannelClassic_cursor = 0;
    ChannelClassic_focus();
}
function ChannelClassic_buttons() {
    return document.querySelectorAll('#classic_channel_page .classic-channel-tabs button, #classic_channel_page .classic-channel-watch');
}
function ChannelClassic_focus() {
    if (ClassicShell_navActive || Main_isExitDialogVisible()) return;
    var buttons = ChannelClassic_buttons();
    buttons.forEach(function (button, index) {
        button.classList.toggle('is-focused', index === ChannelClassic_cursor);
    });
    if (buttons[ChannelClassic_cursor]) buttons[ChannelClassic_cursor].focus();
}
function ChannelClassic_action(index) {
    if (index === 0) {
        ChannelClassic_cursor = 0;
        ChannelClassic_focus();
        return;
    }
    ChannelContent_cursorY = 0;
    ChannelContent_cursorX = index - 1;
    ChannelContent_keyEnter();
}
function ChannelClassic_syncFollow() {
    document.querySelectorAll('.classic-channel-follow').forEach(function (button) {
        button.textContent = AddCode_IsFollowing ? (ClassicShell_ru() ? 'Отслеживается' : 'Following') : ClassicShell_ru() ? 'Отслеживать' : 'Follow';
    });
}
function ChannelClassic_key(event) {
    event.preventDefault();
    var buttons = ChannelClassic_buttons();
    if (event.keyCode === KEY_UP) {
        if (ChannelClassic_cursor >= 4) {
            ChannelClassic_cursor = 0;
            ChannelClassic_focus();
        } else ClassicShell_focusNav();
        return;
    }
    if (event.keyCode === KEY_RETURN || event.keyCode === KEY_KEYBOARD_BACKSPACE) {
        ChannelContent_handleKeyBakc();
        return;
    }
    if (Main_FirstLoad) return;
    if (event.keyCode === KEY_LEFT || event.keyCode === KEY_RIGHT) {
        ChannelClassic_cursor = Math.max(0, Math.min(Math.min(buttons.length - 1, 3), ChannelClassic_cursor + (event.keyCode === KEY_LEFT ? -1 : 1)));
        ChannelClassic_focus();
    } else if (event.keyCode === KEY_DOWN && buttons.length > 4) {
        ChannelClassic_cursor = 4;
        ChannelClassic_focus();
    } else if (event.keyCode === KEY_ENTER && !event.repeat) {
        if (buttons[ChannelClassic_cursor]) buttons[ChannelClassic_cursor].click();
    }
}

function ChannelClassic_chrome(key) {
    var chrome = ClassicPages_el('div', 'classic-channel-chrome'),
        header = ClassicPages_el('header', 'classic-channel-header'),
        info = ClassicPages_el('div', 'classic-channel-identity'),
        tabs = ClassicPages_el('nav', 'classic-channel-tabs'),
        ru = ClassicShell_ru(),
        selected = key === Main_ChannelContent ? 0 : key === Main_ChannelVod ? 1 : 2;
    header.appendChild(ClassicPages_image(Main_values.Main_selectedChannelLogo, 'classic-channel-avatar', IMG_404_LOGO));
    info.appendChild(ClassicPages_el('h1', '', Main_values.Main_selectedChannelDisplayname));
    info.appendChild(ClassicPages_el('p', '', ChannelContent_description || ''));
    header.appendChild(info);
    chrome.appendChild(header);
    if (key !== Main_ChannelContent) {
        chrome.id = 'classic_channel_grid_chrome';
        tabs.id = 'classic_channel_tabs';
    }
    [
        ru ? 'Главная' : 'Home',
        ru ? 'Видео' : 'Videos',
        ru ? 'Клипы' : 'Clips',
        AddCode_IsFollowing ? (ru ? 'Отслеживается' : 'Following') : ru ? 'Отслеживать' : 'Follow'
    ].forEach(function (label, index) {
        var button = ClassicPages_el('button', 'classic-channel-tab' + (index === 3 ? ' classic-channel-follow' : ''), label);
        button.type = 'button';
        button.classList.toggle('active', index === selected);
        if (index === selected) button.setAttribute('aria-current', 'page');
        button.dataset.channelAction = ['home', 'videos', 'clips', 'follow'][index];
        button.onclick = function () {
            if (key === Main_ChannelContent || index === 3) ChannelClassic_action(index);
            else ChannelClassic_gridAction(index, key);
        };
        tabs.appendChild(button);
    });
    chrome.appendChild(tabs);
    return chrome;
}
function ChannelClassic_updateTabs(key) {
    ChannelClassic_clearTabs();
    if (key !== Main_ChannelVod && key !== Main_ChannelClip) return;
    document.body.classList.add('classic-channel-grid', 'classic-channel-page-open');
    document.getElementById('screens_holder').appendChild(ChannelClassic_chrome(key));
}
function ChannelClassic_clearTabs() {
    var tabs = document.getElementById('classic_channel_grid_chrome');
    if (tabs) tabs.remove();
    document.body.classList.remove('classic-channel-page-open');
    document.body.classList.remove('classic-channel-grid');
    ChannelClassic_tabFocus = false;
    Main_removeEventListener('keydown', ChannelClassic_tabsKey);
}
function ChannelClassic_focusTabs(key) {
    ClassicPreview_stop();
    Screens_RemoveFocus(key);
    ChannelClassic_tabFocus = true;
    ChannelClassic_tabIndex = key === Main_ChannelVod ? 1 : 2;
    Main_removeEventListener('keydown', ScreenObj[key].key_fun);
    Main_addEventListener('keydown', ChannelClassic_tabsKey);
    ChannelClassic_tabsFocus();
}
function ChannelClassic_tabsFocus() {
    var buttons = document.querySelectorAll('#classic_channel_tabs button');
    buttons.forEach(function (button, index) {
        button.classList.toggle('is-focused', index === ChannelClassic_tabIndex);
    });
    if (buttons[ChannelClassic_tabIndex]) buttons[ChannelClassic_tabIndex].focus();
}
function ChannelClassic_gridAction(index, key) {
    Screens_exit(key);
    if (index === 0) {
        Main_values.Main_Go = Main_ChannelContent;
        ChannelClassic_cursor = 0;
        ChannelContent_init();
    } else Screens_init(index === 1 ? Main_ChannelVod : Main_ChannelClip);
}
function ChannelClassic_tabsKey(event) {
    event.preventDefault();
    if (event.keyCode === KEY_UP) {
        Main_removeEventListener('keydown', ChannelClassic_tabsKey);
        ClassicShell_focusNav();
    } else if (event.keyCode === KEY_LEFT || event.keyCode === KEY_RIGHT) {
        ChannelClassic_tabIndex = Math.max(0, Math.min(3, ChannelClassic_tabIndex + (event.keyCode === KEY_LEFT ? -1 : 1)));
        ChannelClassic_tabsFocus();
    } else if (event.keyCode === KEY_ENTER && !event.repeat) {
        if (ChannelClassic_tabIndex === 3) ChannelClassic_action(3);
        else ChannelClassic_gridAction(ChannelClassic_tabIndex, Main_values.Main_Go);
    } else if (event.keyCode === KEY_DOWN || event.keyCode === KEY_RETURN || event.keyCode === KEY_KEYBOARD_BACKSPACE) {
        ChannelClassic_tabFocus = false;
        document.querySelectorAll('#classic_channel_tabs .is-focused').forEach(function (row) {
            row.classList.remove('is-focused');
        });
        Main_removeEventListener('keydown', ChannelClassic_tabsKey);
        Main_addEventListener('keydown', ScreenObj[Main_values.Main_Go].key_fun);
        Screens_addFocus(true, Main_values.Main_Go);
    }
}

function ClassicPages_previewRect(image) {
    var frame = image.parentElement,
        rect = frame.getBoundingClientRect(),
        style = getComputedStyle(frame);
    var left = parseFloat(style.borderLeftWidth) || 0,
        right = parseFloat(style.borderRightWidth) || 0,
        bottom = parseFloat(style.borderBottomWidth) || 0;
    return {left: rect.left + left, right: rect.right - right, bottom: rect.bottom - bottom};
}
function ClassicPages_streamCard(type, id, ids, data, key, extraImage, forceVod) {
    ScreenObj[key].DataObj[id] = data;
    var live = type === 'live' && !forceVod,
        clip = type === 'clip',
        wrapper = ClassicPages_el('div', ScreenObj[key].thumbclass + ' classic-video-card' + (live ? ' classic-live-card' : ''));
    wrapper.id = ids[3] + id;
    var card = ClassicPages_el('div', 'stream_thumbnail_live');
    card.id = ids[0] + id;
    var frame = ClassicPages_el('div', 'stream_thumbnail_live_img');
    frame.id = ids[5] + id;
    var url = clip ? data[15] : forceVod ? extraImage : data[0];
    if (url) url = url.replace('{width}x{height}', Main_VideoSize);
    frame.appendChild(ClassicPages_el('span', 'classic-thumbnail-placeholder', ClassicShell_ru() ? 'Превью' : 'Preview'));
    var image = ClassicPages_image(url, 'stream_img');
    image.id = ids[1] + id;
    image.setAttribute('onerror', "this.onerror=null;this.style.visibility='hidden';");
    frame.appendChild(image);
    var watched = ClassicPages_el('div', 'vod_watched');
    watched.id = ids[7] + id;
    watched.style.width = (Main_history_Watched_Obj[data[7]] || 0) + '%';
    frame.appendChild(watched);
    card.appendChild(frame);
    var copy = ClassicPages_el('div', 'classic-card-copy');
    var title = ClassicPages_el('strong', 'classic-card-title', ClassicShell_text(type === 'live' ? data[2] : data[10]));
    title.id = ids[11] + id;
    copy.appendChild(title);
    var channel = ClassicPages_el('span', 'classic-card-channel');
    channel.id = ids[2] + id;
    // Keep the historical live-to-VOD marker children used by Main_CheckBroadcastIDStartSucess.
    channel.appendChild(ClassicPages_el('span', 'classic-hidden-marker'));
    channel.appendChild(document.createTextNode(' '));
    channel.appendChild(ClassicPages_el('span', 'hideimp classic-hidden-marker', 'VOD'));
    channel.appendChild(document.createTextNode(clip ? data[4] : data[1] || data[6]));
    copy.appendChild(channel);
    var game = ClassicPages_el('span', 'classic-card-game', data[3] || '');
    game.id = ids[12] + id;
    copy.appendChild(game);
    var meta = ClassicPages_el('div', 'classic-card-meta');
    meta.id = ids[4] + id;
    meta.appendChild(
        ClassicPages_el('span', 'classic-card-type' + (live ? ' is-live' : ''), live ? 'LIVE' : clip ? (ClassicShell_ru() ? 'КЛИП' : 'CLIP') : 'VOD')
    );
    var viewers = ClassicPages_el(
        'span',
        'classic-card-views',
        live ? data[4] + ' ' + Main_GetViewerStrings(data[13]) : (clip ? data[14] : data[4]) + ' ' + Main_GetViewsStrings(data[13])
    );
    viewers.id = ids[10] + id;
    meta.appendChild(viewers);
    var duration = ClassicPages_el('span', 'classic-card-duration', live ? '' : clip ? Play_timeS(data[1]) : Play_timeS(data[11]));
    duration.id = ids[8] + id;
    meta.appendChild(duration);
    var since = ClassicPages_el('span', 'classic-hidden-marker');
    since.id = ids[9] + id;
    meta.appendChild(since);
    copy.appendChild(meta);
    card.appendChild(copy);
    wrapper.appendChild(card);
    return wrapper.outerHTML;
}
function ClassicPages_tabLabel(html) {
    return ClassicShell_text(html).replace(/^\s*(?:Сменить|Переключить|Switch|Change)\s*:?\s*/i, '');
}

function FollowingClassic_cancelHold() {
    window.clearTimeout(FollowingClassic.holdTimer);
    FollowingClassic.holdDown = false;
    FollowingClassic.holdLong = false;
    FollowingClassic.holdKey = null;
}
function FollowingClassic_keyUp(event) {
    if (event.keyCode !== KEY_ENTER || !FollowingClassic.holdDown) return;
    event.preventDefault();
    event.stopPropagation();
    var activate = !FollowingClassic.holdLong,
        key = FollowingClassic.holdKey;
    FollowingClassic_cancelHold();
    if (activate && FollowingClassic.active && Main_isScene1DocVisible() && !ClassicShell_navActive && !ClassicPreview_blocked()) {
        var row = FollowingClassic.rows.find(function (item) {
            return item.key === key;
        });
        if (row) row.node.click();
    }
}
function FollowingClassic_setPosition(index) {
    var screen = ScreenObj[Main_UserLive];
    screen.posY = Math.floor(index / 4);
    screen.posX = index % 4;
    screen.focusPos = screen.posY + '_' + screen.posX;
}
function FollowingClassic_stopPreview() {
    window.clearTimeout(FollowingClassic.previewTimer);
    FollowingClassic.previewRequest = (FollowingClassic.previewRequest || 0) + 1;
    Screens_LoadPreviewSTop();
    document.querySelectorAll('#classic_following_page .opacity_zero').forEach(function (image) {
        image.classList.remove('opacity_zero');
    });
}
function FollowingClassic_preview(row) {
    if (ClassicPreview_blocked()) return;
    if (!row || row.section !== 'live') {
        FollowingClassic_stopPreview();
        ScreenObj[Main_UserLive].posY = -2;
        ScreenObj[Main_UserLive].focusPos = '';
        return;
    }
    FollowingClassic_setPosition(row.index);
    if (!Main_IsOn_OSInterface || !ScreenObj[Main_UserLive].PreviewEnable) return;
    var stream = ScreenObj[Main_UserLive].DataObj[ScreenObj[Main_UserLive].focusPos];
    if (Play_PreviewId && Main_A_equals_B(Play_PreviewId, stream[14])) {
        Screens_LoadPreviewRestore(Main_UserLive);
        return;
    }
    FollowingClassic_stopPreview();
    var key = row.key,
        generation = FollowingClassic.generation;
    FollowingClassic.previewTimer = window.setTimeout(
        function () {
            if (
                !FollowingClassic.active ||
                !Main_isScene1DocVisible() ||
                ClassicShell_navActive ||
                key !== FollowingClassic.focusKey ||
                generation !== FollowingClassic.generation
            )
                return;
            FollowingClassic.previewKey = key;
            FollowingClassic.previewGeneration = generation;
            FollowingClassic.previewPosition = row.index;
            PlayHLS_GetPlayListAsync(true, stream[6], FollowingClassic.previewRequest, Main_UserLive, FollowingClassic_previewResult);
        },
        DefaultPreviewDelay + Settings_PreviewDelay[Settings_Obj_default('show_feed_player_delay')]
    );
}
function FollowingClassic_previewResult(result, key, requestId) {
    if (
        !FollowingClassic.active ||
        !Main_isScene1DocVisible() ||
        ClassicPreview_blocked() ||
        requestId !== FollowingClassic.previewRequest ||
        FollowingClassic.previewKey !== FollowingClassic.focusKey ||
        FollowingClassic.previewGeneration !== FollowingClassic.generation
    )
        return;
    Screens_LoadPreviewResult(result, Main_UserLive, FollowingClassic.previewPosition % 100);
}

function ClassicPages_filterLabels(key) {
    var screen = ScreenObj[key],
        ru = ClassicShell_ru(),
        labels;
    if (key === Main_ChannelVod)
        labels = [
            screen.highlight ? (ru ? 'Тип: хайлайты' : 'Type: highlights') : ru ? 'Тип: записи трансляций' : 'Type: past broadcasts',
            screen.periodPos === 1 ? (ru ? 'Сначала новые' : 'Newest first') : ru ? 'По просмотрам' : 'Most viewed'
        ];
    else if (key === Main_ChannelClip)
        labels = [
            (ru ? 'Период: ' : 'Period: ') +
                (ru ? ['за сутки', 'за неделю', 'за месяц', 'за всё время'] : ['24 hours', 'week', 'month', 'all time'])[screen.periodPos - 1]
        ];
    else return;
    labels.forEach(function (label, index) {
        var node = document.getElementById(screen.ids[2] + '-1_' + index);
        if (node) node.textContent = label;
    });
}
