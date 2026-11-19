/* SmartTwitchTV classic player UI; GPL-3.0-or-later, see LICENSE. */
var PlayClassic_dialog = null;
var PlayClassic_view = 'home';
var PlayClassic_cursor = 0;
var PlayClassic_rows = [];
var PlayClassic_stack = [];
var PlayClassic_context = 'ShowInLive';
var PlayClassic_consumedKey = null;
var PlayClassic_actualQuality = null;
var PlayClassic_waitForRelease = false;
document.addEventListener(
    'keyup',
    function (event) {
        if (event.keyCode === KEY_ENTER) PlayClassic_waitForRelease = false;
    },
    true
);

function PlayClassic_enabled() {
    return !!Settings_Obj_default('classic_player');
}

function PlayClassic_applyMode() {
    document.body.classList.toggle('classic-player-ui', PlayClassic_enabled());
    ClassicChatPresentation_apply();
    PlayVod_ProgresYoffset = PlayClassic_enabled() ? '%, 0)' : '%, -27%)';
}

function PlayClassic_kind() {
    return PlayVod_isOn ? 2 : PlayClip_isOn ? 3 : 1;
}

function PlayClassic_primary(prop, key, control) {
    if (!PlayClassic_enabled() || !/^(ShowInLive|ShowInVod|ShowInClip|ShowInPP|ShowInMulti|ShowInStay)$/.test(prop)) return !!control[prop];
    if (Number(key) === Play_controlsSettings) return true;
    return (
        [Play_controlsQuality, Play_controlsQualityMini, Play_controlsQualityMulti, Play_controlsChat].indexOf(Number(key)) !== -1 && !!control[prop]
    );
}

function PlayClassic_defineControl() {
    Play_controls[Play_controlsSettings] = {
        ShowInLive: true,
        ShowInVod: true,
        ShowInClip: true,
        ShowInPP: true,
        ShowInMulti: true,
        ShowInStay: true,
        icons: 'settings',
        string: STR_SETTINGS,
        values: null,
        defaultValue: null,
        enterKey: function () {
            PlayClassic_open();
        }
    };
}

function PlayClassic_title(text, value, action) {
    return {text: text, value: value || '', action: action};
}
function PlayClassic_visibility() {
    return PlayVod_isOn
        ? 'ShowInVod'
        : PlayClip_isOn
          ? 'ShowInClip'
          : Play_MultiEnable
            ? 'ShowInMulti'
            : PlayExtra_PicturePicture
              ? 'ShowInPP'
              : 'ShowInLive';
}
function PlayClassic_qualityState() {
    var kind = PlayClassic_kind();
    return {
        kind: kind,
        qualities: kind === 1 ? Play_data.qualities : kind === 2 ? PlayVod_qualities : PlayClip_qualities,
        current: kind === 1 ? Play_data.qualityPlaying : kind === 2 ? PlayVod_qualityPlaying : PlayClip_qualityPlaying
    };
}
function PlayClassic_qualityText() {
    var state = PlayClassic_qualityState(),
        current = String(state.current || '');
    var text = current.replace('source', STR_SOURCE).replace('Auto', STR_AUTO);
    if (current.indexOf('Auto') !== -1 && PlayClassic_actualQuality && PlayClassic_actualQuality.kind === state.kind) {
        text += ' · ' + (ClassicShell_ru() ? 'сейчас ' : 'now ') + PlayClassic_actualQuality.value;
    }
    return text;
}
function PlayClassic_syncQualityLabel() {
    var control = Play_controls[Play_controlsQuality];
    if (control && control.doc_name && PlayClassic_enabled()) Main_textContentWithEle(control.doc_name, PlayClassic_qualityText());
    if (PlayClassic_dialog)
        PlayClassic_rows.forEach(function (row, index) {
            if (row.group === 'quality' || row.key === Play_controlsQuality) {
                row.value = PlayClassic_qualityText();
                var button = document.querySelectorAll('#classic_settings_rows button')[index];
                if (button) button.querySelector('.classic-settings-value').textContent = row.value;
            }
        });
}

