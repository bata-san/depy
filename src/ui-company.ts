import {
  FACILITY_DEFINITIONS,
  RESEARCH_DEFINITIONS,
  ROLE_LABELS,
  SPECIALTY_IMPACTS,
  SPECIALTY_LABELS,
  TRAIT_DESCRIPTIONS,
  TRAIT_LABELS,
} from './data';
import { financeSummary, loanOffers, recurringWeeklyBurn, runwayWeeks } from './simulation';
import { engineeringStaffEffect, operationsStaffEffect, salesStaffEffect } from './staff-effects';
import type { CompanyTab, FacilityId, GameState, ResearchArea, StaffMember } from './types';
import { badge, bar, esc, moneyTone, num, pct, yen } from './ui-format';

const researchAreas = Object.keys(RESEARCH_DEFINITIONS) as ResearchArea[];
const facilityIds = Object.keys(FACILITY_DEFINITIONS) as FacilityId[];

function researchCard(state: GameState, area: ResearchArea): string {
  const definition = RESEARCH_DEFINITIONS[area];
  const level = state.research[area] ?? 0;
  const active = state.activeResearch?.area === area;
  const cash = Math.round(definition.baseCash * Math.pow(1.48, level));
  const rp = Math.round(definition.baseRp * Math.pow(1.35, level));
  return `<article class="research-card card ${active ? 'active' : ''}">
    <header><div>${badge(`Lv.${level}`, active ? 'accent' : '')}<h3>${esc(definition.name)}</h3></div>${active ? badge(state.activeResearch?.paused ? '停止中' : '研究中', state.activeResearch?.paused ? 'warning' : 'good') : ''}</header>
    <p>${esc(definition.description)}</p>
    ${active ? `<div class="research-progress"><span><b>${Math.round(state.activeResearch?.progress ?? 0)}%</b><small>社員構成で速度が変化 · 実時間進行</small></span>${bar(state.activeResearch?.progress ?? 0, 100, 'accent')}</div><button data-action="toggle-research">${state.activeResearch?.paused ? '研究を再開' : '研究を一時停止'}</button>` : `<dl class="cost-list"><div><dt>開始費</dt><dd>${yen.format(cash)}</dd></div><div><dt>必要RP</dt><dd>${rp}</dd></div><div><dt>経営週運営</dt><dd>${yen.format(Math.round(cash / Math.max(8, definition.baseWeeks)))}</dd></div></dl><button class="primary" data-action="start-research" data-area="${area}" ${state.activeResearch ? 'disabled' : ''}>研究開始</button>`}
  </article>`;
}

export function renderResearch(state: GameState): string {
  return `<div class="panel-section"><header class="section-head"><div><small>RESEARCH PROGRAM</small><h2>技術研究</h2><p>技術年とは別の実時間進行。得意な社員が揃うほど大幅に速くなります。</p></div><div class="research-points"><small>RESEARCH POINTS</small><b>${num.format(state.researchPoints)} RP</b></div></header><div class="research-grid">${researchAreas.map((area) => researchCard(state, area)).join('')}</div></div>`;
}

function coreStats(member: StaffMember): string {
  return `<div class="staff-core-stats"><span><small>能力</small><b>${Math.round(member.skill)}</b></span><span><small>発想</small><b>${Math.round(member.creativity)}</b></span><span><small>規律</small><b>${Math.round(member.discipline)}</b></span><span><small>成長</small><b>${Math.round(member.growth)}</b></span></div>`;
}

