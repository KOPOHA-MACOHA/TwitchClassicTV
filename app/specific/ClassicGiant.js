/* FFZ:GE reward emotes for Twitch Classic. GPL-3.0-or-later.
 * Adapted behavior from ReYohoho: enlarge the last emote of a marked reward.
 * Preserve our entire emote composition, including zero-width layers/modifiers.
 */
var ClassicGiant = {channels: {}, requests: {}, sequence: 0};
var ClassicGiant_query = 'query ClassicGiantRewards($id:ID!){user(id:$id){id channel{communityPointsSettings{customRewards{id title prompt}}}}}';
function ClassicGiant_load(channel) {
    channel = String(channel || '');
    if (!ClassicFeatures_enabled('giant_emotes') || !/^\d+$/.test(channel)) return;
    if (Object.keys(ClassicGiant.requests).length >= 20) return;
    var entry = ClassicGiant.channels[channel];
    if (entry && Date.now() - entry.at < (entry.failed ? 30000 : 300000)) return;
    var keys = Object.keys(ClassicGiant.channels).sort(function (a, b) {
        return ClassicGiant.channels[a].at - ClassicGiant.channels[b].at;
    });
    keys.slice(0, Math.max(0, keys.length - 19)).forEach(function (key) {
        delete ClassicGiant.channels[key];
    });
    entry = ClassicGiant.channels[channel] = {at: Date.now(), rewards: entry ? entry.rewards : {}, failed: false};
    var id = ++ClassicGiant.sequence;
    ClassicGiant.requests[id] = {
        channel: channel,
        entry: entry,
        timer: window.setTimeout(function () {
            ClassicGiant_failure(null, channel, id);
        }, 6000)
    };
    try {
        HttpGetSetUserHeader();
        FullxmlHttpGet(
            PlayClip_BaseUrl,
            Main_OAuth_User_Headers.concat([['Content-Type', 'application/json']]),
            ClassicGiant_result,
            ClassicGiant_failure,
            channel,
            id,
            'POST',
            JSON.stringify({operationName: 'ClassicGiantRewards', query: ClassicGiant_query, variables: {id: channel}})
        );
    } catch (error) {
        ClassicGiant_failure(null, channel, id);
    }
}
function ClassicGiant_take(id) {
    var request = ClassicGiant.requests[id];
    if (!request) return null;
    clearTimeout(request.timer);
    delete ClassicGiant.requests[id];
    return ClassicGiant.channels[request.channel] === request.entry ? request : null;
}
function ClassicGiant_failure(result, channel, id) {
    var request = ClassicGiant_take(id);
    if (request) request.entry.failed = true;
}
function ClassicGiant_result(result, channel, id) {
    var request = ClassicGiant_take(id);
    if (!request) return;
    try {
        if (result.status !== 200) throw Error('HTTP');
        var data = JSON.parse(result.responseText),
            user = data.data && data.data.user;
        var rewards = user && user.channel && user.channel.communityPointsSettings && user.channel.communityPointsSettings.customRewards;
        if (!user || String(user.id) !== request.channel || !Array.isArray(rewards)) throw Error('Rewards');
        request.entry.rewards = {};
        rewards.slice(0, 1000).forEach(function (reward) {
            if (reward && reward.id && (String(reward.title || '') + ' ' + String(reward.prompt || '')).indexOf('FFZ:GE') !== -1)
                request.entry.rewards[String(reward.id)] = true;
        });
        ClassicGiant_refresh();
    } catch (error) {
        request.entry.failed = true;
    }
}
function ClassicGiant_prepare(holder, message) {
    if (!message.rewardId || !message.rewardChannel) return;
    holder.classList.add('classic-reward-message');
    holder.dataset.classicReward = String(message.rewardId);
    holder.dataset.classicRewardChannel = String(message.rewardChannel);
    ClassicGiant_load(message.rewardChannel);
    ClassicGiant_apply(holder);
}
function ClassicGiant_apply(holder) {
    var giant = holder.querySelector('.classic-giant-emote');
    if (!ClassicFeatures_enabled('giant_emotes')) {
        if (giant) {
            var origin = holder.querySelector('.classic-giant-origin'),
                root = giant.firstElementChild;
            if (root) root.style.zoom = '';
            if (origin && root) origin.replaceWith(root);
            else if (root) giant.parentNode.insertBefore(root, giant);
            giant.remove();
        }
        return;
    }
    if (giant) {
        ClassicGiant_fit(giant);
        return;
    }
    var entry = ClassicGiant.channels[holder.dataset.classicRewardChannel];
    if (!entry || !entry.rewards[holder.dataset.classicReward]) return;
    var message = holder.querySelector('.message');
    if (!message) return;
    var emotes = message.querySelectorAll('img.emoticon'),
        root = emotes[emotes.length - 1];
    if (!root) return;
    while (
        root.parentElement !== message &&
        root.parentElement &&
        root.parentElement.matches(
            '.classic-emote-stack,.classic-emote-layer,.classic-emote-effect,.classic-emote-transform-content,.classic-emote-stretch-content'
        )
    )
        root = root.parentElement;
    var origin = document.createElement('span');
    origin.className = 'classic-giant-origin';
    origin.hidden = true;
    root.before(origin);
    giant = document.createElement('span');
    giant.className = 'classic-giant-emote';
    giant.appendChild(root);
    message.appendChild(giant);
    var images = root.matches('img') ? [root] : root.querySelectorAll('img');
    Array.prototype.forEach.call(images, function (image) {
        if (!image.complete)
            image.addEventListener(
                'load',
                function () {
                    if (giant.isConnected) ClassicGiant_fit(giant);
                },
                {once: true}
            );
    });
    ClassicGiant_fit(giant);
}
function ClassicGiant_refresh() {
    document.querySelectorAll('.classic-reward-message').forEach(ClassicGiant_apply);
}

// Layout measurement is restricted to rare enlarged reward messages, never ordinary chat.
function ClassicGiant_fit(giant) {
    var root = giant.firstElementChild;
    if (!root || !giant.isConnected) return;
    root.style.zoom = '';
    var available = giant.clientWidth,
        width = root.getBoundingClientRect().width;
    if (available > 0 && width > available) root.style.zoom = String(available / width);
}
window.addEventListener('resize', function () {
    document.querySelectorAll('.classic-giant-emote').forEach(ClassicGiant_fit);
});
