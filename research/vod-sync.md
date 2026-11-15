# Twitch account VOD resume — 0.18

## Protocol evidence

On 2026-11-15 the current endpoint `https://gql.twitch.tv/gql` accepted both shapes below using the existing client's public Client-ID without authentication:

- `query ClassicVodSyncRead($id:ID!){video(id:$id){id self{viewingHistory{position updatedAt}}}}`, `id="0"`: HTTP 200, `data.video=null`.
- `mutation ClassicVodSyncWrite($input:UpdateUserViewedVideoInput!){updateUserViewedVideo(input:$input) @skip(if:true){video{id}}}`, dummy user/video `0`, `videoType=VOD`, position `0`: HTTP 200, `data={}`. The skip directive prevented execution; no user's history was changed.

This validates schema availability, not authenticated access or successful synchronisation.

Schema references inspected: https://kawcco.com/twitch-graphql-api/updateuserviewedvideoinput.doc.html , https://kawcco.com/twitch-graphql-api/updateuserviewedvideopayload.doc.html , https://kawcco.com/twitch-graphql-api/videoselfedge.doc.html , https://kawcco.com/twitch-graphql-api/videoviewinghistory.doc.html . These are third-party snapshots, not a supported Twitch API contract. The public Helix videos API does not expose viewer resume updates: https://dev.twitch.tv/docs/api/reference/videos .

## Behaviour

- Normal opening and warm resume fetch the account position before starting the native player. After 1.8 seconds without a useful response, playback uses local history/checkpoints. Back exits without waiting.
- Explicit link positions and Start Over take precedence. Existing resume-dialog preferences remain effective.
- Position changes are checkpointed locally every 5 seconds and sent periodically every 30 seconds, plus explicit seek/pause/background/exit events. Local records contain no OAuth token.
- A dirty local record newer than server updatedAt can take precedence, including a backward seek. Clean local records never defeat a newer server position. Device clock skew and simultaneous playback on two devices remain limitations: Twitch provides no conditional update/revision field for this mutation.
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
