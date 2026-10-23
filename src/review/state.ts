import { deriveRewards, parseMoneyMinor, recordDaySettlement, confirmDayCredit, getPreviousDayCreditStatus } from '../domain';
import type { PreviousDayCreditStatus } from '../domain';
import { configs, makeSnapshot, makeSyntheticConfig } from '../fixtures';

export type Concept = 'A' | 'B' | 'C';
export type Platform = 'mobile' | 'desktop';
export type Scenario = 'S1' | 'S2' | 'S3' | 'complete' | 'reset' | 'credited' | 'custom';
export interface ReviewState {
  concept: Concept; platform: Platform; scenario: Scenario; n: number;
  rules: 'demo' | 'open'; wager: string; network: 'ready' | 'loading' | 'error';
  textScale: boolean; previousCoins: number | null;
}
export const defaultState: ReviewState = { concept: 'B', platform: 'desktop', scenario: 'S2', n: 12, rules: 'demo', wager: '850', network: 'ready', textScale: false, previousCoins: null };
export const conceptInfo = {
  A: { name: 'Segmented Journey', tag: 'The full picture', description: 'The whole journey stays in view. A familiar sequence makes each completed milestone easy to locate.', focus: 'Journey first', question: 'Can you distinguish stages from amounts?' },
  B: { name: 'Next Reward Focus', tag: 'Recommended direction', description: 'Today’s earnings and the next reward take the lead. The complete journey is one deliberate tap away.', focus: 'Next step first', question: 'Is the next reward clear at a glance?' },
  C: { name: 'Reward Medallion', tag: 'Exploratory direction', description: 'A compact medallion carries the milestone overview. Precise amounts stay outside the ring, in plain text.', focus: 'Status first', question: 'Does the ring read as milestones?' },
};
export const scenarios: { id: Scenario; title: string; amount: string; description: string }[] = [
  { id: 'S1', title: 'A fresh start', amount: '€0', description: 'No qualifying bets yet' },
  { id: 'S2', title: 'On the journey', amount: '€850', description: 'Between two milestones' },
  { id: 'S3', title: 'The final milestone', amount: '€4,500', description: 'Eleven milestones reached' },
];
export function readState(search = window.location.search): ReviewState {
  const p = new URLSearchParams(search);
  const concept = p.get('concept'); const platform = p.get('platform'); const n = Number(p.get('n') || 12);
  const scenario = p.get('scenario'); const network = p.get('network');
  return { ...defaultState,
    concept: concept === 'A' || concept === 'C' ? concept : 'B',
    platform: platform === 'mobile' ? 'mobile' : 'desktop',
    n: Number.isInteger(n) && n >= 1 && n <= 12 ? n : 12,
    scenario: ['S1','S2','S3','complete','reset','credited','custom'].includes(scenario || '') ? scenario as Scenario : 'S2',
    rules: p.get('rules') === 'open' ? 'open' : 'demo', wager: parseMoneyMinor(p.get('wager') || '850') !== null ? (p.get('wager') || '850') : '850',
    network: network === 'loading' || network === 'error' ? network : 'ready', textScale: p.get('textScale') === 'true',
    previousCoins: p.has('previousCoins') && Number.isSafeInteger(Number(p.get('previousCoins'))) && Number(p.get('previousCoins')) >= 0 ? Number(p.get('previousCoins')) : null,
  };
}
export function stateSearch(state: ReviewState) {
  const p = new URLSearchParams();
  Object.entries(state).forEach(([key,value]) => { if (value !== null) p.set(key,String(value)); });
  return p.toString();
}
export function getFixture(state: ReviewState) {
  const config = state.n === 12 ? (state.rules === 'open' ? configs.openFinal : configs.demoFinal5000) : state.n === 1 ? configs.layoutN1 : state.n === 6 ? configs.layoutN6 : makeSyntheticConfig(state.n);
  let wager = state.scenario === 'S1' || state.scenario === 'reset' || state.scenario === 'credited' ? 0 : state.scenario === 'S2' ? 85000 : state.scenario === 'S3' ? 450000 : parseMoneyMinor(state.wager)!;
  if (state.scenario === 'complete') {
    const final = config.milestones.at(-1)!;
    wager = final.threshold.kind === 'exact' ? final.threshold.minor : 500000;
  }
  const newDay = state.scenario === 'reset' || state.scenario === 'credited';
  const snapshot = makeSnapshot(config, wager, { dayId: newDay ? 'review-next-day' : 'review-day', asOf: newDay ? '2026-10-24T10:00:00Z' : '2026-10-23T10:00:00Z' });
  const model = deriveRewards(config, snapshot, { mode: 'review', activeDayId: snapshot.dayId });
  const prior = deriveRewards(config, makeSnapshot(config, 450000), { mode: 'review', activeDayId: makeSnapshot(config, 450000).dayId });
  const previousIdentity = { promotionId: config.promotionId, configVersion: config.configVersion, dayId: 'review-day' };
  let ledger = newDay ? recordDaySettlement([], {
    ...previousIdentity, earnedCoins: state.previousCoins ?? prior.earnedCoins ?? 0,
    creditStatus: 'pending', settlementReference: 'review-explicit-settlement',
  }) : [];
  if (state.scenario === 'credited') ledger = confirmDayCredit(ledger, {
    ...previousIdentity, settlementReference: 'review-explicit-settlement', creditedAt: '2026-10-24T10:00:00Z',
  });
  const previous: PreviousDayCreditStatus = getPreviousDayCreditStatus(ledger, previousIdentity);
  return { config, snapshot, model, previous };
}
