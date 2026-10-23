import { isNonnegativeInteger } from './validation';

const coinsFormatter = new Intl.NumberFormat('en-IE', { maximumFractionDigits: 0 });
const eurosFormatter = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const centsFormatter = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Accept a plain unsigned decimal amount; all arithmetic is in integer cents. */
export function parseMoneyMinor(input: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(input.trim());
  if (!match) return null;
  const cents = BigInt(match[1]) * 100n + BigInt((match[2] ?? '').padEnd(2, '0'));
  return cents <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(cents) : null;
}
export function formatMoney(minor: number): string {
  if (!isNonnegativeInteger(minor)) throw new RangeError('Money must be nonnegative safe integer minor units.');
  const whole = BigInt(minor) / 100n;
  const cents = minor % 100;
  if (cents === 0) return eurosFormatter.format(whole);
  // Keep both integer components exact, even at Number.MAX_SAFE_INTEGER cents.
  return centsFormatter.formatToParts(whole).map((part) => part.type === 'fraction' ? String(cents).padStart(2, '0') : part.value).join('');
}
export function formatCoins(coins: number): string {
  if (!isNonnegativeInteger(coins)) throw new RangeError('Coins must be a nonnegative safe integer.');
  return coinsFormatter.format(coins);
}