function PlayClassic_value(key, control) {
    if (key === Play_controlsQuality) return PlayClassic_qualityText();
    if (key === Play_controlsChatSide) return PlayClassic_layoutValue();
    if (key === Play_controlsChat) return PlayClassic_chatModeNames()[PlayClassic_chatModeIndex()];
    if (control.values) return control.values[control.defaultValue] === undefined ? control.defaultValue + '%' : control.values[control.defaultValue];
    var summary = document.getElementById('controls_text_summary_' + key);
    return summary ? summary.textContent.trim() : '';
}
function PlayClassic_available(key) {
    var kind = PlayClassic_kind();
    if (key === Play_controlsChapters) return kind === 2 && PlayVod_ChaptersArray.length > 0;
    if (key === Play_controlsOpenLive) return kind > 1 && !!Play_HasLive;
    if (key === Play_controlsOpenVod) return kind === 3 && !!PlayClip_HasVOD;
    return true;
}
function PlayClassic_controlRows(keys, all) {
    var prop = PlayClassic_visibility();
    return keys
        .map(Number)
        .filter(function (key) {
            return (
                key !== Play_controlsSettings &&
                key !== Play_controlsBack &&
                Play_controls[key] &&
                PlayClassic_available(key) &&
                (all || Play_controls[key][prop])
            );
        })
        .map(function (key) {
            var control = Play_controls[key];
            return {
                key: key,
                text: control.string || (control.doc_title && control.doc_title.textContent),
                value: PlayClassic_value(key, control),
                action: function () {
                    if (key === Play_controlsQuality) PlayClassic_quality();
                    else if (key === Play_controlsChatSide) PlayClassic_layout();
                    else if (key === Play_controlsChat) PlayClassic_chatMode();
                    else if (key === Play_controlsChatSettings) PlayClassic_chat();
                    else if (key === Play_controlsPreview) PlayClassic_preview();
                    else if (key === Play_controlsAudio) PlayClassic_audio();
                    else if (control.values && (control.updown || control.values.length > 1)) PlayClassic_values(key);
                    else if (control.enterKey) {
                        PlayClassic_close();
                        control.enterKey(PlayClassic_kind());
                    }
                }
            };
        });
}
function PlayClassic_groups() {
    return {
        quality: [Play_controlsQuality, Play_controlsQualityMini, Play_controlsQualityMulti],
        layout: [Play_controlsChatSide, Play_MultiStream],
        chat: [Play_controlsChat, Play_controlsChatSend, Play_controlsChatSettings],
        playback: [
            Play_controlsSpeed,
            Play_controlsExternal,
            Play_controlsRewind,
            Play_controlsScreeOff,
            Play_controlsLowLatency,
            Play_controlsChapters
        ],
        content: [
            Play_controlsSearch,
            Play_controlsChanelCont,
            Play_controlsGameCont,
            Play_controlsOpenLive,
            Play_controlsOpenVod,
            Play_controlsFollow,
            Play_controlsContentLang
        ],
        audio: [
            Play_controlsAudioAll,
            Play_controlsAudio_Volume_100,
            Play_controlsAudioEna0,
            Play_controlsAudioVol0,
            Play_controlsAudioEna1,
            Play_controlsAudioVol1,
            Play_controlsAudioEna2,
            Play_controlsAudioVol2,
            Play_controlsAudioEna3,
            Play_controlsAudioVol3
        ],
        preview: [Play_controlsPreviewEnable, Play_controlsPreviewSize, Play_controlsPreviewVolume, Play_controlsPreviewMainVolume],
        diagnostics: [Play_controlsPlayerStatus, Play_controlsControls]
    };
}
function PlayClassic_labels() {
    return ClassicShell_ru()
        ? {
              quality: 'Качество',
              layout: 'Компоновка',
              chat: 'Чат',
              playback: 'Воспроизведение',
              audio: 'Звук',
              content: 'Канал и контент',
              preview: 'Предпросмотр',
              diagnostics: 'Информация и управление'
          }
        : {
              quality: 'Quality',
              layout: 'Layout',
              chat: 'Chat',
              playback: 'Playback',
              audio: 'Audio',
              content: 'Channel and content',
              preview: 'Previews',
              diagnostics: 'Information and controls'
          };
}
function PlayClassic_groupRows(group) {
    var groups = PlayClassic_groups(),
        keys = groups[group],
        prop;
    if (group === 'audio') prop = Play_MultiEnable ? 'ShowInAudioMulti' : PlayExtra_PicturePicture ? 'ShowInAudioPP' : 'ShowInAudio';
    if (group === 'preview') prop = 'ShowInPreview';
    if (prop)
        keys = keys.filter(function (key) {
            return Play_controls[key] && Play_controls[key][prop];
        });
    if (group === 'audio' && Play_MultiEnable)
        keys = keys.filter(function (key) {
            if (key < Play_controlsAudioEna0 || key > Play_controlsAudioVol3) return true;
            var slot = Math.floor((key - Play_controlsAudioEna0) / 2);
            return Play_MultiArray[slot] && Play_MultiArray[slot].data.length;
        });
    if (group === 'audio')
        keys.forEach(function (key) {
            if (Play_controls[key].setLabel) Play_controls[key].setLabel();
        });
    return PlayClassic_controlRows(keys, !!prop);
}
function PlayClassic_group(group) {
    if (!PlayClassic_dialog) PlayClassic_open();
    var rows = PlayClassic_groupRows(group);
    if (group === 'layout')
        rows = rows.map(function (row) {
            if (row.key === Play_controlsChatSide) row.text = ClassicShell_ru() ? 'Видео и чат' : 'Video and chat';
            return row;
        });
    PlayClassic_go(PlayClassic_labels()[group], rows);
}

