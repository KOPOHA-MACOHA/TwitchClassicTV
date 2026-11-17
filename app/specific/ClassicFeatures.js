/* Twitch Classic feature preferences. GPL-3.0-or-later. */
var ClassicFeatures_defaults = {
    vod_sync: true,
    watch_time_points: true,
    auto_claim_bonus: true,
    raid_switch: true,
    chat_images: false,
    emote_modifiers: true,
    giant_emotes: true,
    connected_chatters: true,
    readable_nicks: true,
    emote_proxy: false
};
function ClassicFeatures_enabled(key) {
    var value = localStorage.getItem('classic_feature_' + key);
    return value === null || value === undefined ? !!ClassicFeatures_defaults[key] : value === 'true';
}
function ClassicFeatures_set(key, value) {
    Main_setItem('classic_feature_' + key, value ? 'true' : 'false');
    if (key === 'vod_sync') {
        if (!value) {
            ClassicVodSync_stop(false);
            ClassicLiveSync_stop(false);
        } else if (Play_isOn && !PlayVod_isOn && !PlayClip_isOn) ClassicLiveSync_start();
        var account = ClassicVodSync_user();
        if (account && ClassicVodSync.status.user !== account.id) ClassicVodSync.status = ClassicVodSync_lastStatus();
        if (account) ClassicVodSync.status.user = account.id;
        ClassicVodSync.status.read = value ? 'idle' : 'off';
        ClassicVodSync.status.readAt = 0;
        ClassicVodSync_saveStatus();
    }
    if (key === 'giant_emotes') {
        if (value) ChatLive_selectedChannel_id.forEach(ClassicGiant_load);
        ClassicGiant_refresh();
    }
    if (key === 'readable_nicks') ClassicChatPresentation_refreshNickColors();
    if (key === 'connected_chatters') {
        [0, 1].forEach(ClassicChatPresentation_refreshCount);
        ClassicChatPresentation_overlayCount();
    }
    if (key === 'raid_switch') {
        if (value && Play_isOn) PlayRaid_SetChannel(Play_data.data[14]);
        else PlayRaid_Close();
    }
    if (key === 'emote_proxy') {
        extraEmotesDone.bttv = {};
        extraEmotesDone.ffz = {};
        extraEmotesDone.seven_tv = {};
        extraEmotesDone.bttvGlobal = null;
        extraEmotesDone.ffzGlobal = null;
        extraEmotesDone.seven_tvGlobal = null;
    }
}
function ClassicFeatures_menu(kind) {
    var ru = ClassicShell_ru(),
        items =
            kind === 'chat'
                ? [
                      [
                          'emote_modifiers',
                          ru ? 'Модификаторы смайлов' : 'Emote modifiers',
                          ru ? 'Растяжение, отражение, поворот и анимационные эффекты' : 'Stretch, flip, rotate and animate emotes'
                      ],
                      [
                          'giant_emotes',
                          ru ? 'Гигаэмоуты за баллы канала' : 'Giant reward emotes',
                          ru
                              ? 'Награды с FFZ:GE в названии или описании увеличивают последний смайл сообщения'
                              : 'Rewards marked FFZ:GE enlarge the last emote in the message'
                      ],
                      [
                          'connected_chatters',
                          ru ? 'Подключённые к чату в скобках' : 'Connected chat users in parentheses',
                          ru
                              ? 'Рядом со зрителями. Включает ботов и пользователей без видео.'
                              : 'Beside viewers. Includes bots and users without video.'
                      ],
                      [
                          'chat_images',
                          ru ? 'Картинки по ссылкам в чате' : 'Chat image previews',
                          ru ? 'До двух картинок из прямых HTTPS-ссылок в сообщении' : 'Up to two images from direct HTTPS image links per message'
                      ],
                      [
                          'emote_proxy',
                          ru ? 'Прокси для смайлов' : 'Emote proxy',
                          ru
                              ? 'Сервис ReYohoho. Только запросы смайлов, без токена Twitch. Применяется после повторного открытия канала.'
                              : 'ReYohoho service. Emote requests only, without your Twitch token. Reopen the channel to apply.'
                      ],
                      [
                          'readable_nicks',
                          ru ? 'Осветлять тёмные ники' : 'Brighten dark nicknames',
                          ru ? 'Сохраняет оттенок. Выключите для точных исходных цветов Twitch.' : 'Preserves hue. Turn off for exact Twitch colours.'
                      ]
                  ]
                : [
                      [
                          'watch_time_points',
                          ru ? 'Отправлять Twitch время просмотра' : 'Report watch time to Twitch',
                          ru
                              ? 'Минуты активного просмотра прямого эфира под вашим аккаунтом. Зачёт статистики зависит от Twitch.'
                              : 'Active live playback minutes for your account. Credit depends on Twitch.'
                      ],
                      [
                          'auto_claim_bonus',
                          ru ? 'Автоматически забирать бонусные баллы' : 'Claim bonus channel points',
                          ru ? 'Забирать доступный бонус на просматриваемом канале' : 'Claim available bonuses on the channel being watched'
                      ],
                      [
                          'raid_switch',
                          ru ? 'Переходить по рейдам' : 'Follow raids',
                          ru
                              ? 'Переход на канал назначения при исходящем рейде. Требуется вход.'
                              : 'Switch to the destination of an outgoing raid. Sign-in required.'
                      ]
                  ];
    var summary = '';
    if (kind !== 'chat') {
        summary = PlayChannelPoints_LastReport
            ? (ru ? 'Последняя успешная отправка: ' : 'Last successful report: ') + new Date(PlayChannelPoints_LastReport).toLocaleTimeString()
            : ru
              ? 'Успешных отправок в этой сессии ещё нет.'
              : 'No successful reports in this session yet.';
        if (PlayAutoClaim_LastBalance !== null)
            summary += ' · ' + PlayAutoClaim_LastChannel + ': ' + PlayAutoClaim_LastBalance + (ru ? ' баллов' : ' points');
    }
    ClassicShell_push(
        ru
            ? kind === 'chat'
                ? 'Смайлы и картинки'
                : 'Просмотр, баллы и рейды'
            : kind === 'chat'
              ? 'Emotes and images'
              : 'Watch time, points and raids',
        summary,
        items.map(function (item) {
            var row = ClassicShell_row(
                item[1],
                item[2],
                function () {
                    ClassicFeatures_set(item[0], !ClassicFeatures_enabled(item[0]));
                    row.value = ClassicFeatures_enabled(item[0]) ? (ru ? 'Вкл.' : 'On') : ru ? 'Выкл.' : 'Off';
                    ClassicShell_renderSettings(
                        ClassicShell_settings.querySelector('h1').textContent,
                        summary,
                        ClassicShell_rows,
                        ClassicShell_cursor
                    );
                },
                '',
                ClassicFeatures_enabled(item[0]) ? (ru ? 'Вкл.' : 'On') : ru ? 'Выкл.' : 'Off'
            );
            return row;
        })
    );
}
function ClassicFeatures_proxyUrl(url) {
    if (!ClassicFeatures_enabled('emote_proxy')) return url;
    try {
        var parsed = new URL(url, 'https://7tv.io');
        if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return url;
        if (
            ['7tv.io', 'cdn.7tv.app', 'api.betterttv.net', 'cdn.betterttv.net', 'api.frankerfacez.com', 'cdn.frankerfacez.com'].indexOf(
                parsed.hostname
            ) === -1
        )
            return url;
        return 'https://ext.rte.net.ru:8443/' + parsed.href;
    } catch (error) {
        return url;
    }
}
