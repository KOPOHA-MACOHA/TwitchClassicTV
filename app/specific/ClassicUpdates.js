/* Fork-owned APK updates through GitHub Releases. GPL-3.0-or-later. */
var ClassicUpdates = {
    active: true,
    generation: 0,
    checking: false,
    checked: 0,
    startupAttempted: false,
    startupWanted: false,
    pendingOffer: false,
    offerTimer: null,
    dialog: null,
    dialogFocus: 0,
    previousFocus: null,
    state: 'idle',
    latest: '',
    notes: ''
};
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
    ClassicUpdates.state = 'checking';
    ClassicUpdates_renderDialog();
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
            if (!release || release.draft || release.prerelease || !/^v?\d+\.\d+(?:\.\d+)?$/.test(release.tag_name) || !Array.isArray(release.assets))
                throw Error('Release');
            var name = release.tag_name.replace(/^v/, ''),
                filename = 'Twitch-Classic-' + name + '.apk',
                url = 'https://github.com/' + ClassicBuild.repository + '/releases/download/' + release.tag_name + '/' + filename,
                asset = release.assets.filter(function (a) {
                    return a.name === filename && a.browser_download_url === url;
                })[0];
            if (!asset) throw Error('APK asset');
            ClassicUpdates.checked = Date.now();
            ClassicUpdates.latest = name;
            ClassicUpdates.notes = String(release.body || '');
            Main_HasUpdate = ClassicUpdates_newer(name, ClassicBuild.name);
            Main_IsWebupdate = false;
            version.ApkUrl = url;
            version.changelog = [{title: 'Twitch Classic ' + name, changes: [ClassicChat_escape(release.body || '')]}];
            ClassicUpdates.state = Main_HasUpdate ? 'available' : 'current';
            if (ClassicUpdates.dialog) ClassicUpdates_renderDialog();
            var startup = ClassicUpdates.startupWanted,
                manual = ClassicUpdates.manualWanted;
            ClassicUpdates.manualWanted = false;
            ClassicUpdates.startupWanted = false;
            if (Main_HasUpdate && startup) {
                ClassicUpdates.pendingOffer = true;
                ClassicUpdates_offerStartup();
            } else if (Main_HasUpdate && !ClassicUpdates.dialog && !manual) Main_WarnUpdate(false);
        },
        ClassicUpdates_failure
    );
}
function ClassicUpdates_failure() {
    ClassicUpdates.checking = false;
    ClassicUpdates.startupWanted = false;
    ClassicUpdates.manualWanted = false;
    Main_Ischecking = false;
    ClassicUpdates.state = 'failure';
    ClassicUpdates_renderDialog();
}
function ClassicUpdates_startup() {
    if (!Main_IsOn_OSInterface || ClassicUpdates.startupAttempted) return;
    ClassicUpdates.startupAttempted = true;
    ClassicUpdates.startupWanted = true;
    ClassicUpdates.lastLaunchCheck = Date.now();
    // A check already started by legacy startup is shared, but its result still
    // must offer the update even when old background/popup preferences are off.
    ClassicUpdates_check(true);
}
function ClassicUpdates_resume() {
    if (!Main_IsOn_OSInterface || Main_isStopped || ClassicUpdates.dialog) return;
    // Android also resumes the existing activity when launched after Home.
    // Avoid the initial duplicate lifecycle callback, then check on each launch.
    if (Date.now() - (ClassicUpdates.lastLaunchCheck || 0) < 5000) return;
    ClassicUpdates.lastLaunchCheck = Date.now();
    ClassicUpdates.startupWanted = true;
    ClassicUpdates_check(true);
}
function ClassicUpdates_offerStartup() {
    clearTimeout(ClassicUpdates.offerTimer);
    if (!ClassicUpdates.pendingOffer || !Main_HasUpdate) return;
    if (Main_isStopped) return;
    if (
        Main_isWelcomeDialogVisible() ||
        Main_isExitDialogVisible() ||
        Main_isAboutDialogVisible() ||
        Settings_isVisible() ||
        Main_values.Main_Go === Main_addUser ||
        PlayClassic_isOpen() ||
        ClassicMulti.active ||
        (!Main_isScene1DocVisible() && !Main_isScene2DocVisible())
    ) {
        ClassicUpdates.offerTimer = setTimeout(ClassicUpdates_offerStartup, 1000);
        return;
    }
    ClassicUpdates.pendingOffer = false;
    ClassicUpdates_showDialog();
}
function ClassicUpdates_manual() {
    ClassicUpdates.manualWanted = true;
    ClassicUpdates.startupWanted = false;
    ClassicUpdates.pendingOffer = false;
    clearTimeout(ClassicUpdates.offerTimer);
    ClassicUpdates.state = 'checking';
    ClassicUpdates_showDialog();
    ClassicUpdates_check(true);
}
function ClassicUpdates_showDialog() {
    ClassicPreview_stop();
    if (!ClassicUpdates.dialog) {
        ClassicUpdates.previousFocus = document.activeElement;
        ClassicUpdates.dialogFocus = 0;
        ClassicUpdates.dialog = document.createElement('section');
        ClassicUpdates.dialog.id = 'classic_update_prompt';
        ClassicUpdates.dialog.setAttribute('role', 'dialog');
        ClassicUpdates.dialog.setAttribute('aria-modal', 'true');
        ClassicUpdates.dialog.setAttribute('aria-labelledby', 'classic_update_title');
        document.body.appendChild(ClassicUpdates.dialog);
        window.addEventListener('keydown', ClassicUpdates_dialogKey, true);
        window.addEventListener('keyup', ClassicUpdates_dialogKeyUp, true);
    }
    Main_UpdateDialogVisible = true;
    if (!ClassicUpdates.checking && Main_HasUpdate) ClassicUpdates.state = 'available';
    ClassicUpdates_renderDialog();
}
function ClassicUpdates_renderDialog() {
    var panel = ClassicUpdates.dialog;
    if (!panel) return;
    var ru = ClassicShell_ru(),
        state = ClassicUpdates.state;
    panel.replaceChildren();
    var card = ClassicPages_el('div', 'classic-update-card');
    card.appendChild(ClassicPages_el('div', 'classic-update-brand', 'TWITCH CLASSIC'));
    var title = ClassicPages_el(
        'h1',
        '',
        state === 'available'
            ? ru
                ? 'Доступно обновление'
                : 'Update available'
            : state === 'checking'
              ? ru
                  ? 'Проверяем обновления…'
                  : 'Checking for updates…'
              : state === 'downloading'
                ? ru
                    ? 'Загрузка обновления…'
                    : 'Downloading update…'
                : state === 'failure'
                  ? ru
                      ? 'Не удалось проверить обновления'
                      : 'Could not check for updates'
                  : ru
                    ? 'Установлена последняя версия'
                    : 'You are up to date'
    );
    title.id = 'classic_update_title';
    card.appendChild(title);
    card.appendChild(
        ClassicPages_el(
            'p',
            'classic-update-versions',
            (ru ? 'Установлена: ' : 'Installed: ') +
                ClassicBuild.name +
                (state === 'available' && ClassicUpdates.latest ? '   →   ' + ClassicUpdates.latest : '')
        )
    );
    if (state === 'available' && ClassicUpdates.notes) card.appendChild(ClassicPages_el('div', 'classic-update-notes', ClassicUpdates.notes));
    if (state === 'checking' || state === 'downloading') card.appendChild(ClassicPages_el('div', 'classic-update-spinner'));
    if (state === 'downloading')
        card.appendChild(
            ClassicPages_el(
                'p',
                'classic-update-hint',
                ru ? 'Подтвердите установку в системном окне Android.' : 'Confirm installation in the Android system dialog.'
            )
        );
    if (state === 'failure')
        card.appendChild(
            ClassicPages_el(
                'p',
                'classic-update-hint',
                ru ? 'Проверьте подключение к интернету и попробуйте ещё раз.' : 'Check your internet connection and try again.'
            )
        );
    var actions = ClassicPages_el('div', 'classic-update-actions');
    if (state !== 'checking' && state !== 'downloading') {
        var primary = ClassicPages_el(
            'button',
            'classic-update-primary',
            state === 'available' ? (ru ? 'Обновить' : 'Update') : ru ? 'Проверить ещё раз' : 'Check again'
        );
        primary.type = 'button';
        primary.onclick =
            state === 'available'
                ? ClassicUpdates_install
                : function () {
                      ClassicUpdates_check(true);
                  };
        actions.appendChild(primary);
    }
    var close = ClassicPages_el('button', 'classic-update-later', state === 'available' ? (ru ? 'Позже' : 'Later') : ru ? 'Закрыть' : 'Close');
    close.type = 'button';
    close.onclick = ClassicUpdates_hideDialog;
    actions.appendChild(close);
    card.appendChild(actions);
    panel.appendChild(card);
    ClassicUpdates_focusDialog();
}
function ClassicUpdates_focusDialog() {
    if (!ClassicUpdates.dialog) return;
    var buttons = ClassicUpdates.dialog.querySelectorAll('button');
    ClassicUpdates.dialogFocus = Math.max(0, Math.min(buttons.length - 1, ClassicUpdates.dialogFocus));
    buttons.forEach(function (b, i) {
        b.classList.toggle('is-focused', i === ClassicUpdates.dialogFocus);
        b.tabIndex = i === ClassicUpdates.dialogFocus ? 0 : -1;
    });
    if (buttons[ClassicUpdates.dialogFocus]) buttons[ClassicUpdates.dialogFocus].focus();
}
function ClassicUpdates_dialogKey(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.keyCode === KEY_RETURN || event.keyCode === KEY_KEYBOARD_BACKSPACE) ClassicUpdates_hideDialog();
    else if (event.keyCode === KEY_LEFT || event.keyCode === KEY_RIGHT) {
        ClassicUpdates.dialogFocus += event.keyCode === KEY_LEFT ? -1 : 1;
        ClassicUpdates_focusDialog();
    } else if (event.keyCode === KEY_UP || event.keyCode === KEY_DOWN) {
        var notes = ClassicUpdates.dialog.querySelector('.classic-update-notes');
        if (notes) notes.scrollTop += ((event.keyCode === KEY_UP ? -1 : 1) * notes.clientHeight) / 2;
    } else if (event.keyCode === KEY_ENTER && !event.repeat) {
        var button = ClassicUpdates.dialog.querySelector('button.is-focused');
        if (button) button.click();
    }
}
function ClassicUpdates_dialogKeyUp(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
}
function ClassicUpdates_hideDialog() {
    if (!ClassicUpdates.dialog) return;
    ClassicUpdates.dialog.remove();
    ClassicUpdates.dialog = null;
    Main_UpdateDialogVisible = false;
    window.removeEventListener('keydown', ClassicUpdates_dialogKey, true);
    window.removeEventListener('keyup', ClassicUpdates_dialogKeyUp, true);
    var previous = ClassicUpdates.previousFocus;
    ClassicUpdates.previousFocus = null;
    if (previous && previous.isConnected) previous.focus();
    ClassicPreview_resume();
}
function ClassicUpdates_install() {
    if (!Main_HasUpdate || ClassicUpdates.checking || ClassicUpdates.state === 'downloading') return;
    ClassicUpdates.state = 'downloading';
    ClassicUpdates.dialogFocus = 0;
    ClassicUpdates_renderDialog();
    Main_values.IsUpDating = true;
    Main_SaveValues();
    OSInterface_UpdateAPK(version.ApkUrl, STR_UPDATE_FAIL, STR_UPDATE_FAIL_DOWNLOAD);
}
