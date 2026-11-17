/* Twitch account history and Continue Watching. GPL-3.0-or-later. */
var ClassicContinue = {
    account: null,
    updated: 0,
    items: [],
    all: [],
    loading: false,
    error: false,
    cached: false,
    menu: null,
    request: 0,
    status: ''
};
// Match the official Following query first; separately request a larger, unfiltered account window.
// ViewedVideosConnection has no cursor/pageInfo: never pretend this is a lifetime archive.
var ClassicContinue_fields =
    'id title lengthSeconds status isDeleted previewThumbnailURL(width:640,height:360) createdAt viewCount language owner{id login displayName profileImageURL(width:70)} self{viewingHistory{position updatedAt}}';
var ClassicContinue_query =
    'query ClassicContinueWatching($first:Int!,$excludeHidden:Boolean!){currentUser:user{id viewedVideos(first:$first,excludeHiddenChannels:$excludeHidden){edges{history{position updatedAt}node{' +
    ClassicContinue_fields +
    '}}}}}';
var ClassicContinue_fullQuery = ClassicContinue_query.replace('currentUser:user{', 'currentUser{');
var ClassicContinue_candidatesQuery =
    'query ClassicContinueCandidates($first:Int!,$after:Cursor){currentUser{id followedVideos(first:$first,after:$after,types:[ARCHIVE,UPLOAD,HIGHLIGHT,PAST_PREMIERE]){pageInfo{hasNextPage endCursor}edges{node{' +
    ClassicContinue_fields +
    '}}}}}';
