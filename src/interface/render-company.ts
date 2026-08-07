import { FACILITY_DEFINITIONS, RESEARCH_DEFINITIONS, ROLE_LABELS, SPECIALTY_IMPACTS, SPECIALTY_LABELS, TRAIT_DESCRIPTIONS, TRAIT_LABELS } from '../data';
import { financeSummary, loanOffers, recurringWeeklyBurn, runwayWeeks, staffCapacity } from '../simulation';
import { staffArchetypeLabel, staffLifeProfile, teamChemistry } from '../staff-life';
import { operationsStaffEffect, projectStaffEffect, researchStaffEffect, salesStaffEffect } from '../staff-effects';
import type { CompanyTab, FacilityId, GameState, ResearchArea, StaffMember, StaffRole } from '../types';
import { esc, meter, num, pct, toneForNumber, yen } from './format';

const researchAreas = Object.keys(RESEARCH_DEFINITIONS) as ResearchArea[];
const facilityIds = Object.keys(FACILITY_DEFINITIONS) as FacilityId[];
const roleIds = Object.keys(ROLE_LABELS) as StaffRole[];

function timeLabel(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60 / 5) * 5;
  return `${String(h + Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function researchLine(state: GameState, area: ResearchArea): string {
  const definition = RESEARCH_DEFINITIONS[area];
  const level = state.research[area] ?? 0;
  const active = state.activeResearch?.area === area;
  const cash = Math.round(definition.baseCash * Math.pow(1.48, level));
  const rp = Math.round(definition.baseRp * Math.pow(1.35, level));
  const factor = researchStaffEffect(state, area);
  return `<article class="line-card research-line ${active ? 'is-active' : ''}" data-research-area="${area}"><header><div><span class="status-text">Lv.${level}</span><h3>${esc(definition.name)}</h3><small>${esc(definition.description)}</small></div><strong>×${factor.toFixed(2)}</strong></header>${active ? `<div class="research-progress"><span><b data-research-progress>${Math.round(state.activeResearch?.progress ?? 0)}%</b><small>社員構成で速度変化</small></span>${meter(state.activeResearch?.progress ?? 0, 100, 'accent')}</div><button data-action="toggle-research">${state.activeResearch?.paused ? '研究を再開' : '研究を一時停止'}</button>` : `<div class="metric-row"><span>開始費 <b>${yen.format(cash)}</b></span><span>必要RP <b>${rp}</b></span><span>基準期間 <b>${definition.baseWeeks}週</b></span></div><button class="action-primary" data-action="start-research" data-area="${area}" ${state.activeResearch ? 'disabled' : ''}>研究開始</button>`}</article>`;
}

export function renderResearch(state: GameState): string {
  return `<section class="view"><header class="view-head"><div><span class="eyebrow">R&D</span><h2>研究</h2></div><div class="head-value"><small>RESEARCH POINTS</small><b>${num.format(state.researchPoints)} RP</b></div></header><div class="stack-list">${researchAreas.map((area) => researchLine(state, area)).join('')}</div></section>`;
}

function roleOptions(current: StaffRole): string {
  return roleIds.map((role) => `<option value="${role}" ${role === current ? 'selected' : ''}>${esc(ROLE_LABELS[role])}</option>`).join('');
}

function staffLine(member: StaffMember): string {
  const risk = member.loyalty < 35 || member.morale < 35;
  const life = staffLifeProfile(member);
  return `<article class="line-card staff-line ${risk ? 'is-risk' : ''}" data-staff-card="${member.id}"><header><div><span class="status-text ${risk ? 'is-warning' : ''}" data-staff-role-label>${esc(ROLE_LABELS[member.role])} · ${esc(staffArchetypeLabel(life.archetype))}</span><h3>${esc(member.name)}</h3><small data-staff-meta>${esc(SPECIALTY_LABELS[member.specialty])} · ${esc(life.title)}</small></div><strong data-staff-skill>${Math.round(life.contribution)}</strong></header><p class="micro-copy">${esc(life.summary)}。${esc(SPECIALTY_IMPACTS[member.specialty])}</p><div class="staff-attributes"><span><small>能力</small><b data-staff-core="skill">${Math.round(member.skill)}</b></span><span><small>発想</small><b data-staff-core="creativity">${Math.round(member.creativity)}</b></span><span><small>規律</small><b data-staff-core="discipline">${Math.round(member.discipline)}</b></span><span><small>成長</small><b data-staff-core="growth">${Math.round(member.growth)}</b></span></div><div class="staff-attributes"><span><small>集中</small><b>${Math.round(life.focus)}</b></span><span><small>連携</small><b>${Math.round(life.teamwork)}</b></span><span><small>耐久</small><b>${Math.round(life.resilience)}</b></span><span><small>野心</small><b>${Math.round(life.ambition)}</b></span></div><div class="metric-row"><span>出社 <b>${timeLabel(life.arrivalHour)}</b></span><span>退勤目安 <b>${timeLabel(life.leaveHour)}</b></span><span>総合貢献 <b>${Math.round(life.contribution)}</b></span></div><div class="condition-lines"><div><span>士気</span>${meter(member.morale, 100, member.morale < 35 ? 'bad' : 'good')}<b data-staff-condition="morale">${Math.round(member.morale)}</b></div><div><span>疲労</span>${meter(member.fatigue, 100, member.fatigue > 75 ? 'bad' : '')}<b data-staff-condition="fatigue">${Math.round(member.fatigue)}</b></div><div><span>忠誠</span>${meter(member.loyalty, 100, member.loyalty < 35 ? 'bad' : '')}<b data-staff-condition="loyalty">${Math.round(member.loyalty)}</b></div><div><span>経験</span>${meter(Math.min(80, member.xp), 80, 'accent')}<b data-staff-condition="xp">${Math.round(member.xp)}</b></div></div><div class="trait-list">${member.traits.map((trait) => `<span title="${esc(TRAIT_DESCRIPTIONS[trait])}">${esc(TRAIT_LABELS[trait])}</span>`).join('')}</div><label class="inline-select"><span>職種変更</span><select data-staff-role="${member.id}">${roleOptions(member.role)}</select></label><footer class="action-row"><span>${yen.format(member.salary)}/月</span><button data-action="staff-train" data-id="${member.id}">研修</button><button data-action="staff-bonus" data-id="${member.id}">賞与</button><button class="action-danger" data-action="staff-dismiss" data-id="${member.id}">契約終了</button></footer></article>`;
}

function candidateLine(candidate: GameState['candidates'][number], full: boolean): string {
  const life = staffLifeProfile(candidate);
  return `<article class="market-line candidate-line" data-candidate-card="${candidate.id}"><div><span>${esc(ROLE_LABELS[candidate.role])} · ${esc(SPECIALTY_LABELS[candidate.specialty])}</span><h3>${esc(candidate.name)}</h3><div class="candidate-stats"><b>能力 ${Math.round(candidate.skill)}</b><b>発想 ${Math.round(candidate.creativity)}</b><b>規律 ${Math.round(candidate.discipline)}</b><b>成長 ${Math.round(candidate.growth)}</b></div><small>${esc(staffArchetypeLabel(life.archetype))} · ${candidate.traits.map((trait) => esc(TRAIT_LABELS[trait])).join(' / ')}</small>${full ? `<p class="micro-copy">${esc(life.summary)} · 勤務 ${timeLabel(life.arrivalHour)}〜${timeLabel(life.leaveHour)}</p>` : ''}</div><div class="market-metrics"><span>契約金 <b>${yen.format(candidate.signingBonus)}</b></span><span>給与 <b>${yen.format(candidate.salary)}/月</b></span><span data-candidate-expiry>残り ${Math.max(0, candidate.expiresAtWeek)}週</span></div></article>`;
}

function teamView(state: GameState): string {
  const projects = state.projects.filter((project) => project.stage !== 'ready');
  const engineering = projects.length ? projectStaffEffect(state, projects[0]!).speed : 1;
  const cap = staffCapacity(state);
  const chemistry = teamChemistry(state);
  return `<section class="company-pane"><div class="team-power"><div><span>開発力</span><b data-team-engineering>×${engineering.toFixed(2)}</b></div><div><span>販促力</span><b data-team-sales>×${salesStaffEffect(state).toFixed(2)}</b></div><div><span>生産管理</span><b data-team-operations>×${operationsStaffEffect(state).toFixed(2)}</b></div><div><span>チーム相性</span><b>${Math.round(chemistry)}</b></div><div><span>オフィス</span><b>${state.staff.length}/${cap}名</b></div></div><p class="micro-copy">社員ごとに出退勤時間、集中力、連携力、疲労耐性が異なります。高い相性は開発速度・問題発生率・研究効率へ反映されます。</p><div class="section-label"><span>STAFF</span><b>${state.staff.length} / ${cap}</b></div><div class="stack-list">${state.staff.map(staffLine).join('')}</div><div class="section-label"><span>RECRUITING</span><b>${state.candidates.length}</b></div><div class="market-lines">${state.candidates.map((candidate) => { const life = staffLifeProfile(candidate); return `<article class="market-line candidate-line" data-candidate-card="${candidate.id}"><div><span>${esc(ROLE_LABELS[candidate.role])} · ${esc(SPECIALTY_LABELS[candidate.specialty])}</span><h3>${esc(candidate.name)}</h3><div class="candidate-stats"><b>能力 ${Math.round(candidate.skill)}</b><b>発想 ${Math.round(candidate.creativity)}</b><b>規律 ${Math.round(candidate.discipline)}</b><b>成長 ${Math.round(candidate.growth)}</b></div><small>${esc(staffArchetypeLabel(life.archetype))} · ${candidate.traits.map((trait) => esc(TRAIT_LABELS[trait])).join(' / ')}</small><p class="micro-copy">${esc(life.summary)} · ${timeLabel(life.arrivalHour)}〜${timeLabel(life.leaveHour)}</p></div><div class="market-metrics"><span>契約金 <b>${yen.format(candidate.signingBonus)}</b></span><span>給与 <b>${yen.format(candidate.salary)}/月</b></span><span data-candidate-expiry>残り ${Math.max(0, candidate.expiresAtWeek - state.absoluteWeek)}週</span></div><button class="action-primary" data-action="hire" data-id="${candidate.id}" ${state.staff.length >= cap ? 'disabled' : ''}>採用</button></article>`; }).join('') || '<section class="empty-state">次の採用市場更新を待っています。</section>'}</div></section>`;
}

function facilitiesView(state: GameState): string {
  return `<section class="company-pane"><div class="stack-list">${facilityIds.map((id) => { const definition = FACILITY_DEFINITIONS[id]; const facility = state.facilities.find((entry) => entry.id === id); const level = facility?.level ?? 0; const multiplier = id === 'office' ? 1.58 : 1.72; const cost = Math.round(definition.baseUpgrade * Math.pow(multiplier, level)); const extra = id === 'office' ? `<p class="micro-copy">Lv.${level + 1}で社員定員 ${5 + (level + 1) * 5}名。3Dオフィスに新しい区画・席・設備・生活感のある小物が追加されます。</p>` : ''; return `<article class="line-card facility-line"><header><div><span class="status-text">Lv.${level}</span><h3>${esc(definition.name)}</h3><small>${esc(definition.description)}</small></div><strong>${yen.format(definition.weeklyMaintenance * level)}/週</strong></header>${extra}<div class="level-track">${Array.from({ length: 5 }, (_, index) => `<i class="${index < level ? 'is-on' : ''}"></i>`).join('')}</div><button class="action-primary" data-action="facility-upgrade" data-id="${id}">Lv.${level + 1}へ強化 · ${yen.format(cost)}</button></article>`; }).join('')}</div></section>`;
}

function financeView(state: GameState): string {
  const finance = financeSummary(state, 12);
  const burn = recurringWeeklyBurn(state);
  const runway = runwayWeeks(state);
  const offers = loanOffers(state);
  return `<section class="company-pane"><div class="stat-row"><div><span>現金</span><b data-finance-cash>${yen.format(state.cash)}</b><small>余命 ${runway > 999 ? '∞' : `${Math.floor(runway)}週`}</small></div><div><span>12週収入</span><b>${yen.format(finance.income)}</b></div><div><span>12週支出</span><b>${yen.format(finance.expense)}</b><small>固定 ${yen.format(burn)}/週</small></div><div><span>12週損益</span><b class="${toneForNumber(finance.net)}">${yen.format(finance.net)}</b></div></div><div class="section-label"><span>LOANS</span><b>${state.loans.length}</b></div><div class="market-lines">${offers.map((offer) => { const total = offer.amount * (1 + offer.interestRate); const weekly = Math.ceil(total / offer.termWeeks / 10_000) * 10_000; return `<article class="market-line ${offer.available ? '' : 'is-disabled'}"><div><span>${esc(offer.lender)}</span><h3>${yen.format(offer.amount)}</h3><p>${esc(offer.reason)}</p></div><div class="market-metrics"><span>金利 <b>${pct(offer.interestRate * 100)}</b></span><span>返済 <b>${yen.format(weekly)}/週</b></span><span>期間 <b>${offer.termWeeks}週</b></span></div><button class="action-primary" data-action="loan" data-amount="${offer.amount}" ${offer.available ? '' : 'disabled'}>借入</button></article>`; }).join('')}</div><div class="stack-list">${state.loans.map((loan) => `<article class="line-card loan-line" data-loan-card="${loan.id}"><header><div><span class="status-text">返済中</span><h3>${esc(loan.lender)}</h3><small>毎週 ${yen.format(loan.weeklyPayment)} · 金利 ${pct(loan.interestRate * 100)}</small></div><strong data-loan-balance>${yen.format(loan.balance)}</strong></header><div class="metric-row"><span>残り <b data-loan-weeks>${loan.remainingWeeks}週</b></span><span>元本 <b>${yen.format(loan.principal)}</b></span></div>${meter(loan.balance, loan.principal * (1 + loan.interestRate), 'warning')}</article>`).join('')}</div><div class="section-label"><span>LEDGER</span><b>${state.ledger.length}</b></div><div class="ledger-lines">${state.ledger.slice(0, 20).map((entry) => `<div><span>${entry.date.year}/${entry.date.week} ${esc(entry.label)}</span><b class="${toneForNumber(entry.amount)}">${entry.amount >= 0 ? '+' : ''}${yen.format(entry.amount)}</b></div>`).join('')}</div></section>`;
}

export function renderCompany(state: GameState): string {
  const tabs: Array<[CompanyTab, string]> = [['team', '人材'], ['facilities', '設備'], ['finance', '資金・融資']];
  const content = state.companyTab === 'team' ? teamView(state) : state.companyTab === 'facilities' ? facilitiesView(state) : financeView(state);
  return `<section class="view"><header class="view-head"><div><span class="eyebrow">COMPANY</span><h2>会社</h2></div><p>社員の個性、組み合わせ、成長とオフィスの拡大が会社の強さへ直接つながります。</p></header><nav class="subnav">${tabs.map(([id, label]) => `<button class="${state.companyTab === id ? 'is-active' : ''}" data-action="company-tab" data-tab="${id}">${label}</button>`).join('')}</nav>${content}</section>`;
}
