/* Account bookmarks for actively watched live archives. GPL-3.0-or-later. */
var ClassicLiveSync = {session: null, timer: null};
var ClassicLiveSync_query = 'query ClassicLiveArchive($id:ID!){currentUser{id}user(id:$id){id stream{id createdAt archiveVideo{id lengthSeconds}}}}';
function ClassicLiveSync_current(s) {
    return (
        s &&
        ClassicLiveSync.session === s &&
        ClassicVodSync_allowed(s.user) &&
        Play_isOn &&
        !PlayVod_isOn &&
        !PlayClip_isOn &&
        Play_data &&
        Play_data.data &&
        String(Play_data.data[14]) === s.channel &&
        String(Play_data.data[7]) === s.broadcast
    );
}
function ClassicLiveSync_start() {
    ClassicLiveSync_stop(true);
    var user = ClassicVodSync_user();
    if (!ClassicVodSync_allowed(user) || !Play_isOn || PlayVod_isOn || PlayClip_isOn || !Play_data.data.length) return;
    var s = {
        user: user,
        channel: String(Play_data.data[14]),
        broadcast: String(Play_data.data[7]),
        video: null,
        metadata: null,
        last: Date.now(),
        activeMs: 0,
        wasActive: false,
        latest: null,
        sentAt: 0,
        metadataAt: 0,
        fetching: false
    };
    ClassicLiveSync.session = s;
    ClassicLiveSync.timer = window.setInterval(ClassicLiveSync_poll, 5000);
    ClassicLiveSync_metadata(s);
}
function ClassicLiveSync_metadata(s) {
    if (!ClassicLiveSync_current(s) || s.fetching) return;
    s.fetching = true;
    s.metadataAt = Date.now();
    ClassicVodSync_request(
        s.user,
        {operationName: 'ClassicLiveArchive', query: ClassicLiveSync_query, variables: {id: s.channel}},
        6000,
        function (error, data) {
            if (!ClassicLiveSync_current(s)) return;
            s.fetching = false;
            var viewer = data && data.currentUser,
                channel = data && data.user,
                stream = channel && channel.stream,
                archive = stream && stream.archiveVideo;
            if (
                error ||
                !viewer ||
                String(viewer.id) !== s.user.id ||
                !channel ||
                String(channel.id) !== s.channel ||
                !stream ||
                String(stream.id) !== s.broadcast ||
                !archive ||
                !/^\d+$/.test(String(archive.id))
            ) {
                s.metadata = null;
                return;
            }
            var created = Date.parse(stream.createdAt),
                duration = Number(archive.lengthSeconds);
            if (!created || !isFinite(duration) || duration <= 0) {
                s.metadata = null;
                return;
            }
            if (s.video && s.video !== String(archive.id)) {
                s.metadata = null;
                return;
            }
            s.video = String(archive.id);
            s.metadata = {created: created, duration: duration, at: Date.now()};
            if (ClassicVodSync.status.user !== s.user.id || ClassicVodSync.status.video !== s.video) {
                ClassicVodSync.status = {
                    user: s.user.id,
                    video: s.video,
                    read: 'live',
                    write: 'idle',
                    readAt: Date.now(),
                    position: null,
                    saved: 0,
                    source: 'live_archive'
                };
                ClassicVodSync_saveStatus();
            }
        }
    );
}
function ClassicLiveSync_poll() {
    var s = ClassicLiveSync.session;
    if (!ClassicLiveSync_current(s)) {
        ClassicLiveSync_stop(false);
        return;
    }
    if (Main_isStopped) {
        s.wasActive = false;
        s.last = Date.now();
        return;
    }
    var now = Date.now(),
        delta = now - s.last,
        active = false;
    try {
        active = !Main_isStopped && Play_Playing && Play_isPlaying() && !Play_PreviewId;
    } catch (error) {
        /* Native not ready. */
    }
    if (delta <= 0 || delta > 10000) {
        s.metadata = null;
        s.metadataAt = 0;
    }
    var continuous = active && s.wasActive && delta > 0 && delta <= 10000;
    if (continuous) s.activeMs += delta;
    s.last = now;
    s.wasActive = active;
    if (active && now - s.metadataAt >= 60000) ClassicLiveSync_metadata(s);
    if (!continuous || s.fetching || !s.metadata || s.activeMs < 5000) return;
    var elapsed = (now - s.metadata.created) / 1000,
        age = (now - s.metadata.at) / 1000;
    // Reject a wrong device clock instead of writing a position far beyond the archive.
    if (elapsed < 0 || elapsed > s.metadata.duration + Math.max(0, age) + 600) return;
    var delay = Math.max(0, Number(ChatLive_Latency[0]) || 0) / 1000;
    var position = Math.max(0, Math.floor(elapsed - delay));
    if (!s.latest || s.latest.position !== position) {
        s.latest = {position: position, updatedAt: now, revision: ++ClassicVodSync.sequence, dirty: true};
        ClassicVodSync_store(s.user.id, s.video, s.latest);
    }
    if (s.activeMs >= 30000 && (!s.sentAt || now - s.sentAt >= 30000)) {
        s.sentAt = now;
        ClassicVodSync_queue(s, s.latest);
    }
}
function ClassicLiveSync_flush() {
    var s = ClassicLiveSync.session;
    if (ClassicLiveSync_current(s) && s.latest && s.latest.dirty) ClassicVodSync_queue(s, s.latest);
}
function ClassicLiveSync_stop(flush) {
    if (flush) ClassicLiveSync_flush();
    window.clearInterval(ClassicLiveSync.timer);
    ClassicLiveSync.timer = null;
    ClassicLiveSync.session = null;
}