function staffCard(member: StaffMember): string {
  const risk = member.loyalty < 35 || member.morale < 35;
  const growthTone = member.growth >= 75 ? 'accent' : member.growth < 40 ? 'warning' : '';
  return `<article class="staff-card card ${risk ? 'risk' : ''}"><header><div>${badge(ROLE_LABELS[member.role], risk ? 'warning' : '')}<h3>${esc(member.name)}</h3><p>${SPECIALTY_LABELS[member.specialty]} · Lv.${member.level}</p></div>${badge(member.growth >= 75 ? '高成長' : member.growth < 40 ? '熟成型' : '標準成長', growthTone)}</header>
    <p class="specialty-impact">${esc(SPECIALTY_IMPACTS[member.specialty])}</p>
    ${coreStats(member)}
    <div class="staff-bars"><label>士気 ${bar(member.morale, 100, member.morale < 35 ? 'bad' : 'good')}<b>${Math.round(member.morale)}</b></label><label>疲労 ${bar(member.fatigue, 100, member.fatigue > 75 ? 'bad' : '')}<b>${Math.round(member.fatigue)}</b></label><label>忠誠 ${bar(member.loyalty, 100, member.loyalty < 35 ? 'bad' : '')}<b>${Math.round(member.loyalty)}</b></label><label>経験 ${bar(member.xp, 80, 'accent')}<b>${Math.round(member.xp)}</b></label></div>
    <div class="trait-row">${member.traits.map((trait) => `<span title="${esc(TRAIT_DESCRIPTIONS[trait])}">${esc(TRAIT_LABELS[trait])}</span>`).join('')}</div>
    <footer><span>${yen.format(member.salary)}/月</span><div><button data-action="staff-train" data-id="${member.id}">研修</button><button data-action="staff-bonus" data-id="${member.id}">賞与</button><button class="danger-text" data-action="staff-dismiss" data-id="${member.id}">契約終了</button></div></footer></article>`;
}

function candidateCard(state: GameState, candidate: GameState['candidates'][number]): string {
  return `<article class="candidate-card card"><header><div>${badge(ROLE_LABELS[candidate.role])}<h3>${esc(candidate.name)}</h3><p>${esc(SPECIALTY_LABELS[candidate.specialty])} · Lv.${candidate.level}</p></div><b>${yen.format(candidate.signingBonus)}</b></header>
    <p>${esc(SPECIALTY_IMPACTS[candidate.specialty])}</p>${coreStats(candidate)}
    <div class="trait-row">${candidate.traits.map((trait) => `<span title="${esc(TRAIT_DESCRIPTIONS[trait])}">${esc(TRAIT_LABELS[trait])}</span>`).join('')}</div>
    <footer><span>${yen.format(candidate.salary)}/月 · 残り${Math.max(0, candidate.expiresAtWeek - state.absoluteWeek)}経営週</span><button class="primary" data-action="hire" data-id="${candidate.id}">採用</button></footer></article>`;
}

function teamPanel(state: GameState): string {
  const engineering = engineeringStaffEffect(state);
  const sales = salesStaffEffect(state);
  const operations = operationsStaffEffect(state);
  return `<div class="company-pane"><div class="summary-strip team-power-strip"><div><small>設計チーム</small><b>×${engineering.toFixed(2)}</b><span>開発品質の基礎</span></div><div><small>販促チーム</small><b>×${sales.toFixed(2)}</b><span>5秒販売需要</span></div><div><small>生産管理</small><b>×${operations.toFixed(2)}</b><span>実生産数</span></div><div><small>採用候補</small><b>${state.candidates.length}名</b><span>約1分ごとに市場更新</span></div></div>
    <h3>社員</h3><div class="staff-grid">${state.staff.map(staffCard).join('')}</div>
    <h3>採用市場</h3><div class="candidate-grid">${state.candidates.map((candidate) => candidateCard(state, candidate)).join('') || '<div class="empty-card">次の採用市場更新を待っています。</div>'}</div>
  </div>`;
}

function facilitiesPanel(state: GameState): string {
  return `<div class="company-pane"><div class="facility-grid">${facilityIds.map((id) => {
    const definition = FACILITY_DEFINITIONS[id];
    const facility = state.facilities.find((entry) => entry.id === id);
    const level = facility?.level ?? 0;
    const cost = Math.round(definition.baseUpgrade * Math.pow(1.72, level));
    return `<article class="facility-card card"><header><div>${badge(`Lv.${level}`)}<h3>${esc(definition.name)}</h3></div><b>${yen.format(definition.weeklyMaintenance * level)}/経営週</b></header><p>${esc(definition.description)}</p><div class="facility-blocks">${Array.from({ length: 5 }, (_, index) => `<i class="${index < level ? 'on' : ''}"></i>`).join('')}</div><button class="primary" data-action="facility-upgrade" data-id="${id}">Lv.${level + 1}へ強化 · ${yen.format(cost)}</button></article>`;
  }).join('')}</div></div>`;
}

