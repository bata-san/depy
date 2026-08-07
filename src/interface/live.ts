import { ROLE_LABELS, SPECIALTY_LABELS, TRAIT_LABELS } from '../data';
import { businessDateLabel } from '../business-cycle';
import { getFactoryLineSnapshot } from '../factory-operations';
import { financeSummary, runwayWeeks } from '../simulation';
import { operationsStaffEffect, projectStaffEffect, researchStaffEffect, salesStaffEffect } from '../staff-effects';
import type { GameState, ProjectStage } from '../types';
import { esc, toneForNumber, yen } from './format';
import { nextAction } from './render-shell';

const stageLabels: Record<ProjectStage, string> = {
  concept: '企画', architecture: '詳細設計', tapeout: 'テープアウト', prototype: '試作', validation: '検証', ready: '完成',
};

const setText = (element: Element | null, value: string): void => {
  if (element && element.textContent !== value) element.textContent = value;
};

const setClassTone = (element: Element | null, tone: string): void => {
  if (!(element instanceof HTMLElement)) return;
  element.classList.remove('is-good', 'is-warning', 'is-bad');
  if (tone) element.classList.add(tone);
};

const setMeter = (element: Element | null, value: number): void => {
  if (!(element instanceof HTMLElement)) return;
  const width = `${Math.max(0, Math.min(100, value))}%`;
  if (element.style.width !== width) element.style.width = width;
};

function patchHud(root: HTMLElement, state: GameState): void {
  const finance = financeSummary(state, 4);
  const runway = runwayWeeks(state);
  setText(root.querySelector('[data-hud-business]'), businessDateLabel(state));
  setText(root.querySelector('[data-hud-tech]'), `技術年 ${state.date.year} · ${state.date.week}週`);
  const cash = root.querySelector('[data-hud-cash]');
  setText(cash, yen.format(state.cash));
  setClassTone(cash, state.cash < 10_000_000 ? 'is-bad' : '');
  const net = root.querySelector('[data-hud-net]');
  setText(net, `4週 ${finance.net >= 0 ? '+' : ''}${yen.format(finance.net)}`);
  setClassTone(net, toneForNumber(finance.net));
  setText(root.querySelector('[data-hud-runway]'), runway > 999 ? '∞' : `${Math.floor(runway)}週`);
  setText(root.querySelector('[data-hud-reputation]'), `評判 ${state.reputation.toFixed(1)}`);

  const project = state.projects.find((item) => item.stage !== 'ready' && !item.paused);
  const product = state.products.find((item) => item.status === 'selling');
  setText(root.querySelector('[data-hud-progress-label]'), project ? 'DEVELOPMENT' : product ? 'SALES / 5 SEC' : 'STATUS');
  setText(root.querySelector('[data-hud-progress]'), project ? `${Math.round(project.progress)}%` : product ? `${product.weeklySales.toLocaleString()}台` : '準備中');
  setText(root.querySelector('[data-hud-progress-name]'), project?.codeName ?? product?.name ?? '最初の世代を開発');

  const objective = nextAction(state);
  const button = root.querySelector<HTMLElement>('[data-region="objective"]');
  if (button) {
    button.dataset.panel = objective.panel;
    button.dataset.tone = objective.tone;
  }
  setText(root.querySelector('[data-objective-label]'), objective.label);
  setText(root.querySelector('[data-objective-text]'), objective.text);
}

function patchProjects(root: HTMLElement, state: GameState): void {
  for (const project of state.projects) {
    const card = root.querySelector<HTMLElement>(`[data-project-card="${CSS.escape(project.id)}"]`);
    if (!card) continue;
    setText(card.querySelector('[data-project-progress]'), `${Math.round(project.progress)}%`);
    setText(card.querySelector('[data-project-stage]'), stageLabels[project.stage]);
    setMeter(card.querySelector('.ui-meter i'), project.progress);
    setText(card.querySelector('[data-project-performance]'), (project.metrics.performance * (1 - project.performancePenalty / 100)).toFixed(1));
    setText(card.querySelector('[data-project-reliability]'), `${Math.round(project.metrics.reliability - project.reliabilityPenalty)}%`);
    const line = card.querySelector<HTMLElement>(`[data-project-team="${CSS.escape(project.id)}"]`);
    if (line && project.stage !== 'ready') {
      const effect = projectStaffEffect(state, project);
      const weak = effect.weakRole ? ` · 不足 ${ROLE_LABELS[effect.weakRole]}` : '';
      line.textContent = `TEAM ×${effect.speed.toFixed(2)} · ${effect.leadName} · 適性 ${Math.round(effect.coverage * 100)}%${weak}`;
      line.dataset.tone = effect.quality >= 68 ? 'good' : effect.quality >= 54 ? 'warning' : 'bad';
    }
  }
}

