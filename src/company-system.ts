import { FACILITY_DEFINITIONS, generateCandidate } from './data';
import { createLoan, loanOffers, type LoanAmount } from './loan-system';
import { addLedger, addNotice, clamp, uid } from './state';
import type { FacilityId, GameState, Loan, StaffMember } from './types';

export { loanOffers };
export function takeLoan(state: GameState, amount: LoanAmount): { ok: boolean; message: string; loan?: Loan } {
  const loan = createLoan(state, amount, uid('loan'));
  if (!loan) return { ok: false, message: '現在の信用状態ではこの融資を利用できません。' };
  state.loans.push(loan); state.cash += loan.principal; addLedger(state, `${loan.lender} 借入`, loan.principal, 'loan'); addNotice(state, '融資実行', `${loan.lender}から¥${loan.principal.toLocaleString()}を借り入れました。`, 'warning');
  return { ok: true, message: '融資を実行しました。', loan };
}

export function hireCandidate(state: GameState, candidateId: string): { ok: boolean; message: string } {
  const candidate = state.candidates.find((item) => item.id === candidateId); if (!candidate) return { ok: false, message: '候補者が見つかりません。' };
  if (state.cash < candidate.signingBonus) return { ok: false, message: '契約金が不足しています。' };
  state.cash -= candidate.signingBonus; addLedger(state, `${candidate.name} 採用`, -candidate.signingBonus, 'salary');
  const member: StaffMember = { ...candidate }; delete (member as Partial<typeof candidate>).signingBonus; delete (member as Partial<typeof candidate>).expiresAtWeek;
  state.staff.push(member); state.candidates = state.candidates.filter((item) => item.id !== candidateId); return { ok: true, message: `${candidate.name}を採用しました。` };
}
export function trainStaff(state: GameState, staffId: string): { ok: boolean; message: string } {
  const member = state.staff.find((item) => item.id === staffId); if (!member) return { ok: false, message: '社員が見つかりません。' };
  const cost = Math.round(700_000 + member.level * 260_000); if (state.cash < cost) return { ok: false, message: '研修費が不足しています。' };
  state.cash -= cost; addLedger(state, `${member.name} 研修`, -cost, 'salary'); member.level += 1; member.skill = clamp(member.skill + 2 + member.growth * .03, 0, 100); member.creativity = clamp(member.creativity + 1, 0, 100); member.morale = clamp(member.morale + 5, 0, 100); return { ok: true, message: `${member.name}が成長しました。` };
}
export function giveStaffBonus(state: GameState, staffId: string): { ok: boolean; message: string } {
  const member = state.staff.find((item) => item.id === staffId); if (!member) return { ok: false, message: '社員が見つかりません。' };
  const cost = Math.round(member.salary * .75); if (state.cash < cost) return { ok: false, message: '賞与資金が不足しています。' };
  state.cash -= cost; addLedger(state, `${member.name} 特別賞与`, -cost, 'salary'); member.morale = clamp(member.morale + 15, 0, 100); member.loyalty = clamp(member.loyalty + 11, 0, 100); member.fatigue = clamp(member.fatigue - 10, 0, 100); return { ok: true, message: '賞与を支給しました。' };
}
export function dismissStaff(state: GameState, staffId: string): { ok: boolean; message: string } {
  const member = state.staff.find((item) => item.id === staffId); if (!member) return { ok: false, message: '社員が見つかりません。' };
  if (state.staff.length <= 3) return { ok: false, message: '最低3名の社員が必要です。' };
  const severance = Math.round(member.salary * 1.5); if (state.cash < severance) return { ok: false, message: '退職金を支払えません。' };
  state.cash -= severance; addLedger(state, `${member.name} 退職金`, -severance, 'salary'); state.staff = state.staff.filter((item) => item.id !== staffId); return { ok: true, message: `${member.name}が退職しました。` };
}

export function upgradeFacility(state: GameState, facilityId: FacilityId): { ok: boolean; message: string } {
  const facility = state.facilities.find((item) => item.id === facilityId); const definition = FACILITY_DEFINITIONS[facilityId]; if (!facility) return { ok: false, message: '設備が見つかりません。' };
  const cost = Math.round(definition.baseUpgrade * Math.pow(1.72, facility.level)); if (state.cash < cost) return { ok: false, message: `設備投資費 ¥${cost.toLocaleString()}が不足しています。` };
  state.cash -= cost; addLedger(state, `${definition.name} Lv.${facility.level + 1}`, -cost, 'facility'); facility.level += 1; if (facilityId === 'office') state.officeLevel = facility.level; return { ok: true, message: `${definition.name}を強化しました。` };
}

