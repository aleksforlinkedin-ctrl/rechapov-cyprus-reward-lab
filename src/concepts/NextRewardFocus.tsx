import { DayFooter, EarnedSummary, NextReward } from '../components/RewardsParts';
import type { ConceptProps } from '../components/RewardsParts';

export function NextRewardFocus(props: ConceptProps) {
  return <div className="concept concept-b"><EarnedSummary {...props} /><NextReward model={props.model} /><DayFooter {...props} variant="B" /></div>;
}
