import type { DaySnapshot, DeriveOptions, ExactMilestone, RewardConfig, RewardViewModel } from './types';
import { validateConfig, validateSnapshot } from './validation';

/** Pure projection: this function never settles, credits, or mutates a ledger. */
export function deriveRewards(config: RewardConfig, snapshot: DaySnapshot, options: DeriveOptions): RewardViewModel {
  const milestones = config.status === 'draft' ? [] : config.milestones;
  const blocked = (reason: string): RewardViewModel => ({
    status: 'blocked', reason, totalCount: milestones.length, milestones,
    completedCount: null, earnedCoins: null, nextTotalCoins: null, incrementalCoins: null,
    remainingMinor: null, localFraction: null, isComplete: null,
    lastReachedMilestone: null, nextMilestone: null, qualifyingWagerMinor: null,
  });
  const configErrors = validateConfig(config);
  if (configErrors.length || config.status === 'draft') return blocked(configErrors.join(' '));
  const snapshotErrors = validateSnapshot(config, snapshot, options);
  if (snapshotErrors.length) return blocked(snapshotErrors.join(' '));
  const wager = snapshot.qualifyingWagerMinor;
  const openFinal = milestones.find((milestone) => milestone.threshold.kind === 'unresolved');
  if (openFinal?.threshold.kind === 'unresolved' && wager > openFinal.threshold.greaterThanMinor) {
    return blocked('The unresolved final rule could change the earned result above €4,900. Confirm the final threshold before reviewing this amount.');
  }
  const reached = milestones.filter((milestone): milestone is ExactMilestone => milestone.threshold.kind === 'exact' && milestone.threshold.minor <= wager);
  const completedCount = reached.length;
  const lastReachedMilestone = reached.at(-1) ?? null;
  const earnedCoins = lastReachedMilestone?.cumulativeCoins ?? 0;
  const nextMilestone = milestones[completedCount] ?? null;
  const common = { reason: null, totalCount: milestones.length, milestones, completedCount, lastReachedMilestone, earnedCoins, nextMilestone, qualifyingWagerMinor: wager };
  if (!nextMilestone) return {
    ...common, status: 'ready', isComplete: true, nextTotalCoins: null,
    incrementalCoins: null, remainingMinor: null, localFraction: null,
  };
  const nextTotalCoins = nextMilestone.cumulativeCoins;
  const incrementalCoins = nextTotalCoins - earnedCoins;
  if (nextMilestone.threshold.kind === 'unresolved') return {
    ...common, status: 'partial', isComplete: false, nextTotalCoins, incrementalCoins,
    remainingMinor: null, localFraction: null,
  };
  const previousThreshold = lastReachedMilestone?.threshold.minor ?? 0;
  const denominator = nextMilestone.threshold.minor - previousThreshold;
  const remainingMinor = nextMilestone.threshold.minor - wager;
  const localFraction = Math.max(0, Math.min(1, (wager - previousThreshold) / denominator));
  if (denominator <= 0 || remainingMinor <= 0 || localFraction < 0 || localFraction >= 1) return blocked('Invalid interval arithmetic.');
  return { ...common, status: 'ready', isComplete: false, nextTotalCoins, incrementalCoins, remainingMinor, localFraction };
}
