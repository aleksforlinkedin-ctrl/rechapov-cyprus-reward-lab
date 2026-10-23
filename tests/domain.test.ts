import { describe, expect, it } from 'vitest';
import {
  acceptSnapshot, confirmDayCredit, deriveRewards, formatCoins, formatMoney,
  getPreviousDayCreditStatus, parseMoneyMinor, recordDaySettlement, validateConfig,
  type Approved, type Assumed, type DayLedgerEntry, type DaySnapshot, type DeriveOptions,
} from '../src/domain';
import {
  configs, makeSnapshot, makeSyntheticConfig, NEXT_REVIEW_DAY_ID, RAW_ROWS,
  rawDraft, REVIEW_DAY_ID, scenarioFixtures,
} from '../src/fixtures';

const review: DeriveOptions = { mode: 'review', activeDayId: REVIEW_DAY_ID };
const project = (wager: number, config = configs.demoFinal5000) => deriveRewards(config, makeSnapshot(config, wager), review);
const mutable = (): Assumed => JSON.parse(JSON.stringify(configs.demoFinal5000));

describe('source integrity and production boundary', () => {
  it('preserves raw wording, amounts, and all rows without filling gaps', () => {
    expect(RAW_ROWS).toHaveLength(12);
    expect(RAW_ROWS[6]).toEqual({ wageringText: '€1,000–1,490', coins: 50000 });
    expect(RAW_ROWS[8]).toEqual({ wageringText: '€2,000–2,490', coins: 140000 });
    expect(RAW_ROWS[11]).toEqual({ wageringText: 'Above €4,900', coins: 300000 });
    expect(Object.isFrozen(RAW_ROWS)).toBe(true);
    expect(RAW_ROWS.every(Object.isFrozen)).toBe(true);
    expect(Object.isFrozen(configs.demoFinal5000.milestones[0].threshold)).toBe(true);
  });
  it('rejects Draft and never promotes assumptions by successful calculation', () => {
    expect(deriveRewards(rawDraft, makeSnapshot(configs.demoFinal5000, 85000), review).status).toBe('blocked');
    expect(deriveRewards(configs.demoFinal5000, makeSnapshot(configs.demoFinal5000, 85000), { ...review, mode: 'production' }).status).toBe('blocked');
    expect(project(85000).status).toBe('ready');
    expect(configs.demoFinal5000.status).toBe('assumed');
  });
  it('requires explicit approved config, eligibility, day rules and server period for production', () => {
    const config: Approved = { status: 'approved', promotionId: 'test-only-approved', configVersion: 'v1', approvalReference: 'test-external-reference', milestones: [{ id: 'm1', threshold: { kind: 'exact', minor: 100 }, cumulativeCoins: 100 }] };
    const activePeriod = { dayId: REVIEW_DAY_ID, startAt: '2026-10-23T00:00:00+03:00', endAt: '2026-10-24T00:00:00+03:00', timeZone: 'Europe/Kaliningrad' };
    const snapshot = makeSnapshot(config, 100, { timing: { kind: 'known', startAt: activePeriod.startAt, endAt: activePeriod.endAt, timeZone: activePeriod.timeZone } });
    expect(deriveRewards(config, snapshot, { ...review, mode: 'production', activePeriod }).status).toBe('blocked');
    expect(deriveRewards(config, snapshot, { ...review, mode: 'production', activePeriod, confirmedRules: { eligibilityReference: 'test-eligibility', dayRuleReference: 'test-day-rule' } }).status).toBe('ready');
    expect(deriveRewards({ ...config, approvalReference: '' }, snapshot, { ...review, mode: 'production', activePeriod, confirmedRules: { eligibilityReference: 'test', dayRuleReference: 'test' } }).status).toBe('blocked');
  });
});

