/* Twitch-style TV navigation and settings; GPL-3.0-or-later. */
var ClassicShell_navActive = false;
var ClassicShell_navIndex = 1;
var ClassicShell_navItems = [];
var ClassicShell_navReturn = null;
var ClassicShell_settings = null;
var ClassicShell_rows = [];
var ClassicShell_cursor = 0;
var ClassicShell_stack = [];
var ClassicShell_descriptors = {};

function ClassicShell_text(html) {
    var div = document.createElement('div');
    div.innerHTML = html == null ? '' : String(html);
    return div.textContent.trim();
}
function ClassicShell_ru() {
    return /^ru/i.test(Settings_AppLang || navigator.language);
}
function ClassicShell_words() {
    return ClassicShell_ru()
        ? {
              following: 'Подписки',
              browse: 'Обзор',
              account: 'Аккаунт',
              settings: 'Настройки',
              general: 'Приложение',
              video: 'Видео и воспроизведение',
              chat: 'Чат и смайлы',
              appearance: 'Внешний вид',
              language: 'Язык и контент',
              alerts: 'Уведомления',
              advanced: 'Дополнительно',
              accountHint: 'Вход, аккаунты и резервная копия',
              videoHint: 'Качество по умолчанию, перемотка и поведение плеера',
              chatHint: '7TV, BTTV, FFZ, сообщения и оформление',
              appearanceHint: 'Анимации, размер интерфейса и превью',
              languageHint: 'Язык приложения и трансляций',
              alertsHint: 'Оповещения о трансляциях и предупреждения',
              advancedHint: 'Кодеки, ограничения и обслуживание',
              settingsHint: 'Выберите раздел',
              hint: '↑ ↓ Выбор     OK Открыть     Назад Вернуться',
              valueHint: '↑ ↓ Выбор     OK Изменить     Назад Вернуться',
              select: 'Выберите значение',
              signIn: 'Войти в Twitch',
              history: 'История просмотров',
              refresh: 'Обновить трансляции',
              help: 'Справка',
              feed: 'Трансляции',
              reset: 'Обновления',
              done: 'Выбрано'
          }
        : {
              following: 'Following',
              browse: 'Browse',
              account: 'Account',
              settings: 'Settings',
              general: 'Application',
              video: 'Video and playback',
              chat: 'Chat and emotes',
              appearance: 'Appearance',
              language: 'Language and content',
              alerts: 'Notifications',
              advanced: 'Advanced',
              accountHint: 'Sign in, accounts and backup',
              videoHint: 'Default quality, seeking and player behavior',
              chatHint: '7TV, BTTV, FFZ, messages and appearance',
              appearanceHint: 'Animations, interface size and previews',
              languageHint: 'App and stream language',
              alertsHint: 'Stream notifications and warnings',
              advancedHint: 'Codecs, limits and maintenance',
              settingsHint: 'Choose a section',
              hint: '↑ ↓ Select     OK Open     Back Return',
              valueHint: '↑ ↓ Select     OK Change     Back Return',
              select: 'Choose a value',
              signIn: 'Sign in to Twitch',
              history: 'Watch history',
              refresh: 'Refresh streams',
              help: 'Help',
              feed: 'Live',
              reset: 'Updates',
              done: 'Selected'
          };
}
function ClassicShell_init() {
    document.body.classList.add('classic-shell');
    document.body.setAttribute('data-classic-locale', ClassicShell_ru() ? 'ru' : 'en');
    ClassicShell_updateScale();
    ClassicChatPresentation_apply();
    var bar = document.getElementById('classic_nav');
    if (!bar) {
        bar = document.createElement('nav');
        bar.id = 'classic_nav';
        bar.setAttribute('aria-label', 'Twitch');
        document.getElementById('scene1').appendChild(bar);
    }
    var w = ClassicShell_words();
    ClassicShell_navItems = [
        {
            text: w.following,
            icon: 'heart-o',
            action: function () {
                if (AddUser_UserHasToken()) ClassicShell_goScreen(Main_UserLive);
                else ClassicShell_account();
            }
        },
        {
            text: w.feed,
            icon: '',
            action: function () {
                ClassicShell_goScreen(Main_Live);
            }
        },
        {
            text: w.browse,
            icon: '',
            action: function () {
                ClassicShell_goScreen(Main_games);
            }
        },
        {text: STR_SEARCH, icon: 'search', action: Main_OpenSearch},
        {text: w.settings, icon: 'settings', action: Main_showSettings},
        {text: w.account, icon: 'user', action: ClassicShell_account}
    ];
    bar.replaceChildren();
    var brand = document.createElement('span');
    brand.className = 'classic-brand';
    var brandIcon = document.createElement('img');
    brandIcon.src = 'branding/twitch-wordmark.svg';
    brandIcon.alt = 'Twitch';
    brandIcon.width = 1140;
    brandIcon.height = 380;
    brand.appendChild(brandIcon);
    bar.appendChild(brand);
    ClassicShell_navItems.forEach(function (item, index) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'classic-nav-button';
        if (item.icon) {
            var icon = document.createElement('i');
            icon.className = 'icon-' + item.icon;
            button.appendChild(icon);
        }
        var text = document.createElement('span');
        text.textContent = item.text;
        button.appendChild(text);
        button.addEventListener('click', function () {
            ClassicShell_navIndex = index;
            ClassicShell_activateNav();
        });
        bar.appendChild(button);
    });
    ClassicShell_syncNav();
}
function ClassicShell_syncNav() {
    var buttons = document.querySelectorAll('#classic_nav button');
    var selected = 1,
        screen = Main_values.Main_Go;
    if ([Main_ChannelContent, Main_ChannelVod, Main_ChannelClip].indexOf(screen) !== -1 && Main_values.Main_BeforeChannel === Main_UserLive)
        selected = 0;
    else if (Settings_isVisible()) selected = 4;
    else if ([Main_UserLive, Main_UserVod, Main_usergames, Main_UserChannels].indexOf(screen) !== -1) selected = 0;
    else if ([Main_games, Main_aGame, Main_AGameVod, Main_AGameClip].indexOf(screen) !== -1) selected = 2;
    else if ([Main_Search, Main_SearchLive, Main_SearchGames, Main_SearchChannels, Main_SearchVod].indexOf(screen) !== -1) selected = 3;
    else if ([Main_Users, Main_addUser, Main_HistoryLive, Main_HistoryVod, Main_HistoryClip].indexOf(screen) !== -1) selected = 5;
    buttons.forEach(function (b, index) {
        b.classList.toggle('active', index === selected);
        b.classList.toggle('nav-focus', ClassicShell_navActive && index === ClassicShell_navIndex);
        b.tabIndex = ClassicShell_navActive && index === ClassicShell_navIndex ? 0 : -1;
    });
}
function ClassicShell_focusNav() {
    if (ClassicShell_navActive) return;
    var screen = ScreenObj[Main_values.Main_Go];
    if (FollowingClassic.active && Main_values.Main_Go === Main_UserLive) {
        document.querySelectorAll('#classic_following_page .is-focused').forEach(function (row) {
            row.classList.remove('is-focused');
        });
        ClassicShell_navReturn = {kind: 'following'};
        Main_removeEventListener('keydown', FollowingClassic_key);
    } else if (ChannelClassic_active && Main_values.Main_Go === Main_ChannelContent) {
        document.querySelectorAll('#classic_channel_page .is-focused').forEach(function (row) {
            row.classList.remove('is-focused');
        });
        ClassicShell_navReturn = {kind: 'channel'};
        Main_removeEventListener('keydown', ChannelContent_handleKeyDown);
    } else if (ChannelClassic_tabFocus) {
        document.querySelectorAll('#classic_channel_tabs .is-focused').forEach(function (row) {
            row.classList.remove('is-focused');
        });
        ClassicShell_navReturn = {kind: 'channel-tabs'};
        Main_removeEventListener('keydown', ChannelClassic_tabsKey);
    } else if (Settings_isVisible()) {
        ClassicShell_navReturn = {kind: 'settings', dialog: Settings_Dialog_isVisible()};
        Main_removeEventListener('keydown', Settings_handleKeyDown);
        Main_removeEventListener('keydown', Settings_DialoghandleKeyDown);
        document.querySelectorAll('#classic_preferences_rows .is-focused').forEach(function (row) {
            row.classList.remove('is-focused');
        });
    } else if (Main_values.Main_Go === Main_addUser) {
        ClassicShell_navReturn = {kind: 'login'};
        Main_removeEventListener('keydown', AddUser_handleKeyDown);
    } else if (Main_values.Main_Go === Main_Users) {
        ClassicShell_navReturn = {kind: 'users'};
        Main_removeEventListener('keydown', Users_handleKeyDown);
        if (Users_status) Users_removeFocus();
    } else {
        ClassicShell_navReturn = {kind: 'screen', screen: Main_values.Main_Go};
        if (screen) {
            Main_removeEventListener('keydown', screen.key_fun);
            if (screen.ids) Screens_RemoveFocus(Main_values.Main_Go);
        }
    }
    Main_removeEventListener('keydown', Sidepannel_handleKeyDownMain);
    ClassicShell_navActive = true;
    ClassicShell_syncNav();
    Main_addEventListener('keydown', ClassicShell_navKey);
    var button = document.querySelectorAll('#classic_nav button')[ClassicShell_navIndex];
    if (button) button.focus();
}
function ClassicShell_blurNav(resume) {
    var context = ClassicShell_navReturn;
    ClassicShell_navReturn = null;
    ClassicShell_navActive = false;
    Main_removeEventListener('keydown', ClassicShell_navKey);
    ClassicShell_syncNav();
    if (document.activeElement) document.activeElement.blur();
    if (!resume) return;
    if (context && context.kind === 'following') {
        Main_addEventListener('keydown', FollowingClassic_key);
        FollowingClassic_focus(true);
    } else if (context && context.kind === 'channel') {
        Main_addEventListener('keydown', ChannelContent_handleKeyDown);
        ChannelClassic_focus();
    } else if (context && context.kind === 'channel-tabs') {
        Main_addEventListener('keydown', ChannelClassic_tabsKey);
        ChannelClassic_tabsFocus();
    } else if (context && context.kind === 'settings') {
        if (context.dialog) {
            Main_addEventListener('keydown', Settings_DialoghandleKeyDown);
            ClassicShell_dialogFocus(Settings_DialogValue[Settings_DialogPos]);
        } else {
            Main_addEventListener('keydown', Settings_handleKeyDown);
            ClassicShell_settingsFocus();
        }
    } else if (context && context.kind === 'login') Main_addEventListener('keydown', AddUser_handleKeyDown);
    else if (context && context.kind === 'users') {
        Main_addEventListener('keydown', Users_handleKeyDown);
        if (Users_status) Users_addFocus();
    } else {
        var screen = ScreenObj[Main_values.Main_Go];
        if (screen) {
            Main_addEventListener('keydown', screen.key_fun);
            if (screen.ids && screen.itemsCount) Screens_addFocus(true, Main_values.Main_Go);
        }
    }
}

