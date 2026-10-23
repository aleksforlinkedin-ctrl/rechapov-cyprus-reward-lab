import type { DaySnapshot, DeriveOptions, ExecutableConfig, RewardConfig } from './types';

export const isNonnegativeInteger = (value: number): boolean => Number.isSafeInteger(value) && value >= 0;
export const isNonempty = (value: string | undefined): boolean => typeof value === 'string' && value.trim().length > 0;
export const isTimestamp = (value: string): boolean => typeof value === 'string' && /T.+(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
export function isTimeZone(value: string): boolean {
  try { new Intl.DateTimeFormat('en-IE', { timeZone: value }); return isNonempty(value); } catch { return false; }
}

/** Validation returns all actionable problems, rather than silently repairing source data. */
export function validateConfig(config: RewardConfig): readonly string[] {
  if (config.status === 'draft') return ['Draft source data cannot be used to calculate rewards.'];
  const errors: string[] = [];
  if (config.status !== 'assumed' && config.status !== 'approved') return ['Unknown configuration status.'];
  if (!isNonempty(config.promotionId) || !isNonempty(config.configVersion)) errors.push('Promotion and config version must be nonempty.');
  if (config.status === 'assumed' && (!isNonempty(config.assumptionSetId) || config.assumptions.length === 0)) errors.push('An assumed config needs its named assumptions.');
  if (config.status === 'approved' && !isNonempty(config.approvalReference)) errors.push('An approved config needs an external approval reference.');
  if (config.milestones.length < 1 || config.milestones.length > 12) errors.push('Milestone count must be between 1 and 12.');
  const ids = new Set<string>();
  let previousThreshold = 0;
  let previousCoins = 0;
  let openCount = 0;
  config.milestones.forEach((milestone, index) => {
    if (!isNonempty(milestone.id) || ids.has(milestone.id)) errors.push(`Milestone ${index + 1} has an empty or duplicated ID.`);
    ids.add(milestone.id);
    if (!isNonnegativeInteger(milestone.cumulativeCoins) || milestone.cumulativeCoins < previousCoins) errors.push(`Milestone ${index + 1} has invalid cumulative coins.`);
    previousCoins = milestone.cumulativeCoins;
    if (milestone.threshold.kind === 'exact') {
      const value = milestone.threshold.minor;
      if (!Number.isSafeInteger(value) || value <= previousThreshold) errors.push(`Milestone ${index + 1} must have a positive, strictly increasing exact threshold.`);
      previousThreshold = value;
    } else if (milestone.threshold.kind === 'unresolved') {
      openCount += 1;
      if (config.status === 'approved') errors.push('Approved rules cannot contain an unresolved threshold.');
      if (index !== config.milestones.length - 1) errors.push('An unresolved threshold is allowed only at the end.');
      if (milestone.threshold.minor !== null || milestone.threshold.greaterThanMinor !== 490000 || milestone.cumulativeCoins !== 300000 || milestone.threshold.greaterThanMinor < previousThreshold) errors.push('The unresolved final must preserve its raw exclusive bound and cumulative reward.');
    } else errors.push(`Milestone ${index + 1} has an unknown threshold kind.`);
  });
  if (openCount > 1) errors.push('Only one unresolved final threshold is allowed.');
  return errors;
}

export function validateSnapshot(config: ExecutableConfig, snapshot: DaySnapshot, options: DeriveOptions): readonly string[] {
  const errors: string[] = [];
  if (!isNonnegativeInteger(snapshot.qualifyingWagerMinor)) errors.push('Qualifying wagers must be nonnegative safe integer minor units.');
  if (!isNonnegativeInteger(snapshot.version)) errors.push('Snapshot version must be a nonnegative safe integer.');
  if (!isTimestamp(snapshot.asOf)) errors.push('Snapshot asOf must be a timestamp with an explicit offset.');
  if (snapshot.promotionId !== config.promotionId) errors.push('Snapshot promotion does not match the active promotion.');
  if (snapshot.configVersion !== config.configVersion) errors.push('Snapshot config version does not match the active configuration.');
  if (!isNonempty(options.activeDayId) || snapshot.dayId !== options.activeDayId) errors.push('Snapshot day does not match the server/review active day.');
  if (snapshot.timing.kind === 'known') {
    const timing = snapshot.timing;
    const start = Date.parse(timing.startAt);
    const end = Date.parse(timing.endAt);
    if (!isTimestamp(timing.startAt) || !isTimestamp(timing.endAt) || start >= end || !isTimeZone(timing.timeZone)) errors.push('Known timing must specify a valid increasing period and time zone.');
    const period = options.activePeriod;
    if (!period || period.dayId !== snapshot.dayId || period.startAt !== timing.startAt || period.endAt !== timing.endAt || period.timeZone !== timing.timeZone) errors.push('Known timing must match the explicitly supplied active period.');
    if (Date.parse(snapshot.asOf) < start || Date.parse(snapshot.asOf) >= end) errors.push('Snapshot asOf lies outside its active period.');
  } else if (snapshot.timing.kind !== 'unknown') errors.push('Unknown timing kind.');
  if (options.mode === 'production') {
    if (config.status !== 'approved') errors.push('Production accepts only externally approved configurations.');
    if (!isNonempty(options.confirmedRules?.eligibilityReference) || !isNonempty(options.confirmedRules?.dayRuleReference)) errors.push('Production requires confirmed eligibility and day rules.');
    if (snapshot.timing.kind !== 'known') errors.push('Production requires an explicit current period.');
  }
  return errors;
}
