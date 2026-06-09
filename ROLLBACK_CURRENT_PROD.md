# Mani.ai production rollback note

Local backup of the production version that was live before the "first 1000" waitlist deployment:

```text
production-backups/moimani-ai-current-before-1000-20260609-110803
```

Server backup created before deployment:

```text
/var/www/u3212803/data/backups/moimani-ai-before-first-1000-20260609-122510.tar.gz
```

The previous webroot was also moved on the server to:

```text
/var/www/u3212803/data/www/moimani.ai.previous-20260609-123033
```

Use this when the current waitlist campaign should be removed and the older production landing should become the main version again.

Recommended future prompt:

```text
Верни старую основную версию Mani.ai без кампании "первые 1000".
Используй локальный бэкап production-backups/moimani-ai-current-before-1000-20260609-110803 как основу,
но сохрани улучшенные SEO/гео/юридические данные, аналитику после согласия на cookies,
актуальные verification-файлы, robots.txt, sitemap.xml и технические правки безопасности.
Сначала локально собери и проверь, потом перед деплоем покажи список файлов.
```

Do not commit secrets, production submissions, or backup contents.
