import type { Assumed, DaySnapshot, Draft, ExactMilestone, ExecutableConfig, Milestone, RawRow } from '../domain';

export const RAW_ROWS: readonly RawRow[] = Object.freeze([
  { wageringText: '€1–9', coins: 100 },
  { wageringText: '€10–99', coins: 1000 },
  { wageringText: '€100–199', coins: 2000 },
  { wageringText: '€200–399', coins: 5000 },
  { wageringText: '€400–799', coins: 10000 },
  { wageringText: '€800–999', coins: 20000 },
  { wageringText: '€1,000–1,490', coins: 50000 },
  { wageringText: '€1,500–1,999', coins: 100000 },
  { wageringText: '€2,000–2,490', coins: 140000 },
  { wageringText: '€2,500–3,990', coins: 200000 },
  { wageringText: '€4,000–4,900', coins: 250000 },
  { wageringText: 'Above €4,900', coins: 300000 },
].map((row) => Object.freeze(row)));

export const UNRESOLVED_QUESTIONS = Object.freeze([
  'S2 says €1,500 more; the next table threshold is €1,000, implying €150 more from €850.',
  'S3 says €5,000 more; the table says Above €4,900. The exact final threshold is unconfirmed.',
  'The table does not say whether rewards are cumulative totals or separate payouts.',
  'Raw ranges leave euro and cent gaps; continuous lower-threshold intervals are an assumption.',
  'The result below €1 is unspecified.',
  'Promotion time zone, exact credit time, eligibility, cancellations, and refunds are unspecified.',
]);

export const rawDraft: Draft = Object.freeze({ status: 'draft', rawRows: RAW_ROWS, unresolvedQuestions: UNRESOLVED_QUESTIONS });
export const DEMO_ASSUMPTION_LABEL = 'Demo assumption: cumulative rewards, normalized lower thresholds, final threshold €5,000; subject to confirmation.';
export const OPEN_FINAL_ASSUMPTION_LABEL = 'Research assumptions: cumulative rewards, table priority for S2, zero below €1, continuous lower-threshold intervals; final threshold unresolved.';
export const SYNTHETIC_ASSUMPTION_LABEL = 'Synthetic layout configuration for reviewing 1–12 milestones; these are not promotion terms.';

const baseAssumptions = Object.freeze([
  'Rows represent cumulative coin totals, not separate payouts.',
  'Table thresholds take priority over the contradictory S2 remaining amount.',
  'Earned coins are zero below the first threshold.',
  'Lower thresholds define continuous intervals, including the raw gaps and cents.',
]);
const thresholds = [100, 1000, 10000, 20000, 40000, 80000, 100000, 150000, 200000, 250000, 400000];
const rewards = [100, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 140000, 200000, 250000, 300000];

function freezeConfig(config: Assumed): Assumed {
  return Object.freeze({ ...config, assumptions: Object.freeze([...config.assumptions]), milestones: Object.freeze(config.milestones.map((milestone) => {
    Object.freeze(milestone.threshold);
    return Object.freeze({ ...milestone });
  })) });
}
const exact = (id: string, minor: number, cumulativeCoins: number): ExactMilestone => ({ id, threshold: { kind: 'exact', minor }, cumulativeCoins });
function sourceMilestones(prefix: string, final: 'open' | '5000'): Milestone[] {
  const milestones: Milestone[] = thresholds.map((minor, index) => exact(`${prefix}-${index + 1}`, minor, rewards[index]));
  milestones.push(final === 'open'
    ? { id: `${prefix}-12`, threshold: { kind: 'unresolved', minor: null, greaterThanMinor: 490000 }, cumulativeCoins: 300000 }
    : exact(`${prefix}-12`, 500000, 300000));
  return milestones;
}

