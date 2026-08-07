import type { GameState, LedgerEntry } from './types';

type BusinessLedgerEntry = LedgerEntry & { businessWeek?: number };

export function businessFinanceSummary(state: GameState, weeks = 12): { income: number; expense: number; net: number } {
  const cutoff = Math.max(0, state.absoluteWeek - weeks + 1);
  const entries = state.ledger.filter((entry) => {
    const businessWeek = (entry as BusinessLedgerEntry).businessWeek;
    // Legacy saves did not store a business-week stamp. Keep only recent imported legacy entries in the current window.
    return businessWeek === undefined ? state.absoluteWeek < weeks : businessWeek >= cutoff;
  });
  const income = entries.filter((entry) => entry.amount > 0).reduce((sum, entry) => sum + entry.amount, 0);
  const expense = -entries.filter((entry) => entry.amount < 0).reduce((sum, entry) => sum + entry.amount, 0);
  return { income, expense, net: income - expense };
}