function PlayClassic_go(title, rows, selected) {
    PlayClassic_stack.push({
        title: document.getElementById('classic_settings_title').textContent,
        rows: PlayClassic_rows,
        cursor: PlayClassic_cursor
    });
    PlayClassic_render(title, rows, selected || 0);
}

function PlayClassic_render(title, rows, selected) {
    PlayClassic_rows = rows;
    PlayClassic_cursor = Math.max(0, Math.min(rows.length - 1, selected || 0));
    var container = document.getElementById('classic_settings_rows');
    document.getElementById('classic_settings_title').textContent = title;
    container.replaceChildren();
    rows.forEach(function (row, index) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'classic-settings-row';
        var label = document.createElement('span');
        label.textContent = row.text;
        button.appendChild(label);
        var value = document.createElement('span');
        value.className = 'classic-settings-value';
        value.textContent = row.value;
        button.classList.toggle('is-current', row.value === '✓');
        button.appendChild(value);
        button.addEventListener('click', function () {
            PlayClassic_cursor = index;
            row.action();
        });
        container.appendChild(button);
    });
    if (!rows.length) {
        var empty = document.createElement('p');
        empty.textContent = STR_CLASSIC_EMPTY;
        container.appendChild(empty);
    }
    PlayClassic_focus();
}

function PlayClassic_focus() {
    var buttons = document.querySelectorAll('#classic_settings_rows button');
    if (buttons[PlayClassic_cursor]) {
        buttons[PlayClassic_cursor].focus();
        buttons[PlayClassic_cursor].scrollIntoView({block: 'nearest'});
    }
}

