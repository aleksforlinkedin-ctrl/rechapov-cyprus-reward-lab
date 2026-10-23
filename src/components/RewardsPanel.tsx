import { useLayoutEffect, useRef, useState } from 'react';
import * as Progress from '@radix-ui/react-progress';
import { CircleAlert, LoaderCircle, RotateCcw } from 'lucide-react';
import type { Assumed, Approved, DaySnapshot, PreviousDayCreditStatus, RewardViewModel } from '../domain';
import { SegmentedJourney } from '../concepts/SegmentedJourney';
import { NextRewardFocus } from '../concepts/NextRewardFocus';
import { RewardMedallion } from '../concepts/RewardMedallion';
import { AllRewardsButton, progressDescription } from './RewardsParts';
import type { Concept, Platform } from './RewardsParts';
import { RewardList } from './RewardList';
import '../styles/product.css';

export interface RewardsPanelProps {
  concept: Concept;
  platform: Platform;
  model: RewardViewModel;
  config: Assumed | Approved;
  snapshot: DaySnapshot;
  previous: PreviousDayCreditStatus;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  onDetailsChange?: (open: boolean) => void;
  detailsOpen?: boolean;
  onDetailsOpenChange?: (open: boolean) => void;
}

export function RewardsPanel({ concept, platform, model, config, snapshot, previous, loading = false, error = false, onRetry, onDetailsChange, detailsOpen, onDetailsOpenChange }: RewardsPanelProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = detailsOpen ?? internalOpen;
  const openerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(open);
  const setOpen = (next: boolean) => {
    setInternalOpen(next);
    onDetailsOpenChange?.(next);
    onDetailsChange?.(next);
  };

  useLayoutEffect(() => {
    if (wasOpen.current && !open) openerRef.current?.focus({ preventScroll: true });
    wasOpen.current = open;
  }, [open]);

  const description = loading ? 'Updating reward progress. Please wait.' : error ? 'Reward progress could not be updated. Try again.' : progressDescription(model);
  const componentProps = { model, snapshot, previous, platform, onShowRewards: () => setOpen(true), openerRef };

  return <section className="rewards-panel" data-platform={platform} data-concept={concept} data-detail-view={open ? 'all-rewards' : 'summary'} aria-label="Daily rewards progress" aria-busy={loading || undefined}>
    <Progress.Root className="sr-only" value={loading || error ? null : model.completedCount} max={model.totalCount} aria-label="Milestones reached" aria-valuetext={description} getValueLabel={() => description}><Progress.Indicator /></Progress.Root>
    <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{description}</span>
    {loading ? <div className="reward-feedback">
      <LoaderCircle size={24} aria-hidden="true" /><strong>Updating your progress</strong><p>Checking your latest qualifying bets.</p><div className="loading-track" aria-hidden="true" />
    </div> : error ? <div className="reward-feedback">
      <CircleAlert size={24} aria-hidden="true" /><strong>Progress couldn’t be updated</strong><p>Your latest progress is temporarily unavailable. Please try again.</p>{onRetry && <button type="button" className="reward-retry" onClick={onRetry}><RotateCcw size={14} aria-hidden="true" />Try again</button>}
    </div> : open ? <RewardList model={model} config={config} snapshot={snapshot} onBack={() => setOpen(false)} /> : model.status === 'blocked' ? <div className="reward-feedback">
      <CircleAlert size={24} aria-hidden="true" /><strong>Reward progress unavailable</strong><p>We can’t show current progress.</p><AllRewardsButton onClick={() => setOpen(true)} openerRef={openerRef} />
    </div> : concept === 'A' ? <SegmentedJourney {...componentProps} /> : concept === 'B' ? <NextRewardFocus {...componentProps} /> : <RewardMedallion {...componentProps} />}
  </section>;
}
