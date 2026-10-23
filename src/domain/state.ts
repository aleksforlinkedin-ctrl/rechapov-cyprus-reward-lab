import type { DayLedgerEntry, DaySnapshot, PreviousDayCreditStatus } from './types';
import { isNonempty, isNonnegativeInteger, isTimestamp } from './validation';

type Identity = { readonly promotionId: string; readonly configVersion: string; readonly dayId: string };
const sameKey = (a: Identity, b: Identity) => a.promotionId === b.promotionId && a.configVersion === b.configVersion && a.dayId === b.dayId;
export type SnapshotAcceptance = { readonly accepted: boolean; readonly snapshot: DaySnapshot | null; readonly reason: 'accepted' | 'duplicate' | 'stale' | 'context-mismatch' | 'invalid' };

/** Active day comes from an explicit context, never day ID sorting or device time. */
export function acceptSnapshot(current: DaySnapshot | null, incoming: DaySnapshot, context: { promotionId: string; configVersion: string; activeDayId: string }): SnapshotAcceptance {
  if (!isNonnegativeInteger(incoming.version) || !isNonnegativeInteger(incoming.qualifyingWagerMinor) || !isTimestamp(incoming.asOf)) return { accepted: false, snapshot: current, reason: 'invalid' };
  if (incoming.promotionId !== context.promotionId || incoming.configVersion !== context.configVersion || incoming.dayId !== context.activeDayId) return { accepted: false, snapshot: current, reason: 'context-mismatch' };
  if (current && sameKey(current, incoming)) {
    if (incoming.version < current.version) return { accepted: false, snapshot: current, reason: 'stale' };
    if (incoming.version === current.version) return { accepted: false, snapshot: current, reason: 'duplicate' };
  }
  if (current && current.dayId === incoming.dayId && current.promotionId === incoming.promotionId && current.configVersion !== incoming.configVersion) return { accepted: false, snapshot: current, reason: 'context-mismatch' };
  return { accepted: true, snapshot: incoming, reason: 'accepted' };
}

export function validateLedgerEntry(entry: DayLedgerEntry): void {
  if (!isNonempty(entry.promotionId) || !isNonempty(entry.configVersion) || !isNonempty(entry.dayId) || !isNonempty(entry.settlementReference) || !isNonnegativeInteger(entry.earnedCoins)) throw new Error('Invalid settled day entry.');
  if (entry.creditStatus !== 'pending' && entry.creditStatus !== 'credited') throw new Error('Invalid credit status.');
  if (entry.creditStatus === 'credited' && (!entry.creditedAt || !isTimestamp(entry.creditedAt))) throw new Error('Credited entries require a confirmed creditedAt timestamp.');
  if (entry.creditStatus === 'pending' && entry.creditedAt !== undefined) throw new Error('Pending entries cannot expose a creditedAt timestamp.');
}

/** An explicit settlement event records a closed day, independently of its successor. */
export function recordDaySettlement(ledger: readonly DayLedgerEntry[], entry: DayLedgerEntry): readonly DayLedgerEntry[] {
  validateLedgerEntry(entry);
  if (entry.creditStatus !== 'pending') throw new Error('Record settlement as pending; credit is a separate confirmed event.');
  const existing = ledger.find((item) => sameKey(item, entry));
  if (existing) {
    if (existing.earnedCoins !== entry.earnedCoins || existing.settlementReference !== entry.settlementReference) throw new Error('Conflicting settlement for an already recorded day.');
    return ledger;
  }
  return [...ledger, Object.freeze({ ...entry })];
}

export type ConfirmedCreditEvent = Identity & { readonly creditedAt: string; readonly settlementReference: string };
export function confirmDayCredit(ledger: readonly DayLedgerEntry[], event: ConfirmedCreditEvent): readonly DayLedgerEntry[] {
  if (!isTimestamp(event.creditedAt) || !isNonempty(event.settlementReference)) throw new Error('Credit requires a confirmed timestamp and settlement reference.');
  const existing = ledger.find((item) => sameKey(item, event));
  if (!existing || existing.settlementReference !== event.settlementReference) throw new Error('Credit must match a recorded settlement.');
  if (existing.creditStatus === 'credited') return ledger;
  return ledger.map((item) => sameKey(item, event) ? Object.freeze({ ...item, creditStatus: 'credited' as const, creditedAt: event.creditedAt }) : item);
}

/** The preceding day is named by the caller; arbitrary day IDs are not sorted. */
export function getPreviousDayCreditStatus(ledger: readonly DayLedgerEntry[], previous: Identity): PreviousDayCreditStatus {
  const entry = ledger.find((item) => sameKey(item, previous));
  if (!entry) return { kind: 'none' };
  validateLedgerEntry(entry);
  return entry.creditStatus === 'pending'
    ? { kind: 'pending', dayId: entry.dayId, earnedCoins: entry.earnedCoins }
    : { kind: 'credited', dayId: entry.dayId, earnedCoins: entry.earnedCoins, creditedAt: entry.creditedAt! };
}
