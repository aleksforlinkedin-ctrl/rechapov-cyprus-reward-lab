# Проверка локального прототипа

Дата: 23 октября 2026 года. Приложение проверено на `http://127.0.0.1:5173` в Google Chrome 155.0.8059.86 через Playwright 1.64.1 (`channel: chrome`, headless). Mobile означает viewport браузера, не физическое мобильное устройство.

## Фактические результаты

| Проверка | Результат |
| --- | --- |
| `npm test` — domain/fixtures | 67 тестов PASS; отдельная проверка domain-agent и повторный запуск основным исполнителем |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS; запуск основным исполнителем |
| Основной `npm run test:e2e` | 30/30 PASS, 16.6 s |
| Проверка после локальных изменений harness | 3/3 PASS, 6.1 s: reset/credit повторно, две новые проверки compare/decimal input |

Итого 32 уникальных browser E2E. После успешного основного прогона полностью повторять его не требовалось: финальные изменения затронули comparison harness и reset, которые проверены отдельным ограниченным прогоном.

## Что подтверждает browser suite

- 18 комбинаций A/B/C × Mobile/Desktop × S1/S2/S3: earned, increment, next total, remaining, count, один Progress, delayed-crediting text. Проверены размеры modal, hero и DetailsContainer, размещение next-block и All rewards внутри DetailsContainer; CTA снаружи.
- All rewards на обеих платформах: при открытии Next находится в видимой области, header 44 px, 12 строк не ниже 48 px, прокрутка клавишей PageDown, Back возвращает фокус.
- Escape сначала закрывает details, затем модалку. Фокус возвращается на trigger; повторное открытие сохраняет confirmed amount; initial focus, Tab и Shift+Tab остаются в ожидаемом диалоговом потоке.
- N=1 и N=6 во всех концепциях: собственные максимальные награды, complete без следующей цели. Open-final S3 сохраняет известные суммы и неизвестный остаток; €4,900.01 блокирует результат.
- Harness меняет состояние существующего iframe через `postMessage`; данные обновляются без перехвата scroll/focus открытого списка. Comparison показывает одинаковые суммы во всех трёх концепциях, переключается Mobile/Desktop.
- Reset сохраняет вчерашние 250,000 в pending при сегодняшнем 0. Confirm credit — отдельное событие. Повторный New day заблокирован в этих состояниях; count остаётся доступным после credited.
- Loading не подставляет 0, Progress indeterminate. Retry из error возвращает подтверждённый S2.
- Некорректный input `850.001` отклоняется без изменения результата. `999.99` показывает €0.01 remaining; `1000` переключает earned на 50,000 и следующую цель с remaining €500.
- Capture скрывает review controls и использует конечные числа; локальный indicator без transition. Reduced motion также выключает transition.
- При 320 CSS px и 200% text size для A/B/C доступны earned, All rewards, Back, CTA и Close; документ не создаёт горизонтального overflow. Допускается прокрутка модалки.

## Найденная и исправленная ошибка

Первый запуск дал 28/30 PASS. В React StrictMode `RewardList` дважды выполнял mount-effect: первый scroll доводил Next до видимой области, второй расчёт от уже смещённой геометрии возвращал список наверх. Исправление учитывает существующий `scrollTop`, делая позиционирование идемпотентным. Обе targeted проверки disclosure прошли после исправления; затем полный основной suite прошёл 30/30.

## Артефакты и повторение

- `tests/e2e.spec.ts` — 32 browser tests.
- `playwright.config.ts` — Chrome, два workers, повторное использование локального dev server.
- `playwright-report/index.html` — полный основной отчёт, включая шесть S2 screenshots A/B/C × две платформы и три screenshots 320px/200%.
- `playwright-report-followup/index.html` — последний ограниченный прогон comparison/input/reset.
- `test-results/` — служебные результаты последнего запуска; при ошибке конфигурация сохраняет screenshot и trace.

Запуск из `reward-lab`: `npm run test:e2e`. Основной отчёт можно открыть командой `npx playwright show-report`; дополнительный — `npx playwright show-report playwright-report-followup`.

## Границы результата

Проверка не является пользовательским тестированием, аудитом WCAG целиком, проверкой реального screen reader, измерением FPS или тестом на физических телефонах. Проверка 320px/200% подтверждает доступ к содержимому и действиям, но не заменяет визуальную оценку каждой строки. Автоматическая геометрия не доказывает, что C воспринимается как milestones, а B превосходит A по скорости понимания. Финальный 3D-арт и Figma в этом этапе не создавались. Бизнес-допущения остаются допущениями после успешных тестов.
