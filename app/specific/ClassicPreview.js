/* Native thumbnail ownership across browsing, navigation and dialogs. GPL-3.0-or-later. */
var ClassicPreview = {epoch: 0, sequence: 0, requests: {}, resumeTimer: null};
function ClassicPreview_blocked() {
    if (typeof Main_Scene1Doc === 'undefined' || !Main_Scene1Doc) return true;
    if (!Main_isScene1DocVisible() || Main_isStopped || ClassicShell_navActive || ChannelClassic_tabFocus || Settings_isVisible() || Main_values.Main_Go === Main_addUser)
        return true;
    return Array.prototype.some.call(document.querySelectorAll('[role="dialog"], [id*="dialog"]'), function (node) {
        if (node.closest('#scene2') && (typeof Main_Scene2Doc === 'undefined' || !Main_Scene2Doc || !Main_isScene2DocVisible())) return false;
        return node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
    });
}
function ClassicPreview_stop() {
    if (typeof Main_Scene1Doc === 'undefined' || !Main_Scene1Doc || !Main_isScene1DocVisible()) return;
    ClassicPreview.epoch++;
    ClassicPreview.requests = {};
    window.clearTimeout(ClassicPreview.resumeTimer);
    window.clearTimeout(FollowingClassic.previewTimer);
    FollowingClassic.previewRequest = (FollowingClassic.previewRequest || 0) + 1;
    Main_clearTimeout(Screens_LoadPreviewId);
    Main_clearTimeout(ChannelContent_LoadPreviewStartId);
    if (Main_IsOn_OSInterface && (Play_PreviewId || (!Play_isOn && !PlayVod_isOn && !PlayClip_isOn))) {
        OSInterface_ClearSidePanelPlayer();
        Play_CheckIfIsLiveCleanEnd();
    }
    document.querySelectorAll('#screens_holder .opacity_zero').forEach(function (node) {
        node.classList.remove('opacity_zero');
    });
}
function ClassicPreview_ticket(screen, position, channel) {
    var id = ++ClassicPreview.sequence;
    ClassicPreview.requests[id] = {epoch: ClassicPreview.epoch, screen: screen, position: position, channel: !!channel};
    Object.keys(ClassicPreview.requests)
        .slice(0, -40)
        .forEach(function (key) {
            delete ClassicPreview.requests[key];
        });
    return id;
}
function ClassicPreview_reply(result, key, id) {
    var request = ClassicPreview.requests[id];
    delete ClassicPreview.requests[id];
    if (!request || request.epoch !== ClassicPreview.epoch || ClassicPreview_blocked() || Main_values.Main_Go !== request.screen) return;
    if (request.channel) ChannelContent_LoadPreviewResult(result, request.screen);
    else Screens_LoadPreviewResult(result, request.screen, request.position);
}
function ClassicPreview_resume() {
    window.clearTimeout(ClassicPreview.resumeTimer);
    ClassicPreview.resumeTimer = window.setTimeout(function () {
        if (ClassicPreview_blocked()) return;
        if (FollowingClassic.active && Main_values.Main_Go === Main_UserLive) {
            var row = FollowingClassic.rows[FollowingClassic.cursor];
            // A response under a dialog can replace the node that held focus.
            if (row && (!row.node.classList.contains('is-focused') || document.activeElement !== row.node))
                FollowingClassic_focus(true);
            else FollowingClassic_preview(row);
        } else if (Main_values.Main_Go === Main_ChannelContent) ChannelContent_LoadPreview();
        else if (ScreenObj[Main_values.Main_Go] && ScreenObj[Main_values.Main_Go].screenType === 0) Screens_LoadPreview(Main_values.Main_Go);
    }, 80);
}