export const research_table_open_final = freezeConfig({
  status: 'assumed', promotionId: 'cyprus-daily-rewards-review', configVersion: 'research-table-open-final-v1',
  assumptionSetId: 'research_table_open_final', assumptions: [...baseAssumptions, 'The final threshold is unresolved; Above €4,900 is retained only as an exclusive lower bound.'],
  milestones: sourceMilestones('research', 'open'),
});
export const demo_assumption_final_5000 = freezeConfig({
  status: 'assumed', promotionId: 'cyprus-daily-rewards-review', configVersion: 'demo-final-5000-v1',
  assumptionSetId: 'demo_assumption_final_5000', assumptions: [...baseAssumptions, 'Demo only: final threshold is €5,000. External confirmation is still required.'],
  milestones: sourceMilestones('demo', '5000'),
});
export const layout_n1 = freezeConfig({
  status: 'assumed', promotionId: 'cyprus-layout-review', configVersion: 'synthetic-layout-n1-v1',
  assumptionSetId: 'layout_n1', assumptions: [SYNTHETIC_ASSUMPTION_LABEL, 'One independent milestone: €100 yields a cumulative 500 coins. Zero earned below the threshold.'],
  milestones: [exact('layout-n1-1', 10000, 500)],
});
export const layout_n6 = freezeConfig({
  status: 'assumed', promotionId: 'cyprus-layout-review', configVersion: 'synthetic-layout-n6-v1',
  assumptionSetId: 'layout_n6', assumptions: [SYNTHETIC_ASSUMPTION_LABEL, 'Six independent continuous cumulative milestones; final threshold €5,000.'],
  milestones: [[100, 100], [5000, 1000], [20000, 5000], [80000, 20000], [200000, 100000], [500000, 300000]].map(([minor, coins], index) => exact(`layout-n6-${index + 1}`, minor, coins)),
});
export const layout_n12 = freezeConfig({
  status: 'assumed', promotionId: 'cyprus-layout-review', configVersion: 'synthetic-layout-n12-v1',
  assumptionSetId: 'layout_n12', assumptions: [...baseAssumptions, SYNTHETIC_ASSUMPTION_LABEL, 'Demo only: final threshold €5,000.'],
  milestones: sourceMilestones('layout-n12', '5000'),
});

export const configs = Object.freeze({ openFinal: research_table_open_final, demoFinal5000: demo_assumption_final_5000, layoutN1: layout_n1, layoutN6: layout_n6, layoutN12: layout_n12 });

/** Extra N values are independent generated layout datasets, never slices of the source. */
export function makeSyntheticConfig(count: number): Assumed {
  if (!Number.isInteger(count) || count < 1 || count > 12) throw new RangeError('Choose 1–12 synthetic milestones.');
  if (count === 1) return layout_n1;
  if (count === 6) return layout_n6;
  if (count === 12) return layout_n12;
  return freezeConfig({
    status: 'assumed', promotionId: 'cyprus-layout-review', configVersion: `synthetic-layout-n${count}-v1`,
    assumptionSetId: `layout_n${count}`, assumptions: [SYNTHETIC_ASSUMPTION_LABEL, `${count} independent cumulative milestones: each €100 step adds 500 coins; maximum ${count * 500} coins.`],
    milestones: Array.from({ length: count }, (_, index) => exact(`layout-n${count}-${index + 1}`, (index + 1) * 10000, (index + 1) * 500)),
  });
}

export const REVIEW_DAY_ID = 'review-period-2026-10-23';
export const PREVIOUS_REVIEW_DAY_ID = 'review-period-2026-10-22';
export const NEXT_REVIEW_DAY_ID = 'review-period-2026-10-24';
export const REVIEW_AS_OF = '2026-10-23T12:00:00+03:00';

export function makeSnapshot(config: ExecutableConfig, qualifyingWagerMinor: number, overrides: Partial<DaySnapshot> = {}): DaySnapshot {
  return Object.freeze({ promotionId: config.promotionId, configVersion: config.configVersion, dayId: REVIEW_DAY_ID, qualifyingWagerMinor, version: 1, asOf: REVIEW_AS_OF, timing: { kind: 'unknown' as const }, ...overrides });
}
export const scenarioFixtures = Object.freeze({
  S1: Object.freeze({ id: 'S1', label: 'No bets yet', description: 'First milestone starts at €1.', wagerMinor: 0 }),
  S2: Object.freeze({ id: 'S2', label: 'Mid journey', description: '€850 in qualifying bets; 20,000 coins earned in the source configuration.', wagerMinor: 85000 }),
  S3: Object.freeze({ id: 'S3', label: 'Almost there', description: '€4,500 in qualifying bets; 250,000 coins earned in the source configuration.', wagerMinor: 450000 }),
});
export type ScenarioId = keyof typeof scenarioFixtures;