function PlayClassic_open() {
    if (PlayClassic_dialog) return;
    PlayClassic_syncQualityLabel();
    Play_clearHidePanel();
    PlayClassic_dialog = document.createElement('section');
    PlayClassic_dialog.id = 'classic_settings';
    PlayClassic_dialog.className = 'classic-settings';
    PlayClassic_dialog.setAttribute('role', 'dialog');
    PlayClassic_dialog.setAttribute('aria-modal', 'true');
    var title = document.createElement('h2');
    title.id = 'classic_settings_title';
    PlayClassic_dialog.appendChild(title);
    var hint = document.createElement('p');
    hint.textContent = STR_CLASSIC_HINT;
    PlayClassic_dialog.appendChild(hint);
    var rows = document.createElement('div');
    rows.id = 'classic_settings_rows';
    PlayClassic_dialog.appendChild(rows);
    document.body.appendChild(PlayClassic_dialog);
    PlayClassic_stack = [];
    var groups = PlayClassic_groups(),
        labels = PlayClassic_labels();
    var rows = Object.keys(groups)
        .filter(function (group) {
            return PlayClassic_groupRows(group).length;
        })
        .map(function (group) {
            var row = PlayClassic_title(labels[group], group === 'quality' ? PlayClassic_qualityText() : '', function () {
                if (group === 'chat') PlayClassic_chat();
                else if (
                    group === 'quality' &&
                    PlayClassic_groupRows(group).length === 1 &&
                    PlayClassic_groupRows(group)[0].key === Play_controlsQuality
                )
                    PlayClassic_quality();
                else PlayClassic_group(group);
            });
            row.group = group;
            return row;
        });
    PlayClassic_render(STR_SETTINGS, rows);
}

function PlayClassic_chat() {
    if (!PlayClassic_dialog) PlayClassic_open();
    var keys = [Play_controlsChat, Play_controlsChatSend].filter(function (key) {
        return Play_controls[key][PlayClassic_visibility()];
    });
    keys = keys.concat(
        Object.keys(Play_controls)
            .map(Number)
            .filter(function (key) {
                return Play_controls[key].ShowInChat && keys.indexOf(key) === -1;
            })
    );
    var rows = PlayClassic_controlRows(keys, true);
    rows.forEach(function (row) {
        if (row.key === Play_controlsChatSide) row.text = ClassicShell_ru() ? 'Видео и чат' : 'Video and chat';
    });
    if (ClassicChatScroll_available())
        rows.splice(1, 0, PlayClassic_title(ClassicShell_ru() ? 'Листать чат' : 'Scroll chat', '', ClassicChatScroll_enter));
    PlayClassic_go(STR_CHAT_OPTIONS, rows);
}
function PlayClassic_audio() {
    PlayClassic_group('audio');
}
function PlayClassic_preview() {
    PlayClassic_group('preview');
}
function PlayClassic_layoutValue() {
    return !Play_isFullScreen
        ? ClassicShell_ru()
            ? 'Раздельно'
            : 'Side by side'
        : Play_isChatShown()
          ? ClassicShell_ru()
              ? 'Чат поверх видео'
              : 'Chat over video'
          : ClassicShell_ru()
            ? 'Без чата'
            : 'Chat hidden';
}
function PlayClassic_layout() {
    if (!PlayClassic_dialog) PlayClassic_open();
    var selected = !Play_isFullScreen ? 1 : Play_isChatShown() ? 0 : 2;
    var names = ClassicShell_ru()
        ? ['Чат поверх видео', 'Раздельно: видео рядом с чатом', 'Видео без чата']
        : ['Chat over video', 'Side by side: video next to chat', 'Video without chat'];
    PlayClassic_go(
        ClassicShell_ru() ? 'Расположение видео и чата' : 'Video and chat layout',
        names.map(function (name, index) {
            return PlayClassic_title(name, index === selected ? '✓' : '', function () {
                PlayClassic_setChatMode([0, 2, 1][index]);
                PlayClassic_back();
            });
        }),
        selected
    );
}

