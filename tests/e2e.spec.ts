import { test, expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';

type Concept = 'A' | 'B' | 'C';
type Platform = 'mobile' | 'desktop';

const concepts: Concept[] = ['A', 'B', 'C'];
const platforms: Platform[] = ['mobile', 'desktop'];
const cases = {
  S1: { earned: '0', increment: '+100', total: '100', remaining: '€1', count: 0 },
  S2: { earned: '20,000', increment: '+30,000', total: '50,000', remaining: '€150', count: 6 },
  S3: { earned: '250,000', increment: '+50,000', total: '300,000', remaining: '€500', count: 11 },
};

function previewQuery(overrides: Record<string, string | number | boolean> = {}) {
  return '/preview?' + new URLSearchParams(Object.entries({ concept: 'B', platform: 'mobile', scenario: 'S2', n: 12, rules: 'demo', capture: 1, ...overrides }).map(([key, value]) => [key, String(value)])).toString();
}

async function openPreview(page: Page, overrides: Record<string, string | number | boolean> = {}) {
  const platform = overrides.platform ?? 'mobile';
  await page.setViewportSize(platform === 'mobile' ? { width: 360, height: 802 } : { width: 1024, height: 582 });
  await page.goto(previewQuery(overrides));
  await expect(page.getByRole('dialog', { name: 'Daily rewards' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

async function expectInside(container: Locator, child: Locator) {
  const parentBox = await container.boundingBox(), childBox = await child.boundingBox();
  expect(parentBox).not.toBeNull(); expect(childBox).not.toBeNull();
  expect(childBox!.y).toBeGreaterThanOrEqual(parentBox!.y - 1);
  expect(childBox!.y + childBox!.height).toBeLessThanOrEqual(parentBox!.y + parentBox!.height + 1);
  expect(childBox!.x).toBeGreaterThanOrEqual(parentBox!.x - 1);
  expect(childBox!.x + childBox!.width).toBeLessThanOrEqual(parentBox!.x + parentBox!.width + 1);
}

for (const concept of concepts) for (const platform of platforms) for (const [scenario, values] of Object.entries(cases)) {
  test(`${concept} ${platform} ${scenario}: shared numbers and reference dimensions`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await openPreview(page, { concept, platform, scenario });
    const panel = page.locator('.rewards-panel');
    const next = panel.locator('.next-reward:visible');
    await expect(panel.locator('.earned-value')).toContainText(values.earned);
    await expect(next.locator('.next-reward__increment')).toHaveText(`${values.increment} coins`);
    await expect(next.locator('.next-reward__total')).toHaveText(`${values.total} coins total`);
    await expect(next.locator('.next-reward__remaining')).toContainText(values.remaining);
    await expect(panel.getByRole('progressbar')).toHaveCount(1);
    await expect(panel.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(values.count));
    await expect(panel.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '12');
    await expect(panel.getByRole('progressbar')).toHaveAttribute('aria-valuetext', new RegExp(`${values.count} of 12 milestones reached`));
    await expect(panel.getByText('Added tomorrow', { exact: true }).filter({ visible: true }).first()).toBeVisible();
    const box = await panel.boundingBox(), hero = await page.locator('.promo-hero').boundingBox(), modal = await page.getByRole('dialog').boundingBox();
    expect(box!.width).toBeCloseTo(platform === 'mobile' ? 328 : 448, 0);
    expect(box!.height).toBeCloseTo(platform === 'mobile' ? 272 : 192, 0);
    expect(hero!.width).toBeCloseTo(platform === 'mobile' ? 328 : 448, 0);
    expect(hero!.height).toBeCloseTo(200, 0);
    expect(modal!.width).toBeCloseTo(platform === 'mobile' ? 360 : 480, 0);
    await expectInside(panel, panel.getByRole('button', { name: 'All rewards' }));
    await expectInside(panel, next);
    expect(await panel.locator('.primary-action').count()).toBe(0);
    expect(errors).toEqual([]);
    if (scenario === 'S2') await testInfo.attach(`${concept}-${platform}-S2`, { body: await page.screenshot(), contentType: 'image/png' });
  });
}

for (const platform of platforms) test(`${platform}: rewards disclosure, scroll, focus, Escape and reopening`, async ({ page }) => {
  await openPreview(page, { platform });
  const dialog = page.getByRole('dialog');
  const opener = page.getByRole('button', { name: 'All rewards' });
  const panelBox = await page.locator('.rewards-panel').boundingBox();
  await opener.click();
  const back = page.getByRole('button', { name: 'Back', exact: true });
  await expect(back).toBeFocused();
  await expect(page.locator('.rewards-table tbody tr')).toHaveCount(12);
  await expect(page.locator('.rewards-table tr[aria-current="step"]')).toContainText('€1,000');
  await expectInside(page.locator('.reward-list-scroll'), page.locator('.rewards-table tr[aria-current="step"]'));
  expect((await page.locator('.rewards-panel').boundingBox())!.height).toBeCloseTo(panelBox!.height, 0);
  expect((await page.locator('.reward-list-header').boundingBox())!.height).toBeCloseTo(44, 0);
  const rows = await page.locator('.rewards-table tbody tr').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height));
  expect(rows.every(height => height >= 48)).toBe(true);
  const scroll = page.locator('.reward-list-scroll');
  await scroll.evaluate(element => { element.scrollTop = 0; });
  await scroll.focus();
  await page.keyboard.press('PageDown');
  await expect.poll(() => scroll.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  await back.click();
  await expect(opener).toBeFocused();
  await opener.click();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await expect(opener).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  const trigger = page.getByRole('button', { name: 'Open daily rewards' });
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(page.locator('.earned-value')).toHaveText('20,000 coins');
  await expect(page.getByRole('heading', { name: 'Daily rewards', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Close daily rewards' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
});

for (const concept of concepts) test(`${concept}: independent N=1/N=6, complete and unknown final`, async ({ page }) => {
  await openPreview(page, { concept, n: 1, scenario: 'S1' });
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '1');
  await expect(page.locator('.next-reward:visible .next-reward__increment')).toHaveText('+500 coins');
  await openPreview(page, { concept, n: 1, scenario: 'complete' });
  await expect(page.locator('.earned-value')).toContainText('500');
  await expect(page.locator('.next-reward:visible')).toContainText('All milestones completed');
  await expect(page.locator('.next-reward:visible .next-reward__remaining')).toHaveCount(0);
  await openPreview(page, { concept, n: 6 });
  await expect(page.locator('.earned-value')).toContainText('20,000');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '4');
  await expect(page.locator('.next-reward:visible .next-reward__increment')).toHaveText('+80,000 coins');
  await expect(page.locator('.next-reward:visible .next-reward__remaining')).toContainText('€1,150');
  await openPreview(page, { concept, n: 6, scenario: 'complete' });
  await expect(page.locator('.earned-value')).toContainText('300,000');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '6');
  await openPreview(page, { concept, rules: 'open', scenario: 'S3' });
  await expect(page.locator('.earned-value')).toContainText('250,000');
  await expect(page.locator('.next-reward:visible .next-reward__increment')).toHaveText('+50,000 coins');
  await expect(page.locator('.next-reward:visible .next-reward__remaining')).toContainText('— to go');
  await expect(page.locator('.local-indicator.is-unknown:visible')).toHaveCount(concept === 'A' ? 0 : 1);
  await openPreview(page, { concept, rules: 'open', scenario: 'custom', wager: '4900.01' });
  await expect(page.getByText('Reward progress unavailable', { exact: true })).toBeVisible();
  await expect(page.locator('.earned-value')).toHaveCount(0);
  await expect(page.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
});

test('review harness updates the same iframe and preserves details scroll and focus', async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 1000 });
  await page.goto('/?concept=B&platform=mobile&scenario=S2&n=12&rules=demo');
  const frameElement = page.locator('iframe');
  const initialSrc = await frameElement.getAttribute('src');
  const frame = page.frameLocator('iframe');
  await expect(frame.locator('.earned-value')).toHaveText('20,000 coins');
  await frame.getByRole('button', { name: 'All rewards' }).click();
  const scroll = frame.locator('.reward-list-scroll');
  await scroll.evaluate(element => { element.scrollTop = 20; });
  await scroll.focus();
  await page.evaluate(() => {
    const child = document.querySelector('iframe')!;
    child.contentWindow!.postMessage({ type: 'review-state', state: { concept: 'B', platform: 'mobile', scenario: 'S3', n: 12, rules: 'demo', network: 'ready' } }, location.origin);
  });
  await expect(frame.locator('.rewards-table tr[aria-current="step"]')).toContainText('€5,000');
  expect(await scroll.evaluate(element => element.scrollTop)).toBeCloseTo(20, 0);
  await expect(scroll).toBeFocused();
  await frame.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(frame.locator('.earned-value')).toHaveText('250,000 coins');
  await page.getByRole('button', { name: /A fresh start/ }).click();
  await expect(frame.locator('.earned-value')).toHaveText('0 coins');
  await page.getByRole('button', { name: /Reward Medallion/ }).click();
  await expect(frame.locator('.concept-c')).toBeVisible();
  expect(await frameElement.getAttribute('src')).toBe(initialSrc);
});

test('new day preserves yesterday; credit is a separate event', async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 1000 });
  await page.goto('/?concept=B&platform=mobile&scenario=S3&n=12&rules=demo');
  const frame = page.frameLocator('iframe');
  await expect(frame.locator('.earned-value')).toHaveText('250,000 coins');
  await page.getByRole('button', { name: 'New day', exact: true }).click();
  await expect(frame.locator('.earned-value')).toHaveText('0 coins');
  await expect(frame.locator('.previous-credit')).toHaveText('Yesterday: 250,000coins · Pending credit');
  await expect(frame.locator('.earned-summary__count')).toContainText('0/12');
  await expect(page.getByRole('button', { name: 'New day', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Confirm previous-day credit' }).click();
  await expect(frame.locator('.previous-credit')).toHaveText('Yesterday’s 250,000coins were added');
  await expect(frame.locator('.earned-summary__count')).toContainText('0/12');
  await expect(frame.locator('.earned-value')).toHaveText('0 coins');
  await expect(page.getByRole('button', { name: 'Credit confirmed' })).toBeDisabled();
});

test('comparison uses synchronized amounts across all three concepts', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/?concept=B&platform=desktop&scenario=S2&n=12&rules=demo');
  await page.getByRole('button', { name: 'Compare all concepts' }).click();
  await expect(page.locator('iframe')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'mobile preview', exact: true })).toHaveAttribute('aria-pressed', 'true');
  for (const concept of concepts) {
    const frame = page.frameLocator(`iframe[title="Concept ${concept} mobile preview"]`);
    await expect(frame.locator('.earned-value')).toContainText('20,000');
    await expect(frame.locator('.next-reward:visible .next-reward__increment')).toHaveText('+30,000 coins');
  }
  await page.getByRole('button', { name: /The final milestone/ }).click();
  for (const concept of concepts) {
    const frame = page.frameLocator(`iframe[title="Concept ${concept} mobile preview"]`);
    await expect(frame.locator('.earned-value')).toContainText('250,000');
    await expect(frame.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '11');
  }
  await page.getByRole('button', { name: 'desktop preview', exact: true }).click();
  for (const concept of concepts) {
    const frame = page.frameLocator(`iframe[title="Concept ${concept} desktop preview"]`);
    await expect(frame.locator('.earned-value')).toContainText('250,000');
    expect((await frame.locator('.rewards-panel').boundingBox())!.width).toBeCloseTo(448, 0);
  }
});

