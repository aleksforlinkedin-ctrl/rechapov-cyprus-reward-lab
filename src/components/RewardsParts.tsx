import type { RefObject } from 'react';
import { ArrowUpRight, Check, ChevronRight } from 'lucide-react';
import { formatCoins, formatMoney } from '../domain';
import type { DaySnapshot, PreviousDayCreditStatus, RewardViewModel } from '../domain';

export type Concept = 'A' | 'B' | 'C';
export type Platform = 'mobile' | 'desktop';

export interface ConceptProps {
  model: RewardViewModel;
  snapshot: DaySnapshot;
  previous: PreviousDayCreditStatus;
  platform: Platform;
  onShowRewards: () => void;
  openerRef: RefObject<HTMLButtonElement | null>;
}

export function milestoneCount(model: RewardViewModel) {
  return `${model.completedCount ?? '—'} of ${model.totalCount} ${model.totalCount === 1 ? 'milestone' : 'milestones'}`;
}

export function progressDescription(model: RewardViewModel) {
  if (model.status === 'blocked' || model.earnedCoins === null) return 'Reward progress is unavailable until the final milestone is confirmed.';
  const next = model.isComplete
    ? ' All milestones completed. Coins earned today are added tomorrow.'
    : model.remainingMinor === null
      ? ' The next milestone threshold is awaiting confirmation.'
      : ` ${formatMoney(model.remainingMinor)} in qualifying bets to the ${model.completedCount === 0 ? 'first' : 'next'} milestone. ${formatCoins(model.incrementalCoins ?? 0)} additional coins; ${formatCoins(model.nextTotalCoins ?? 0)} coins total.`;
  return `${milestoneCount(model)} reached. ${formatCoins(model.earnedCoins)} coins earned today.${next}`;
}

export function MilestoneTrack({ model, compact = false }: { model: RewardViewModel; compact?: boolean }) {
  return <div className={`milestone-track${compact ? ' milestone-track--mini' : ''}`} aria-hidden="true">
    {model.milestones.map((milestone, index) => {
      const reached = index < (model.completedCount ?? 0);
      const active = index === model.completedCount && !model.isComplete;
      return <span key={milestone.id} className={`milestone-segment ${reached ? 'is-reached' : active ? 'is-active' : 'is-locked'}`}>
        {active && model.localFraction !== null && <i style={{ width: `${model.localFraction * 100}%` }} />}
      </span>;
    })}
  </div>;
}

export function EarnedSummary({ model, snapshot, previous, variant = 'standard' }: Pick<ConceptProps, 'model' | 'snapshot' | 'previous'> & { variant?: 'standard' | 'medallion' }) {
  const pending = previous.kind !== 'none';
  return <div className={`earned-summary earned-summary--${variant}`}>
    <div className="earned-summary__main">
      <div className="reward-label" aria-label={pending ? `Earned today. ${milestoneCount(model)} reached` : undefined}>
        {variant === 'medallion' ? 'Coins earned today' : 'Earned today'}
        {pending && variant === 'standard' && <span className="earned-summary__count" aria-hidden="true"> · {model.completedCount}/{model.totalCount}</span>}
      </div>
      <div className="earned-value">{model.earnedCoins === null ? '—' : formatCoins(model.earnedCoins)}{variant !== 'medallion' && <span> coins</span>}</div>
    </div>
    {variant === 'standard' ? <div className="earned-summary__aside">
      <span className="wager-value">{formatMoney(snapshot.qualifyingWagerMinor)}</span>
      <span className="reward-label">qualifying bets</span>
      <span className="reward-timing">Added tomorrow</span>
    </div> : <div className="earned-summary__aside">
      <span className="reward-timing">Added tomorrow</span>
      <span className="reward-reset">Resets daily</span>
    </div>}
  </div>;
}

export function NextReward({ model, variant = 'card' }: { model: RewardViewModel; variant?: 'card' | 'inline' | 'compact' }) {
  if (model.isComplete) return <div className={`next-reward next-reward--${variant} next-reward--complete`}>
    <span className="completion-icon" aria-hidden="true"><Check size={18} strokeWidth={2.3} /></span>
    <div><strong>All milestones completed</strong><span className="reward-secondary">Added tomorrow</span></div>
  </div>;
  return <div className={`next-reward next-reward--${variant}${model.completedCount === 0 ? ' next-reward--first' : ''}`}>
    <div className="next-reward__amount">
      <span className="next-reward__eyebrow">{model.completedCount === 0 ? 'First milestone' : 'Next milestone'}<ArrowUpRight aria-hidden="true" size={12} /></span>
      <strong className="next-reward__increment">+{model.incrementalCoins === null ? '—' : formatCoins(model.incrementalCoins)}<span> coins</span></strong>
      <span className="next-reward__total">{model.nextTotalCoins === null ? '—' : formatCoins(model.nextTotalCoins)} coins total</span>
    </div>
    <div className="next-reward__goal">
      <span className={`next-reward__remaining${model.completedCount === 0 ? ' is-first' : ''}`}>{model.remainingMinor === null ? <><span aria-hidden="true">— to go</span><span className="sr-only">Remaining qualifying bets are unknown.</span></> : <><strong>{formatMoney(model.remainingMinor)}</strong>{model.completedCount === 0 ? ' to the first milestone' : ' to go'}</>}</span>
      {model.completedCount === 0 && <span className="sr-only">to the first milestone. Coins earned today are added tomorrow.</span>}
      <div className={`local-indicator${model.localFraction === null ? ' is-unknown' : ''}`} aria-hidden="true"><span style={{ width: `${(model.localFraction ?? 0) * 100}%` }} /></div>
    </div>
  </div>;
}

export function PreviousCredit({ previous }: { previous: PreviousDayCreditStatus }) {
  if (previous.kind === 'none') return null;
  return <div className="previous-credit">
    {previous.kind === 'pending' ? <><span>Yesterday: {formatCoins(previous.earnedCoins)}</span><span>coins · Pending credit</span></> : <><span>Yesterday’s {formatCoins(previous.earnedCoins)}</span><span>coins were added</span></>}
  </div>;
}

export function AllRewardsButton({ onClick, openerRef }: { onClick: () => void; openerRef: RefObject<HTMLButtonElement | null> }) {
  return <button ref={openerRef} type="button" className="all-rewards-button" onClick={onClick}>All rewards <ChevronRight size={14} aria-hidden="true" /></button>;
}

export function DayFooter({ model, snapshot, previous, onShowRewards, openerRef, variant }: ConceptProps & { variant: Concept }) {
  const hasPrevious = previous.kind !== 'none';
  return <div className={`reward-footer reward-footer--${variant.toLowerCase()}`}>
    <div className="reward-footer__info">
      {hasPrevious ? <PreviousCredit previous={previous} /> : variant === 'B' ? <>
        <MilestoneTrack model={model} compact />
        <span className="mini-count">{milestoneCount(model)}</span>
        <span className="reward-reset">Resets daily</span>
      </> : variant === 'C' ? <><span className="footer-wager">{formatMoney(snapshot.qualifyingWagerMinor)}</span><span className="reward-secondary">qualifying bets</span></> : <><span className="reward-reset">Resets daily</span><span className="footer-credit-timing">Added tomorrow</span></>}
    </div>
    <AllRewardsButton onClick={onShowRewards} openerRef={openerRef} />
  </div>;
}