function ClassicShell_activateNav() {
    var context = ClassicShell_navReturn;
    if (
        context &&
        ((context.kind === 'settings' && ClassicShell_navIndex === 4) ||
            ((context.kind === 'users' || context.kind === 'login') && ClassicShell_navIndex === 5))
    ) {
        ClassicShell_blurNav(true);
        return;
    }
    ClassicShell_blurNav(false);
    if (context && context.kind === 'settings') {
        if (context.dialog) Settings_DialoghandleKeyReturnAfter();
        Settings_exit();
    } else if (context && context.kind === 'login') AddUser_exit();
    ClassicShell_navItems[ClassicShell_navIndex].action();
    ClassicShell_syncNav();
}
function ClassicShell_navKey(event) {
    if (!ClassicShell_navActive) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.keyCode === KEY_LEFT || event.keyCode === KEY_RIGHT) {
        ClassicShell_navIndex = Math.max(
            0,
            Math.min(ClassicShell_navItems.length - 1, ClassicShell_navIndex + (event.keyCode === KEY_LEFT ? -1 : 1))
        );
        ClassicShell_syncNav();
        document.querySelectorAll('#classic_nav button')[ClassicShell_navIndex].focus();
    } else if (event.keyCode === KEY_ENTER && !event.repeat) ClassicShell_activateNav();
    else if (event.keyCode === KEY_DOWN) ClassicShell_blurNav(true);
    else if (event.keyCode === KEY_RETURN || event.keyCode === KEY_KEYBOARD_BACKSPACE) {
        // Following replaces a root grid; it is not a nested section to return to.
        var returnToSection = ClassicShell_navReturn && ['screen', 'following'].indexOf(ClassicShell_navReturn.kind) === -1;
        ClassicShell_blurNav(true);
        if (!returnToSection) Main_showExitDialog();
    }
}
function ClassicShell_screenKey(key, event) {
    var screen = ScreenObj[key];
    if (event.keyCode === KEY_UP && screen.posY <= (screen.HasSwitches ? -1 : 0)) {
        if (key === Main_ChannelVod || key === Main_ChannelClip) ChannelClassic_focusTabs(key);
        else ClassicShell_focusNav();
        return true;
    }
    if (event.keyCode === KEY_LEFT) {
        if (screen.posX === 0) ClassicShell_focusNav();
        else Screens_KeyLeftRight(-1, screen.ColumnsCount - 1, key);
        return true;
    }
    if (event.keyCode === KEY_ENTER) {
        if (!event.repeat) screen.key_play();
        return true;
    }
    return false;
}
function ClassicShell_account() {
    Main_values.Main_Before = Main_values.Main_Go;
    Main_ExitCurrent(Main_values.Main_Go);
    if (AddUser_UserIsSet()) Users_init();
    else AddUser_init();
    ClassicShell_syncNav();
}
function ClassicShell_row(title, subtitle, action, icon, value) {
    return {title: title, subtitle: subtitle || '', action: action, icon: icon || '', value: value || ''};
}
function ClassicShell_openSettings() {
    ClassicShell_blurNav(false);
    ClassicShell_settings = document.createElement('section');
    ClassicShell_settings.id = 'classic_preferences';
    ClassicShell_settings.innerHTML =
        '<header><span class="classic-settings-eyebrow"></span><h1></h1><p></p></header><div id="classic_preferences_rows"></div><footer></footer>';
    document.getElementById('settings_holder').appendChild(ClassicShell_settings);
    ClassicShell_stack = [];
    ClassicShell_rootSettings();
    ClassicShell_syncNav();
}
function ClassicShell_closeSettings() {
    if (ClassicShell_valuePopup) {
        ClassicShell_valuePopup.remove();
        ClassicShell_valuePopup = null;
        Main_removeEventListener('keydown', ClassicShell_valueKeyDown);
    }
    if (ClassicShell_settings) ClassicShell_settings.remove();
    ClassicShell_settings = null;
    ClassicShell_stack = [];
}
function ClassicShell_rootSettings() {
    var w = ClassicShell_words();
    ClassicShell_renderSettings(w.settings, w.settingsHint, [
        ClassicShell_row(
            w.account,
            w.accountHint,
            function () {
                ClassicShell_section(
                    w.account,
                    ['backup_sync'],
                    [
                        ClassicShell_row(
                            ClassicShell_ru() ? 'Синхронизация записей Twitch' : 'Twitch VOD synchronisation',
                            ClassicShell_ru() ? 'Продолжение просмотра между ТВ и приложением Twitch' : 'Resume watching between TV and Twitch',
                            ClassicVodSync_menu,
                            'history'
                        ),
                        ClassicShell_row(
                            ClassicShell_ru() ? 'Просмотр, баллы и рейды' : 'Watch time, points and raids',
                            '',
                            function () {
                                ClassicFeatures_menu('account');
                            },
                            'history'
                        ),
                        ClassicShell_row(
                            AddUser_UserHasToken() ? w.account : w.signIn,
                            '',
                            function () {
                                Settings_exit();
                                ClassicShell_account();
                            },
                            'user'
                        ),
                        ClassicShell_row(
                            w.history,
                            '',
                            function () {
                                Settings_exit();
                                ClassicShell_goScreen(Main_History[Main_values.HistoryPos]);
                            },
                            'history'
                        )
                    ]
                );
            },
            'user'
        ),
        ClassicShell_row(
            w.video,
            w.videoHint,
            function () {
                ClassicShell_section(w.video, [
                    'default_quality',
                    'restor_playback',
                    'single_clickExit',
                    'vod_dialog',
                    'seek_preview',
                    'vod_seek',
                    'playerend_opt',
                    'speed_adjust'
                ]);
            },
            'videocamera'
        ),
        ClassicShell_row(w.chat, w.chatHint, ClassicShell_chatSettings, 'chat'),
        ClassicShell_row(
            w.appearance,
            w.appearanceHint,
            function () {
                ClassicShell_section(w.appearance, ['ui_opt', 'preview_settings', 'start_user_screen']);
            },
            'preview'
        ),
        ClassicShell_row(
            w.language,
            w.languageHint,
            function () {
                ClassicShell_section(w.language, ['app_lang', 'content_lang', 'loadAll_lang', 'enable_mature']);
            },
            'globe'
        ),
        ClassicShell_row(
            w.alerts,
            w.alertsHint,
            function () {
                ClassicShell_section(w.alerts, ['livenotification_opt', 'warnings_opt']);
            },
            'volume'
        ),
        ClassicShell_row(
            w.advanced,
            w.advancedHint,
            function () {
                ClassicShell_section(w.advanced, [
                    'custom_opt',
                    'check_source',
                    'PP_workaround',
                    'player_extracodecs',
                    'blocked_codecs',
                    'block_qualities',
                    'player_bitrate',
                    'update_settings',
                    'dpad_opt'
                ]);
            },
            'settings'
        ),
        ClassicShell_row(
            ClassicShell_ru() ? 'Проверить обновления' : 'Check for updates',
            'Twitch Classic ' + ClassicBuild.name,
            ClassicUpdates_manual,
            'refresh'
        )
    ]);
}
function ClassicShell_mainSetting(key) {
    var descriptor = ClassicShell_descriptors[key];
    if (!descriptor || !document.getElementById(key)) return null;
    var setting = Settings_value[key];
    return ClassicShell_row(
        descriptor.title,
        descriptor.summary,
        function () {
            var index = Settings_value_keys.indexOf(key);
            Settings_cursorY = index;
            if (setting.values.length > 1) ClassicShell_pickValue(key);
            else Settings_KeyEnter();
        },
        '',
        setting.values.length > 1 ? ClassicShell_text(Settings_Obj_values(key)) : '›'
    );
}
function ClassicShell_section(title, keys, extra) {
    var rows = keys.map(ClassicShell_mainSetting).filter(Boolean);
    ClassicShell_push(title, '', (extra || []).concat(rows));
}
function ClassicShell_push(title, summary, rows, selected) {
    ClassicShell_stack.push({
        title: ClassicShell_settings.querySelector('h1').textContent,
        summary: ClassicShell_settings.querySelector('header p').textContent,
        rows: ClassicShell_rows,
        cursor: ClassicShell_cursor
    });
    ClassicShell_renderSettings(title, summary, rows, selected);
}
function ClassicShell_renderSettings(title, summary, rows, selected) {
    var w = ClassicShell_words();
    ClassicShell_rows = rows;
    ClassicShell_cursor = selected || 0;
    ClassicShell_settings.querySelector('.classic-settings-eyebrow').textContent = 'TWITCH CLASSIC · ' + ClassicBuild.name;
    ClassicShell_settings.querySelector('h1').textContent = title;
    ClassicShell_settings.querySelector('header p').textContent = summary;
    ClassicShell_settings.querySelector('footer').textContent = w.hint;
    var holder = document.getElementById('classic_preferences_rows');
    holder.replaceChildren();
    rows.forEach(function (row, index) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'classic-preference-row';
        if (row.icon) {
            var i = document.createElement('i');
            i.className = 'icon-' + row.icon;
            b.appendChild(i);
        }
        var label = document.createElement('span');
        label.className = 'classic-preference-copy';
        var name = document.createElement('strong');
        name.textContent = row.title;
        label.appendChild(name);
        if (row.subtitle) {
            var sub = document.createElement('small');
            sub.textContent = row.subtitle;
            label.appendChild(sub);
        }
        b.appendChild(label);
        var value = document.createElement('span');
        value.className = 'classic-preference-value';
        value.textContent = row.value || '›';
        b.appendChild(value);
        b.addEventListener('click', function () {
            ClassicShell_cursor = index;
            row.action();
        });
        holder.appendChild(b);
    });
    ClassicShell_settingsFocus();
}
function ClassicShell_settingsFocus() {
    var buttons = document.querySelectorAll('#classic_preferences_rows button');
    buttons.forEach(function (button, index) {
        button.classList.toggle('is-focused', index === ClassicShell_cursor);
        button.tabIndex = index === ClassicShell_cursor ? 0 : -1;
    });
    if (buttons[ClassicShell_cursor]) {
        buttons[ClassicShell_cursor].focus();
        buttons[ClassicShell_cursor].scrollIntoView({block: 'nearest'});
    }
}
function ClassicShell_pickValue(key) {
    var setting = Settings_value[key],
        descriptor = ClassicShell_descriptors[key];
    ClassicShell_push(
        descriptor.title,
        descriptor.summary,
        setting.values.map(function (value, index) {
            return ClassicShell_row(
                ClassicShell_text(value),
                '',
                function () {
                    var position = Settings_value_keys.indexOf(key);
                    setting.defaultValue = index;
                    Settings_ChangeSettings(position);
                    ClassicShell_settingsBack();
                },
                '',
                setting.defaultValue === index ? '✓' : ''
            );
        }),
        setting.defaultValue
    );
}
function ClassicShell_settingsBack() {
    var prev = ClassicShell_stack.pop();
    if (prev) {
        // Refresh values after returning from the value picker.
        prev.rows.forEach(function (row) {
            Object.keys(ClassicShell_descriptors).some(function (key) {
                if (ClassicShell_descriptors[key].title === row.title && Settings_value[key]) {
                    row.value = ClassicShell_text(Settings_Obj_values(key));
                    return true;
                }
                return false;
            });
        });
        ClassicShell_renderSettings(prev.title, prev.summary, prev.rows, prev.cursor);
    } else {
        Settings_exit();
        Main_SwitchScreen();
    }
}
function ClassicShell_settingsKey(event) {
    if (!ClassicShell_settings) return false;
    event.preventDefault();
    if (event.keyCode === KEY_RETURN || event.keyCode === KEY_KEYBOARD_BACKSPACE) ClassicShell_settingsBack();
    else if (event.keyCode === KEY_UP && ClassicShell_cursor === 0) ClassicShell_focusNav();
    else if (event.keyCode === KEY_UP || event.keyCode === KEY_DOWN) {
        ClassicShell_cursor = Math.max(0, Math.min(ClassicShell_rows.length - 1, ClassicShell_cursor + (event.keyCode === KEY_UP ? -1 : 1)));
        ClassicShell_settingsFocus();
    } else if (event.keyCode === KEY_ENTER && !event.repeat) {
        var row = ClassicShell_rows[ClassicShell_cursor];
        if (row) row.action();
    }
    return true;
}

