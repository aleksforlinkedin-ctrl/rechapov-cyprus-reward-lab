import { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowUpRight, ChevronRight, Coins, X } from 'lucide-react';
import { RewardsPanel } from '../components/RewardsPanel';
import { getFixture, readState } from '../review/state';
import { Hero } from './Hero';
import '../styles/product.css';
import '../styles/shell.css';

export function Preview() {
  const [state, setState] = useState(readState);
  const [open, setOpen] = useState(true);
  const [details, setDetails] = useState(false);
  const [notice, setNotice] = useState('');
  const title = useRef<HTMLHeadingElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const embedded = new URLSearchParams(location.search).get('embed') === '1';
  const capture = new URLSearchParams(location.search).get('capture') === '1';
  const { config, snapshot, model, previous } = getFixture(state);
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== window.parent || event.data?.type !== 'review-state') return;
      const next = readState('?' + new URLSearchParams(event.data.state).toString());
      setState(next);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);
  useEffect(() => {
    document.documentElement.style.fontSize = state.textScale ? '32px' : '16px';
    document.body.dataset.capture = String(capture);
    document.body.dataset.platform = state.platform;
    document.body.dataset.textScale = String(state.textScale);
  }, [state.textScale, state.platform, capture]);
  const showRouteNotice = () => {
    const message = '“View eligible games” is a proposed destination. The game route and eligibility rules require confirmation.';
    if (embedded) window.parent.postMessage({type:'preview-notice',message},location.origin);
    else setNotice(message);
  };
  return <main className={`preview-root platform-${state.platform}`}>
    <div className="ambient-background" aria-hidden="true"><div className="ambient-header"><span className="ambient-brand">◈ &nbsp; CYPRUS</span><span>DISCOVER &nbsp;&nbsp;&nbsp; PROMOTIONS &nbsp;&nbsp;&nbsp; REWARDS</span><div className="ambient-avatar" /></div><div className="ambient-content"><p>Made for your everyday.</p><div className="ambient-tiles"><div /><div /><div /></div></div></div>
    <Dialog.Root open={open} onOpenChange={next=>{ setOpen(next); if(!next) setDetails(false); }}>
      <div className="preview-closed"><Coins size={32}/><h1>Your rewards are here.</h1><p>Return to your confirmed daily progress.</p><Dialog.Trigger asChild><button className="primary-action" ref={trigger}>Open daily rewards <ArrowUpRight size={18}/></button></Dialog.Trigger></div>
      <Dialog.Portal><Dialog.Overlay className="promo-overlay" />
        <Dialog.Content className={`promo-modal ${state.platform}`} data-concept={state.concept}
          onOpenAutoFocus={e=>{e.preventDefault();title.current?.focus();}}
          onCloseAutoFocus={e=>{e.preventDefault();trigger.current?.focus();}}
          onEscapeKeyDown={e=>{if(details){e.preventDefault();setDetails(false);}}}
          onPointerDownOutside={e=>e.preventDefault()}>
          <header className="promo-header"><span className="promo-symbol" aria-hidden="true"><Coins size={17}/></span><Dialog.Title ref={title} tabIndex={-1}>Daily rewards</Dialog.Title><Dialog.Close asChild><button className="modal-close" aria-label="Close daily rewards"><X size={20}/></button></Dialog.Close></header>
          <Dialog.Description className="sr-only">Your daily milestone progress. Coins earned today are added tomorrow. Exchange coins for bonuses, free spins and free bets.</Dialog.Description>
          <div className="promo-body"><Hero />
            <RewardsPanel concept={state.concept} platform={state.platform} config={config} snapshot={snapshot} model={model} previous={previous} loading={state.network==='loading'} error={state.network==='error'} onRetry={()=>{setState(s=>({...s,network:'ready'}));if(embedded)window.parent.postMessage({type:'preview-retry'},location.origin);}} detailsOpen={details} onDetailsOpenChange={setDetails}/>
            <footer className="promo-action-area"><button className="primary-action" onClick={showRouteNotice}>View eligible games <ChevronRight size={18}/></button><p>Coins for bonuses, free spins &amp; free bets.</p></footer>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    {!embedded && !capture && <aside className="standalone-note">{notice || (state.n!==12 ? 'Synthetic layout fixture · Review only · Not promotion terms.' : state.rules==='open' ? 'Review only: final threshold unresolved. Remaining amount is not inferred.' : 'Demo assumption: cumulative rewards, normalized lower thresholds, final threshold €5,000; subject to confirmation.')}</aside>}
  </main>;
}
