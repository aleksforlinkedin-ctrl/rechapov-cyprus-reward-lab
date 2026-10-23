import { DayFooter, EarnedSummary, NextReward } from '../components/RewardsParts';
import type { ConceptProps } from '../components/RewardsParts';
import type { RewardViewModel } from '../domain';

function arcPath(start: number, end: number, radius = 49) {
  const point = (degrees: number) => [56 + radius * Math.cos(degrees * Math.PI / 180), 56 + radius * Math.sin(degrees * Math.PI / 180)];
  const a = point(start), b = point(end);
  return `M ${a[0]} ${a[1]} A ${radius} ${radius} 0 ${end - start > 180 ? 1 : 0} 1 ${b[0]} ${b[1]}`;
}

function Medallion({ model }: { model: RewardViewModel }) {
  const n = model.totalCount;
  const activeIndex = model.completedCount ?? 0;
  return <div className="reward-medallion" aria-hidden="true">
    <svg viewBox="0 0 112 112" width="112" height="112" focusable="false">
      <circle className="medallion-face" cx="56" cy="56" r="41" />
      {model.milestones.map((milestone, index) => {
        const reached = index < activeIndex;
        const active = index === activeIndex && !model.isComplete;
        const cls = `medallion-sector ${reached ? 'is-reached' : active ? 'is-active' : 'is-locked'}`;
        if (n === 1) return <g key={milestone.id}><circle className={cls} cx="56" cy="56" r="49" />{active && <circle className="medallion-sector-inner" cx="56" cy="56" r="49" />}</g>;
        const gap = n === 12 ? 8 : 7;
        const start = -90 + index * 360 / n + gap / 2;
        const end = -90 + (index + 1) * 360 / n - gap / 2;
        return <g key={milestone.id}><path className={cls} d={arcPath(start, end)} />{active && <path className="medallion-sector-inner" d={arcPath(start, end)} />}</g>;
      })}
    </svg>
    <div className="medallion-label"><strong>{model.completedCount ?? '—'}<span>/{n}</span></strong><span>{n === 1 ? 'milestone' : 'milestones'}</span></div>
  </div>;
}

export function RewardMedallion(props: ConceptProps) {
  return <div className="concept concept-c"><Medallion model={props.model} /><EarnedSummary {...props} variant="medallion" /><NextReward model={props.model} variant="compact" /><DayFooter {...props} variant="C" /></div>;
}
