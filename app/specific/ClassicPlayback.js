/* Playback must remain usable when optional services fail. GPL-3.0-or-later. */
var ClassicPlayback = {active: false, generation: 0, timer: null, started: 0, timeout: 30000, services: false, failures: {}};
function ClassicPlayback_optional(name, callback) {
    if (ClassicPlayback.failures[name]) return;
    try {
        return callback();
    } catch (error) {
        ClassicPlayback.failures[name] = true;
        Main_Log('Optional playback service failed: ' + name);
    }
}
function ClassicPlayback_boot() {
    // A failed 0.6 restore must not trap the user again after installing this fix.
    var pending = localStorage.getItem('classic_pending_playback');
    if (pending || localStorage.getItem('classic_playback_recovery') !== '0.7') {
        Main_values.Play_WasPlaying = 0;
        Main_SaveValues();
        localStorage.removeItem('classic_pending_playback');
        localStorage.setItem('classic_playback_recovery', '0.7');
    }
}
function ClassicPlayback_begin() {
    ClassicPlayback_stop();
    Main_PreventClick(false, Main_PreventClickfun);
    ClassicPlayback.active = true;
    ClassicPlayback.started = Date.now();
    localStorage.setItem('classic_pending_playback', 'live');
    ClassicPlayback.timer = window.setInterval(ClassicPlayback_poll, 1000);
}
function ClassicPlayback_stop() {
    window.clearInterval(ClassicPlayback.timer);
    ClassicPlayback.timer = null;
    ClassicPlayback.active = false;
    ClassicPlayback.services = false;
    ClassicPlayback.generation++;
    ClassicPlayback_optional('points-stop', PlayChannelPoints_Stop);
    ClassicPlayback_optional('raid-stop', PlayRaid_Close);
}
function ClassicPlayback_poll() {
    if (!ClassicPlayback.active) return;
    if (!Play_isOn || PlayVod_isOn || PlayClip_isOn) {
        ClassicPlayback_stop();
        return;
    }
    if (Main_isStopped) return;
    var playing = false;
    try {
        playing = Play_Playing && Play_isPlaying();
    } catch (error) {
        /* Wait for the native player, without aborting setup. */
    }
    if (playing) {
        ClassicPlayback.active = false;
        window.clearInterval(ClassicPlayback.timer);
        ClassicPlayback.timer = null;
        localStorage.removeItem('classic_pending_playback');
        ClassicPlayback_optional('hide-loading', Play_HideBufferDialog);
        var generation = ClassicPlayback.generation;
        // Start network/chat extras on a later turn, after native playback and controls are ready.
        window.setTimeout(function () {
            if (generation !== ClassicPlayback.generation || !Play_isOn || Main_isStopped) return;
            ClassicPlayback.services = true;
            ClassicPlayback_optional('points', PlayChannelPoints_Start);
            ClassicPlayback_optional('raids', function () {
                PlayRaid_SetChannel(Play_data.data[14]);
            });
        }, 2000);
    } else if (Date.now() - ClassicPlayback.started >= ClassicPlayback.timeout) ClassicPlayback_cancel(true);
}
function ClassicPlayback_cancel(timedOut) {
    ClassicPlayback_stop();
    window.clearTimeout(Main_hideScene1DocAndCallBackId);
    Play_loadDataId = -1;
    Main_values.Play_WasPlaying = 0;
    localStorage.removeItem('classic_pending_playback');
    // Each cleanup is independent: failure of an auxiliary service cannot prevent leaving the player.
    try {
        Play_PreshutdownStream(true);
    } catch (error) {
        Main_Log('Playback startup cleanup failed');
    }
    Play_isOn = false;
    Play_Playing = false;
    Main_clearAllPlayerEvents();
    Main_PreventClick(false, Main_PreventClickfun);
    try {
        Play_HideBufferDialog();
    } catch (error) {
        /* Browser state still needs recovery. */
    }
    Main_showScene1Doc();
    Main_hideScene2Doc();
    Main_values.Play_WasPlaying = 0;
    Main_SaveValues();
    Main_SwitchScreen(false, true);
    if (timedOut)
        Main_showWarningDialog(
            ClassicShell_ru() ? 'Не удалось запустить трансляцию. Попробуйте открыть её снова.' : 'The stream did not start. Try opening it again.',
            5000
        );
}
function ClassicPlayback_startKey(event) {
    if (ClassicPlayback.active && (event.keyCode === KEY_RETURN || event.keyCode === KEY_KEYBOARD_BACKSPACE)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        ClassicPlayback_cancel(false);
    }
}
window.addEventListener('keydown', ClassicPlayback_startKey, true);