function patchProducts(root: HTMLElement, state: GameState): void {
  const active = state.products.filter((product) => product.status !== 'eol');
  for (const product of active) {
    const card = root.querySelector<HTMLElement>(`[data-product-card="${CSS.escape(product.id)}"]`);
    if (!card) continue;
    const lost = Math.max(0, product.weeklyDemand - product.weeklySales);
    const supply = product.weeklyDemand ? product.weeklyProduced / product.weeklyDemand * 100 : 100;
    setText(card.querySelector('[data-product-rating]'), product.rating.toFixed(1));
    setText(card.querySelector('[data-product-sales]'), product.weeklySales.toLocaleString());
    setText(card.querySelector('[data-product-demand]'), `需要 ${product.weeklyDemand.toLocaleString()}`);
    setText(card.querySelector('[data-product-produced]'), product.weeklyProduced.toLocaleString());
    setText(card.querySelector('[data-product-supply]'), `供給率 ${Math.round(supply)}%`);
    setText(card.querySelector('[data-product-lost]'), lost.toLocaleString());
    setText(card.querySelector('[data-product-profit]'), yen.format(product.weeklyProfit));
  }
  setText(root.querySelector('[data-summary-demand]'), active.reduce((sum, product) => sum + product.weeklyDemand, 0).toLocaleString());
  setText(root.querySelector('[data-summary-produced]'), active.reduce((sum, product) => sum + product.weeklyProduced, 0).toLocaleString());
  setText(root.querySelector('[data-summary-sales]'), active.reduce((sum, product) => sum + product.weeklySales, 0).toLocaleString());
  setText(root.querySelector('[data-summary-profit]'), yen.format(active.reduce((sum, product) => sum + product.weeklyProfit, 0)));
  setText(root.querySelector('[data-sales-team]'), `販促 ×${salesStaffEffect(state).toFixed(2)} · 生産管理 ×${operationsStaffEffect(state).toFixed(2)} · 5秒ごとに販売`);
}

function patchFactories(root: HTMLElement, state: GameState): void {
  for (const contract of state.contracts.filter((item) => item.active)) {
    const card = root.querySelector<HTMLElement>(`[data-factory-card="${CSS.escape(contract.id)}"]`);
    if (!card) continue;
    const line = getFactoryLineSnapshot(state, contract);
    const status = contract.setupRemaining ? `立上げ ${contract.setupRemaining}週` : line.maintenance < 35 ? '要整備' : '稼働中';
    setText(card.querySelector('[data-factory-status]'), status);
    setClassTone(card.querySelector('[data-factory-status]'), line.maintenance < 35 ? 'is-bad' : contract.setupRemaining ? 'is-warning' : 'is-good');
    setText(card.querySelector('[data-factory-capacity]'), `${line.effectiveCapacity.toLocaleString()} / 5秒`);
    setText(card.querySelector('[data-factory-remaining]'), `${contract.remainingWeeks}週`);
    setText(card.querySelector('[data-factory-allocated]'), line.allocated.toLocaleString());
    setText(card.querySelector('[data-factory-util]'), `${Math.round(line.utilization * 100)}%`);
    setText(card.querySelector('[data-factory-maint]'), String(Math.round(line.maintenance)));
    setText(card.querySelector('[data-factory-process]'), String(Math.round(line.processControl)));
    setText(card.querySelector('[data-factory-exp]'), String(Math.round(line.experience)));
    setText(card.querySelector('[data-factory-management]'), `${Math.round(line.management * 100)}%`);
  }
}

function patchResearch(root: HTMLElement, state: GameState): void {
  if (!state.activeResearch) return;
  const card = root.querySelector<HTMLElement>(`[data-research-area="${state.activeResearch.area}"]`);
  if (!card) return;
  setText(card.querySelector('[data-research-progress]'), `${Math.round(state.activeResearch.progress)}%`);
  setMeter(card.querySelector('.ui-meter i'), state.activeResearch.progress);
  const head = card.querySelector('header > strong');
  setText(head, `×${researchStaffEffect(state, state.activeResearch.area).toFixed(2)}`);
}