function ClassicShell_dialogFocus(key) {
    var row = document.getElementById(key + '_div');
    if (row) {
        row.tabIndex = -1;
        row.focus();
        row.scrollIntoView({block: 'nearest'});
    }
    var help = document.getElementById('classic_dialog_help'),
        info = ClassicShell_descriptors[key];
    if (help) {
        var text = info ? info.summary : '';
        if (key === 'chat_logging')
            text = ClassicShell_ru()
                ? 'Входить в чат от имени выбранного аккаунта. Выключите для анонимного чтения; отправка сообщений остаётся доступна.'
                : 'Join chat using the selected account. Disable to read anonymously; you can still send messages.';
        if (text.length > 280) text = text.slice(0, 275).replace(/\s+\S*$/, '') + '…';
        help.textContent = text;
    }
}
function ClassicShell_welcome() {
    var d = document.getElementById('welcome_dialog_text');
    d.replaceChildren();
    var h = document.createElement('h1');
    h.textContent = 'Twitch Classic';
    d.appendChild(h);
    var p = document.createElement('p');
    p.textContent = ClassicShell_ru()
        ? 'Трансляции, подписки и категории — в верхнем меню. Вход по QR-коду — в разделе «Аккаунт». Все параметры приложения — в «Настройках».'
        : 'Live streams, following and categories are in the top menu. Open Account to sign in with a QR code. All app preferences are in Settings.';
    d.appendChild(p);
    var hint = document.createElement('strong');
    hint.textContent = ClassicShell_ru() ? 'Нажмите OK, чтобы начать' : 'Press OK to continue';
    d.appendChild(hint);
}

