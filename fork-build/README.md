# Twitch Classic 0.33

Personal Android TV fork of [SmartTwitchTV](https://github.com/fgl27/SmartTwitchTV), GPL-3.0-or-later.
Upstream source revision: `7ca7b76249b4c2a6b2f44932641f49894410c99a`.

The player toolbar exposes quality, chat and settings alongside the original pause/seek UI. A remote-controlled drawer groups video, chat, audio and advanced actions. The application shell is redesigned: horizontal Following / Live / Browse navigation replaces the left sidebar, four-column 16:9 stream cards show compact metadata, and technical help overlays/counters are removed from browsing. Standard OK activates a card without the former hidden long-press refresh behavior. A separate settings screen groups account, video, chat, appearance, language, notification and advanced preferences. Chat preferences are subdivided into appearance, moderation, highlights and badges. OK opens a value picker; Back cancels or returns one level. Native preferences still perform storage and side effects. The legacy thumbnail color theme/clock/sidebar controls are not exposed by the fixed shell theme. Functional appearance preferences include thumbnail quality, animation, text scale and player clock. Search and onboarding use the same visual theme. QR login is retained.

The account screen generates its QR code locally using qrcode-generator 1.4.4 (MIT; see app/thirdparty/qrcode-LICENSE). It uses the upstream Twitch device authorization flow, honors polling intervals and expiry, and displays a manual activation code as a fallback. Device codes and tokens are never embedded in the QR code. Authentication was tested with mock API responses, not a real account.

## Build provenance

This APK retains the native Media3 player from the upstream signed release 3.0.379. It bundles this fork's source UI in Android assets, redirects the existing native WebViews to these assets, changes the application identity to `org.tvmod.classic`, and is signed separately. It installs alongside upstream SmartTwitchTV and official Twitch. It does not reuse modifications to the official Twitch APK from earlier experiments. The launcher and splash use the official bundled Twitch Glitch vector. The header and TV banner use the official extruded wordmark. Backgrounds use Twitch Purple #9146FF. Square app icons are separate from the 16:9 banner, and the adaptive foreground stays inside the central safe circle. Branding is mapped to the original resource IDs of the SHA-pinned native input.

Native input: https://github.com/fgl27/SmartTwitchTV/releases/download/379/SmartTV_twitch_3_0_379.apk
SHA-256: 60c405bbec86501497360767f9e843e7e0fe788e030244d5ec4d63eebf973d99

Packaging: `python fork-build/build.py --kitchen /path/to/ReTwitch-src/kitchen`
The kitchen must contain Morphe CLI 1.20.0 and its Kotlin 2.4 compiler, matching build.py. A local signing key is created or reused by Morphe and is not distributed as source. The scripts contain the complete resource/URL patch. Android source is in apk/. The APK also includes this corresponding source archive as assets/classic-source.zip. Dependencies and their locations are declared in the original Gradle project. Native files may alternatively be built using the upstream Android build instructions and SDK; that build path was not exercised for this artifact.

## Validation and limitations

Headless Chromium boots the real app UI with external services mocked. tests/shell-browser.cjs verifies four-column card layout without row overlap, actual remote key navigation, no sidebar, grouped settings, stored default quality, nested chat preference selection/scrolling and single OK activation. Its screenshots contain fixture streams and placeholder thumbnails, not real channels. tests/classic-browser.cjs verifies primary controls, drawer navigation, native quality/speed/volume actions, QR decoding, device-flow intervals/expiry/renewal/cancellation and verification URL validation. The test needs playwright-core, Chromium, jsqr and pngjs. The APK signature and manifest are checked separately. No television or Android emulator was available: real stream playback, account authorization and performance under emote spam remain unverified. This release changes the application interface and login presentation; it does not claim to repair upstream playback or chat performance.

## Authorization fix in 0.3

Android FullxmlHttpGet passes callback names to Java, which dispatches through smartTwitchTV.Main_CheckFullxmlHttpGet. The anonymous callbacks introduced in 0.2 had empty names and could not receive native responses. Authorization requests now use global named dispatchers and per-request IDs with cancellation generations. A 15-second watchdog leaves the spinner and displays a retry screen on timeout, malformed responses or HTTP errors. tests/native-auth-browser.cjs exercises the actual FullxmlHttpGet and OSInterface functions through a simulated Android transport and callback-name dispatcher: device code, token polling, user lookup, timeout, retry and ignored late replies. No physical TV or real account was used in that test.

## 0.4 navigation and player fixes

The player menu groups are quality, layout, chat, playback, channel/content, audio, preview and diagnostics, informed by the grouping in https://github.com/YofarDev/SmarterPurpleTV/blob/3dfe4561421173ca4b8cabeb166f2e88fdcb91bc/app/specific/PlayerUI.js . The implementation remains local and uses the native controls available in this client; it does not import newer fork-only native APIs. All group headings and layout choices have Russian/English labels. The old catch-all section is removed. Existing controls are accounted for in the regression test; unavailable live/VOD/chapter actions are filtered by playback state.

The native chat/video layout toggle is available as Layout > Video and chat, with explicit overlay, side-by-side and hidden-chat choices. It uses the original resize callback and saves preferences. Current quality comes from the selected playback quality, replacing the original hardcoded native control placeholder. Auto mode can show a separate observation received from the native quality callback. Bottom quality and Settings keyboard events suppress the browser default Enter click and wait for release, so opening a menu cannot immediately activate its first row.

In 0.4 Following opened a selector; this is replaced by the unified page described below. Settings, nested sections, logged-in accounts and the activation screen can return to the header with Up, then resume with Down. Returning from native preference dialogs restores the invoking row's focus. Grid focus is rendered on an inset overlay above thumbnails, and exit confirmation uses the new theme.

Tests: shell-browser.cjs checks thumbnail border pixels on all four edges, settings/header round trips, restored focus, exit styling and a fixture offline channel through the real GQL parser/channel action. player-navigation-browser.cjs uses actual keydown/keyup events for live/VOD/clip menus, quality selection, native split/overlay resize bridge calls, saved layout and complete original-control accounting. Auth tests from 0.3 remain applicable. Physical-TV playback and rendering still require device validation.

## 0.5 pages, cards and playback overlay

Following now loads live followed streams and followed channels concurrently, paginates both sources and presents live cards above offline channels on one page. Named native HTTP dispatchers, request generations and watchdogs avoid anonymous-callback problems and stale responses. Offline channels open a new channel page with Home, Videos, Clips and Follow. Video and clip grids have a dedicated horizontal channel tab bar; legacy filter rows retain their actions with real flow height. Thumbnail cards use matching rounded image/frame geometry, metadata below the image and natural-height rows.

Native previews were drawn above the WebView and could be enlarged 26 percent, covering the focus border and image badges. Card previews now send their actual inner rectangle and disable that enlargement. A pinned bytecode patch adds a rounded GradientDrawable outline and setClipToOutline to the native preview PlayerView; full-player setup disables clipping, and preview restore re-enables it. The corresponding Java changes are included. Media3 decoders, network playback and rendering backend are unchanged. SurfaceView outline behavior still needs verification on physical Android TV hardware.

The playback overlay has compact channel metadata, flat focused buttons, a thin timeline and a chat heading with clean text. It retains native actions and user chat font, sizing and placement preferences. Browser tests exercise real keyboard navigation, live/offline following, channel Video/Clip grids and their non-overlapping tab/filter/card geometry, toolbar label bounds and all existing player groups. Services and video are mocked; these checks do not establish real-device playback performance.

The Chrome extension was inspected as a downloaded package without executing it. See research/reyohoho-extension.md for version, source locations, capabilities and portability notes. Its functionality is not imported in this build.

## 0.6 selected chat features and watch reporting

Both live elapsed time and the existing viewing-session timer are visible again; the start clock time was not added. Chat composition now handles combined zero-width flags, overlays across native Twitch emote chunks, prefix/suffix emote effects and bounded opt-in HTTPS image previews. The optional ReYohoho emote proxy defaults off and does not receive Twitch authorization headers. Account and Chat preferences expose the new switches.

Watch reporting, bonus points and raid navigation are adapted from SmarterPurpleTV GPL sources at the revision above. Reporting samples native active playback, accumulates real eligible intervals and excludes long timer gaps, pause, background, VOD and clips. Bonus claims target only the currently watched channel. EventSub handles outgoing raid navigation; server-side raid joining is not implemented. Settings show the last successful report and last returned points balance. These internal Twitch endpoints can change, and successful transport does not establish credit in streaks, recap, history or Drops. See research/watch-accounting.md for source links, public endpoint verification, exact limits and tests. No real-account claims or watch reporting were performed in this environment.

## 0.7 playback recovery and requested interface corrections

The user confirmed 0.4 played streams and did not install 0.5. This build restores native player bytecode to the 0.4 version, removing the unverified native outline modifications from 0.5/0.6. Static images retain their CSS-rounded corners; native live preview video may have square corners until a device-verified rendering fix is available. validate.py checks all three DEX files against the byte hashes of the working 0.4.

Following now creates native-compatible stream records, positions and image IDs and explicitly loads previews through the existing asynchronous HLS/native player path. Preview responses are scoped to generation and focused channel. Full playback clears the preview and starts a fresh request, avoiding reuse of stale or unfinished previews. Cached-page entry refreshes authorization headers; BaseXmlHttpGet reconstructs authenticated headers instead of assuming a preexisting second header entry. Legacy refresh callbacks are routed to the unified page and do not clear the playing video. Header navigation no longer reattaches an unrelated legacy sidebar key callback when reselecting the current tab.

Holding OK for 650 ms refreshes both followed streams and channels; short OK activates on release, with no playback on long-press release. Both paginated requests and rendering are checked in tests. Auto-preview respects the existing enable/delay preferences. The full native callback-name flow is exercised from the actual Following card, including reselecting the active tab, preview startup and full playback.

Optional watch/raid services start after native readiness on a later turn. Their failures, and chat/metadata startup failures, cannot throw through the core setup chain. Loading has a Back handler and a 30-second watchdog. Pending failed starts are cleared at boot; the one-time 0.7 migration skips automatic restoration of the broken 0.6 session without deleting login/settings/history. Tests cover silent native transport, Back despite the old global key blocker, timeouts and persisted interrupted startup through a real page reload. They use a simulated native player, not a physical TV, and do not establish the device-specific crash cause.

Pause has equal fixed width/height and overrides the native inline percentage/padding. Progress resets inherited borders/vertical transforms so played purple, buffered light gray and remaining dark track stay distinct; live delay is shown as text. Pixel tests distinguish all three regions. Show chat provides overlay/off/split choices and can hide chat while leaving split mode. Home/Videos/Clips share the same identity header and tab factory, including Home selection and a separate remote-focus indicator; browser geometry checks compare all header elements across tabs.

## 0.8 chat presentation, fonts and author colours

The chat heading and the existing live counter now share one row in each chat pane. Viewers and connected chatters retain their distinct data sources and labels; compact eye/group icons and numbers save space, while the full label is retained in accessible text. Count visibility/reset, PiP chat switching and legacy-player mode retain the same DOM IDs. The old second counter row and its 2.9vh content deduction are removed in classic mode. The header height is 3.9vh regardless of whether the counter is enabled.

Inter variable fonts used by Twitch are bundled with Cyrillic/Latin and additional supported subsets, their source hashes, and SIL OFL license. Roobert headings refer to official Twitch CDN faces with font-display optional; bundled Inter provides an offline and Cyrillic fallback. No Roobert font binary is redistributed. Font kerning is restored and legacy letter spacing removed. Roboto-specific rules and generated feed font styles use Inter. Icon fonts remain intact.

The actual IRC color and VOD userColor fields now determine nickname colours even for moderators, streamer messages, Bits and mentions. Highlights still apply to the message, not the author's chosen name colour. The old replacement-colour preference is removed from the chat settings UI; previously stored values do not override server colours. A deterministic palette fallback is used only when Twitch omits a valid colour.

The remaining heavy text outlines/drop shadows are removed from classic surfaces; player notice bubbles, end-action focus colours and settings spacing are aligned with the shell. Channel video/clip filter labels describe the selected type/sort/period rather than listing multiple choices with slashes. The larger multi-stream composition and chat-input/emote-grid layouts remain legacy components and would need a separate layout change.

Tests include actual live and VOD message renderers with highlight flags, local font loading with external network mocked, both count kinds/header geometry, no extra counter padding, reset and classic/legacy mode transitions. The existing startup, remote navigation, native callback, typography/layout and player checks are also run. Native DEX remains identical to the user-confirmed 0.4. No physical TV test was available.

## 0.9 player action row

Pause, quality, chat and settings now share one visual and remote-navigation row. Up selects the timeline; Down restores the last selected action. Clips retain previous/next actions in the same row. Timeline, seek labels and live-delay text have reserved space above the buttons, without the legacy translated timeline position. Focus no longer fades the neighboring row away. Browser tests exercise actual key handlers for live/VOD/clips and check geometry at 720p, 1080p and 2160p. Native DEX remains identical to the working 0.4 build.

## 0.10 exit navigation

Following is treated as a root screen by header Back handling. Back from its cards selects the header; the next Back opens the existing Cancel/Minimize/Close dialog instead of returning to the cards. Nested channel/settings/account navigation is retained. Browser regression reproduces the old failure and exercises Escape and Backspace through Following/header/dialog/cancel, plus Back from the ordinary Live grid.

## 0.11 exclusive player focus

Clear focus from all toolbar controls before assigning the current selection. Previously the cursor was updated before the old single-control clear, leaving the previous control highlighted. A regression test reproduces that failure and asserts exactly one focused element, matching the cursor, after each horizontal/vertical remote navigation step across live, VOD and clips including previous/next and timeline return.

## 0.12 repository migration, multistream and chat geometry

Migrated the full fork to KOPOHA-MACOHA/TwitchClassicTV with a separate baseline 0.11 commit. Added a contained native-compatible multistream picker, native HLS named callbacks, cancellation and startup watchdog, four-slot operations and remote input. Bounded zero-width layers to the base emote before applying group modifiers; z! at the start retains a normal visible emote rather than painting over the nick. Added an optional connected-to-chat count (Twitch chatters.count, not proof of video viewing). Added portable browser tests, pinned public tool bootstrap, private-key-only release automation and fork-owned APK update checks. See docs/RELEASES.md for signing setup and limitations.

## 0.13 native playlist response and chat layout

The pinned Android Tools.ResponseObj constructor sets url=null (also confirmed in the distributed DEX); Gson omits that field. The 0.12 multi fixture incorrectly supplied a URL. Request URLs are now tracked by callback, request ID and slot, with bounded lifetime, and restored on successful asynchronous/synchronous playlist results. Token failures retain request/slot correlation. Tests now omit the URL on the wire, coerce callback arguments like Java, assert the exact URL delivered to native startup, and complete concurrent requests in reverse order.

Wide emotes reserve twice their intrinsic width with CSS grid; transformed content paints inside its reserved frame. Zero-width layers are confined to their base composition. A dedicated browser test checks nicknames, words, neighboring emotes, multiple compositions, narrow/wrapped messages, and animation phases. Dark nickname brightening is optional, preserves hue and original source colours, and caches by colour without per-message DOM measurement.

## 0.14 visible update entry point, startup prompt and multistream chat

Added a root Settings "Check for updates" row and a dedicated modern popup with available/checking/current/failure/downloading states, remote focus and Android installer handoff. Actual startup calls an independent check that bypasses legacy background/popup preferences and shares an in-flight request. Offers wait for welcome/login/settings dialogs to finish. Manual dismissal preserves settings focus.

Multistream chat can target an occupied slot without changing the main video. Large-main layout uses the native spare upper-right region; grid chat uses an overlay. Small-player defaults (720p / 3 Mbps) no longer impose multistream limits: its own default is unbounded, with selectable 1080/720/480 ceilings. The native Auto algorithm and hardware/network limits still apply. Original small-player limits/chat preferences are restored on exit. Chat image previews are block elements below nickname/badge text; a geometry regression verifies unchanged first-line alignment and separate image rows.

## 0.15 conservative multistream startup and native decoder failure

The 0.14 unlimited default is rolled back to the existing standard small-player profile used in 0.13. An explicit migration resets the old default once. A raised ceiling remains an opt-in; native failures after StartMultiStream retry an affected extra slot at most once with standard settings. Terminal errors retain the main window and refresh the picker after the native failure handler clears the failed slot, including early-return paths. Error text is shown above the grid. Diagnostics contain only slot/type/code/ceiling/time, with no playback URL or token.

The regression fixture now models decoder rejection through the real smartTwitchTV.Play_MultiEnd entry point after an attempted start. It tests standard settings on entry, restored chat visibility when entering from visible chat, recovery of multiple failed elevated slots, and a permanent failure without a retry loop or removal of the main window. Physical-device decoding remains unverified; the decoder-limit hypothesis is compatible with the regression report rather than a captured TV log.

## 0.16 branding and UI review

Uses the official extruded Twitch wordmark and Glitch vectors from the public brand package, bundled offline. Android app_icon previously pointed at the widescreen banner; it now points at the padded square icon. Adaptive foreground and splash are separate resources, and render-branding.cjs also refreshes Gradle resource variants. Primary decoration is #9146FF; readable light text highlights remain #BF94FF. Russian count labels now handle 1/2/5 and 11–14 correctly, using nonbreaking thousands separators. Settings display the installed version and describe account backup more precisely. See docs/UI-REVIEW.md for checked surfaces, remaining suggestions and physical-device limits.

## 0.17 account VOD resume

ClassicVodSync.js reads `video.self.viewingHistory` on ordinary VOD open and on native warm resume. It writes `updateUserViewedVideo` every 30 seconds of changing position, plus explicit seek, pause, Home/background and exit. Five-second local checkpoints are per account and bounded to 200 videos. Newer unsent local changes are compared with the server timestamp; backward seeks and explicit start-over are preserved. All writes for a given account/video are serialised, including a final queued edit after closing. Timed-out mutations block further writes for that video until a deliberate reopen; no unbounded retry loop is used. Late reads cannot seek an already started player. A valid remote zero is translated to the native player's 1ms start-over sentinel.

Reads have an independent 1.8-second watchdog and then fall back to local resume. Back cancels preflight immediately. The native bridge uses globally named callbacks. A returned video ID or HTTP 200 alone is not marked saved: the mutation must return matching server viewing history, or a separate read must confirm it. Account settings expose an opt-out and separate read/save outcomes.

The current Twitch schema was checked anonymously: read an absent video and validate the write with `@skip(if:true)` (no account mutation). Real account authorisation, TV-to-mobile and mobile-to-TV synchronisation are not yet verified. This build is the first integration stage; live watch credit, streak credit and server-side raid participation are unchanged. See research/vod-sync.md for protocol evidence and device acceptance checks.

## 0.18 VOD metadata ordering

The initial 0.17 resume preflight could let the original metadata callback arrive while PlayVod_isOn was false. Start the metadata request in PlayVod_PosStart after the resume decision and active VOD state, preserving chapters and local history. Metadata callbacks also check the returned video ID so stale responses cannot change the next video's panel. The VOD integration test now delivers a complete metadata response (including chapter and history fields) instead of leaving that unrelated service silent. It asserts that metadata is requested only after preflight and that a stale video response is ignored.

## 0.19 VOD thumbnail promotion

A VOD selected while its thumbnail player was active previously bypassed ClassicVodSync_open because Play_PreviewId was truthy, incorrectly reporting Disabled. Promotion now starts an account session, reads the remote position, preserves the native preview player and playlist, and explicitly seeks it after FixViewPosition. The old thumbnail offset cannot overwrite the account or explicit position. A mismatched preview is cleared before a fresh load. No checkpoint is sent for passive browsing previews.

When exiting, the upstream code can set Play_PreviewId before the final save. A forced final sample is now allowed for the same VOD while its viewing session is still active; periodic preview samples remain excluded. Statuses distinguish actual opt-out, missing login, live rewind, invalid video ID and an explicit starting position. Tests reproduce the previous Disabled result on native preview promotion and cover remote/empty/zero/explicit positions, mismatched preview clearing and demotion flush. The native model now reproduces Android StartAuto's preview-reuse branch instead of always assuming a new player start.

## 0.20 account continuation and VOD preview behaviour

Following includes five unfinished account VODs above live follows and offline channels. ClassicContinue.js fetches currentUser.viewedVideos independently, filters unavailable/completed entries, sorts by server update time, and caches per account. Cards show title/channel/progress/time remaining, open through the original VOD opener, and run fresh resume preflight instead of trusting a stale shelf offset. The explicit Continue action overrides the ordinary Start Over preference without disabling fresh account reads. Long OK opens a modern Resume / Hide on this TV / Cancel menu; live-card long OK still refreshes. Hiding is local and is lifted when that server entry changes. Account changes never reuse another account's cache. Following preserves pending focus while its three independent requests finish.

Fresh server resume history now wins over unconfirmed local checkpoints and TV clock skew. The read compares video.self.viewingHistory with the matching account-shelf record. An optional shelf error does not discard a valid direct response. Reads wait for this device's in-flight position writes within a four-second total deadline. Unpausing on TV also checks the account again before sending more position updates, so viewing on a phone during the pause can move the TV forward or backward. A user edit/exit invalidates late pause-refresh results. Last read/write outcomes, time, position and source are persisted per account and remain visible after a restart.

VOD thumbnail autoplay is disabled once on upgrading, and defaults off on new installations; it can be enabled under Appearance > Previews. Live autoplay retains its own preference. A paused VOD reused as a thumbnail is not automatically unpaused, even after opting in. Screen and in-player-feed auto-preview replies honour the VOD switch, including late responses.

Both GraphQL query shapes were accepted by the current Twitch endpoint without an account (currentUser=null), which establishes schema validity only. Tests simulate authenticated replies; real account shelf access and phone-to-TV progress still need user verification. TV-to-Twitch saving was confirmed by the user on 0.19.

## 0.21 account history retrieval and empty state

Use the official TV Following root (`user`, aliased to currentUser) with first=20 and excludeHiddenChannels=true, followed by the account root with first=1000 and excludeHiddenChannels=false. Fall back to first=100 if the expanded request fails. Merge and deduplicate records by video ID/newest history timestamp. Import completed and unfinished records into account-local VOD history without removing TV-only entries; respect the VOD-history recording preference. Continue shows five unfinished records, including unknown duration and RECORDING archives. The existing VOD grid is available from a dedicated history action. An empty result has an explicit state/retry and per-account persisted counts, instead of silently hiding the shelf. Missing primary history can use video.self.viewingHistory.

The internal connection has no after/cursor/pageInfo, verified against the current endpoint. No lifetime-history completeness or authenticated mobile parity is claimed. These are existing server bookmarks; this change does not start writing LIVE watch positions or implement streak accounting. Native DEX and signing identity are unchanged.

## 0.22 FFZ:GE reward emotes

ClassicGiant.js fetches channel reward IDs/title/prompt through Twitch GraphQL on chat setup, with per-channel bounded caching and a six-second request timeout. IRC custom-reward-id and source-room-id link messages to the reward map; only titles/prompts containing FFZ:GE activate the feature. No points are redeemed. The last complete emote composition moves below the message with zero-width layers and modifiers retained; rare giant-message layout fitting uses CSS zoom to fit narrow chat without cropping. Normal messages incur no new layout measurement. Existing enlarged messages restore their original location and size when the feature is disabled; moderation removes the enlarged content too. Default on; a normal Chat/Emotes preference toggles it.

Tests cover the actual IRC renderer/native callback names, delayed metadata, reward title/prompt and ordinary rewards, no-emote messages, wide/zero-width compositions and narrow chat, toggle restoration, channel isolation, timeout/late callback, and deletion. This does not implement bits power-up EventSub or giant emote sending.

The user confirmed both history windows return zero on 0.21. The root cause remains unresolved; this release makes no claim to fix mobile watch-history interoperability.

## 0.23 account recovery, live archive bookmarks and preview ownership

When the account index produces no usable records, ClassicContinue reads up to three 100-video followedVideos pages, then up to 100 already-known account-local VOD/archive IDs in batches of 20. Only positive video.self.viewingHistory enters recovered history. Current account identity and request generation are checked, zero-progress catalogue entries are excluded, records are deduplicated/newest-first, and RECORDING archives are not mistaken for completed VODs. Candidate requests have a six-second timeout and a combined 18-second fallback budget. Partial failures retain account-local cached history and offer retry. Unknown unfollowed videos remain a coverage limit, explicitly labelled.

ClassicLiveSync validates currentUser/channel/broadcast/archive identity before writing through the existing serialized and confirmed VOD mutation writer. Consecutive active main live playback checkpoints broadcast-relative position, subtracts available native chat latency, and reports at about 30-second intervals. Pause/background/exit flush the last actual sample; background, buffering, thumbnails, clips/VODs and missing/mismatched archives do not advance live bookmarks. Extreme clock disagreement is refused. There is no streak/recap claim. This uses the existing watch-sync opt-out and keeps native DEX unchanged.

ClassicPreview owns thumbnail request generations across header navigation, browsing dialogs and actual screen/channel preview callbacks. Opening a browsing modal clears the native side-panel player and restores static images; old token/playlist callbacks cannot recreate it, even after returning to the same card. Preview starts/restores are refused while a modal/header/settings is active. Modal close can resume live browsing previews. Fullscreen playback and VOD promotion keep their independent lifecycle. No native z-order patch is introduced.

New browser regressions exercise empty-index recovery through paginated self-history, completed/zero/recording records, known unfollowed videos, cached failures, repeated cursors and account switches. Live tests use native named callbacks, archive identity, confirmation/readback, latency, pause/background and missing archives. Preview tests run the actual HLS/native pipeline, close a popup before an old response arrives, verify native clearing before modal visibility, block restores and switch tabs without clearing full playback. Existing key-input tests wait for the actual click guard; a stubbed VOD opener explicitly closes its deliberately unfinished loading popup before preview assertions.

## 0.25 navigation focus

Exit from the header keeps its navigation context suspended under the modal. Cancel, Back and timeout restore the same header button without reinitializing the page; Down resumes the saved content selection. The exit dialog owns DOM focus and captures keydown/keyup/keypress, prevents default activation, resets its cursor and ignores key repeats. Following long-OK is canceled on leaving its focus region. Deferred grid focus cannot override header, channel tabs or the exit dialog. Channel tab entry clears grid focus and native previews. Browser regressions exercise real remote events, all exit dismissal paths, unchanged request counts and exclusive channel/header/grid focus.

## 0.26 initial Following focus

Before followed streams arrive, the Live section owns a visible, non-actionable loading focus target. Cached or faster-loading continuation/offline cards cannot take initial focus. Down allows an intentional selection in the already loaded sections, and a late stream response preserves that keyed selection. OK on the loading target is ignored and is never queued for a later card. Held-OK activation is canceled when navigating, refreshing, switching accounts or losing its keyed target during a render; a matching target survives a metadata-only render. The continuation browser regression delays the actual HTTP stream response, primes the history cache, delivers history first, and exercises keydown/keyup across the response and user navigation.

## 0.27 larger chat images

Image previews grow from a 9em by 5em frame to a 16em-wide 16:9 frame, bounded to the chat width. The frame scales down proportionally in narrow chat layouts. Images retain object-fit containment and their separate line beneath badges/nickname. Failed-image links have no forced aspect ratio.
