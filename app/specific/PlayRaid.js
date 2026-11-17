/*
 * Copyright (c) 2017–present YofarDev
 *
 * This file is part of SmarterPurpleTV <https://github.com/YofarDev/SmarterPurpleTV>
 *
 * SmarterPurpleTV is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * SmarterTwitchTV is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with SmarterTwitchTV.  If not, see <https://github.com/fgl27/SmartTwitchTV/blob/master/LICENSE>.
 *
 */

//Follow raids: while a live stream plays, keep one EventSub websocket with a channel.raid
//subscription for the watched broadcaster. When the broadcaster raids, the payload carries
//the raided channel and the player switches to it.
//The websocket transport needs a user access token, so this only runs logged in.

var PlayRaid_Generation = 0;
var PlayRaid_Socket = null;
var PlayRaid_SessionId = null;
var PlayRaid_ChannelId = null;
var PlayRaid_SubscriptionId = null;
var PlayRaid_UnsubscribePendingId = null;
var PlayRaid_Active = false;
var PlayRaid_RaidDone = false;
var PlayRaid_RetryId = 0;
var PlayRaid_Retries = 0;
var PlayRaid_SubscribeRetries = 0;
var PlayRaid_SwitchCheckId = 0;
var PlayRaid_TargetName = '';

function PlayRaid_Enabled() {
    return ClassicFeatures_enabled('raid_switch');
}

//Called every time the main player successfully loads a live stream
function PlayRaid_SetChannel(channelId) {
    if (
        !channelId ||
        !PlayRaid_Enabled() ||
        !AddUser_UserHasToken() ||
        Play_MultiEnable ||
        PlayExtra_PicturePicture ||
        PlayVod_isOn ||
        PlayClip_isOn
    ) {
        PlayRaid_Close();
        return;
    }

    //A reload of the current stream (ad escape) must not drop and re-create a working subscription
    if (PlayRaid_SubscriptionId && PlayRaid_Socket && PlayRaid_Socket.readyState === 1 && PlayRaid_ChannelId === channelId + '') return;

    if (PlayRaid_ChannelId !== String(channelId) || !PlayRaid_Active) {
        PlayRaid_SwitchCheckId++;
        PlayRaid_RaidDone = false;
    }
    PlayRaid_Generation++;
    PlayRaid_ChannelId = channelId + '';
    PlayRaid_Active = true;
    PlayRaid_SubscribeRetries = 0;
    PlayRaid_Retries = 0;

    if (PlayRaid_Socket && PlayRaid_Socket.readyState === 1) {
        //Connected, move the subscription to the new channel
        PlayRaid_UnsubscribeOld();
        PlayRaid_Subscribe();
    } else if (!PlayRaid_Socket) {
        PlayRaid_Connect();
    }
    //A socket still connecting subscribes with the current PlayRaid_ChannelId on welcome
}

function PlayRaid_Close() {
    PlayRaid_Active = false;
    PlayRaid_Generation++;
    PlayRaid_SwitchCheckId++;
    Main_clearTimeout(PlayRaid_RetryId);

    if (PlayRaid_Socket) {
        PlayRaid_Socket.onclose = noop_fun;
        PlayRaid_Socket.onerror = noop_fun;
        PlayRaid_Socket.onmessage = noop_fun;
        PlayRaid_Socket.onopen = noop_fun;
        try {
            PlayRaid_Socket.close();
        } catch (e) {
            Main_Log('PlayRaid_Close ' + e);
        }
        PlayRaid_Socket = null;
    }

    PlayRaid_SessionId = null;
    PlayRaid_SubscriptionId = null;
}

function PlayRaid_Connect() {
    Main_clearTimeout(PlayRaid_RetryId);
    PlayRaid_SessionId = null;

    PlayRaid_Socket = new WebSocket('wss://eventsub.wss.twitch.tv/ws');
    PlayRaid_Socket.onmessage = PlayRaid_onMessage;
    PlayRaid_Socket.onclose = PlayRaid_onClose;
    PlayRaid_Socket.onerror = noop_fun;
}

function PlayRaid_onClose() {
    PlayRaid_Socket = null;
    PlayRaid_SessionId = null;

    if (!PlayRaid_Active) return;

    PlayRaid_Retries++;
    if (PlayRaid_Retries > 5) {
        PlayRaid_Active = false;
        return;
    }

    Main_clearTimeout(PlayRaid_RetryId);
    PlayRaid_RetryId = Main_setTimeout(PlayRaid_Connect, Math.min(PlayRaid_Retries * 3000, 30000), PlayRaid_RetryId);
}

function PlayRaid_onMessage(data) {
    if (!data.data || !PlayRaid_Active) return;

    var message;

    try {
        message = JSON.parse(data.data);
    } catch (e) {
        return;
    }

    var type = message && message.metadata ? message.metadata.message_type : null,
        payload = message ? message.payload : null;

    if (type === 'session_welcome' && payload && payload.session) {
        PlayRaid_SessionId = payload.session.id;
        PlayRaid_Retries = 0;
        PlayRaid_SubscribeRetries = 0;
        PlayRaid_UnsubscribeOld();
        PlayRaid_Subscribe();
    } else if (type === 'notification' && payload && payload.subscription && payload.subscription.type === 'channel.raid') {
        PlayRaid_HandleRaid(payload.event);
    } else if (type === 'session_reconnect') {
        //The server is dropping this session, reconnect for a fresh one
        if (PlayRaid_Socket) PlayRaid_Socket.close();
    } else if (type === 'revocation') {
        PlayRaid_SubscriptionId = null;
        ClassicSyncReport_record('raid', 'revoked');
    }
}