function PlayClassic_values(key) {
    if (key === Play_controlsChat) {
        PlayClassic_chatMode();
        return;
    }
    var control = Play_controls[key];
    PlayClassic_go(
        control.string || control.doc_title.textContent,
        Array.from({length: control.values.length}, function (_, index) {
            var value = control.values[index];
            return PlayClassic_title(value === undefined ? index + '%' : String(value), index === control.defaultValue ? '✓' : '', function () {
                if (control.updown) {
                    var delta = index - control.defaultValue;
                    // Volume's original arrow handler scales its input by the user's configured step.
                    if (value === undefined) delta /= Settings_VolumeScale;
                    control.updown(delta, PlayClassic_kind());
                    if (control.enterKey) {
                        PlayClassic_close();
                        control.enterKey(PlayClassic_kind());
                        return;
                    }
                } else if (control.enterKey) {
                    var left = control.values.length;
                    while (control.defaultValue !== index && left-- > 0) {
                        var before = control.defaultValue;
                        control.enterKey(PlayClassic_kind());
                        if (before === control.defaultValue) break;
                    }
                }
                PlayClassic_back();
            });
        }),
        control.defaultValue
    );
}

function PlayClassic_quality() {
    if (!PlayClassic_dialog) PlayClassic_open();
    PlayClassic_syncQualityLabel();
    var state = PlayClassic_qualityState(),
        kind = state.kind,
        qualities = state.qualities,
        current = state.current;
    PlayClassic_go(
        STR_QUALITY,
        qualities.map(function (quality, index) {
            return PlayClassic_title(
                String(quality.id).replace('source', STR_SOURCE).replace('Auto', STR_AUTO),
                quality.id === current ? '✓' : '',
                function () {
                    if (quality.id === current) {
                        PlayClassic_close();
                        return;
                    }
                    if (kind === 1) Play_data.qualityIndex = index;
                    else if (kind === 2) PlayVod_qualityIndex = index;
                    else PlayClip_qualityIndex = index;
                    PlayClassic_close();
                    PlayClassic_actualQuality = null;
                    Play_controls[Play_controlsQuality].enterKey(kind);
                }
            );
        }),
        Math.max(
            0,
            qualities.findIndex(function (q) {
                return q.id === current;
            })
        )
    );
}

function PlayClassic_back() {
    var previous = PlayClassic_stack.pop();
    if (previous) {
        previous.rows.forEach(function (row) {
            if (row.key !== undefined) row.value = PlayClassic_value(row.key, Play_controls[row.key]);
            else if (row.group === 'quality') row.value = PlayClassic_qualityText();
        });
        PlayClassic_render(previous.title, previous.rows, previous.cursor);
    } else PlayClassic_close();
}
function PlayClassic_close() {
    if (!PlayClassic_dialog) return;
    PlayClassic_dialog.remove();
    PlayClassic_dialog = null;
    PlayClassic_stack = [];
    Play_ResetPanel(PlayClassic_kind());
}
function PlayClassic_isOpen() {
    return !!PlayClassic_dialog;
}
function PlayClassic_ignoreKeyUp(event) {
    if (PlayClassic_isOpen() || event.keyCode === PlayClassic_consumedKey) {
        if (event.keyCode === PlayClassic_consumedKey) PlayClassic_consumedKey = null;
        return true;
    }
    return false;
}
function PlayClassic_handleKeyDown(event) {
    PlayClassic_consumedKey = event.keyCode;
    if (event.preventDefault) event.preventDefault();
    if (event.stopPropagation) event.stopPropagation();
    if (event.keyCode === KEY_ENTER) {
        if (event.repeat || PlayClassic_waitForRelease) return;
        PlayClassic_waitForRelease = true;
    }
    if (event.keyCode === KEY_RETURN || event.keyCode === KEY_KEYBOARD_BACKSPACE || event.keyCode === KEY_LEFT) PlayClassic_back();
    else if (event.keyCode === KEY_UP || event.keyCode === KEY_DOWN) {
        PlayClassic_cursor = Math.max(0, Math.min(PlayClassic_rows.length - 1, PlayClassic_cursor + (event.keyCode === KEY_UP ? -1 : 1)));
        PlayClassic_focus();
    } else if (event.keyCode === KEY_ENTER || event.keyCode === KEY_RIGHT) {
        var row = PlayClassic_rows[PlayClassic_cursor];
        if (row) row.action();
    }
}

