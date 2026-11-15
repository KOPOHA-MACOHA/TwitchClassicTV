/* Account VOD resume through Twitch's site GraphQL API. GPL-3.0-or-later.
 * The protocol is undocumented. Failures must never prevent playback.
 * Only position metadata is stored locally; credentials are never persisted here.
 */
var ClassicVodSync = {
    session: null,
    sequence: 0,
    requests: {},
    writers: {},
    timer: null,
    readTimeout: 1800,
    requestTimeout: 6000,
    interval: 30000,
    status: {read: 'idle', write: 'idle', position: null, saved: 0}
};
var ClassicVodSync_readQuery = 'query ClassicVodSyncRead($id:ID!){video(id:$id){id self{viewingHistory{position updatedAt}}}}';
var ClassicVodSync_writeQuery =
    'mutation ClassicVodSyncWrite($input:UpdateUserViewedVideoInput!){updateUserViewedVideo(input:$input){video{id self{viewingHistory{position updatedAt}}}}}';
function ClassicVodSync_user() {
    return AddUser_UserHasToken() ? {id: String(AddUser_UsernameArray[0].id), token: AddUser_UsernameArray[0].access_token} : null;
}
function ClassicVodSync_allowed(user) {
    var current = ClassicVodSync_user();
    return ClassicFeatures_enabled('vod_sync') && current && user && current.id === user.id;
}
function ClassicVodSync_cache(userId) {
    try {
        var cache = JSON.parse(localStorage.getItem('classic_vod_resume_' + userId));
        if (!cache || typeof cache !== 'object' || Array.isArray(cache)) return {};
        Object.keys(cache).forEach(function (id) {
            var record = cache[id];
            if (
                !/^\d+$/.test(id) ||
                !record ||
                typeof record.position !== 'number' ||
                !isFinite(record.position) ||
                record.position < 0 ||
                !isFinite(record.updatedAt)
            )
                delete cache[id];
        });
        return cache;
    } catch (error) {
        return {};
    }
}
function ClassicVodSync_store(userId, videoId, record) {
    var cache = ClassicVodSync_cache(userId);
    cache[videoId] = record;
    var keys = Object.keys(cache).sort(function (a, b) {
        return cache[b].updatedAt - cache[a].updatedAt;
    });
    keys.slice(200).forEach(function (key) {
        delete cache[key];
    });
    try {
        Main_setItem('classic_vod_resume_' + userId, JSON.stringify(cache));
    } catch (error) {
        /* Storage failure cannot stop playback. */
    }
}
function ClassicVodSync_request(user, body, timeout, done) {
    var id = ++ClassicVodSync.sequence;
    var request = {user: user, done: done, timer: null};
    ClassicVodSync.requests[id] = request;
    request.timer = window.setTimeout(function () {
        ClassicVodSync_finish(id, 'timeout');
    }, timeout);
    try {
        FullxmlHttpGet(
            PlayClip_BaseUrl,
            [
                [clientIdHeader, AddCode_backup_client_id],
                [Bearer_Header, Main_OAuth + user.token],
                ['Content-Type', 'application/json']
            ],
            ClassicVodSync_httpSuccess,
            ClassicVodSync_httpFailure,
            0,
            id,
            'POST',
            JSON.stringify(body)
        );
    } catch (error) {
        ClassicVodSync_finish(id, 'network');
    }
}
function ClassicVodSync_httpFailure(key, id) {
    ClassicVodSync_finish(Number(id), 'network');
}
function ClassicVodSync_httpSuccess(response, key, id) {
    id = Number(id);
    if (!ClassicVodSync.requests[id]) return;
    var error = null,
        data = null;
    try {
        var result = JSON.parse(response.responseText);
        if (response.status === 401 || response.status === 403) error = 'auth';
        else if (response.status !== 200) error = response.status ? 'server' : 'network';
        else if (result.errors && result.errors.length) {
            var messages = JSON.stringify(result.errors);
            error = /unauth|forbidden|integrity|access.denied|invalid.*token/i.test(messages) ? 'auth' : 'unsupported';
        } else if (!result.data || typeof result.data !== 'object') error = 'malformed';
        else data = result.data;
    } catch (e) {
        error = response.status === 401 || response.status === 403 ? 'auth' : 'malformed';
    }
    ClassicVodSync_finish(id, error, data);
}
function ClassicVodSync_finish(id, error, data) {
    var request = ClassicVodSync.requests[id];
    if (!request) return;
    delete ClassicVodSync.requests[id];
    window.clearTimeout(request.timer);
    // Account changes invalidate responses, including writes completed after logout.
    if (!ClassicVodSync_allowed(request.user)) error = 'cancelled';
    try {
        request.done(error, data);
    } catch (e) {
        Main_Log('VOD sync callback failed');
    }
}
function ClassicVodSync_history(video, videoId) {
    if (!video || String(video.id) !== videoId || !video.self) return null;
    var history = video.self.viewingHistory;
    if (!history || typeof history.position !== 'number' || !isFinite(history.position) || history.position < 0) return null;
    return {position: Math.floor(history.position), updatedAt: Date.parse(history.updatedAt) || 0};
}
function ClassicVodSync_current(session) {
    return (
        session &&
        ClassicVodSync.session === session &&
        String(Main_values.ChannelVod_vodId) === session.video &&
        ClassicVodSync_allowed(session.user)
    );
}
function ClassicVodSync_open(continueStart, fromStart, resume) {
    ClassicVodSync_stop(false);
    var user = ClassicVodSync_user(),
        video = String(Main_values.ChannelVod_vodId || '');
    ClassicVodSync.status = {read: 'idle', write: 'idle', position: null, saved: 0};
    if (!ClassicFeatures_enabled('vod_sync') || !user || !/^\d+$/.test(video) || Play_PreviewId || Play_OpenRewind) {
        ClassicVodSync.status.read = !user ? 'signin' : 'off';
        continueStart();
        return;
    }
    var s = {
        user: user,
        video: video,
        duration: Number(Play_DurationSeconds) || 0,
        waiting: false,
        remote: null,
        started: false,
        seen: false,
        expected: 0,
        lastPosition: null,
        lastSend: 0,
        firstSave: false,
        continueStart: continueStart
    };
    ClassicVodSync.session = s;
    var previous = ClassicVodSync.writers[user.id + ':' + video];
    if (previous && !previous.busy) previous.blocked = false;
    Object.keys(ClassicVodSync.writers).forEach(function (key) {
        if (key !== user.id + ':' + video && !ClassicVodSync.writers[key].busy) delete ClassicVodSync.writers[key];
    });
    ClassicVodSync.timer = window.setInterval(ClassicVodSync_poll, 5000);
    // Explicit timestamps, native restoration and "start over" always win over cloud resume.
    if (fromStart) Main_vodOffset = 0.001;
    if (fromStart || Main_vodOffset || PlayVod_replay || (!resume && Settings_Obj_default('vod_dialog') >= 2)) {
        continueStart();
        return;
    }
    s.waiting = true;
    ClassicVodSync.status.read = 'reading';
    Main_PreventClick(false, Main_PreventClickfun);
    Play_showBufferDialog();
    ClassicVodSync_request(
        user,
        {operationName: 'ClassicVodSyncRead', query: ClassicVodSync_readQuery, variables: {id: video}},
        ClassicVodSync.readTimeout,
        function (error, data) {
            if (ClassicVodSync.session !== s || !s.waiting) return;
            s.waiting = false;
            if (!ClassicVodSync_current(s)) {
                ClassicVodSync.status.read = 'cancelled';
                ClassicVodSync_stop(false);
                if (String(Main_values.ChannelVod_vodId) === video && !Main_isStopped) continueStart();
                return;
            }
            var remote = !error && ClassicVodSync_history(data.video, video);
            ClassicVodSync.status.read = error || (!data.video ? 'unavailable' : !data.video.self ? 'auth' : remote ? 'received' : 'empty');
            if (remote) {
                var local = ClassicVodSync_cache(user.id)[video];
                // A newer local edit may be a deliberate backward seek. Never use max(position).
                if (local && local.dirty && (!remote.updatedAt || local.updatedAt > remote.updatedAt)) s.remote = local.position;
                else s.remote = remote.position;
                ClassicVodSync.status.position = s.remote;
            } else {
                var cached = ClassicVodSync_cache(user.id)[video];
                if (cached && typeof cached.position === 'number') s.remote = cached.position;
            }
            continueStart();
        }
    );
}
function ClassicVodSync_position(localPosition) {
    var s = ClassicVodSync.session;
    if (!ClassicVodSync_current(s) || s.remote === null) return localPosition;
    var duration = Number(Play_DurationSeconds) || s.duration;
    // The native player uses a positive millisecond offset to distinguish start-over from restoration.
    return Math.max(0.001, duration > 0 ? Math.min(s.remote, Math.max(0, duration - 1)) : s.remote);
}
function ClassicVodSync_started(seconds) {
    var s = ClassicVodSync.session;
    if (!ClassicVodSync_current(s)) return;
    s.started = true;
    s.expected = Math.max(0, Number(seconds) || 0);
}
function ClassicVodSync_sample(force, suppliedPosition) {
    var s = ClassicVodSync.session;
    if (!ClassicVodSync_current(s) || !s.started || !PlayVod_isOn || PlayClip_isOn || Play_PreviewId) return;
    if (!force && (Main_isStopped || PlayVod_IsJumping || Play_jumping || Main_vodOffset)) return;
    var position;
    try {
        position = suppliedPosition === undefined ? OSInterface_gettime() / 1000 : suppliedPosition;
        if (!isFinite(position) || position < 0) return;
        // Do not save the previous player clock or an uninitialised zero during startup.
        if (!s.seen) {
            if ((!force && !OSInterface_getPlaybackState()) || Math.abs(position - s.expected) > 30) return;
            s.seen = true;
        }
    } catch (error) {
        return;
    }
    if (position === 0 && s.lastPosition > 10 && suppliedPosition === undefined) return;
    var duration = Number(Play_DurationSeconds) || s.duration;
    if (duration > 0) position = Math.min(position, duration);
    position = Math.floor(position);
    if (s.lastPosition !== position) {
        s.lastPosition = position;
        var record = {position: position, updatedAt: Date.now(), revision: ++ClassicVodSync.sequence, dirty: true};
        ClassicVodSync_store(s.user.id, s.video, record);
        s.latest = record;
    }
    if (!s.latest || !s.latest.dirty) return;
    if (force || !s.firstSave || Date.now() - s.lastSend >= ClassicVodSync.interval) {
        s.firstSave = true;
        s.lastSend = Date.now();
        ClassicVodSync_queue(s, s.latest);
    }
}
function ClassicVodSync_poll() {
    var s = ClassicVodSync.session;
    if (!s) return;
    if (!ClassicVodSync_current(s)) {
        var continuation = s.waiting && String(Main_values.ChannelVod_vodId) === s.video && !Main_isStopped ? s.continueStart : null;
        ClassicVodSync_stop(false);
        if (continuation) continuation();
        return;
    }
    ClassicVodSync_sample(false);
}
function ClassicVodSync_queue(session, record) {
    var key = session.user.id + ':' + session.video;
    var writer = ClassicVodSync.writers[key];
    if (!writer)
        writer = ClassicVodSync.writers[key] = {user: session.user, video: session.video, busy: false, blocked: false, latest: null, attempted: null};
    writer.user = session.user;
    writer.latest = record;
    ClassicVodSync_send(writer);
}
function ClassicVodSync_send(writer) {
    if (writer.busy || writer.blocked || !writer.latest || writer.attempted === writer.latest.revision || !ClassicVodSync_allowed(writer.user))
        return;
    writer.busy = true;
    var record = writer.latest;
    writer.attempted = record.revision;
    ClassicVodSync.status.write = 'sending';
    ClassicVodSync_request(
        writer.user,
        {
            operationName: 'ClassicVodSyncWrite',
            query: ClassicVodSync_writeQuery,
            variables: {input: {userID: writer.user.id, videoID: writer.video, videoType: 'VOD', position: record.position}}
        },
        ClassicVodSync.requestTimeout,
        function (error, data) {
            if (error) {
                ClassicVodSync_written(writer, record, error);
                return;
            }
            var video = data.updateUserViewedVideo && data.updateUserViewedVideo.video;
            if (!video || String(video.id) !== writer.video) {
                ClassicVodSync_written(writer, record, 'unsupported');
                return;
            }
            var history = ClassicVodSync_history(video, writer.video);
            if (history && history.position === record.position) {
                ClassicVodSync_written(writer, record, null);
                return;
            }
            // A 200 response or video ID alone does not establish a saved position.
            ClassicVodSync_request(
                writer.user,
                {operationName: 'ClassicVodSyncRead', query: ClassicVodSync_readQuery, variables: {id: writer.video}},
                ClassicVodSync.requestTimeout,
                function (readError, readData) {
                    var stored = !readError && ClassicVodSync_history(readData.video, writer.video);
                    ClassicVodSync_written(writer, record, readError || (!stored || stored.position !== record.position ? 'unconfirmed' : null));
                }
            );
        }
    );
}
function ClassicVodSync_written(writer, record, error) {
    writer.busy = false;
    // An ambiguous timed-out mutation must not be followed by more writes that it could overtake.
    if (error === 'timeout' || error === 'auth' || error === 'unsupported' || error === 'cancelled') writer.blocked = true;
    if (error !== 'cancelled') {
        ClassicVodSync.status.write = error || 'saved';
        if (!error) {
            ClassicVodSync.status.saved = Date.now();
            var cached = ClassicVodSync_cache(writer.user.id)[writer.video];
            if (cached && cached.revision === record.revision) {
                cached.dirty = false;
                ClassicVodSync_store(writer.user.id, writer.video, cached);
            }
            record.dirty = false;
        }
    }
    ClassicVodSync_send(writer);
}
function ClassicVodSync_stop(flush) {
    if (flush) ClassicVodSync_sample(true);
    window.clearInterval(ClassicVodSync.timer);
    ClassicVodSync.timer = null;
    if (ClassicVodSync.session) {
        if (ClassicVodSync.session.waiting) ClassicVodSync.status.read = 'cancelled';
        ClassicVodSync.session.waiting = false;
    }
    ClassicVodSync.session = null;
}
function ClassicVodSync_waitKey(event) {
    var s = ClassicVodSync.session;
    if (!s || !s.waiting) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.keyCode === KEY_RETURN || event.keyCode === KEY_KEYBOARD_BACKSPACE) {
        ClassicVodSync_stop(false);
        Main_vodOffset = 0;
        Play_HideBufferDialog();
        PlayVod_isOn = true;
        PlayVod_shutdownStream(true);
    }
}
window.addEventListener('keydown', ClassicVodSync_waitKey, true);
function ClassicVodSync_background() {
    var s = ClassicVodSync.session;
    if (s && s.waiting) {
        ClassicVodSync_stop(false);
        PlayVod_isOn = true;
        PlayVod_shutdownStream(true);
    } else {
        var saved;
        try {
            saved = OSInterface_getsavedtime() / 1000;
        } catch (error) {
            /* Use the current clock. */
        }
        ClassicVodSync_sample(true, saved > 0 ? saved : undefined);
    }
}
function ClassicVodSync_menu() {
    var ru = ClassicShell_ru(),
        enabled = ClassicFeatures_enabled('vod_sync');
    var words = ru
        ? {
              idle: 'Ещё не выполнялось',
              off: 'Выключено',
              signin: 'Требуется вход в Twitch',
              reading: 'Ожидание Twitch',
              cancelled: 'Операция отменена',
              received: 'Позиция получена с Twitch',
              empty: 'На Twitch нет сохранённой позиции',
              unavailable: 'Запись недоступна на Twitch',
              sending: 'Отправка позиции',
              saved: 'Сохранение подтверждено Twitch',
              timeout: 'Сервер не ответил вовремя. Позиция сохранена на ТВ',
              auth: 'Twitch отклонил авторизацию',
              unsupported: 'Twitch отклонил запрос',
              malformed: 'Некорректный ответ Twitch',
              network: 'Нет связи с Twitch',
              server: 'Ошибка сервера Twitch',
              unconfirmed: 'Twitch не подтвердил новую позицию'
          }
        : {
              idle: 'Not attempted yet',
              off: 'Disabled',
              signin: 'Sign in to Twitch',
              reading: 'Reading position',
              cancelled: 'Cancelled',
              received: 'Position received from Twitch',
              empty: 'No saved position on Twitch',
              unavailable: 'Video unavailable on Twitch',
              sending: 'Sending position',
              saved: 'Save confirmed by Twitch',
              timeout: 'Server timed out. Position is saved on TV',
              auth: 'Twitch rejected authorisation',
              unsupported: 'Twitch rejected the request',
              malformed: 'Invalid Twitch response',
              network: 'Cannot reach Twitch',
              server: 'Twitch server error',
              unconfirmed: 'Twitch has not confirmed the new position'
          };
    var status = ClassicVodSync.status;
    var summary =
        (ru ? 'Получение: ' : 'Read: ') +
        (words[status.read] || words.idle) +
        ' · ' +
        (ru ? 'Сохранение: ' : 'Write: ') +
        (words[status.write] || words.idle);
    if (status.saved) summary += ' · ' + new Date(status.saved).toLocaleTimeString();
    ClassicShell_push(ru ? 'Синхронизация записей Twitch' : 'Twitch VOD synchronisation', summary, [
        ClassicShell_row(
            ru ? 'Синхронизировать позицию VOD' : 'Synchronise VOD position',
            ru
                ? 'Получать позицию при открытии и сохранять во время просмотра. Изменение применяется при следующем открытии записи.'
                : 'Read on open and save while watching. Changes apply when a video is reopened.',
            function () {
                ClassicFeatures_set('vod_sync', !ClassicFeatures_enabled('vod_sync'));
                // Replace this page without adding another Back navigation level.
                ClassicShell_settingsBack();
                ClassicVodSync_menu();
            },
            'history',
            enabled ? (ru ? 'Вкл.' : 'On') : ru ? 'Выкл.' : 'Off'
        )
    ]);
}