function ClassicContinue_knownIds(account) {
    var history = Main_values_History_data[account],
        ids = [];
    if (!history) return ids;
    (history.vod || []).forEach(function (row) {
        if (row && /^\d+$/.test(String(row.id))) ids.push(String(row.id));
    });
    (history.live || []).forEach(function (row) {
        if (row && /^\d+$/.test(String(row.vodid || ''))) ids.push(String(row.vodid));
    });
    return ids
        .filter(function (id, index) {
            return ids.indexOf(id) === index;
        })
        .slice(0, 100);
}
function ClassicContinue_invalidate() {
    ClassicContinue.updated = 0;
}
function ClassicContinue_parse(user, account, includeCompleted) {
    if (!user || String(user.id) !== String(account) || !user.viewedVideos || !Array.isArray(user.viewedVideos.edges)) throw Error('History');
    var hidden = {};
    try {
        hidden = JSON.parse(localStorage.getItem('classic_continue_hidden_' + account)) || {};
    } catch (error) {
        /* Empty hidden list. */
    }
    var records = {},
        order = [];
    user.viewedVideos.edges.slice(0, 2000).forEach(function (edge) {
        if (!edge || !edge.node) return;
        var video = edge.node,
            history = edge.history,
            self = video.self && video.self.viewingHistory;
        if (
            !history ||
            typeof history.position !== 'number' ||
            !isFinite(history.position) ||
            (self && (Date.parse(self.updatedAt) || 0) > (Date.parse(history.updatedAt) || 0))
        )
            history = self;
        var position = history && history.position,
            duration = Number(video.lengthSeconds) || 0,
            id = String(video.id || '');
        if (
            !/^\d+$/.test(id) ||
            video.isDeleted ||
            video.status === 'FAILED' ||
            video.status === 'UNPROCESSED' ||
            typeof position !== 'number' ||
            !isFinite(position) ||
            position < 0
        )
            return;
        var updated = Date.parse(history.updatedAt) || 0,
            previous = records[id];
        if (previous && previous.updatedAt >= updated) return;
        var owner = video.owner || video.creator || {};
        if (!previous) order.push(id);
        records[id] = {
            id: id,
            title: String(video.title || ''),
            duration: isFinite(duration) ? Math.max(0, duration) : 0,
            position: Math.floor(position),
            updatedAt: updated,
            recording: video.status === 'RECORDING',
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
    });
    return order
        .map(function (id) {
            return records[id];
        })
        .filter(function (item) {
            if (includeCompleted) return true;
            if (!item.position) return false;
            var hide = hidden[item.id];
            return (
                !(hide && hide.position === item.position && hide.updatedAt === item.updatedAt) &&
                (!item.duration || item.recording || item.duration - item.position > Math.min(30, item.duration * 0.02))
            );
        })
        .sort(function (a, b) {
            return b.updatedAt - a.updatedAt;
        });
}
function ClassicContinue_data(item) {
    return [
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
}
function ClassicContinue_import(account) {
    var history = Main_values_History_data[account];
    if (!history || !Array.isArray(history.vod) || ScreenObj[Main_HistoryVod].histPosX[1]) return;
    ClassicContinue.all.forEach(function (item) {
        var existing = history.vod.find(function (row) {
            return String(row.id) === item.id;
        });
        var data = ClassicContinue_data(item);
        if (!existing) {
            existing = {id: item.id};
            history.vod.push(existing);
        }
        existing.data = data;
        existing.date = item.updatedAt;
        existing.name = item.channel.login.toLowerCase();
        existing.game = '';
        existing.views = item.views;
        existing.created_at = Date.parse(item.createdAt) || 0;
        existing.watched = item.position;
        Main_history_Watched_Obj[item.id] = item.duration ? Math.min(100, (100 * item.position) / item.duration) : 0;
    });
    history.vod.sort(function (a, b) {
        return b.date - a.date;
    });
    history.vod = history.vod.slice(0, 2000);
    Main_setHistoryItem();
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
    ClassicContinue.status = '';
    ClassicContinue.recovered = false;
    ClassicContinue.partial = false;
    var request = ++ClassicContinue.request,
        edges = [],
        successes = 0,
        received = [],
        cataloguePages = 0,
        scanned = 0,
        seenCandidates = {},
        fallbackStarted = false,
        fallbackGood = false,
        deadline = Date.now() + 18000,
        storedEdges = [];
    ClassicContinue.items = [];
    ClassicContinue.all = [];
    function apply(user) {
        ClassicContinue.all = ClassicContinue_parse(user, account, true);
        ClassicContinue.items = ClassicContinue_parse(user, account, false);
    }
    try {
        var stored = JSON.parse(localStorage.getItem('classic_continue_cache_' + account));
        if (stored && Array.isArray(stored.edges)) {
            storedEdges = stored.edges;
            apply({id: account, viewedVideos: stored});
        }
    } catch (error) {
        /* No offline cache. */
    }
    function current() {
        return request === ClassicContinue.request && AddUser_UserHasToken() && String(AddUser_UsernameArray[0].id) === account;
    }
    function candidateRequest(body, success, failure) {
        if (!current()) return;
        HttpGetSetUserHeader();
        ClassicPages_request(
            FollowingClassic,
            PlayClip_BaseUrl,
            Main_OAuth_User_Headers.concat([
                ['Content-Type', 'application/json'],
                ['Cache-Control', 'no-cache']
            ]),
            'POST',
            JSON.stringify(body),
            success,
            failure,
            Math.max(1, Math.min(6000, deadline - Date.now()))
        );
    }
    function collect(nodes) {
        nodes.forEach(function (node) {
            if (!node || !/^\d+$/.test(String(node.id))) return;
            seenCandidates[String(node.id)] = true;
            scanned++;
            var h = node.self && node.self.viewingHistory;
            if (h && typeof h.position === 'number' && h.position > 0) edges.push({node: node, history: h});
        });
        apply({id: account, viewedVideos: {edges: edges}});
        FollowingClassic_render();
    }
    function knownBatch(ids) {
        if (!current()) return;
        if (!ids.length || Date.now() >= deadline) {
            finish(true);
            return;
        }
        var batch = ids.slice(0, 20),
            rest = ids.slice(20),
            query = 'query ClassicContinueKnown { currentUser{id} ';
        batch.forEach(function (id, index) {
            query += 'v' + index + ':video(id:' + JSON.stringify(id) + '){' + ClassicContinue_fields + '} ';
        });
        candidateRequest(
            {operationName: 'ClassicContinueKnown', query: query + '}'},
            function (result) {
                if (!current()) return;
                if (!result.data || !result.data.currentUser || String(result.data.currentUser.id) !== account) {
                    ClassicContinue.partial = true;
                    finish(true);
                    return;
                }
                if (result.errors && result.errors.length) ClassicContinue.partial = true;
                collect(
                    batch.map(function (id, index) {
                        return result.data['v' + index];
                    })
                );
                fallbackGood = true;
                knownBatch(rest);
            },
            function () {
                if (current()) {
                    ClassicContinue.partial = true;
                    finish(true);
                }
            }
        );
    }
    function known() {
        knownBatch(
            ClassicContinue_knownIds(account).filter(function (id) {
                return !seenCandidates[id];
            })
        );
    }
    function catalogue(after) {
        if (!current()) return;
        if (cataloguePages >= 3 || Date.now() >= deadline) {
            ClassicContinue.partial = true;
            known();
            return;
        }
        cataloguePages++;
        candidateRequest(
            {operationName: 'ClassicContinueCandidates', query: ClassicContinue_candidatesQuery, variables: {first: 100, after: after}},
            function (result) {
                if (!current()) return;
                var user = result.data && result.data.currentUser,
                    connection = user && user.followedVideos;
                if (!user || String(user.id) !== account || !connection || !Array.isArray(connection.edges)) {
                    ClassicContinue.partial = true;
                    known();
                    return;
                }
                fallbackGood = true;
                if (result.errors && result.errors.length) ClassicContinue.partial = true;
                collect(
                    connection.edges.map(function (edge) {
                        return edge && edge.node;
                    })
                );
                var page = connection.pageInfo;
                if (page && page.hasNextPage && page.endCursor && page.endCursor !== after) catalogue(page.endCursor);
                else {
                    if (page && page.hasNextPage) ClassicContinue.partial = true;
                    known();
                }
            },
            function () {
                if (current()) {
                    ClassicContinue.partial = true;
                    known();
                }
            }
        );
    }
    function finish(fromFallback) {
        if (!current()) return;
        if (!fromFallback && !fallbackStarted && !ClassicContinue_parse({id: account, viewedVideos: {edges: edges}}, account, true).length) {
            fallbackStarted = true;
            deadline = Date.now() + 18000;
            catalogue(null);
            return;
        }
        var useCache = fallbackStarted && ClassicContinue.partial && !edges.length && storedEdges.length > 0;
        if (useCache) edges = storedEdges;
        ClassicContinue.recovered = fallbackStarted && edges.length > 0;
        ClassicContinue.loading = false;
        ClassicContinue.error = !successes && !fallbackGood;
        ClassicContinue.cached = !!useCache || (!successes && !fallbackGood && ClassicContinue.items.length > 0);
        if (successes || fallbackGood) {
            var user = {id: account, viewedVideos: {edges: edges}};
            apply(user);
            ClassicContinue_import(account);
            Main_setItem('classic_continue_cache_' + account, JSON.stringify(user.viewedVideos));
        }
        if (fallbackStarted) received.push((ClassicShell_ru() ? 'проверено видео ' : 'videos checked ') + scanned);
        ClassicContinue.status =
            (ClassicShell_ru() ? 'Twitch: получено ' : 'Twitch: received ') +
            received.join(' / ') +
            (ClassicShell_ru() ? '; записей ' : '; videos ') +
            ClassicContinue.all.length +
            (ClassicShell_ru() ? '; незаконченных ' : '; unfinished ') +
            ClassicContinue.items.length;
        Main_setItem(
            'classic_continue_status_' + account,
            JSON.stringify({at: Date.now(), text: ClassicContinue.status, error: ClassicContinue.error})
        );
        FollowingClassic_render();
    }
    function fetchHistory(expanded, limit) {
        if (!current()) return;
        HttpGetSetUserHeader();
        ClassicPages_request(
            FollowingClassic,
            PlayClip_BaseUrl,
            Main_OAuth_User_Headers.concat([
                ['Content-Type', 'application/json'],
                ['Cache-Control', 'no-cache']
            ]),
            'POST',
            JSON.stringify({
                operationName: 'ClassicContinueWatching',
                query: expanded ? ClassicContinue_fullQuery : ClassicContinue_query,
                variables: {first: expanded ? limit || 1000 : 20, excludeHidden: !expanded}
            }),
            function (result) {
                if (!current()) return;
                var user = result.data && result.data.currentUser;
                ClassicContinue_parse(user, account, true); // A null/wrong account or missing connection is an error, never an empty success.
                successes++;
                received.push(user.viewedVideos.edges.length);
                edges = edges.concat(user.viewedVideos.edges);
                if (!expanded) {
                    apply({id: account, viewedVideos: {edges: edges}});
                    FollowingClassic_render();
                    fetchHistory(true);
                } else finish(false);
            },
            function () {
                if (!current()) return;
                received.push(ClassicShell_ru() ? 'ошибка' : 'error');
                if (!expanded) fetchHistory(true);
                else if (!limit) fetchHistory(true, 100);
                else finish();
            }
        );
    }
    FollowingClassic_render();
    fetchHistory(false);
}
function ClassicContinue_history() {
    FollowingClassic_stopPreview();
    FollowingClassic_exit();
    ClassicShell_goScreen(Main_HistoryVod);
}
function ClassicContinue_render(panel) {
    if (ClassicContinue.account !== String(FollowingClassic.account)) return;
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
        fill.style.width = (item.duration ? Math.min(100, (100 * item.position) / item.duration) : 0) + '%';
        progress.appendChild(fill);
        frame.appendChild(progress);
        button.appendChild(frame);
        button.appendChild(ClassicPages_el('strong', 'following-stream-title', item.title));
        button.appendChild(ClassicPages_el('span', 'following-stream-channel', item.channel.displayName));
        button.appendChild(
            ClassicPages_el(
                'span',
                'following-stream-meta',
                item.duration && !item.recording
                    ? (ru ? 'Осталось ' : 'Remaining ') + Play_timeS(Math.max(0, item.duration - item.position))
                    : (ru ? 'Просмотрено ' : 'Watched ') + Play_timeS(item.position)
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
    if (ClassicContinue.recovered)
        section.appendChild(
            ClassicPages_el(
                'p',
                'following-status',
                ru
                    ? 'По сохранённым позициям Twitch. Записи неизвестных ТВ каналов могут отсутствовать.'
                    : 'Recovered from Twitch resume positions. Unknown channels may be missing.'
            )
        );
    if (ClassicContinue.partial && !ClassicContinue.loading)
        section.appendChild(
            ClassicPages_el('p', 'following-status', ru ? 'Проверена часть доступных записей.' : 'Some available videos were checked.')
        );
    if (ClassicContinue.loading) section.appendChild(ClassicPages_el('p', 'following-status', ru ? 'Обновление…' : 'Updating…'));
    else if (ClassicContinue.cached)
        section.appendChild(
            ClassicPages_el(
                'p',
                'following-status',
                ru ? 'Нет связи с Twitch. Показаны последние данные.' : 'Twitch is unavailable. Showing cached history.'
            )
        );
    if (!ClassicContinue.loading && !ClassicContinue.items.length && !ClassicContinue.error)
        section.appendChild(
            ClassicPages_el('p', 'following-status', ru ? 'Twitch не вернул незаконченных записей.' : 'Twitch returned no unfinished videos.')
        );
    if (ClassicContinue.status && (!ClassicContinue.items.length || ClassicContinue.error))
        section.appendChild(ClassicPages_el('p', 'following-status classic-history-status', ClassicContinue.status));
    if (ClassicContinue.all.length && !ClassicContinue.loading) {
        var history = ClassicPages_el(
            'button',
            'following-retry classic-history-action',
            ru ? 'Вся доступная история Twitch' : 'All available Twitch history'
        );
        history.type = 'button';
        history.onclick = ClassicContinue_history;
        section.appendChild(history);
        FollowingClassic.rows.push({key: 'continue:history', node: history, section: 'history'});
    }
    if (!ClassicContinue.loading && (ClassicContinue.error || ClassicContinue.partial || !ClassicContinue.items.length)) {
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
    var data = ClassicContinue_data(item);
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
    ClassicPreview_stop();
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
