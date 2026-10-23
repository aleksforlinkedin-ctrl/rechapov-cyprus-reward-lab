export type MoneyMinor = number;
export type Coins = number;

export type ExactMilestone = {
  readonly id: string;
  readonly threshold: { readonly kind: 'exact'; readonly minor: MoneyMinor };
  readonly cumulativeCoins: Coins;
};
export type OpenFinalMilestone = {
  readonly id: string;
  readonly threshold: { readonly kind: 'unresolved'; readonly minor: null; readonly greaterThanMinor: 490000 };
  readonly cumulativeCoins: 300000;
};
export type Milestone = ExactMilestone | OpenFinalMilestone;
export type RawRow = { readonly wageringText: string; readonly coins: Coins };
export type Draft = {
  readonly status: 'draft';
  readonly rawRows: readonly RawRow[];
  readonly unresolvedQuestions: readonly string[];
};
export type Assumed = {
  readonly status: 'assumed';
  readonly promotionId: string;
  readonly configVersion: string;
  readonly assumptionSetId: string;
  readonly assumptions: readonly string[];
  readonly milestones: readonly Milestone[];
};
export type Approved = {
  readonly status: 'approved';
  readonly promotionId: string;
  readonly configVersion: string;
  readonly approvalReference: string;
  readonly milestones: readonly ExactMilestone[];
};
export type RewardConfig = Draft | Assumed | Approved;
export type ExecutableConfig = Assumed | Approved;
export type CurrentPeriodTiming =
  | { readonly kind: 'unknown' }
  | { readonly kind: 'known'; readonly startAt: string; readonly endAt: string; readonly timeZone: string };
export type DaySnapshot = {
  readonly promotionId: string;
  readonly configVersion: string;
  readonly dayId: string;
  readonly qualifyingWagerMinor: MoneyMinor;
  readonly version: number;
  readonly asOf: string;
  readonly timing: CurrentPeriodTiming;
};
export type DayLedgerEntry = {
  readonly promotionId: string;
  readonly configVersion: string;
  readonly dayId: string;
  readonly earnedCoins: Coins;
  readonly creditStatus: 'pending' | 'credited';
  readonly creditedAt?: string;
  readonly settlementReference: string;
};
export type PreviousDayCreditStatus =
  | { readonly kind: 'none' }
  | { readonly kind: 'pending'; readonly dayId: string; readonly earnedCoins: Coins }
  | { readonly kind: 'credited'; readonly dayId: string; readonly earnedCoins: Coins; readonly creditedAt: string };
export type ActivePeriod = {
  readonly dayId: string;
  readonly startAt: string;
  readonly endAt: string;
  readonly timeZone: string;
};
export type DeriveOptions = {
  readonly mode: 'review' | 'production';
  readonly activeDayId: string;
  /** Server/review authority, never inferred from the device's midnight. */
  readonly activePeriod?: ActivePeriod;
  readonly confirmedRules?: {
    readonly eligibilityReference: string;
    readonly dayRuleReference: string;
  };
};
export type RewardViewModel = {
  readonly status: 'ready' | 'partial' | 'blocked';
  readonly reason: string | null;
  readonly totalCount: number;
  readonly completedCount: number | null;
  readonly earnedCoins: Coins | null;
  readonly nextTotalCoins: Coins | null;
  readonly incrementalCoins: Coins | null;
  readonly remainingMinor: MoneyMinor | null;
  readonly localFraction: number | null;
  readonly isComplete: boolean | null;
  readonly lastReachedMilestone: ExactMilestone | null;
  readonly nextMilestone: Milestone | null;
  readonly milestones: readonly Milestone[];
  readonly qualifyingWagerMinor: MoneyMinor | null;
};