test('invalid amount is rejected and exact decimal boundary updates the preview', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/?concept=B&platform=mobile&scenario=S2&n=12&rules=demo');
  const frame = page.frameLocator('iframe');
  await expect(frame.locator('.earned-value')).toHaveText('20,000 coins');
  await page.getByText('Advanced checks', { exact: true }).click();
  await page.getByLabel('Qualifying bets (€)', { exact: true }).fill('850.001');
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('up to 2 decimals');
  await expect(frame.locator('.earned-value')).toHaveText('20,000 coins');
  await page.getByLabel('Qualifying bets (€)', { exact: true }).fill('999.99');
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(frame.locator('.next-reward__remaining')).toContainText('€0.01');
  await page.getByLabel('Qualifying bets (€)', { exact: true }).fill('1000');
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(frame.locator('.earned-value')).toHaveText('50,000 coins');
  await expect(frame.locator('.next-reward__remaining')).toContainText('€500');
});

test('loading is indeterminate and Retry restores confirmed state', async ({ page }) => {
  await openPreview(page, { network: 'loading' });
  await expect(page.getByText('Updating your progress', { exact: true })).toBeVisible();
  await expect(page.locator('.earned-value')).toHaveCount(0);
  await expect(page.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
  await expect(page.locator('.rewards-panel')).toHaveAttribute('aria-busy', 'true');
  await openPreview(page, { network: 'error' });
  await expect(page.getByText('Progress couldn’t be updated', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('.earned-value')).toHaveText('20,000 coins');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '6');
});

test('capture and reduced motion expose static final values', async ({ page }) => {
  await openPreview(page, { capture: 1 });
  await expect(page.locator('body')).toHaveAttribute('data-capture', 'true');
  await expect(page.locator('.standalone-note, .control-rail')).toHaveCount(0);
  expect(await page.locator('.local-indicator > span').evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s');
  await expect(page.locator('.earned-value')).toHaveText('20,000 coins');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openPreview(page, { capture: 0 });
  expect(await page.locator('.local-indicator > span').evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s');
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
});

for (const concept of concepts) test(`${concept}: 320 CSS px with 200% text preserves access`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 802 });
  await page.goto(previewQuery({ concept, textScale: true, scenario: 'S3' }));
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe('32px');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await expect(page.locator('.earned-value')).toContainText('250,000');
  await page.getByRole('button', { name: 'All rewards' }).scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'All rewards' }).click();
  await expect(page.getByRole('heading', { name: 'All rewards', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'View eligible games' }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'View eligible games' })).toBeInViewport();
  await testInfo.attach(`${concept}-320-text200`, { body: await page.screenshot(), contentType: 'image/png' });
  await page.getByRole('button', { name: 'Close daily rewards' }).click();
  await expect(dialog).toHaveCount(0);
});
