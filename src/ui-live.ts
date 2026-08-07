import { ROLE_LABELS } from './data';
import { businessDateLabel } from './business-cycle';
import { operationsStaffEffect, projectStaffEffect, researchStaffEffect, salesStaffEffect } from './staff-effects';
import type { GameState, ProjectStage } from './types';

const stages: Record<ProjectStage, string> = {
  concept: '企画', architecture: '詳細設計', tapeout: 'テープアウト', prototype: '試作', validation: '検証', ready: '完成',
};

const yen = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 });

const setText = (element: Element | null, value: string): void => {
  if (element && element.textContent !== value) element.textContent = value;
};

const setMeter = (element: Element | null, value: number): void => {
  if (!(element instanceof HTMLElement)) return;
  const width = `${Math.max(0, Math.min(100, value))}%`;
  if (element.style.width !== width) element.style.width = width;
};

function ensureLiveLine(parent: HTMLElement, className: string): HTMLElement {
  const existing = parent.querySelector<HTMLElement>(`.${className}`);
  if (existing) return existing;
  const node = document.createElement('div');
  node.className = className;
  parent.append(node);
  return node;
}

function updateHud(root: HTMLElement, state: GameState): void {
  const stats = root.querySelectorAll<HTMLElement>('.top-hud .hud-stat');
  const business = stats[0];
  if (business) {
    setText(business.querySelector('small'), 'BUSINESS CALENDAR');
    setText(business.querySelector('b'), businessDateLabel(state));
    setText(business.querySelector('span'), `技術年 ${state.date.year}年 · ${state.date.week}週`);
  }
  const cash = stats[1];
  if (cash) setText(cash.querySelector('b'), yen.format(state.cash));

  const activeProject = state.projects.find((project) => project.stage !== 'ready' && !project.paused);
  const activeProduct = state.products.find((product) => product.status === 'selling');
  const hud = root.querySelector('.progress-stat');
  if (hud) {
    setText(hud.querySelector('small'), activeProject ? 'DEVELOPMENT' : activeProduct ? 'SALES / 5 SEC' : 'STATUS');
    setText(hud.querySelector('b'), activeProject ? `${Math.round(activeProject.progress)}%` : activeProduct ? `${activeProduct.weeklySales.toLocaleString()}台` : '準備中');
    setText(hud.querySelector('span'), activeProject?.codeName ?? activeProduct?.name ?? '最初の世代を開発');
  }
}

function updateProjects(root: HTMLElement, state: GameState): void {
  const cards = root.querySelectorAll<HTMLElement>('.project-card');
  cards.forEach((card, index) => {
    const project = state.projects[index];
    if (!project) return;
    setText(card.querySelector('.project-percent'), `${Math.round(project.progress)}%`);
    setText(card.querySelector('header .badge'), stages[project.stage]);
    setMeter(card.querySelector('.meter i'), project.progress);
    if (project.stage === 'ready') return;
    const effect = projectStaffEffect(state, project);
    const line = ensureLiveLine(card, 'staff-impact-live');
    const weak = effect.weakRole ? ` · 不足 ${ROLE_LABELS[effect.weakRole]}` : '';
    const quality = effect.quality >= 82 ? '最高' : effect.quality >= 68 ? '良好' : effect.quality >= 54 ? '不安' : '危険';
    setText(line, `TEAM ×${effect.speed.toFixed(2)} · ${effect.leadName} · 適性${Math.round(effect.coverage * 100)}% · 品質 ${quality}${weak}`);
    line.dataset.tone = effect.quality >= 68 ? 'good' : effect.quality >= 54 ? 'warning' : 'bad';
  });
}

