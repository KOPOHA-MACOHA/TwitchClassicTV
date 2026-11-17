/* Local watch diagnostics. GPL-3.0-or-later. */
var ClassicSyncReport_entries = {};
var ClassicSyncReport_account = null;
var ClassicSyncReport_labels = {
    'vod-read': 'ok timeout network auth server malformed unsupported cancelled',
    resume: 'received empty unavailable auth timeout network server malformed unsupported cancelled',
    'vod-write': 'saved timeout network auth server malformed unsupported cancelled unconfirmed',
    'vod-start': 'cloud local explicit player',
    history: 'index recovered partial cached failed',
    minute: 'http endpoint-pending',
    bonus: 'http unavailable none available claimed rejected',
    raid: 'http received switched unavailable revoked'
};

function ClassicSyncReport_snapshot() {
    var user = ClassicVodSync_user();
    var account = user ? user.id : null;
    if (account !== ClassicSyncReport_account) {
        ClassicSyncReport_account = account;
        ClassicSyncReport_entries = {};
    }
    return ClassicSyncReport_entries;
}

function ClassicSyncReport_record(area, outcome, first, second) {
    var choices = ClassicSyncReport_labels[area];
    if (typeof choices !== 'string' || choices.split(' ').indexOf(outcome) < 0) return;
    var detail = [first, second].filter(function (value) {
        return Number.isSafeInteger(value) && value >= 0 && value <= 99999999;
    });
    var snapshot = ClassicSyncReport_snapshot();
    if (ClassicSyncReport_account === null) return;
    snapshot[area] = new Date().toISOString().slice(11, 19) + 'Z ' + outcome + (detail.length ? ' ' + detail.join('/') : '');
}

function ClassicSyncReport_text() {
    var snapshot = ClassicSyncReport_snapshot();
    var lines = ['Twitch Classic ' + ClassicBuild.name, 'sync=' + (ClassicFeatures_enabled('vod_sync') ? 'on' : 'off')];
    Object.keys(ClassicSyncReport_labels).forEach(function (area) {
        if (snapshot[area]) lines.push(area + ' ' + snapshot[area]);
    });
    if (lines.length === 2) lines.push('No events in this session');
    return lines.join('\n');
}

function ClassicSyncReport_open() {
    var ru = ClassicShell_ru();
    var title = ru ? 'Отчёт синхронизации' : 'Sync report';
    ClassicShell_push(
        title,
        ru ? 'Считайте QR камерой или сканером на телефоне. Код содержит текст отчёта.' :
             'Scan with your phone camera or QR reader. The code contains the report as text.',
        [ClassicShell_row(ru ? 'Назад' : 'Back', '', ClassicShell_settingsBack, 'history')]
    );
    var report = ClassicSyncReport_text();
    var layout = document.createElement('div');
    layout.className = 'classic-sync-report';
    var holder = document.createElement('div');
    holder.className = 'qr-login-code';
    var qr = qrcode(0, 'M');
    qr.addData(report);
    qr.make();
    holder.innerHTML = qr.createSvgTag({cellSize: 5, margin: 4, scalable: true});
    holder.querySelector('svg').setAttribute('aria-label', title);
    layout.appendChild(holder);
    var preview = document.createElement('pre');
    preview.textContent = report;
    layout.appendChild(preview);
    document.getElementById('classic_preferences_rows').prepend(layout);
}
