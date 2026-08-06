import type { GameState, Loan } from './types';

export type LoanAmount = 25_000_000 | 60_000_000 | 120_000_000;

export interface LoanOffer {
  amount: LoanAmount;
  lender: string;
  interestRate: number;
  termWeeks: number;
  available: boolean;
  reason: string;
}

export function loanOffers(state: GameState): LoanOffer[] {
  const existingPrincipal = state.loans.reduce((sum, loan) => sum + loan.balance, 0);
  const baseAvailable = state.loans.length < 3;
  return [
    {
      amount: 25_000_000,
      lender: '地域産業銀行',
      interestRate: .11,
      termWeeks: 104,
      available: baseAvailable && existingPrincipal < 110_000_000,
      reason: '小規模設備・運転資金向け。審査が緩い。',
    },
    {
      amount: 60_000_000,
      lender: 'テクノロジー開発銀行',
      interestRate: .155,
      termWeeks: 156,
      available: baseAvailable && state.reputation >= 8 && existingPrincipal < 150_000_000,
      reason: state.reputation >= 8 ? '量産契約と世代開発向け。' : '評判8以上で利用可能。',
    },
    {
      amount: 120_000_000,
      lender: 'グローバル成長ファンド',
      interestRate: .21,
      termWeeks: 182,
      available: baseAvailable && state.reputation >= 24 && state.stats.lifetimeRevenue >= 150_000_000 && existingPrincipal < 180_000_000,
      reason: state.reputation >= 24 && state.stats.lifetimeRevenue >= 150_000_000 ? '先端工場・大型開発向け。高金利。' : '評判24・累計売上1.5億円以上で利用可能。',
    },
  ];
}

export function createLoan(state: GameState, amount: LoanAmount, id: string): Loan | null {
  const offer = loanOffers(state).find((item) => item.amount === amount);
  if (!offer?.available) return null;
  const total = amount * (1 + offer.interestRate);
  return {
    id,
    lender: offer.lender,
    principal: amount,
    balance: total,
    weeklyPayment: Math.ceil(total / offer.termWeeks / 10_000) * 10_000,
    remainingWeeks: offer.termWeeks,
    originalTermWeeks: offer.termWeeks,
    interestRate: offer.interestRate,
  };
}