function updateResearch(root: HTMLElement, state: GameState): void {
  const research = state.activeResearch;
  const card = root.querySelector<HTMLElement>('.research-card.active');
  if (!research || !card) return;
  setText(card.querySelector('.research-progress b'), `${Math.round(research.progress)}%`);
  setMeter(card.querySelector('.research-progress .meter i'), research.progress);
  const factor = researchStaffEffect(state, research.area);
  const line = ensureLiveLine(card, 'staff-impact-live');
  setText(line, `研究チーム ×${factor.toFixed(2)} · 人材構成で研究速度が変化`);
  line.dataset.tone = factor >= 1.15 ? 'good' : factor >= .8 ? 'warning' : 'bad';
}

function updateProducts(root: HTMLElement, state: GameState): void {
  const selling = state.products.filter((product) => product.status === 'selling');
  const cards = root.querySelectorAll<HTMLElement>('.product-list > .product-card');
  cards.forEach((card, index) => {
    const product = selling[index];
    if (!product) return;
    const hero = card.querySelectorAll<HTMLElement>('.sales-hero > div');
    const lost = Math.max(0, product.weeklyDemand - product.weeklySales);
    const supplyRate = product.weeklyDemand ? product.weeklyProduced / product.weeklyDemand * 100 : 100;
    if (hero[0]) {
      setText(hero[0].querySelector('b'), product.weeklySales.toLocaleString());
      setText(hero[0].querySelector('span'), `需要 ${product.weeklyDemand.toLocaleString()}`);
    }
    if (hero[1]) {
      setText(hero[1].querySelector('b'), product.weeklyProduced.toLocaleString());
      setText(hero[1].querySelector('span'), `供給率 ${Math.round(supplyRate)}%`);
    }
    if (hero[2]) setText(hero[2].querySelector('b'), lost.toLocaleString());
    if (hero[3]) setText(hero[3].querySelector('b'), yen.format(product.weeklyProfit));
    const rating = card.querySelector<HTMLElement>('.rating b');
    if (rating) setText(rating, product.rating.toFixed(1));
  });

  const panel = root.querySelector<HTMLElement>('.product-list')?.closest<HTMLElement>('.panel-section');
  const summary = panel?.querySelectorAll<HTMLElement>('.summary-strip > div');
  if (summary?.length) {
    const demand = selling.reduce((sum, product) => sum + product.weeklyDemand, 0);
    const produced = selling.reduce((sum, product) => sum + product.weeklyProduced, 0);
    const sold = selling.reduce((sum, product) => sum + product.weeklySales, 0);
    const profit = selling.reduce((sum, product) => sum + product.weeklyProfit, 0);
    setText(summary[0]?.querySelector('b') ?? null, demand.toLocaleString());
    setText(summary[1]?.querySelector('b') ?? null, produced.toLocaleString());
    setText(summary[2]?.querySelector('b') ?? null, sold.toLocaleString());
    setText(summary[3]?.querySelector('b') ?? null, yen.format(profit));
  }

  const teamLineHost = panel?.querySelector<HTMLElement>('.section-head');
  if (teamLineHost) {
    const line = ensureLiveLine(teamLineHost, 'business-team-live');
    setText(line, `販促チーム ×${salesStaffEffect(state).toFixed(2)} · 生産管理 ×${operationsStaffEffect(state).toFixed(2)} · 5秒ごとに販売`);
  }
}

export function updateRealtimeUI(root: HTMLElement, state: GameState): void {
  updateHud(root, state);
  updateProjects(root, state);
  updateResearch(root, state);
  updateProducts(root, state);
}

export function realtimeStructureKey(state: GameState): string {
  const projects = state.projects.map((project) => `${project.id}:ready=${project.stage === 'ready'}:paused=${project.paused}:issues=${project.issues.filter((issue) => issue.status === 'open').length}`).join('|');
  const products = state.products.map((product) => `${product.id}:${product.status}`).join('|');
  const research = state.activeResearch ? `${state.activeResearch.area}:${state.activeResearch.paused}` : 'none';
  const event = state.activeEvent?.id ?? 'none';
  const candidates = state.candidates.map((candidate) => candidate.id).join(',');
  return `${projects}#research:${research}#products:${products}#event:${event}#candidates:${candidates}#staff:${state.staff.length}#notices:${state.notifications.length}`;
}