function ClassicShell_chatSettings() {
    var ru = ClassicShell_ru(),
        groups = [
            {
                title: ru ? 'Оформление чата' : 'Chat appearance',
                summary: ru ? 'Прокрутка, фон, разделители и время сообщений' : 'Scrolling, background, separators and timestamps',
                icon: 'chat-brig',
                keys: ['chat_line_animation', 'individual_lines', 'chat_individual_background', 'chat_timestamp', 'show_chatters']
            },
            {
                title: ru ? 'Сообщения и модерация' : 'Messages and moderation',
                summary: ru ? 'Удаление сообщений, боты и общий чат' : 'Deleted messages, bots and shared chat',
                icon: 'chat',
                keys: ['chat_logging', 'disabled_shared', 'chat_showUserNotice', 'clear_chat', 'show_actions', 'chat_bot']
            },
            {
                title: ru ? 'Выделение сообщений' : 'Message highlights',
                summary: ru ? 'Упоминания, стример, модераторы и подписчики' : 'Mentions, streamers, moderators and subscribers',
                icon: 'star',
                keys: [
                    'highlight_rewards',
                    'highlight_first',
                    'highlight_atstreamer',
                    'highlight_streamer',
                    'highlight_mod',
                    'highlight_atuser',
                    'highlight_user_send',
                    'show_sub',
                    'highlight_bits'
                ]
            },
            {
                title: ru ? 'Значки пользователей' : 'User badges',
                summary: ru ? 'Модераторы, VIP и значки подписчиков' : 'Moderator, VIP and subscriber badges',
                icon: 'user',
                keys: ['chat_show_badges', 'chat_show_badges_mod', 'chat_show_badges_vip', 'chat_show_badges_shared']
            }
        ];
    ClassicShell_push(
        ClassicShell_words().chat,
        ru ? 'Смайлы 7TV, BTTV и FFZ поддерживаются клиентом.' : '7TV, BTTV and FFZ emotes are supported by this client.',
        [
            ClassicShell_row(
                ru ? 'Смайлы и картинки' : 'Emotes and images',
                '',
                function () {
                    ClassicFeatures_menu('chat');
                },
                'chat'
            )
        ].concat(
            groups.map(function (group) {
                return ClassicShell_row(
                    group.title,
                    group.summary,
                    function () {
                        Settings_DialogShowChat(false, group);
                    },
                    group.icon
                );
            })
        )
    );
}
var ClassicShell_valuePopup = null;
var ClassicShell_valueKey = null;
var ClassicShell_valueIndex = 0;
function ClassicShell_openDialogValue() {
    var key = Settings_DialogValue[Settings_DialogPos],
        setting = Settings_value[key];
    if (key === 'thumb_background' || key === 'backup_account' || !setting || setting.values.length < 2) return false;
    ClassicShell_valueKey = key;
    ClassicShell_valueIndex = setting.defaultValue;
    ClassicShell_valuePopup = document.createElement('section');
    ClassicShell_valuePopup.id = 'classic_value_popup';
    ClassicShell_valuePopup.setAttribute('role', 'dialog');
    ClassicShell_valuePopup.setAttribute('aria-modal', 'true');
    var box = document.createElement('div');
    box.className = 'classic-value-box';
    var title = document.createElement('h2');
    title.textContent = ClassicShell_descriptors[key].title;
    box.appendChild(title);
    var list = document.createElement('div');
    list.className = 'classic-value-list';
    setting.values.forEach(function (value, index) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = ClassicShell_text(value) + (index === setting.defaultValue ? '  ✓' : '');
        b.addEventListener('click', function () {
            ClassicShell_valueIndex = index;
            ClassicShell_closeDialogValue(true);
        });
        list.appendChild(b);
    });
    box.appendChild(list);
    ClassicShell_valuePopup.appendChild(box);
    document.getElementById('scene1').appendChild(ClassicShell_valuePopup);
    Main_removeEventListener('keydown', Settings_DialoghandleKeyDown);
    Main_addEventListener('keydown', ClassicShell_valueKeyDown);
    ClassicShell_valueFocus();
    return true;
}
function ClassicShell_valueFocus() {
    var rows = document.querySelectorAll('#classic_value_popup button');
    if (rows[ClassicShell_valueIndex]) {
        rows[ClassicShell_valueIndex].focus();
        rows[ClassicShell_valueIndex].scrollIntoView({block: 'nearest'});
    }
}
function ClassicShell_closeDialogValue(apply) {
    if (!ClassicShell_valuePopup) return;
    var key = ClassicShell_valueKey;
    ClassicShell_valuePopup.remove();
    ClassicShell_valuePopup = null;
    Main_removeEventListener('keydown', ClassicShell_valueKeyDown);
    if (apply) Settings_DialogRightLeftAfter(key, ClassicShell_valueIndex - Settings_value[key].defaultValue);
    Main_addEventListener('keydown', Settings_DialoghandleKeyDown);
    ClassicShell_dialogFocus(key);
}
function ClassicShell_valueKeyDown(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.keyCode === KEY_UP || event.keyCode === KEY_DOWN) {
        ClassicShell_valueIndex = Math.max(
            0,
            Math.min(Settings_value[ClassicShell_valueKey].values.length - 1, ClassicShell_valueIndex + (event.keyCode === KEY_UP ? -1 : 1))
        );
        ClassicShell_valueFocus();
    } else if (event.keyCode === KEY_ENTER && !event.repeat) ClassicShell_closeDialogValue(true);
    else if (event.keyCode === KEY_RETURN || event.keyCode === KEY_KEYBOARD_BACKSPACE) ClassicShell_closeDialogValue(false);
}