function PlayClassic_revealOnInput(event, kind) {
    if (
        !PlayClassic_enabled() ||
        Play_isPanelShowing() ||
        Play_isEndDialogVisible() ||
        Play_MultiDialogVisible() ||
        UserLiveFeed_isPreviewShowing() ||
        Play_isVodDialogVisible()
    )
        return false;
    if ([KEY_UP, KEY_DOWN, KEY_LEFT, KEY_RIGHT, KEY_ENTER].indexOf(event.keyCode) === -1) return false;
    PlayClassic_consumedKey = event.keyCode;
    if (kind === 1) Play_showPanel();
    else if (kind === 2) PlayVod_showPanel(true);
    else PlayClip_showPanel();
    return true;
}

function PlayClassic_updateDelay(live, seconds) {
    var badge = document.getElementById('classic_live_delay');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'classic_live_delay';
        document.getElementById('progress_pause_holder').appendChild(badge);
    }
    var value = parseFloat(seconds);
    badge.textContent = live && isFinite(value) && value >= 0 ? (ClassicShell_ru() ? 'Отставание: ' : 'Live delay: ') + Play_timeS(value) : '';
}

function PlayClassic_chatModeNames() {
    if (Play_MultiEnable && ClassicMulti.entered)
        return ClassicShell_ru() ? ['Да — поверх окон', 'Нет', 'Рядом с основным окном'] : ['Yes — over windows', 'No', 'Beside the main window'];
    return ClassicShell_ru() ? ['Да — поверх видео', 'Нет', 'Разделение — рядом с видео'] : ['Yes — over video', 'No', 'Split — next to video'];
}
function PlayClassic_chatModeIndex() {
    if (Play_MultiEnable && ClassicMulti.entered) return !ClassicMulti.chatWanted ? 1 : Play_Multi_MainBig ? 2 : 0;
    return !Play_isChatShown() ? 1 : Play_isFullScreen ? 0 : 2;
}
function PlayClassic_setChatMode(index) {
    if (Play_MultiEnable && ClassicMulti.entered) {
        if (index !== 1) ClassicMulti_setLayout(index === 2);
        ClassicMulti_toggleChat(index !== 1);
        return;
    }
    var full = index !== 2;
    if (Play_isFullScreen !== full) Play_controls[Play_controlsChatSide].enterKey(PlayClassic_kind());
    Play_ChatEnable = index !== 1;
    if (Play_ChatEnable) Play_showChat();
    else Play_hideChat();
    Main_setItem('ChatEnable', Play_ChatEnable ? 'true' : 'false');
    Play_controls[Play_controlsChat].setLabel();
    Play_clearHidePanel();
}
function PlayClassic_chatMode() {
    if (!PlayClassic_dialog) PlayClassic_open();
    var selected = PlayClassic_chatModeIndex();
    PlayClassic_go(
        ClassicShell_ru() ? 'Показать чат' : 'Show chat',
        PlayClassic_chatModeNames().map(function (name, index) {
            return PlayClassic_title(name, index === selected ? '✓' : '', function () {
                PlayClassic_setChatMode(index);
                PlayClassic_back();
            });
        }),
        selected
    );
}

