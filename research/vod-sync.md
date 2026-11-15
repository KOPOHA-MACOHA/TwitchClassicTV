# Twitch account VOD resume — 0.20

## Protocol evidence

On 2026-11-15 the current endpoint `https://gql.twitch.tv/gql` accepted both shapes below using the existing client's public Client-ID without authentication:

- `query ClassicVodSyncRead($id:ID!){video(id:$id){id self{viewingHistory{position updatedAt}}}}`, `id="0"`: HTTP 200, `data.video=null`.
- `mutation ClassicVodSyncWrite($input:UpdateUserViewedVideoInput!){updateUserViewedVideo(input:$input) @skip(if:true){video{id}}}`, dummy user/video `0`, `videoType=VOD`, position `0`: HTTP 200, `data={}`. The skip directive prevented execution; no user's history was changed.

This validates schema availability, not authenticated access or successful synchronisation.

Schema references inspected: https://kawcco.com/twitch-graphql-api/updateuserviewedvideoinput.doc.html , https://kawcco.com/twitch-graphql-api/updateuserviewedvideopayload.doc.html , https://kawcco.com/twitch-graphql-api/videoselfedge.doc.html , https://kawcco.com/twitch-graphql-api/videoviewinghistory.doc.html . These are third-party snapshots, not a supported Twitch API contract. The public Helix videos API does not expose viewer resume updates: https://dev.twitch.tv/docs/api/reference/videos .

## Behaviour

- Normal opening and warm resume fetch the account position before starting the native player. After four seconds without a useful response, playback uses local history/checkpoints. Back exits without waiting.
- Explicit link positions and Start Over take precedence. Existing resume-dialog preferences remain effective.
- Position changes are checkpointed locally every 5 seconds and sent periodically every 30 seconds, plus explicit seek/pause/background/exit events. Local records contain no OAuth token.
- A fresh server position takes precedence, including a backward seek from another device. Local checkpoints are used when a fresh response cannot be obtained. Device clock skew and simultaneous playback on two devices remain limitations: Twitch provides no conditional update/revision field for this mutation.
- Per-video writes are serialised and coalesce a final pending change after exit. Unknown outcome/timeouts stop automatic writes for that video until reopening. Responses after an account switch are ignored.
- HTTP 200 is insufficient: matching server viewingHistory is required; otherwise an independent read is attempted. Settings show authorisation rejection, timeout, malformed/unsupported response or unconfirmed write instead of claiming success.

## Automated coverage

`tests/vod-sync-browser.cjs` boots the actual source app, uses Android's named callback dispatch, reads the resume position and reaches native StartAuto via token/playlist responses. It verifies retained full metadata, chapters and local history after resume preflight, ignores stale metadata, and checks writes and readback, queued/backward/native seeks, pause/background, final flush, warm resume, explicit/zero/start-over positions, failed/silent/malformed responses, ignored late replies, Back during preflight, account isolation, opt-out and remote navigation. These responses are simulated.

## Required real-device acceptance

1. Sign in to the same Twitch account on TV and the official mobile app. Open a normal VOD, advance several minutes, pause/exit. Under Settings → Account → Twitch VOD synchronisation check Read and Write outcomes. Open that VOD on the phone and compare the resume point.
2. Advance the same VOD on the phone and exit it. Reopen the VOD on TV (also test return from Home with the player preserved) and compare positions.
3. Repeat with a deliberate backward seek and Start Over. Disconnect the TV briefly, verify local continuation and the reported network outcome. Do not use an explicit timestamp link for the ordinary cloud-resume check.
4. If Twitch rejects the current device-flow credential or an undocumented operation, preserve local playback and record which direction/status failed. No real-account access test has been run in the build environment.

This does not implement or establish live watch streaks, yearly watch statistics, Drops or joinRaid. Those remain separate integration stages, dependent on real authenticated protocol verification.

## 0.19 preview-path regression

The user reported Read: Disabled / Write: Not attempted while watching a VOD with the option enabled. Source inspection found that the default native thumbnail-promotion path carried Play_PreviewId into ClassicVodSync_open, and was treated like passive preview viewing. A regression test with the native preview state reproduced exactly `off` before the fix. The main-player session must start on explicit VOD selection even when its underlying player already exists. Applying a cloud position requires a separate native seek after promotion; Android FixViewPosition alone does not apply StartAuto's ResumePosition.

The test now models both native player creation and preview reuse, validates all resume precedence variants, and checks the forced last save when the player is marked as a preview immediately before shutdown. This fixes a confirmed local lifecycle bug. Authenticated interoperability with the user's official Twitch app still requires another device check.

## 0.20 device feedback and account shelf

The user confirmed TV-to-Twitch position saving on 0.19, while phone-to-TV resume did not advance. Last outcomes disappeared after an app restart, preventing determination of whether a request was skipped, timed out, or lost to local precedence. Remove the TV-clock-based dirty-cache override, read matching currentUser.viewedVideos history as well as video.self, wait for in-flight own writes before reading, recheck on Play after a pause, and persist per-account diagnostics. A manual seek/pause/exit during a pause-refresh cancels its application. A successful fresh read is server-authoritative; local history is a network-failure fallback. Explicit timestamps and Start Over still win by user choice.

The live endpoint accepted `ClassicContinueWatching($first:Int!)` selecting currentUser{id viewedVideos(first:$first){edges{history{position updatedAt}node{id title lengthSeconds isDeleted status previewThumbnailURL(width:640,height:360) createdAt viewCount language owner{id login displayName profileImageURL(width:70)}}}}}` with first=50 and returned currentUser=null without auth. It also accepted the combined resume query. No authenticated account changes were made in that schema probe.

ClassicContinue consumes the first 50 account-history entries, filters malformed/duplicate/deleted/unstarted/completed videos, sorts by history.updatedAt and shows five. Completed means remaining<=min(30 seconds,2% of duration). It does not filter by follows. Local hiding does not change Twitch history; an updated server record is shown again. Cached rows are isolated by account and marked when used after a request error. Opening a row fetches fresh resume state rather than treating the shelf's old timestamp as an explicit user seek.

The VOD-preview preference is migrated off once; the independent live-preview value is preserved. Opting back in retains an existing paused VOD rather than automatically calling PlayPause(true) during screen-player restoration. Automatic screen/feed VOD preview requests and replies honour the preference. Continue cards never autoplay.

`tests/continue-browser.cjs` checks five-card layout, filtering, non-followed channels, keyboard navigation and local context hiding, fresh phone position on opening, cache/error/account isolation, late preview replies, paused VOD restore and live autoplay. `tests/vod-sync-browser.cjs` covers fresh account history versus stale direct/local records, Play after a phone session, persisted diagnostics and partial GraphQL responses. Tests use fixtures; the new actual authenticated read behaviour requires another device check.
