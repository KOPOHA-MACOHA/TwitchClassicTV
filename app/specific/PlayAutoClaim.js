/*
 * Copyright (c) 2017–present Felipe de Leon <fglfgl27@gmail.com>
 *
 * This file is part of SmartTwitchTV <https://github.com/fgl27/SmartTwitchTV>
 *
 * SmartTwitchTV is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SmartTwitchTV is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with SmartTwitchTV. If not, see <https://github.com/fgl27/SmartTwitchTV/blob/master/LICENSE>.
 *
 */

//Bonus channel points, adapted from SmarterPurpleTV PlayAutoClaim.js (GPL-3.0-or-later).
//Only the channel bonus flow is retained; no drops automation is enabled.
var PlayAutoClaim_Generation = 0;
var PlayAutoClaim_LastBalance = null;
var PlayAutoClaim_LastChannel = null;
var PlayAutoClaim_Ticks = 0;
//Some Android versions replace a showing toast with the next one, so notices close together share one toast
var PlayAutoClaim_Notices = [];
var PlayAutoClaim_NoticeId = null;
var PlayAutoClaim_NoticeShownAt = 0;
//Wait for the other claims of the same tick
var PlayAutoClaim_NoticeWaitMs = 1000;
//Toast.LENGTH_LONG
var PlayAutoClaim_ToastMs = 3500;

function PlayAutoClaim_Reset() {
    Main_clearTimeout(PlayAutoClaim_NoticeId);
    PlayAutoClaim_NoticeId = null;
    PlayAutoClaim_Notices = [];
    PlayAutoClaim_Generation++;
    PlayAutoClaim_Ticks = 0;
}

//Called once per minute of live playback (paused, buffering and background minutes are skipped)
function PlayAutoClaim_Tick(channelId) {
    if (ClassicFeatures_enabled('auto_claim_bonus')) PlayAutoClaim_BonusCheck(channelId);

    PlayAutoClaim_Ticks++;
}

function PlayAutoClaim_Gql(body, callback, key) {
    HttpGetSetUserHeader();
    FullxmlHttpGet(PlayClip_BaseUrl, Main_OAuth_User_Headers, callback, noop_fun, key, PlayAutoClaim_Generation, 'POST', JSON.stringify(body));
}

function PlayAutoClaim_Data(obj, id) {
    if (
        id !== PlayAutoClaim_Generation ||
        !ClassicFeatures_enabled('auto_claim_bonus') ||
        !PlayChannelPoints_IsCurrentStream() ||
        !PlayChannelPoints_Active() ||
        obj.status !== 200
    )
        return null;

    try {
        return JSON.parse(obj.responseText).data;
    } catch (e) {
        return null;
    }
}

//settingKey = the notice toggle of that claim type
function PlayAutoClaim_Notify(settingKey, text) {
    if (!ClassicFeatures_enabled('auto_claim_bonus')) return;

    PlayAutoClaim_Notices.push(text);

    if (PlayAutoClaim_NoticeId !== null) return;

    //After the wait, and never over a toast still on screen
    PlayAutoClaim_NoticeId = Main_setTimeout(
        PlayAutoClaim_NotifyShow,
        Math.max(PlayAutoClaim_NoticeWaitMs, PlayAutoClaim_NoticeShownAt + PlayAutoClaim_ToastMs - new Date().getTime())
    );
}

function PlayAutoClaim_NotifyShow() {
    PlayAutoClaim_NoticeId = null;

    if (!PlayAutoClaim_Notices.length) return;

    //One line per claim
    OSInterface_showToast(PlayAutoClaim_Notices.join('\n'));
    PlayAutoClaim_Notices = [];
    PlayAutoClaim_NoticeShownAt = new Date().getTime();
}

function PlayAutoClaim_BonusCheck(channelId) {
    PlayAutoClaim_Gql(
        {query: 'query { user(id: "' + channelId + '") { id channel { self { communityPoints { balance availableClaim { id } } } } } }'},
        PlayAutoClaim_BonusCheckSuccess,
        0
    );
}

function PlayAutoClaim_BonusCheckSuccess(obj, key, id) {
    var data = PlayAutoClaim_Data(obj, id),
        user = data && data.user,
        points = user && user.channel && user.channel.self && user.channel.self.communityPoints;

    if (points && Main_A_equals_B(user.id, PlayChannelPoints_ChannelId)) {
        PlayAutoClaim_LastBalance = points.balance;
        PlayAutoClaim_LastChannel = Play_data.data[1];
    }
    //Only claim on the channel still being watched
    if (!points || !points.availableClaim || !Main_A_equals_B(user.id, PlayChannelPoints_ChannelId)) return;

    PlayAutoClaim_Gql(
        {
            query:
                'mutation { claimCommunityPoints(input: {channelID: "' +
                user.id +
                '", claimID: "' +
                points.availableClaim.id +
                '"}) { currentPoints error { code } } }'
        },
        PlayAutoClaim_BonusClaimSuccess,
        points.balance || 0
    );
}

//key = balance before the claim
function PlayAutoClaim_BonusClaimSuccess(obj, key, id) {
    var data = PlayAutoClaim_Data(obj, id),
        result = data && data.claimCommunityPoints;

    if (!result || result.error || !result.currentPoints) return;

    PlayAutoClaim_LastBalance = result.currentPoints;
    var earned = result.currentPoints - (key || 0);

    PlayAutoClaim_Notify(
        'auto_claim_notify_bonus',
        (ClassicShell_ru() ? 'Бонусные баллы получены' : 'Bonus points claimed') + (earned > 0 ? ': +' + earned : '')
    );
}
