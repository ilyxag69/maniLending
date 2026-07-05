# Telegram / Open Graph preview check

After deployment, verify the server-rendered metadata and image response:

```powershell
curl.exe -I https://moimani.ai
curl.exe -I https://moimani.ai/og-image-v2.png
curl.exe -A "TelegramBot (like TwitterBot)" -L https://moimani.ai | Select-String -Pattern "og:"
curl.exe -A "TelegramBot (like TwitterBot)" -I https://moimani.ai/og-image-v2.png
```

Expected image response: `200 OK`, `Content-Type: image/png`, no redirect or authorization.

Telegram caches previews by URL. Send `https://moimani.ai` to `@WebpageBot` after deployment. If Telegram still shows an old card, test `https://moimani.ai/?v=2` and request a refresh in the bot.