function PlayRaid_Headers(post) {
    var headers = [
        [clientIdHeader, AddCode_backup_client_id],
        [Bearer_Header, Bearer + AddUser_UsernameArray[0].access_token]
    ];

    if (post) headers.push(['Content-Type', 'application/json']);

    return headers;
}

//The bridge checkResult/key parameters are Java longs, so only numbers may flow through them;
//string scoping is done via these module variables and the response body instead
function PlayRaid_UnsubscribeOld() {
    if (!PlayRaid_SubscriptionId) return;

    PlayRaid_UnsubscribePendingId = PlayRaid_SubscriptionId;

    FullxmlHttpGet(
        Main_helix_api + 'eventsub/subscriptions?id=' + PlayRaid_SubscriptionId,
        PlayRaid_Headers(false),
        PlayRaid_UnsubscribeSuccess,
        noop_fun,
        0,
        0,
        'DELETE',
        null
    );
}

function PlayRaid_UnsubscribeSuccess() {
    //A late response must not clear an id that was replaced by a newer subscription
    if (PlayRaid_UnsubscribePendingId && PlayRaid_UnsubscribePendingId === PlayRaid_SubscriptionId) PlayRaid_SubscriptionId = null;

    PlayRaid_UnsubscribePendingId = null;
}

function PlayRaid_Subscribe() {
    if (!PlayRaid_SessionId || !PlayRaid_ChannelId || !PlayRaid_Active) return;

    var body = JSON.stringify({
        type: 'channel.raid',
        version: '1',
        condition: {from_broadcaster_user_id: PlayRaid_ChannelId},
        transport: {method: 'websocket', session_id: PlayRaid_SessionId}
    });

    FullxmlHttpGet(
        Main_helix_api + 'eventsub/subscriptions',
        PlayRaid_Headers(true),
        PlayRaid_SubscribeSuccess,
        PlayRaid_SubscribeError,
        0,
        PlayRaid_Generation,
        'POST',
        body
    );
}

function PlayRaid_SubscribeSuccess(responseObj, key, generation) {
    if (!PlayRaid_Active || generation !== PlayRaid_Generation) return;
    var status = responseObj.status;
    ClassicSyncReport_record('raid', 'http', status);

    if (status === 200 || status === 202 || status === 409) {
        PlayRaid_SubscribeRetries = 0;

        if (status !== 409) {
            try {
                var sub = JSON.parse(responseObj.responseText).data[0];
                //The response echoes the condition: only keep the id if the channel did not change while
                //the request was in flight
                if (sub.condition && sub.condition.from_broadcaster_user_id === PlayRaid_ChannelId) PlayRaid_SubscriptionId = sub.id;
            } catch (e) {
                Main_Log('PlayRaid_SubscribeSuccess ' + e);
            }
        }
    } else {
        if (status === 401 && AddUser_UserHasToken()) AddCode_validateToken(0);
        PlayRaid_SubscribeError();
    }
}

function PlayRaid_SubscribeError() {
    if (!PlayRaid_Active || PlayRaid_SubscribeRetries >= 5) return;

    PlayRaid_SubscribeRetries++;
    Main_clearTimeout(PlayRaid_RetryId);
    PlayRaid_RetryId = Main_setTimeout(PlayRaid_Subscribe, 8000, PlayRaid_RetryId);
}

//event is the channel.raid payload, kept a standalone global for testing
function PlayRaid_HandleRaid(event) {
    if (!PlayRaid_Active || PlayRaid_RaidDone || !event) return;
    if (event.from_broadcaster_user_id + '' !== PlayRaid_ChannelId) return;
    if (!Play_isOn || PlayVod_isOn || PlayClip_isOn || Play_MultiEnable || PlayExtra_PicturePicture) return;
    if (!PlayRaid_Enabled()) return;

    PlayRaid_RaidDone = true;
    ClassicSyncReport_record('raid', 'received');

    PlayRaid_TargetName = event.to_broadcaster_user_name || event.to_broadcaster_user_login;

    Play_showWarningMiddleDialog(Play_data.data[1] + (ClassicShell_ru() ? ' → рейд на ' : ' → raiding ') + PlayRaid_TargetName, 2500);

    Play_SavePlayData();

    PlayRaid_SwitchCheckId++;
    BaseXmlHttpGet(
        Main_helix_api + 'streams?user_login=' + event.to_broadcaster_user_login,
        PlayRaid_SwitchSuccess,
        PlayRaid_SwitchFail,
        null,
        PlayRaid_SwitchCheckId,
        true
    );
}

function PlayRaid_SwitchSuccess(responseText, key, checkId) {
    if (checkId !== PlayRaid_SwitchCheckId || !Play_isOn || !PlayRaid_Active || !PlayRaid_Enabled()) return;

    var response;

    try {
        response = JSON.parse(responseText);
    } catch (e) {
        PlayRaid_SwitchFail(null, checkId);
        return;
    }

    if (!response.data || !response.data.length) {
        PlayRaid_SwitchFail(null, checkId);
        return;
    }

    //Already watching the raided channel (race with a manual switch)
    if (response.data[0].user_id + '' === Play_data.data[14] + '') return;

    Play_StopStay();
    Play_EndDialogEnter = 0;
    Play_HideEndDialog();

    Play_data = JSON.parse(JSON.stringify(Play_data_base));
    Play_data.data = ScreensObj_LiveCellArray(response.data[0]);
    ClassicSyncReport_record('raid', 'switched');

    Main_openStream();
}

function PlayRaid_SwitchFail(key, checkId) {
    if (checkId !== PlayRaid_SwitchCheckId) return;

    ClassicSyncReport_record('raid', 'unavailable');
    Play_showWarningMiddleDialog(PlayRaid_TargetName + STR_SPACE_HTML + STR_LIVE + STR_IS_OFFLINE, 2000);
}