describe('single cumulative reward projection', () => {
  it('derives all required scenarios from shared source fixtures', () => {
    expect(project(scenarioFixtures.S1.wagerMinor)).toMatchObject({ status: 'ready', earnedCoins: 0, nextTotalCoins: 100, incrementalCoins: 100, remainingMinor: 100, localFraction: 0, completedCount: 0, totalCount: 12, isComplete: false });
    expect(project(scenarioFixtures.S2.wagerMinor)).toMatchObject({ status: 'ready', earnedCoins: 20000, nextTotalCoins: 50000, incrementalCoins: 30000, remainingMinor: 15000, localFraction: 0.25, completedCount: 6 });
    expect(project(scenarioFixtures.S3.wagerMinor)).toMatchObject({ status: 'ready', earnedCoins: 250000, nextTotalCoins: 300000, incrementalCoins: 50000, remainingMinor: 50000, localFraction: 0.5, completedCount: 11 });
  });
  it.each([[99, 0, 100], [100, 100, 1000], [99999, 20000, 100000], [100000, 50000, 150000]])('handles a cent boundary at %i', (wager, earnedCoins, nextThreshold) => {
    const result = project(wager);
    expect(result.earnedCoins).toBe(earnedCoins);
    expect(result.nextMilestone?.threshold.minor).toBe(nextThreshold);
    expect(result.remainingMinor).toBeGreaterThan(0);
  });
  it.each([[149999, 50000], [249999, 140000], [399999, 200000]])('normalizes raw gaps only in named assumption sets at %i', (wager, earned) => expect(project(wager).earnedCoins).toBe(earned));
  it('crosses several milestones using a single cumulative change', () => {
    const before = project(75000);
    const after = project(160000);
    expect(before.earnedCoins).toBe(10000);
    expect(after.earnedCoins).toBe(100000);
    expect(after.earnedCoins! - before.earnedCoins!).toBe(90000);
  });
  it('keeps open-final S3 partial without an invented €5,000 threshold', () => {
    const result = project(450000, configs.openFinal);
    expect(result).toMatchObject({ status: 'partial', earnedCoins: 250000, nextTotalCoins: 300000, incrementalCoins: 50000, completedCount: 11, remainingMinor: null, localFraction: null, isComplete: false });
    expect(result.nextMilestone?.threshold).toEqual({ kind: 'unresolved', minor: null, greaterThanMinor: 490000 });
    expect(project(490000, configs.openFinal).status).toBe('partial');
  });
  it('blocks all earned/count/complete precision above the unresolved exclusive bound', () => {
    expect(project(490001, configs.openFinal)).toMatchObject({ status: 'blocked', earnedCoins: null, completedCount: null, nextTotalCoins: null, incrementalCoins: null, remainingMinor: null, localFraction: null, isComplete: null, nextMilestone: null, lastReachedMilestone: null });
    expect(project(950000, configs.openFinal).status).toBe('blocked');
  });
  it.each([500000, 500001, 950000])('completes only at or above the exact demo final: %i', (wager) => {
    expect(project(wager)).toMatchObject({ earnedCoins: 300000, completedCount: 12, isComplete: true, nextMilestone: null, nextTotalCoins: null, incrementalCoins: null, remainingMinor: null, localFraction: null });
  });
  it('permits zero-delta cumulative milestones because no prohibition was supplied', () => {
    const config: Assumed = { ...configs.layoutN1, milestones: [{ id: 'first', threshold: { kind: 'exact', minor: 100 }, cumulativeCoins: 500 }, { id: 'second', threshold: { kind: 'exact', minor: 200 }, cumulativeCoins: 500 }] };
    expect(project(100, config)).toMatchObject({ status: 'ready', earnedCoins: 500, incrementalCoins: 0, completedCount: 1, isComplete: false });
  });
});

describe('independent configurations for every stage count', () => {
  it('uses independent N=1/6 maxima and expected source fixtures', () => {
    expect(project(10000, configs.layoutN1)).toMatchObject({ earnedCoins: 500, totalCount: 1, completedCount: 1, isComplete: true });
    expect(project(85000, configs.layoutN6)).toMatchObject({ earnedCoins: 20000, totalCount: 6, completedCount: 4, incrementalCoins: 80000, remainingMinor: 115000 });
  });
  for (let count = 1; count <= 12; count += 1) {
    it(`supports N=${count}: before, first, middle, final and above-final`, () => {
      const config = makeSyntheticConfig(count);
      expect(validateConfig(config)).toEqual([]);
      expect(config.assumptions.some((text) => text.includes('Synthetic'))).toBe(true);
      const milestones = config.milestones;
      const first = milestones[0].threshold.minor!;
      const final = milestones.at(-1)!.threshold.minor!;
      const middleIndex = Math.floor((count - 1) / 2);
      const middle = milestones[middleIndex].threshold.minor!;
      expect(project(first - 1, config)).toMatchObject({ earnedCoins: 0, completedCount: 0, isComplete: false });
      expect(project(first, config)).toMatchObject({ earnedCoins: milestones[0].cumulativeCoins, completedCount: 1 });
      expect(project(middle, config)).toMatchObject({ earnedCoins: milestones[middleIndex].cumulativeCoins, completedCount: middleIndex + 1 });
      expect(project(final, config)).toMatchObject({ earnedCoins: milestones.at(-1)!.cumulativeCoins, completedCount: count, isComplete: true });
      expect(project(final + 1, config)).toMatchObject({ earnedCoins: milestones.at(-1)!.cumulativeCoins, completedCount: count, isComplete: true });
    });
  }
  it('rejects invalid requested sizes', () => {
    for (const value of [0, 13, 1.5, NaN]) expect(() => makeSyntheticConfig(value)).toThrow();
  });
});

