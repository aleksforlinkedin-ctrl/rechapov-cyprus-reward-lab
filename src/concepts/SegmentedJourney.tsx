import { DayFooter, EarnedSummary, MilestoneTrack, NextReward, milestoneCount } from '../components/RewardsParts';
import type { ConceptProps } from '../components/RewardsParts';
import { formatMoney } from '../domain';

export function SegmentedJourney(props: ConceptProps) {
  return <div className="concept concept-a">
    <div className="journey-summary"><EarnedSummary {...props} /><div className="journey-desktop-next"><NextReward model={props.model} variant="inline" /></div></div>
    <div className="journey-overview"><MilestoneTrack model={props.model} /><div className="journey-overview__labels"><span>{milestoneCount(props.model)}</span><span>{formatMoney(props.snapshot.qualifyingWagerMinor)} qualifying bets</span></div></div>
    <div className="journey-mobile-next"><NextReward model={props.model} variant="inline" /></div>
    <DayFooter {...props} variant="A" />
  </div>;
}
