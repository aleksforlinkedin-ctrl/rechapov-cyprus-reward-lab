# Daily Rewards — UX Concept Lab

React + TypeScript прототип этапа 3: три UX-концепции дневных наград. В репозиторий входит только приложение `reward-lab`; исходные PDF и исследовательские документы из родительской папки исключены. UX/UI и модель наград сохранены. Figma и финальный 3D-арт в этом этапе не создавались.

Онлайн: [rechapov-cyprus-reward-lab.vercel.app](https://rechapov-cyprus-reward-lab.vercel.app). Настройки публикации и обновлений описаны в [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Запуск

```sh
git clone https://github.com/aleksforlinkedin-ctrl/rechapov-cyprus-reward-lab.git
cd rechapov-cyprus-reward-lab
npm ci
npm run dev
```

Открыть **http://127.0.0.1:5173/**. Vite слушает только loopback. При занятом порте запуск завершится с ошибкой, не сменит адрес молча.

```sh
npm test       # математическая модель и дневной цикл
npm run build  # TypeScript и production build
npm run test:e2e  # браузерные проверки; установленный Google Chrome
```

## Как сравнивать

- Слева выбрать A — Segmented Journey, B — Next Reward Focus или C — Reward Medallion. Начальный экран: B / S2 / Desktop.
- Переключать S1 (€0), S2 (€850), S3 (€4,500), Mobile/Desktop. Compare all открывает три настоящих интерактивных preview рядом; при недостатке места canvas прокручивается по горизонтали.
- All rewards внутри модалки заменяет только блок наград. Back или первый Escape возвращает summary; второй Escape закрывает модалку. Кнопка Open daily rewards открывает её снова с прежними данными.
- Complete, New day и отдельная Confirm previous-day credit проверяют дневной цикл. New day сохраняет текущую заработанную сумму, не зачисляет её автоматически и не перезаписывает pending при повторном нажатии.
- Campaign configuration — только review-контрол. N=1/6 независимы от исходной таблицы; остальные N синтетические. Их условия не предлагаются как условия акции.
- Advanced checks: точный ввод суммы с центами, неизвестный финал, loading/error с Retry и текст 200%.
- Кнопка разворачивания открывает чистый frozen capture в отдельной вкладке: фиксированные сценарий/день, без debug-контролов и transitions. Условия demo описаны в родительском canvas и документации; чистый capture предназначен только для внутреннего review.
- URL хранит выбранную конфигурацию. `/preview?...` — отдельная продуктовая модалка; React/Radix работают в iframe, поэтому модальный focus trap не блокирует внешние контролы стенда.

Основной CTA `View eligible games` показывает пояснение **вне модалки**: маршрут и eligibility не определены. Игровой, депозитный или Claim flow не выдумывается.

## Правила и архитектура

[`docs/ASSUMPTIONS.md`](docs/ASSUMPTIONS.md) хранит противоречия исходника и принятые допущения. [`docs/REVIEW_GUIDE.md`](docs/REVIEW_GUIDE.md) — инструкция сравнения и вопросы для диагностики UX. [`docs/QA.md`](docs/QA.md) — фактически выполненные браузерные проверки и ограничения.

`src/domain` — чистая модель, validation, exact minor-unit parsing/formatting и отдельные snapshot/ledger события. `src/fixtures` — неизменяемые raw-данные, именованные Assumed-конфигурации. `src/components` и `src/concepts` получают один согласованный view model. `src/shell` — Radix Dialog, статичный CSS/SVG hero и CTA. `src/review` — внешний стенд; здесь допустимы настройки сценариев и объяснения неопределённостей.

Основные суммы S2: 20,000 earned / +30,000 / 50,000 total / €150 / 6 of 12. S3 demo: 250,000 / +50,000 / 300,000 / €500 / 11 of 12. В `research_table_open_final` при €4,500 remaining/local неизвестны; выше €4,900 весь результат заблокирован. Assumed запрещён на production-границе. Нормализация диапазонов и final €5,000 не считаются подтверждёнными.

Неизвестные часы окончания дня не заменены локальной полуночью. `Resets daily` и `Added tomorrow` не означают автоматическое зачисление при reset. Review использует фиксированные dayId и отдельное подтверждённое credit-событие. Backend, wallet и реальные финансовые транзакции отсутствуют.

## Размеры и доступность

При 100%: hero 328×200 / 448×200, DetailsContainer 328×272 / 448×192 с padding 16/12. Mobile viewport 360×802; Desktop 1024×582; модалка 360/480. При 320 CSS px и увеличении текста допустимы reflow и вертикальная прокрутка. Суммы не обрезаются ради исходной высоты.

Единый Radix Progress сообщает завершённые этапы, а не денежный процент. SVG и дублирующие индикаторы декоративные. Есть клавиатурный focus, Escape, Back/return focus, reduced motion. Пользовательские исследования, реальное устройство и screen-reader аудит не выполнены; качественное превосходство B/C не заявляется доказанным.

## Зависимости и исходные материалы

React/ReactDOM 19.2.0, Radix Dialog 1.3.1, Progress 1.2.1; точные версии остальных пакетов и lockfile сохранены. Единственный арт — собственный статичный CSS/SVG; Motion/WebGL/Three.js отсутствуют. Runtime notices сохранены в [`docs/THIRD_PARTY_NOTICES.md`](docs/THIRD_PARTY_NOTICES.md), исходные лицензии — `docs/licenses/`. Повторный сбор notices: `node scripts/collect-notices.mjs`.

Приложение публикуется по явному разрешению владельца. Исходное задание, предыдущая работа и исследовательские документы родительской папки в этот репозиторий не включены.