function patchStaff(root: HTMLElement, state: GameState): void {
  for (const member of state.staff) {
    const card = root.querySelector<HTMLElement>(`[data-staff-card="${CSS.escape(member.id)}"]`);
    if (!card) continue;
    setText(card.querySelector('[data-staff-role-label]'), ROLE_LABELS[member.role]);
    setText(card.querySelector('[data-staff-meta]'), `${SPECIALTY_LABELS[member.specialty]} · Lv.${member.level}`);
    setText(card.querySelector('[data-staff-skill]'), String(Math.round(member.skill)));
    const core: Record<string, number> = { skill: member.skill, creativity: member.creativity, discipline: member.discipline, growth: member.growth };
    for (const [key, value] of Object.entries(core)) setText(card.querySelector(`[data-staff-core="${key}"]`), String(Math.round(value)));
    const conditions: Record<string, number> = { morale: member.morale, fatigue: member.fatigue, loyalty: member.loyalty, xp: member.xp };
    for (const [key, value] of Object.entries(conditions)) setText(card.querySelector(`[data-staff-condition="${key}"]`), String(Math.round(value)));
    const roleSelect = card.querySelector<HTMLSelectElement>(`[data-staff-role="${CSS.escape(member.id)}"]`);
    if (roleSelect && roleSelect.value !== member.role) roleSelect.value = member.role;
    const traits = card.querySelector<HTMLElement>('.trait-list');
    if (traits) {
      const html = member.traits.map((trait) => `<span>${esc(TRAIT_LABELS[trait])}</span>`).join('');
      if (traits.innerHTML !== html) traits.innerHTML = html;
    }
  }
  const activeProject = state.projects.find((project) => project.stage !== 'ready');
  setText(root.querySelector('[data-team-engineering]'), `×${activeProject ? projectStaffEffect(state, activeProject).speed.toFixed(2) : '1.00'}`);
  setText(root.querySelector('[data-team-sales]'), `×${salesStaffEffect(state).toFixed(2)}`);
  setText(root.querySelector('[data-team-operations]'), `×${operationsStaffEffect(state).toFixed(2)}`);
  for (const candidate of state.candidates) setText(root.querySelector(`[data-candidate-card="${CSS.escape(candidate.id)}"] [data-candidate-expiry]`), `残り ${Math.max(0, candidate.expiresAtWeek - state.absoluteWeek)}週`);
}

function patchFinance(root: HTMLElement, state: GameState): void {
  setText(root.querySelector('[data-finance-cash]'), yen.format(state.cash));
  for (const loan of state.loans) {
    const card = root.querySelector<HTMLElement>(`[data-loan-card="${CSS.escape(loan.id)}"]`);
    if (!card) continue;
    setText(card.querySelector('[data-loan-balance]'), yen.format(loan.balance));
    setText(card.querySelector('[data-loan-weeks]'), `${loan.remainingWeeks}週`);
    setMeter(card.querySelector('.ui-meter i'), loan.balance / Math.max(1, loan.principal * (1 + loan.interestRate)) * 100);
  }
}

export function patchLiveInterface(root: HTMLElement, state: GameState): void {
  patchHud(root, state);
  if (state.activePanel === 'development') patchProjects(root, state);
  if (state.activePanel === 'products') patchProducts(root, state);
  if (state.activePanel === 'factories') patchFactories(root, state);
  if (state.activePanel === 'research') patchResearch(root, state);
  if (state.activePanel === 'company') {
    if (state.companyTab === 'team') patchStaff(root, state);
    if (state.companyTab === 'finance') patchFinance(root, state);
  }
}

export function panelStructureKey(state: GameState, modelKey: string): string {
  const projects = state.projects.map((project) => `${project.id}:${project.stage}:${project.paused}:${project.issues.filter((issue) => issue.status === 'open').length}`).join('|');
  const products = state.products.map((product) => `${product.id}:${product.status}`).join('|');
  const contracts = state.contracts.map((contract) => `${contract.id}:${contract.active}`).join('|');
  const staff = state.staff.map((member) => `${member.id}:${member.role}`).join('|');
  const candidates = state.candidates.map((candidate) => candidate.id).join('|');
  const research = state.activeResearch ? `${state.activeResearch.area}:${state.activeResearch.paused}` : 'none';
  const rivals = state.competitors.map((company) => `${company.id}:${company.status}:${company.models.length}`).join('|');
  const loans = state.loans.map((loan) => loan.id).join('|');
  return `${state.activePanel}#${state.companyTab}#${state.selectedSeriesId}#${projects}#${products}#${contracts}#${staff}#${candidates}#${research}#${rivals}#${loans}#${state.market.headline}#${modelKey}`;
}
