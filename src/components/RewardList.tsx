import { useLayoutEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, Check, LockKeyhole } from 'lucide-react';
import { formatCoins, formatMoney } from '../domain';
import type { Assumed, Approved, DaySnapshot, RewardViewModel } from '../domain';

export function RewardList({ model, config, snapshot, onBack }: { model: RewardViewModel; config: Assumed | Approved; snapshot: DaySnapshot; onBack: () => void }) {
  const backRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLTableRowElement>(null);

  useLayoutEffect(() => {
    backRef.current?.focus({ preventScroll: true });
    const scroll = scrollRef.current, current = currentRef.current;
    if (scroll && current) {
      scroll.scrollTop = Math.max(0, scroll.scrollTop + current.getBoundingClientRect().top - scroll.getBoundingClientRect().top - 27);
    }
  }, []);

  return <div className="reward-list-view">
    <div className="reward-list-header">
      <button ref={backRef} type="button" onClick={onBack} className="reward-back"><ArrowLeft size={16} aria-hidden="true" />Back</button>
      <h3>All rewards</h3>
      <span className="reward-list-header__count">{config.milestones.length} {config.milestones.length === 1 ? 'milestone' : 'milestones'}</span>
    </div>
    <div className="reward-list-scroll" ref={scrollRef} tabIndex={0} aria-label="All milestone rewards, scroll to explore">
      <p className="reward-list-context">{formatMoney(snapshot.qualifyingWagerMinor)} qualifying bets today · Added tomorrow</p>
      <table className="rewards-table">
        <caption className="sr-only">All rewards. {formatMoney(snapshot.qualifyingWagerMinor)} in qualifying bets today. Coins earned today are added tomorrow. Resets daily.</caption>
        <thead><tr><th scope="col">Qualifying bets</th><th scope="col">Total coins</th></tr></thead>
        <tbody>{config.milestones.map((milestone, index) => {
          const reached = model.completedCount !== null && index < model.completedCount;
          const next = model.completedCount !== null && index === model.completedCount && !model.isComplete;
          const current = next || (model.isComplete && index === config.milestones.length - 1);
          const status = model.status === 'blocked' ? 'Unconfirmed' : reached ? 'Reached' : next ? 'Next' : 'Locked';
          const Icon = reached ? Check : next ? ArrowRight : LockKeyhole;
          return <tr key={milestone.id} ref={current ? currentRef : undefined} className={next ? 'is-next' : reached ? 'is-reached' : 'is-locked'} aria-current={next ? 'step' : undefined}>
            <td><span className="reward-row-threshold">{milestone.threshold.kind === 'exact' ? formatMoney(milestone.threshold.minor) : <><span aria-hidden="true">—</span><span className="sr-only">Threshold unknown</span></>}</span><span className="reward-row-status"><Icon size={11} aria-hidden="true" />{status}</span></td>
            <td>{formatCoins(milestone.cumulativeCoins)}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  </div>;
}
