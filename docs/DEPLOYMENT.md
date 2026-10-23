# Публикация приложения

- GitHub: https://github.com/aleksforlinkedin-ctrl/rechapov-cyprus-reward-lab
- Владелец GitHub: личный аккаунт `aleksforlinkedin-ctrl`.
- Vercel workspace: `AleksandrRechapov` (`aleksandr-rechapov`).
- Vercel project: `rechapov-cyprus-reward-lab`.
- Публичный адрес: https://rechapov-cyprus-reward-lab.vercel.app

## Сборка и обновления

Проект подключён к GitHub через существующее приложение Vercel. Production-ветка — `main`. Push в `main` запускает автоматическую сборку и публикацию; отдельный ручной деплой после изменения кода не требуется.

| Настройка | Значение |
| --- | --- |
| Framework | Vite + React + TypeScript |
| Root Directory | корень репозитория |
| Node.js | 24.x |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

`vercel.json` хранит настройки сборки, включённую Git-интеграцию и SPA rewrite на `index.html`. Благодаря rewrite прямое открытие и обновление `/preview?...` загружают приложение, сохраняя URL-параметры.

## Доступ и состав репозитория

Сайт публикуется по HTTPS без Vercel Authentication, пароля или IP-ограничений. В приложение не добавлены дополнительные ограничения доступа.

В репозиторий включено только содержимое `reward-lab`. Исходные PDF, Handoff и исследовательские документы родительской папки не публикуются. `node_modules`, `dist`, локальные отчёты тестов, `.vercel` и `.env*` исключены через `.gitignore`.

Публикация не меняет UX/UI, математическую модель и функциональность. Контрольные SHA-256 всех 24 файлов `src` и `public` сверены с версией до публикации.
