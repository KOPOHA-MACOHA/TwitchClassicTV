# Twitch branding assets

`twitch-wordmark.svg` is the official **Extruded Wordmark / White** and `twitch-glitch.svg` is **Glitch / White**, copied unchanged from Twitch’s public brand download:

- Brand site: https://brand.twitch.com/
- Archive: https://brand.twitch.com/uploads/Twitch-Brand.zip (retrieved 2026-11-15).
- Archive paths: `Twitch Brand/Twitch Logos/01. Twitch Wordmark/01. Extruded Wordmark/04. White/twitch_wordmark_extruded_white.svg` and `Twitch Brand/Twitch Logos/02. Glitch/04. White/glitch_flat_white.svg`.

The primary brand purple is **#9146FF**. Light text highlights retain **#BF94FF** for readability on dark backgrounds. Twitch owns its branding; these assets are not covered by this project’s GPL license. The app remains an unofficial client named Twitch Classic. Trademark information: https://www.twitch.tv/p/en/legal/trademark/ .

`fork-build/render-branding.cjs` renders the bundled vectors offline. The header and TV banner use the real extruded wordmark rather than font-rendered text. The square icon and adaptive foreground use Glitch. The 1080px adaptive foreground keeps all symbol pixels inside the central 660px safe circle, so launcher masks do not cut its corners. Android’s `app_icon` resource is square; it must never be mapped to the widescreen TV banner.
