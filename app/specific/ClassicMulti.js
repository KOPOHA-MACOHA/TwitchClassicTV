/* Twitch Classic multistream picker. GPL-3.0-or-later; uses the existing native player APIs. */
var ClassicMulti = {
    active: false,
    generation: 0,
    source: 'followed',
    streams: [],
    cursor: null,
    selected: 1,
    loading: false,
    error: '',
    next: null,
    pending: null,
    sequence: Date.now()
};
function ClassicMulti_words(ru, en) {
    return ClassicShell_ru() ? ru : en;
}
function ClassicMulti_open() {
    if (!Play_MultiEnable || !Play_isOn) return;
    if (ClassicMulti.active) return;
    if (PlayClassic_isOpen()) PlayClassic_close();
    if (UserLiveFeed_isPreviewShowing()) UserLiveFeed_Hide();
    if (Play_MultiDialogVisible()) Play_HideMultiDialog();
    Play_ForceHidePannel();
    Play_clearHidePanel();
    ClassicMulti.active = true;
    ClassicMulti.selected = Play_MultiFirstClear();
    ClassicMulti.cursor = 'slot:' + ClassicMulti.selected;
    ClassicMulti.source = AddUser_UserHasToken() ? 'followed' : 'live';
    ClassicMulti.streams = [];
    ClassicMulti.error = '';
    document.body.classList.add('classic-multi-open');
    ClassicMulti_load(false);
}
function ClassicMulti_close() {
    ClassicPages_cancel(ClassicMulti);
    ClassicMulti_cancelPending();
    ClassicMulti.active = false;
    ClassicMulti.qualityOpen = false;
    var panel = document.getElementById('classic_multi');
    if (panel) panel.remove();
    document.body.classList.remove('classic-multi-open');
    if (document.activeElement) document.activeElement.blur();
}
function ClassicMulti_cancelPending() {
    if (ClassicMulti.pending) clearTimeout(ClassicMulti.pending.timer);
    ClassicMulti.pending = null;
}
function ClassicMulti_load(more) {
    if (!ClassicMulti.active || (more && (ClassicMulti.loading || !ClassicMulti.next))) return;
    if (!more) {
        ClassicPages_cancel(ClassicMulti);
        ClassicMulti.streams = [];
        ClassicMulti.next = null;
    }
    ClassicMulti.loading = true;
    ClassicMulti.error = '';
    ClassicMulti_render();
    HttpGetSetUserHeader();
    var followed = ClassicMulti.source === 'followed',
        cursor = more ? ClassicMulti.next : null,
        url =
            Main_helix_api +
            (followed ? 'streams/followed?user_id=' + encodeURIComponent(AddUser_UsernameArray[0].id) + '&' : 'streams?') +
            'first=24' +
            (cursor ? '&after=' + encodeURIComponent(cursor) : '');
    ClassicPages_request(
        ClassicMulti,
        url,
        followed ? Main_Bearer_User_Headers : Main_Bearer_Headers,
        null,
        null,
        function (result) {
            if (!Array.isArray(result.data)) throw Error('Streams');
            result.data.forEach(function (stream) {
                if (
                    stream.user_id &&
                    stream.user_login &&
                    !ClassicMulti.streams.some(function (s) {
                        return s.user_id === stream.user_id;
                    })
                )
                    ClassicMulti.streams.push(stream);
            });
            ClassicMulti.next = result.pagination && result.pagination.cursor !== cursor ? result.pagination.cursor : null;
            ClassicMulti.loading = false;
            ClassicMulti_render();
        },
        function () {
            ClassicMulti.loading = false;
            ClassicMulti.error = ClassicMulti_words(
                'Не удалось загрузить трансляции. Нажмите «Обновить».',
                'Could not load streams. Select Refresh.'
            );
            ClassicMulti_render();
        }
    );
}
function ClassicMulti_button(parent, id, label, action, cls) {
    var button = ClassicPages_el('button', cls || '', label);
    button.type = 'button';
    button.dataset.multiId = id;
    button.onclick = function () {
        ClassicMulti.cursor = id;
        action();
    };
    parent.appendChild(button);
    return button;
}
function ClassicMulti_occupied(id) {
    for (var i = 0; i < 4; i++) if (Play_MultiArray[i].data.length && String(Play_MultiArray[i].data[14]) === String(id)) return i;
    return -1;
}
function ClassicMulti_selectSlot(slot) {
    ClassicMulti.selected = slot;
    ClassicMulti.cursor = Play_MultiArray[slot].data.length ? 'replace' : ClassicMulti_firstStream();
    ClassicMulti_render();
}
function ClassicMulti_firstStream() {
    var stream = ClassicMulti.streams.filter(function (s) {
        return ClassicMulti_occupied(s.user_id) < 0;
    })[0];
    return stream ? 'stream:' + stream.user_id : 'source:' + ClassicMulti.source;
}
function ClassicMulti_render() {
    if (!ClassicMulti.active) return;
    var panel = document.getElementById('classic_multi');
    if (!panel) {
        panel = ClassicPages_el('section', 'classic-multi');
        panel.id = 'classic_multi';
        document.getElementById('scene2').appendChild(panel);
    }
    panel.replaceChildren();
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', ClassicMulti_words('Мультистрим', 'Multistream'));
    var header = ClassicPages_el('header', 'classic-multi-header');
    header.appendChild(ClassicPages_el('h1', '', ClassicMulti_words('Мультистрим', 'Multistream')));
    ClassicMulti_button(header, 'close', ClassicMulti_words('Готово', 'Done'), ClassicMulti_close);
    panel.appendChild(header);
    var body = ClassicPages_el('div', 'classic-multi-body'),
        aside = ClassicPages_el('aside', 'classic-multi-aside');
    aside.appendChild(ClassicPages_el('h2', '', ClassicMulti_words('Окна', 'Windows')));
    var slots = ClassicPages_el('div', 'classic-multi-slots');
    for (var i = 0; i < 4; i++)
        (function (slot) {
            var data = Play_MultiArray[slot].data;
            var button = ClassicMulti_button(
                slots,
                'slot:' + slot,
                '',
                function () {
                    if (!ClassicMulti.pending) ClassicMulti_selectSlot(slot);
                },
                'classic-multi-slot'
            );
            button.classList.toggle('is-selected', slot === ClassicMulti.selected);
            button.appendChild(ClassicPages_el('span', 'classic-multi-slot-number', String(slot + 1)));
            button.appendChild(ClassicPages_el('strong', '', data.length ? data[1] : ClassicMulti_words('Добавить', 'Add stream')));
            button.appendChild(
                ClassicPages_el(
                    'small',
                    '',
                    ClassicMulti.pending && ClassicMulti.pending.slot === slot
                        ? ClassicMulti_words('Подключение…', 'Connecting…')
                        : data.length
                          ? Play_audio_enable[slot]
                              ? ClassicMulti_words('Звук включён', 'Audio on')
                              : ClassicMulti_words('Без звука', 'Muted')
                          : ClassicMulti_words('Пустое окно', 'Empty window')
                )
            );
        })(i);
    aside.appendChild(slots);
    var actions = ClassicPages_el('div', 'classic-multi-actions'),
        slot = ClassicMulti.selected,
        occupied = Play_MultiArray[slot].data.length;
    if (occupied) {
        ClassicMulti_button(actions, 'replace', ClassicMulti_words('Заменить трансляцию', 'Replace stream'), function () {
            ClassicMulti.cursor = ClassicMulti_firstStream();
            ClassicMulti_focus();
        });
        ClassicMulti_button(actions, 'audio', ClassicMulti_words('Слушать это окно', 'Listen to this window'), function () {
            if (!ClassicMulti.pending) ClassicMulti_audio(slot);
        });
        ClassicMulti_button(actions, 'main', ClassicMulti_words('Сделать основным', 'Make main'), function () {
            if (!ClassicMulti.pending) ClassicMulti_makeMain(slot);
        });
        ClassicMulti_button(actions, 'chat-source', ClassicMulti_words('Чат этого окна', 'Chat from this window'), function () {
            ClassicMulti_toggleChat(true, Play_MultiArray[slot].data[14]);
        });
        var remove = ClassicMulti_button(actions, 'remove', ClassicMulti_words('Убрать из окна', 'Remove stream'), function () {
            ClassicMulti_remove(slot);
        });
        remove.disabled =
            Play_MultiArray.filter(function (s) {
                return s.data.length;
            }).length <= 1 || !!ClassicMulti.pending;
    }
    ClassicMulti_button(
        actions,
        'chat-toggle',
        ClassicMulti.chatWanted ? ClassicMulti_words('Скрыть чат', 'Hide chat') : ClassicMulti_words('Показать чат', 'Show chat'),
        function () {
            ClassicMulti_toggleChat(!ClassicMulti.chatWanted);
        }
    );
    ClassicMulti_button(
        actions,
        'layout',
        Play_Multi_MainBig ? ClassicMulti_words('Сетка 2 × 2', '2 × 2 grid') : ClassicMulti_words('Одно большое окно', 'One large window'),
        function () {
            ClassicMulti_setLayout(!Play_Multi_MainBig);
        }
    );
    ClassicMulti_button(actions, 'quality', ClassicMulti_words('Качество окон: ', 'Window quality: ') + ClassicMulti_qualityLabel(), function () {
        ClassicMulti.qualityOpen = true;
        ClassicMulti.cursor = 'limit:' + (ClassicMulti.qualityLimit || 0);
        ClassicMulti_render();
    });
    ClassicMulti_button(actions, 'finish', ClassicMulti_words('Завершить мультистрим', 'End multistream'), function () {
        ClassicMulti_close();
        Play_controls[Play_MultiStream].enterKey();
    });
    aside.appendChild(actions);
    body.appendChild(aside);
    var content = ClassicPages_el('div', 'classic-multi-content'),
        sources = ClassicPages_el('nav', 'classic-multi-sources');
    if (ClassicMulti.qualityOpen) {
        content.appendChild(ClassicPages_el('h2', '', ClassicMulti_words('Качество всех окон', 'Quality of all windows')));
        content.appendChild(
            ClassicPages_el(
                'p',
                'classic-multi-target',
                ClassicMulti_words(
                    'Максимальное качество выбирается отдельно от режима «картинка в картинке». Автоматический поток зависит от сети и возможностей телевизора.',
                    'Independent of picture-in-picture limits. Automatic quality depends on the network and TV capabilities.'
                )
            )
        );
        [0, 1080, 720, 480].forEach(function (limit) {
            var b = ClassicMulti_button(
                content,
                'limit:' + limit,
                (limit ? limit + 'p' : ClassicMulti_words('Без ограничения', 'No ceiling')) + (limit === ClassicMulti.qualityLimit ? ' ✓' : ''),
                function () {
                    ClassicMulti.qualityLimit = limit;
                    Main_setItem('classic_multi_quality', String(limit));
                    ClassicMulti_applyQuality(true);
                    ClassicMulti.qualityOpen = false;
                    ClassicMulti.cursor = 'quality';
                    ClassicMulti_render();
                },
                'classic-multi-quality-option'
            );
        });
        body.appendChild(content);
        panel.appendChild(body);
        panel.appendChild(ClassicPages_el('footer', '', ClassicMulti_words('OK — выбрать · Назад — к трансляциям', 'OK — choose · Back — streams')));
        ClassicMulti_focus();
        return;
    }
    ['followed', 'live'].forEach(function (source) {
        var button = ClassicMulti_button(
            sources,
            'source:' + source,
            source === 'followed' ? ClassicMulti_words('Подписки', 'Following') : ClassicMulti_words('Трансляции', 'Live'),
            function () {
                if (ClassicMulti.source !== source) {
                    ClassicMulti.source = source;
                    ClassicMulti_load(false);
                } else {
                    ClassicMulti.cursor = ClassicMulti_firstStream();
                    ClassicMulti_focus();
                }
            }
        );
        button.classList.toggle('is-selected', ClassicMulti.source === source);
        button.disabled = source === 'followed' && !AddUser_UserHasToken();
    });
    ClassicMulti_button(sources, 'refresh', ClassicMulti_words('Обновить', 'Refresh'), function () {
        ClassicMulti_load(false);
    });
    content.appendChild(sources);
    content.appendChild(ClassicPages_el('p', 'classic-multi-target', ClassicMulti_words('Трансляция для окна ', 'Stream for window ') + (slot + 1)));
    var grid = ClassicPages_el('div', 'classic-multi-grid');
    ClassicMulti.streams.forEach(function (stream) {
        var used = ClassicMulti_occupied(stream.user_id),
            button = ClassicMulti_button(
                grid,
                'stream:' + stream.user_id,
                '',
                function () {
                    ClassicMulti_add(stream);
                },
                'classic-multi-stream'
            );
        button.disabled = used >= 0 || !!ClassicMulti.pending;
        var frame = ClassicPages_el('div', 'classic-multi-thumb');
        frame.appendChild(
            ClassicPages_image(stream.thumbnail_url && stream.thumbnail_url.replace('{width}', '480').replace('{height}', '270'), '', IMG_404_VIDEO)
        );
        frame.appendChild(
            ClassicPages_el(
                'span',
                '',
                used >= 0 ? ClassicMulti_words('В окне ', 'Window ') + (used + 1) : Main_formatNumber(stream.viewer_count || 0)
            )
        );
        button.appendChild(frame);
        button.appendChild(ClassicPages_el('strong', '', stream.user_name));
        button.appendChild(ClassicPages_el('small', '', stream.title));
    });
    content.appendChild(grid);
    if (ClassicMulti.loading || ClassicMulti.error || !ClassicMulti.streams.length)
        content.appendChild(
            ClassicPages_el(
                'p',
                'classic-multi-status',
                ClassicMulti.error ||
                    (ClassicMulti.loading
                        ? ClassicMulti_words('Загрузка…', 'Loading…')
                        : ClassicMulti_words('Сейчас нет трансляций', 'No live streams'))
            )
        );
    if (ClassicMulti.next && !ClassicMulti.loading)
        ClassicMulti_button(content, 'more', ClassicMulti_words('Показать ещё', 'Show more'), function () {
            ClassicMulti_load(true);
        });
    body.appendChild(content);
    panel.appendChild(body);
    panel.appendChild(
        ClassicPages_el(
            'footer',
            '',
            ClassicMulti_words(
                'Стрелки — выбор · OK — действие · Назад — к окнам / закрыть',
                'Arrows — select · OK — choose · Back — windows / close'
            )
        )
    );
    ClassicMulti_focus();
}
function ClassicMulti_focus() {
    var buttons = document.querySelectorAll('#classic_multi button:not(:disabled)'),
        target = null;
    buttons.forEach(function (b) {
        b.classList.remove('is-focused');
        b.tabIndex = -1;
        if (b.dataset.multiId === ClassicMulti.cursor) target = b;
    });
    if (!target) target = document.querySelector('#classic_multi [data-multi-id="slot:' + ClassicMulti.selected + '"]');
    if (target) {
        ClassicMulti.cursor = target.dataset.multiId;
        target.classList.add('is-focused');
        target.tabIndex = 0;
        target.focus({preventScroll: true});
        target.scrollIntoView({block: 'nearest'});
    }
}
function ClassicMulti_key(event) {
    if (!ClassicMulti.active) {
        if (!PlayClassic_enabled() || !Play_MultiEnable || event.keyCode !== KEY_UP || Play_isEndDialogVisible() || Play_StayDialogVisible())
            return false;
        ClassicMulti_open();
    } else if (event.keyCode === KEY_RETURN || event.keyCode === KEY_KEYBOARD_BACKSPACE) {
        if (!event.repeat) {
            if (ClassicMulti.qualityOpen) {
                ClassicMulti.qualityOpen = false;
                ClassicMulti.cursor = 'quality';
                ClassicMulti_render();
            } else if (ClassicMulti.pending) {
                ClassicMulti_cancelPending();
                ClassicMulti.cursor = 'slot:' + ClassicMulti.selected;
                ClassicMulti_render();
            } else if (ClassicMulti.cursor && /^(stream:|source:|refresh|more)/.test(ClassicMulti.cursor)) {
                ClassicMulti.cursor = 'slot:' + ClassicMulti.selected;
                ClassicMulti_focus();
            } else ClassicMulti_close();
        }
    } else if (event.keyCode === KEY_ENTER) {
        if (!event.repeat) {
            var selected = document.querySelector('#classic_multi .is-focused');
            if (selected) selected.click();
        }
    } else if ([KEY_LEFT, KEY_RIGHT, KEY_UP, KEY_DOWN].indexOf(event.keyCode) !== -1) {
        var current = document.querySelector('#classic_multi .is-focused');
        if (current) {
            var origin = current.getBoundingClientRect(),
                winner = null,
                score = Infinity;
            document.querySelectorAll('#classic_multi button:not(:disabled)').forEach(function (candidate) {
                if (candidate === current) return;
                var b = candidate.getBoundingClientRect(),
                    dx = b.left + b.width / 2 - origin.left - origin.width / 2,
                    dy = b.top + b.height / 2 - origin.top - origin.height / 2,
                    vertical = event.keyCode === KEY_UP || event.keyCode === KEY_DOWN;
                if (vertical ? (event.keyCode === KEY_UP ? dy >= -1 : dy <= 1) : event.keyCode === KEY_LEFT ? dx >= -1 : dx <= 1) return;
                var distance = vertical ? Math.abs(dy) + Math.abs(dx) * 3 : Math.abs(dx) + Math.abs(dy) * 3;
                if (distance < score) {
                    score = distance;
                    winner = candidate;
                }
            });
            if (winner) {
                ClassicMulti.cursor = winner.dataset.multiId;
                ClassicMulti_focus();
            }
        }
    }
    // Consume keyup too: old hold-Up/Down handlers must not refresh/switch players.
    PlayClassic_consumedKey = event.keyCode;
    event.preventDefault();
    event.stopPropagation();
    return true;
}
function ClassicMulti_add(stream) {
    if (ClassicMulti.pending || ClassicMulti_occupied(stream.user_id) >= 0) return;
    var slot = ClassicMulti.selected,
        request = {slot: slot, id: ++ClassicMulti.sequence, stream: stream};
    ClassicMulti.pending = request;
    request.timer = setTimeout(function () {
        if (ClassicMulti.pending === request) ClassicMulti_fail();
    }, 20000);
    ClassicMulti_render();
    try {
        PlayHLS_GetPlayListAsync(true, stream.user_login, request.id, slot, ClassicMulti_result);
    } catch (e) {
        ClassicMulti_fail();
    }
}
function ClassicMulti_result(response, slot, id, failure) {
    var request = ClassicMulti.pending;
    if (!request || request.slot !== slot || !ClassicMulti.active || !Play_isOn || !Play_MultiEnable) return;
    if (response === null) {
        if (id === request.id)
            ClassicMulti_fail(
                ClassicMulti_words('Twitch не выдал доступ к трансляции. Попробуйте ещё раз.', 'Twitch did not grant stream access. Try again.')
            );
        return;
    }
    if (Main_isStopped) {
        ClassicMulti_cancelPending();
        return;
    }
    var result;
    try {
        result = JSON.parse(response);
    } catch (e) {
        ClassicMulti_fail();
        return;
    }
    if (result.checkResult !== request.id) return;
    if (result.status !== 200 || !result.url || typeof result.responseText !== 'string' || !/^\s*#EXTM3U(?:\r?\n|$)/.test(result.responseText)) {
        ClassicMulti_fail();
        return;
    }
    ClassicMulti_cancelPending();
    Play_MultiArray[slot] = JSON.parse(JSON.stringify(Play_data_base));
    Play_MultiArray[slot].data = ScreensObj_LiveCellArray(request.stream);
    Play_MultiStartQualitySuccess(slot, result.url, result.responseText);
    ClassicMulti_applyChat();
    ClassicMulti.selected = Play_MultiFirstClear();
    ClassicMulti.cursor = 'slot:' + ClassicMulti.selected;
    ClassicMulti_render();
}
function ClassicMulti_fail(reason) {
    ClassicMulti_cancelPending();
    ClassicMulti.error = reason || ClassicMulti_words('Не удалось подключить трансляцию. Попробуйте ещё раз.', 'Could not connect. Try again.');
    ClassicMulti_render();
}
function ClassicMulti_audio(slot) {
    Play_audio_enable = [0, 0, 0, 0];
    Play_AudioReset(slot);
    Play_SetAudioIcon();
    ClassicMulti_render();
}
function ClassicMulti_makeMain(slot) {
    if (slot === null || !Play_MultiArray[slot].data.length) return;
    Play_SetMultiStreamMainBig(slot);
    Play_Multi_MainBig = true;
    OSInterface_EnableMultiStream(true, slot);
    Play_data = JSON.parse(JSON.stringify(Play_MultiArray[0]));
    Play_MultiUpdateMain();
    Play_controls[Play_controlsQualityMulti].values = STR_QUALITY_MULTI_BIG;
    ClassicMulti.selected = 0;
    ClassicMulti_applyChat();
    ClassicMulti.cursor = 'slot:0';
    ClassicMulti_audio(0);
}
function ClassicMulti_remove(slot) {
    if (
        ClassicMulti.pending ||
        Play_MultiArray.filter(function (s) {
            return s.data.length;
        }).length < 2
    )
        return;
    // The pinned native bridge exposes clearing slot 1. Rotate temporarily to it,
    // clear exactly that player, then restore the remaining players and layout.
    var offset = slot - 1;
    OSInterface_EnableMultiStream(true, offset);
    OSInterface_mClearSmallPlayer();
    OSInterface_EnableMultiStream(true, -offset);
    OSInterface_EnableMultiStream(Play_Multi_MainBig, 0);
    PlayExtra_PicturePicture = false;
    Play_MultiArray[slot] = JSON.parse(JSON.stringify(Play_data_base));
    Play_MultiInfoReset(slot);
    if (!slot) {
        ClassicMulti_makeMain(Play_MultiFirstAvailable());
        return;
    }
    if (Play_audio_enable[slot]) ClassicMulti_audio(Play_MultiFirstAvailable());
    ClassicMulti_applyChat();
    ClassicMulti.cursor = 'slot:' + slot;
    ClassicMulti_render();
}