// The timeline and the action row are two visual/navigation rows. Keep the
// legacy Y states for Enter/playback handlers, but navigate them spatially.
var PlayClassic_rowReturn = null;
function PlayClassic_actionRow() {
    var row = [{y: 1, clip: 0}];
    if (PlayClip_isOn && PlayClip_HasBack) row.unshift({y: 1, clip: -1});
    if (PlayClip_isOn && PlayClip_HasNext) row.push({y: 1, clip: 1});
    Object.keys(Play_controls)
        .map(Number)
        .sort(function (a, b) {
            return a - b;
        })
        .forEach(function (key) {
            if (Play_controls[key].visible) row.push({y: 2, key: key});
        });
    return row;
}
function PlayClassic_focusRow(item) {
    PlayVod_PanelY = item.y;
    PlayClip_EnterPos = item.clip || 0;
    if (item.key !== undefined) Play_PanelCounter = item.key;
    Play_BottomIconsFocus(false, true);
}
function PlayClassic_navigateRow(event, kind) {
    if (!PlayClassic_enabled() || !Play_isPanelShowing() || Play_isVodDialogVisible()) return false;
    var key = event.keyCode;
    if ([KEY_LEFT, KEY_RIGHT, KEY_UP, KEY_DOWN].indexOf(key) === -1) return false;
    if (key === KEY_DOWN && PlayVod_PanelY === 2 && Play_PanelCounter === Play_controlsChat && ClassicChatScroll_enter()) {
        PlayClassic_consumedKey = key;
        event.preventDefault();
        return true;
    }
    if (!PlayVod_PanelY && key !== KEY_DOWN) {
        // Left/right retain the original seek behavior; Up stays on the timeline.
        if (key !== KEY_UP) return false;
    } else {
        var row = PlayClassic_actionRow(),
            index = 0;
        for (var i = 0; i < row.length; i++) {
            if (row[i].y === PlayVod_PanelY && (row[i].y === 1 ? row[i].clip === PlayClip_EnterPos : row[i].key === Play_PanelCounter)) index = i;
        }
        if (!PlayVod_PanelY) {
            var saved = PlayClassic_rowReturn;
            var target = row.filter(function (item) {
                return saved && item.y === saved.y && item.key === saved.key && item.clip === saved.clip;
            })[0];
            PlayClassic_focusRow(target || row[0]);
        } else if (key === KEY_UP) {
            PlayClassic_rowReturn = row[index];
            PlayVod_PanelY = 0;
            Play_BottomIconsFocus();
        } else if (key !== KEY_DOWN) {
            PlayClassic_focusRow(row[Math.max(0, Math.min(row.length - 1, index + (key === KEY_RIGHT ? 1 : -1)))]);
        }
    }
    PlayClassic_consumedKey = key;
    if (event.preventDefault) event.preventDefault();
    Play_screeOn();
    Play_ResetPanel(kind);
    return true;
}
function PlayClassic_focusActionRow(skipInfo, checkjump) {
    Play_BottomIconsFocusClear();
    // The row cursor already points at the destination. Clear the whole toolbar
    // before assigning its sole focus, rather than clearing only that destination.
    Object.keys(Play_controls).forEach(function (key) {
        var control = Play_controls[key];
        if (control.button) Main_RemoveClassWithEle(control.button, Play_BottonIcons_Focus_Class);
        if (control.button_text) control.button_text.style.opacity = '0';
    });
    Play_BottonIconsShow(skipInfo);
    if (!PlayVod_PanelY) {
        Main_AddClassWithEle(Play_BottonIcons_Progress, Play_BottonIcons_Focus_Class);
        if (PlayVod_addToJump) {
            PlayVod_jumpTime(PlayVod_TimeToJump / Play_DurationSeconds);
            Play_BottonIcons_Progress_Steps.style.display = 'inline-block';
        }
    } else {
        if (PlayVod_PanelY === 2) Play_IconsAddFocus();
        else {
            var button = PlayClip_EnterPos === -1 ? Play_BottonIcons_Back : PlayClip_EnterPos === 1 ? Play_BottonIcons_Next : Play_BottonIcons_Pause;
            Main_AddClassWithEle(button, Play_BottonIcons_Focus_Class);
            if (PlayClip_EnterPos)
                Main_ShowElementWithEle(PlayClip_EnterPos === -1 ? Play_BottonIcons_Back_Img_holder : Play_BottonIcons_Next_Img_holder);
        }
        if (PlayVod_IsJumping && checkjump) Play_BottomIconsFocusResetProgress();
        Play_BottonIcons_Progress_Steps.style.display = 'none';
    }
    document.body.classList.toggle('classic-clip-back', !!(PlayClip_isOn && PlayClip_HasBack));
    document.body.classList.toggle('classic-clip-next', !!(PlayClip_isOn && PlayClip_HasNext));
}
