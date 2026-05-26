# Mani.ai Search Setup

This file tracks the remaining manual steps for search indexing and analytics.

## Google Search Console

1. Open https://search.google.com/search-console/.
2. Add property: `https://moimani.ai/`.
3. Choose one verification method:
   - HTML tag: send the full tag or only the `content` value from:
     `<meta name="google-site-verification" content="..." />`
   - HTML file: send the exact file name and file content Google provides.
   - DNS TXT: add it in the domain DNS panel if domain-level verification is preferred.
4. After verification, submit sitemap:
   `https://moimani.ai/sitemap.xml`

## Yandex Webmaster

1. Open https://webmaster.yandex.ru/.
2. Add site: `https://moimani.ai/`.
3. Choose one verification method:
   - Meta tag: send the full tag or only the `content` value.
   - HTML file: send the exact file name and file content Yandex provides.
   - DNS TXT: add it in the domain DNS panel if domain-level verification is preferred.
4. After verification, submit sitemap:
   `https://moimani.ai/sitemap.xml`

## Analytics

Optional IDs to add:

- Google Analytics 4 Measurement ID: `G-XXXXXXXXXX`
- Yandex Metrica counter ID: numeric counter id

Do not add placeholder verification or analytics IDs to production. Empty tags do not verify ownership and can make future maintenance confusing.