// Multistream uses its own chat/quality choices; normal playback preferences are restored on exit.
function ClassicMulti_prepare() {
    ClassicMulti.entered = true;
    ClassicMulti.chatChannel = null;
    ClassicMulti.savedChatEnabled = Play_ChatEnable;
    ClassicMulti.chatWanted = localStorage.getItem('classic_multi_chat') !== 'false';
    ClassicMulti.qualityLimit = Number(localStorage.getItem('classic_multi_quality') || 0);
    if ([0, 1080, 720, 480].indexOf(ClassicMulti.qualityLimit) === -1) ClassicMulti.qualityLimit = 0;
    ClassicMulti.savedChat = {
        width: Play_chat_container.style.width,
        height: Play_chat_container.style.height,
        top: Play_chat_container.style.top,
        left: Play_chat_container.style.left
    };
    Play_StoreChatPos();
    ClassicMulti_applyQuality(false);
}
function ClassicMulti_enter() {
    ClassicMulti_applyChat();
    ClassicMulti_open();
}
function ClassicMulti_leave() {
    if (!ClassicMulti.entered) return;
    ClassicMulti.entered = false;
    ClassicMulti.qualityOpen = false;
    Play_ChatEnable = ClassicMulti.savedChatEnabled;
    Main_setItem('ChatEnable', Play_ChatEnable ? 'true' : 'false');
    if (Play_isOn && Play_data.data.length && String(ChatLive_selectedChannel_id[0]) !== String(Play_data.data[14])) ChatLive_Init(0);
    Settings_SetResBitRateMin();
    if (ClassicMulti.savedChat)
        Object.keys(ClassicMulti.savedChat).forEach(function (key) {
            Play_chat_container.style[key] = ClassicMulti.savedChat[key];
        });
    var header = document.querySelector('#classic_chat_header0 .classic-chat-title');
    if (header) header.textContent = ClassicShell_ru() ? 'Чат' : 'Chat';
}
function ClassicMulti_chatData() {
    if (ClassicMulti.chatChannel) {
        for (var i = 0; i < 4; i++)
            if (Play_MultiArray[i].data.length && String(Play_MultiArray[i].data[14]) === String(ClassicMulti.chatChannel))
                return Play_MultiArray[i].data;
        ClassicMulti.chatChannel = null;
    }
    var slot = Play_MultiArray[0].data.length ? 0 : Play_MultiFirstAvailable();
    return slot === null ? null : Play_MultiArray[slot].data;
}
function ClassicMulti_applyChat() {
    if (!ClassicMulti.entered || !Play_MultiEnable) return;
    var data = ClassicMulti_chatData();
    if (!ClassicMulti.chatWanted || !data) {
        Play_hideChat();
        return;
    }
    if (String(ChatLive_selectedChannel_id[0]) !== String(data[14])) ChatLive_Init(0, false, data);
    Play_chat_container.classList.remove('hide');
    Play_controls[Play_controlsChat].setLabel();
    var saved = ClassicMulti.savedChat || {};
    Play_chat_container.style.width = Play_Multi_MainBig ? '32.8%' : saved.width || '25%';
    Play_chat_container.style.height = Play_Multi_MainBig ? '65.8%' : saved.height || '48%';
    Play_chat_container.style.top = Play_Multi_MainBig ? '0.2%' : saved.top || '0.2%';
    Play_chat_container.style.left = Play_Multi_MainBig ? '67%' : saved.left || '74%';
    var header = document.querySelector('#classic_chat_header0 .classic-chat-title');
    if (header) {
        header.textContent = (ClassicShell_ru() ? 'Чат · ' : 'Chat · ') + data[1];
        header.title = data[1];
    }
}
function ClassicMulti_toggleChat(enabled, channel) {
    ClassicMulti.chatWanted = enabled;
    if (channel !== undefined) ClassicMulti.chatChannel = channel;
    Main_setItem('classic_multi_chat', enabled ? 'true' : 'false');
    ClassicMulti_applyChat();
    if (ClassicMulti.active) ClassicMulti_render();
}
function ClassicMulti_setLayout(big) {
    if (ClassicMulti.pending) return;
    if (big && !Play_MultiArray[0].data.length) {
        ClassicMulti_makeMain(Play_MultiFirstAvailable());
        return;
    }
    Play_Multi_MainBig = big;
    OSInterface_EnableMultiStream(big, 0);
    Play_controls[Play_controlsQualityMulti].values = big ? STR_QUALITY_MULTI_BIG : STR_QUALITY_MULTI;
    ClassicMulti_applyChat();
    if (ClassicMulti.active) ClassicMulti_render();
}
function ClassicMulti_applyQuality(restart) {
    // The upstream "small player" defaults cap all four multistream windows at
    // 720p / 3 Mbps. Use a separate multistream ceiling, unbounded by default.
    OSInterface_SetSmallPlayerBitrate(0, ClassicMulti.qualityLimit || 0);
    if (restart)
        for (var i = 0; i < 4; i++)
            if (Play_MultiArray[i].data.length && Play_MultiArray[i].AutoUrl && Play_MultiArray[i].playlist)
                OSInterface_StartMultiStream(i, Play_MultiArray[i].AutoUrl, Play_MultiArray[i].playlist, true);
}
function ClassicMulti_qualityLabel() {
    return ClassicMulti.qualityLimit
        ? (ClassicShell_ru() ? 'До ' : 'Up to ') + ClassicMulti.qualityLimit + 'p'
        : ClassicMulti_words('Без ограничения', 'No ceiling');
}
