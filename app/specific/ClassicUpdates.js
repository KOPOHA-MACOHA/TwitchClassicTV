/* Fork-owned APK updates through GitHub Releases. GPL-3.0-or-later. */
var ClassicUpdates = {active: true, generation: 0, checking: false, checked: 0};
function ClassicUpdates_newer(a, b) {
    var left = a.split('.').map(Number),
        right = b.split('.').map(Number);
    for (var i = 0; i < Math.max(left.length, right.length); i++) {
        if ((left[i] || 0) !== (right[i] || 0)) return (left[i] || 0) > (right[i] || 0);
    }
    return false;
}
function ClassicUpdates_check(force) {
    if (ClassicUpdates.checking) return;
    if (!force && Date.now() - ClassicUpdates.checked < 6 * 60 * 60 * 1000) return;
    ClassicUpdates.checking = true;
    ClassicPages_request(
        ClassicUpdates,
        'https://api.github.com/repos/' + ClassicBuild.repository + '/releases/latest',
        [['Accept', 'application/vnd.github+json']],
        null,
        null,
        function (release) {
            ClassicUpdates.checking = false;
            Main_Ischecking = false;
            Main_UpdateDialogLastCheck = Main_getclock();
            ClassicUpdates.checked = Date.now();
            if (!release || release.draft || release.prerelease || !/^v?\d+\.\d+(?:\.\d+)?$/.test(release.tag_name) || !Array.isArray(release.assets))
                throw Error('Release');
            var name = release.tag_name.replace(/^v/, ''),
                filename = 'Twitch-Classic-' + name + '.apk',
                url = 'https://github.com/' + ClassicBuild.repository + '/releases/download/' + release.tag_name + '/' + filename,
                asset = release.assets.filter(function (a) {
                    return a.name === filename && a.browser_download_url === url;
                })[0];
            if (!asset) throw Error('APK asset');
            Main_HasUpdate = ClassicUpdates_newer(name, ClassicBuild.name);
            Main_IsWebupdate = false;
            version.ApkUrl = url;
            version.changelog = [{title: 'Twitch Classic ' + name, changes: [ClassicChat_escape(release.body || '')]}];
            if (Main_HasUpdate) Main_WarnUpdate(false);
            else if (Main_isUpdateDialogVisible()) {
                Main_UpdateDialogTitle();
                OSInterface_showToast(STR_NO_UPDATES);
            }
            Main_UpdateDialogSetTitle();
        },
        ClassicUpdates_failure
    );
}
function ClassicUpdates_failure() {
    ClassicUpdates.checking = false;
    Main_Ischecking = false;
    // Leave the last known valid APK URL intact; a failed request is not "no updates".
    if (Main_isUpdateDialogVisible()) {
        Main_UpdateDialogTitle();
        Main_UpdateDialogSetTitle();
        OSInterface_showToast(STR_UPDATE_CHECKING_FAIL);
    }
}