function ClassicShell_updateScale() {
    var offset = Number(Settings_Obj_values('global_font_offset')) || 0;
    document.documentElement.style.setProperty('--classic-type-scale', (29 + offset) / 29);
}

function ClassicShell_presentSetting(key, info) {
    var labels = ClassicShell_ru()
        ? {
              show_vod_player: 'Автопросмотр записей в миниатюрах',
              chat_logging: 'Вход в чат от имени аккаунта',
              disabled_shared: 'Отключить общий чат',
              chat_line_animation: 'Плавная прокрутка',
              individual_lines: 'Разделители сообщений',
              chat_individual_background: 'Чередование фона сообщений',
              chat_timestamp: 'Время сообщений',
              chat_showUserNotice: 'Системные уведомления в чате',
              show_chatters: 'Счётчик в чате',
              chat_nickcolor: 'Читаемые цвета ников',
              highlight_rewards: 'Сообщения за баллы канала',
              highlight_first: 'Первое сообщение зрителя',
              highlight_mod: 'Сообщения модераторов',
              highlight_streamer: 'Сообщения стримера',
              highlight_atstreamer: 'Упоминания стримера',
              highlight_atuser: 'Упоминания вашего ника',
              highlight_user_send: 'Ваши сообщения',
              show_sub: 'Сообщения подписчиков',
              highlight_bits: 'Сообщения с Bits',
              clear_chat: 'Удаление сообщений модерацией',
              show_actions: 'Сообщения /me',
              chat_bot: 'Скрывать ботов и команды',
              chat_show_badges: 'Значки пользователей',
              chat_show_badges_mod: 'Значки модераторов',
              chat_show_badges_vip: 'Значки VIP',
              chat_show_badges_shared: 'Значки общего чата'
          }
        : {
              show_vod_player: 'Autoplay VOD thumbnails',
              chat_logging: 'Join chat using your account',
              disabled_shared: 'Disable shared chat',
              chat_line_animation: 'Smooth scrolling',
              individual_lines: 'Message separators',
              chat_individual_background: 'Alternating message backgrounds',
              chat_timestamp: 'Message timestamps',
              chat_showUserNotice: 'System notices in chat',
              show_chatters: 'Chat counter',
              chat_nickcolor: 'Readable name colors',
              highlight_rewards: 'Channel point messages',
              highlight_first: 'First-time chatters',
              highlight_mod: 'Moderator messages',
              highlight_streamer: 'Streamer messages',
              highlight_atstreamer: 'Streamer mentions',
              highlight_atuser: 'Mentions of your name',
              highlight_user_send: 'Your messages',
              show_sub: 'Subscriber messages',
              highlight_bits: 'Bits messages',
              clear_chat: 'Remove moderated messages',
              show_actions: '/me messages',
              chat_bot: 'Hide bots and commands',
              chat_show_badges: 'User badges',
              chat_show_badges_mod: 'Moderator badges',
              chat_show_badges_vip: 'VIP badges',
              chat_show_badges_shared: 'Shared chat badges'
          };
    if (labels[key]) {
        if (!info.summary) info.summary = info.title;
        info.title = labels[key];
    }
}

function ClassicShell_goScreen(key) {
    var before = Main_values.Main_Go;
    // The legacy sidebar re-adds its old callback when selecting the current page.
    // Header navigation must close and reopen the actual page instead.
    Main_removeEventListener('keydown', Sidepannel_Callback);
    Main_ExitCurrent(before);
    Main_values.Search_isSearching = false;
    Main_values.Main_Before = before;
    Main_values.Main_Go = key;
    Main_SwitchScreen();
}
