# Release Checklist

Run this after every production update:

```bash
node tools/check-live-site.mjs
```

Manual checks:

- Open `https://moimani.ai/` on desktop and mobile widths.
- Click App Store and Google Play buttons.
- Toggle the Mani tone switch.
- Check Google Analytics Realtime and Yandex Metrica Realtime after test clicks.
- Confirm `https://moimani.ai/sitemap.xml` is submitted in Google Search Console and Yandex Webmaster.

Optional environment override:

```bash
SITE_URL=https://moimani.ai node tools/check-live-site.mjs
```