export function recurringWeeklyBurn(state: GameState): number {
  const salaries = state.staff.reduce((sum, member) => sum + member.salary / 52, 0);
  const facilities = state.facilities.reduce((sum, facility) => sum + FACILITY_DEFINITIONS[facility.id].weeklyMaintenance * facility.level, 0);
  const office = 420_000 + state.officeLevel * 130_000; const legal = Math.max(160_000, state.series.length * 85_000 + state.products.length * 65_000);
  const research = state.activeResearch && !state.activeResearch.paused ? state.activeResearch.weeklyCost : 0;
  const projects = state.projects.filter((project) => project.stage !== 'ready' && !project.paused).reduce((sum, project) => sum + project.weeklyBurn, 0);
  return salaries + facilities + office + legal + research + projects + state.loans.reduce((sum, loan) => sum + loan.weeklyPayment, 0);
}
export function runwayWeeks(state: GameState): number { const burn = recurringWeeklyBurn(state); return burn <= 0 ? 999 : Math.max(0, state.cash / burn); }

export function updateCompanyWeekly(state: GameState): void {
  const salaries = Math.round(state.staff.reduce((sum, member) => sum + member.salary / 52, 0)); const facilities = Math.round(state.facilities.reduce((sum, facility) => sum + FACILITY_DEFINITIONS[facility.id].weeklyMaintenance * facility.level, 0)); const overhead = 420_000 + state.officeLevel * 130_000 + state.series.length * 85_000 + state.products.length * 65_000;
  state.cash -= salaries + facilities + overhead; addLedger(state, '給与', -salaries, 'salary'); addLedger(state, '設備・管理費', -(facilities + overhead), 'overhead');
  if (state.activeResearch && !state.activeResearch.paused) { state.cash -= state.activeResearch.weeklyCost; state.activeResearch.spent += state.activeResearch.weeklyCost; addLedger(state, '研究運営費', -state.activeResearch.weeklyCost, 'research'); }
  for (const project of state.projects.filter((item) => item.stage !== 'ready' && !item.paused)) { state.cash -= project.weeklyBurn; project.spent += project.weeklyBurn; addLedger(state, `${project.codeName} 開発運営`, -project.weeklyBurn, 'development'); if (state.cash < 0) project.paused = true; }
  for (const loan of [...state.loans]) { const payment = Math.min(loan.weeklyPayment, loan.balance); state.cash -= payment; loan.balance -= payment; loan.remainingWeeks -= 1; addLedger(state, `${loan.lender} 返済`, -payment, 'loan'); if (loan.balance <= 1 || loan.remainingWeeks <= 0) state.loans = state.loans.filter((item) => item.id !== loan.id); }
  for (const member of state.staff) { const working = state.projects.some((project) => project.stage !== 'ready' && !project.paused) || Boolean(state.activeResearch && !state.activeResearch.paused); member.fatigue = clamp(member.fatigue + (working ? 1.5 : -2.8), 0, 100); member.morale = clamp(member.morale + (state.cash < 0 ? -3 : member.fatigue > 80 ? -1.5 : .2), 0, 100); member.loyalty = clamp(member.loyalty + (member.morale < 35 ? -.8 : .08), 0, 100); member.xp += working ? 2 : .3; }
  if (state.absoluteWeek - state.lastCandidateRefreshWeek >= 13) { state.candidates = Array.from({ length: 4 }, () => generateCandidate(state.absoluteWeek, state.date.year)); state.lastCandidateRefreshWeek = state.absoluteWeek; }
  if (state.cash < 0) { state.reputation = clamp(state.reputation - .25, 0, 100); if (state.cash < -30_000_000) addNotice(state, '資金危機', '債務超過が深刻です。融資、値上げ、契約縮小が必要です。', 'bad'); }
}

export function financeSummary(state: GameState, weeks = 12): { income: number; expense: number; net: number } {
  const entries = state.ledger.filter((entry) => state.absoluteWeek - (entry.date.year * 52 + entry.date.week) <= weeks); const income = entries.filter((entry) => entry.amount > 0).reduce((sum, entry) => sum + entry.amount, 0); const expense = -entries.filter((entry) => entry.amount < 0).reduce((sum, entry) => sum + entry.amount, 0); return { income, expense, net: income - expense };
}