describe('validation rejects untrustworthy numbers and context', () => {
  it.each([-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('rejects invalid wager %s', (wager) => expect(project(wager).status).toBe('blocked'));
  it('rejects duplicate/empty IDs, invalid thresholds, coin totals, ordering and stage counts', () => {
    const invalid: Assumed[] = [
      { ...mutable(), milestones: [] },
      { ...mutable(), milestones: [...mutable().milestones, mutable().milestones[0]] },
      { ...mutable(), milestones: [{ ...mutable().milestones[0], id: '' }] },
      { ...mutable(), milestones: [mutable().milestones[0], mutable().milestones[0]] },
      { ...mutable(), milestones: [{ id: 'x', threshold: { kind: 'exact', minor: 0 }, cumulativeCoins: 100 }] },
      { ...mutable(), milestones: [{ id: 'x', threshold: { kind: 'exact', minor: 0.5 }, cumulativeCoins: 100 }] },
      { ...mutable(), milestones: [{ id: 'x', threshold: { kind: 'exact', minor: Number.MAX_SAFE_INTEGER + 1 }, cumulativeCoins: 100 }] },
      { ...mutable(), milestones: [{ id: 'x', threshold: { kind: 'exact', minor: 100 }, cumulativeCoins: -1 }] },
      { ...mutable(), milestones: [{ id: 'x', threshold: { kind: 'exact', minor: 100 }, cumulativeCoins: 1.5 }] },
      { ...mutable(), milestones: [{ id: 'x', threshold: { kind: 'exact', minor: 100 }, cumulativeCoins: Number.MAX_SAFE_INTEGER + 1 }] },
      { ...mutable(), milestones: [{ id: 'x', threshold: { kind: 'exact', minor: 100 }, cumulativeCoins: 500 }, { id: 'y', threshold: { kind: 'exact', minor: 200 }, cumulativeCoins: 499 }] },
      { ...mutable(), milestones: [mutable().milestones[1], mutable().milestones[0]] },
      { ...configs.openFinal, milestones: [configs.openFinal.milestones.at(-1)!, configs.openFinal.milestones[0]] },
    ];
    for (const config of invalid) expect(project(85000, config).status).toBe('blocked');
  });
  it.each([{ promotionId: 'wrong' }, { configVersion: 'wrong' }, { dayId: 'wrong' }, { version: -1 }, { version: 1.5 }, { asOf: 'not a timestamp' }])('rejects snapshot mismatch %s', (overrides) => {
    expect(deriveRewards(configs.demoFinal5000, makeSnapshot(configs.demoFinal5000, 0, overrides), review).status).toBe('blocked');
  });
  it('requires known timing to match the explicitly named active period', () => {
    const period = { dayId: REVIEW_DAY_ID, startAt: '2026-10-23T00:00:00Z', endAt: '2026-10-24T00:00:00Z', timeZone: 'UTC' };
    const snapshot = makeSnapshot(configs.demoFinal5000, 0, { timing: { kind: 'known', ...period } });
    expect(deriveRewards(configs.demoFinal5000, snapshot, review).status).toBe('blocked');
    expect(deriveRewards(configs.demoFinal5000, snapshot, { ...review, activePeriod: period }).status).toBe('ready');
    expect(deriveRewards(configs.demoFinal5000, snapshot, { ...review, activePeriod: { ...period, dayId: 'other' } }).status).toBe('blocked');
    expect(deriveRewards(configs.demoFinal5000, { ...snapshot, asOf: period.endAt }, { ...review, activePeriod: period }).status).toBe('blocked');
    expect(deriveRewards(configs.demoFinal5000, { ...snapshot, timing: { kind: 'known', ...period, endAt: period.startAt } }, { ...review, activePeriod: period }).status).toBe('blocked');
  });
});

describe('daily reset, idempotent updates, and independent settlement', () => {
  const config = configs.demoFinal5000;
  const today = makeSnapshot(config, 450000, { version: 100 });
  const context = { promotionId: config.promotionId, configVersion: config.configVersion, activeDayId: REVIEW_DAY_ID };
  const settlement: DayLedgerEntry = { promotionId: config.promotionId, configVersion: config.configVersion, dayId: REVIEW_DAY_ID, earnedCoins: 250000, creditStatus: 'pending', settlementReference: 'test-settlement-1' };
  it('ignores duplicate/stale data without rolling back the confirmed snapshot', () => {
    expect(acceptSnapshot(today, today, context)).toMatchObject({ accepted: false, snapshot: today, reason: 'duplicate' });
    expect(acceptSnapshot(today, makeSnapshot(config, 0, { version: 99 }), context)).toMatchObject({ accepted: false, snapshot: today, reason: 'stale' });
    const corrected = makeSnapshot(config, 400000, { version: 101 });
    expect(acceptSnapshot(today, corrected, context)).toMatchObject({ accepted: true, snapshot: corrected });
  });
  it('accepts version 1 in a new active day and preserves yesterday pending', () => {
    const ledger = recordDaySettlement([], settlement);
    const newDay = makeSnapshot(config, 0, { version: 1, dayId: NEXT_REVIEW_DAY_ID, asOf: '2026-10-24T12:00:00+03:00' });
    const accepted = acceptSnapshot(today, newDay, { ...context, activeDayId: NEXT_REVIEW_DAY_ID });
    expect(accepted.accepted).toBe(true);
    expect(deriveRewards(config, accepted.snapshot!, { ...review, activeDayId: NEXT_REVIEW_DAY_ID }).earnedCoins).toBe(0);
    expect(getPreviousDayCreditStatus(ledger, settlement)).toEqual({ kind: 'pending', dayId: REVIEW_DAY_ID, earnedCoins: 250000 });
    expect(ledger).toHaveLength(1);
  });
  it('credits only a separate confirmed event, idempotently', () => {
    const ledger = recordDaySettlement([], settlement);
    expect(recordDaySettlement(ledger, settlement)).toBe(ledger);
    for (let index = 0; index < 5; index += 1) deriveRewards(config, today, review);
    expect(ledger[0].creditStatus).toBe('pending');
    const event = { ...settlement, creditedAt: '2026-10-24T11:00:00Z' };
    const credited = confirmDayCredit(ledger, event);
    expect(credited[0].creditStatus).toBe('credited');
    expect(getPreviousDayCreditStatus(credited, settlement)).toEqual({ kind: 'credited', dayId: REVIEW_DAY_ID, earnedCoins: 250000, creditedAt: event.creditedAt });
    expect(confirmDayCredit(credited, event)).toBe(credited);
    expect(recordDaySettlement(credited, settlement)).toBe(credited);
    expect(ledger[0].creditStatus).toBe('pending');
  });
  it('does not activate another day or config without context and never sorts day IDs', () => {
    const next = makeSnapshot(config, 0, { dayId: 'a-server-period', version: 1 });
    expect(acceptSnapshot(today, next, context).accepted).toBe(false);
    expect(acceptSnapshot(today, next, { ...context, activeDayId: 'a-server-period' }).accepted).toBe(true);
    const changed: DaySnapshot = { ...today, configVersion: 'v2', version: 101 };
    expect(acceptSnapshot(today, changed, { ...context, configVersion: 'v2' }).accepted).toBe(false);
  });
  it('rejects credit without a settlement and malformed ledger entries', () => {
    expect(() => confirmDayCredit([], { ...settlement, creditedAt: '2026-10-24T11:00:00Z' })).toThrow();
    expect(() => recordDaySettlement([], { ...settlement, earnedCoins: -1 })).toThrow();
    expect(() => recordDaySettlement([], { ...settlement, creditedAt: '2026-10-24T11:00:00Z' })).toThrow();
    expect(() => recordDaySettlement([], { ...settlement, creditStatus: 'credited' })).toThrow();
    expect(() => recordDaySettlement(recordDaySettlement([], settlement), { ...settlement, earnedCoins: 250001 })).toThrow();
  });
});

describe('integer decimal input and consistent formatting', () => {
  it.each([['0', 0], ['0.01', 1], ['0.99', 99], ['1', 100], ['1.2', 120], ['850', 85000], ['4500.00', 450000], ['90071992547409.91', Number.MAX_SAFE_INTEGER]])('parses %s exactly', (input, expected) => expect(parseMoneyMinor(input)).toBe(expected));
  it.each(['-1', '1.234', '1e3', 'Infinity', 'NaN', '', '1,000', '90071992547409.92'])('rejects invalid decimal input %s', (input) => expect(parseMoneyMinor(input)).toBeNull());
  it('formats without affecting calculation values', () => {
    expect(formatMoney(85000)).toBe('€850');
    expect(formatMoney(450000)).toBe('€4,500');
    expect(formatMoney(99999)).toBe('€999.99');
    expect(formatMoney(Number.MAX_SAFE_INTEGER)).toBe('€90,071,992,547,409.91');
    expect(formatCoins(20000)).toBe('20,000');
    expect(formatCoins(250000)).toBe('250,000');
    expect(() => formatMoney(-1)).toThrow();
    expect(() => formatCoins(1.5)).toThrow();
  });
});