function financePanel(state: GameState): string {
  const finance = financeSummary(state, 12);
  const burn = recurringWeeklyBurn(state);
  const runway = runwayWeeks(state);
  const offers = loanOffers(state);
  return `<div class="company-pane"><div class="finance-hero"><div><small>現金</small><b>${yen.format(state.cash)}</b><span>資金余命 ${runway > 999 ? '∞' : `${Math.floor(runway)}経営週`}</span></div><div><small>12経営週収入</small><b>${yen.format(finance.income)}</b></div><div><small>12経営週支出</small><b>${yen.format(finance.expense)}</b></div><div class="${moneyTone(finance.net)}"><small>12経営週損益</small><b>${yen.format(finance.net)}</b><span>固定支出 ${yen.format(burn)}/経営週</span></div></div>
    <h3>融資</h3><div class="loan-grid">${offers.map((offer) => { const total = offer.amount * (1 + offer.interestRate); const weekly = Math.ceil(total / offer.termWeeks / 10_000) * 10_000; return `<article class="loan-card card ${offer.available ? '' : 'locked'}"><header><div><small>${esc(offer.lender)}</small><h3>${yen.format(offer.amount)}</h3></div>${badge(`${pct(offer.interestRate * 100)} 金利`, offer.interestRate > .18 ? 'warning' : '')}</header><p>${esc(offer.reason)}</p><dl class="cost-list"><div><dt>期間</dt><dd>${offer.termWeeks}経営週</dd></div><div><dt>週次返済</dt><dd>${yen.format(weekly)}</dd></div><div><dt>総返済</dt><dd>${yen.format(total)}</dd></div></dl><button class="primary" data-action="loan" data-amount="${offer.amount}" ${offer.available ? '' : 'disabled'}>借り入れる</button></article>`; }).join('')}</div>
    <h3>返済中</h3><div class="active-loans">${state.loans.map((loan) => `<article class="card"><header><div><small>${esc(loan.lender)}</small><h3>残高 ${yen.format(loan.balance)}</h3></div><b>残り${loan.remainingWeeks}経営週</b></header><p>毎週 ${yen.format(loan.weeklyPayment)} · 金利 ${pct(loan.interestRate * 100)}</p>${bar(loan.balance, loan.principal * (1 + loan.interestRate), 'warning')}</article>`).join('') || '<div class="empty-card">返済中の融資はありません。</div>'}</div>
    <h3>最近の入出金</h3><div class="ledger-list">${state.ledger.slice(0, 18).map((entry) => `<div><span>${entry.date.year}/${entry.date.week} ${esc(entry.label)}</span><b class="${moneyTone(entry.amount)}">${entry.amount >= 0 ? '+' : ''}${yen.format(entry.amount)}</b></div>`).join('')}</div>
  </div>`;
}

export function renderCompany(state: GameState): string {
  const tabs: Array<[CompanyTab, string]> = [['team', '人材'], ['facilities', '設備'], ['finance', '資金・融資']];
  const content = state.companyTab === 'team' ? teamPanel(state) : state.companyTab === 'facilities' ? facilitiesPanel(state) : financePanel(state);
  return `<div class="panel-section"><header class="section-head"><div><small>PEOPLE FIRST MANAGEMENT</small><h2>会社経営</h2><p>社員の能力・職種・専門・疲労が開発、研究、販売、量産へ直接影響します。</p></div></header><nav class="company-tabs">${tabs.map(([id, label]) => `<button class="${state.companyTab === id ? 'active' : ''}" data-action="company-tab" data-tab="${id}">${label}</button>`).join('')}</nav>${content}</div>`;
}
