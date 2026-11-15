# Twitch Classic 0.16

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
