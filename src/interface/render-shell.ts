import { businessDateLabel } from '../business-cycle';
import { financeSummary, runwayWeeks } from '../simulation';
import type { GameState, PanelId } from '../types';
import type { InterfaceModel } from './model';
import { renderCompetitors, renderFactories, renderProducts } from './render-business';
import { renderCompany, renderResearch } from './render-company';
import { renderDevelopment } from './render-development';
import { esc, toneForNumber, yen } from './format';

export const panelItems: Array<[PanelId, string, string]> = [
  ['development', '開発', 'DEV'],
  ['products', '製品', 'SELL'],
  ['factories', '工場', 'FAB'],
  ['competitors', '競合', 'RIVAL'],
  ['research', '研究', 'R&D'],
  ['company', '会社', 'TEAM'],
];

export const panelNames: Record<PanelId, string> = {
  home: 'オフィス', development: '開発', products: '製品', factories: '工場', competitors: '競合', research: '研究', company: '会社',
};

export function renderShell(state: GameState): string {
  const finance = financeSummary(state, 4);
  const runway = runwayWeeks(state);
  return `<div class="interface-shell">
    <header class="top-line" data-region="hud">
      <button class="brand-link" data-action="panel" data-panel="home"><b>PC FRONTIER</b><span>${esc(state.companyName)}</span></button>
      <div class="hud-readout"><small>BUSINESS</small><b data-hud-business>${esc(businessDateLabel(state))}</b><span data-hud-tech>技術年 ${state.date.year} · ${state.date.week}週</span></div>
      <div class="hud-readout"><small>CASH</small><b class="${state.cash < 10_000_000 ? 'is-bad' : ''}" data-hud-cash>${yen.format(state.cash)}</b><span data-hud-net class="${toneForNumber(finance.net)}">4週 ${finance.net >= 0 ? '+' : ''}${yen.format(finance.net)}</span></div>
      <div class="hud-readout"><small>RUNWAY</small><b data-hud-runway>${runway > 999 ? '∞' : `${Math.floor(runway)}週`}</b><span data-hud-reputation>評判 ${state.reputation.toFixed(1)}</span></div>
      <div class="hud-readout hud-progress"><small data-hud-progress-label>STATUS</small><b data-hud-progress>準備中</b><span data-hud-progress-name>最初の世代を開発</span></div>
      <div class="utility-actions"><button data-action="camera-reset" aria-label="カメラを戻す">VIEW</button><button data-action="save-manager" aria-label="セーブ管理">SAVE</button></div>
    </header>
    <button class="objective-line" data-region="objective" data-action="objective"><span></span><div><small data-objective-label>NEXT</small><b data-objective-text></b></div><em>→</em></button>
    <nav class="command-bar" aria-label="主要コマンド"><button class="command-link ${state.activePanel === 'home' ? 'is-active' : ''}" data-action="panel" data-panel="home"><small>VIEW</small><b>オフィス</b></button>${panelItems.map(([id, label, short]) => `<button class="command-link ${state.activePanel === id ? 'is-active' : ''}" data-action="panel" data-panel="${id}"><small>${short}</small><b>${label}</b></button>`).join('')}</nav>
    <aside class="tool-window" data-region="panel" ${state.activePanel === 'home' ? 'hidden' : ''}><header><div><small>MANAGEMENT</small><h1 data-panel-title>${esc(panelNames[state.activePanel])}</h1></div><button data-action="close-panel">×</button></header><div class="tool-scroll" data-region="panel-body"></div></aside>
    <div class="event-layer" data-region="event"></div>
  </div>`;
}

export function renderPanel(state: GameState, model: InterfaceModel): string {
  if (state.activePanel === 'development') return renderDevelopment(state, model);
  if (state.activePanel === 'products') return renderProducts(state);
  if (state.activePanel === 'factories') return renderFactories(state);
  if (state.activePanel === 'competitors') return renderCompetitors(state);
  if (state.activePanel === 'research') return renderResearch(state);
  if (state.activePanel === 'company') return renderCompany(state);
  return '';
}

export function nextAction(state: GameState): { label: string; text: string; panel: PanelId; tone: 'info' | 'good' | 'warning' | 'bad' } {
  if (state.activeEvent) return { label: '経営判断', text: state.activeEvent.title, panel: 'company', tone: 'bad' };
  const issue = state.projects.find((project) => project.issues.some((item) => item.status === 'open'));
  if (issue) return { label: '開発停止', text: `${issue.codeName}の問題へ対応`, panel: 'development', tone: 'bad' };
  const ready = state.projects.find((project) => project.stage === 'ready' && !state.products.some((product) => product.projectId === project.id));
  if (ready) return { label: '発売準備', text: `${ready.codeName}を製品化`, panel: 'development', tone: 'good' };
  const shortage = state.products.find((product) => product.status === 'selling' && product.weeklyDemand > product.weeklySales * 1.2);
  if (shortage) return { label: '供給不足', text: `${shortage.name} · ${Math.max(0, shortage.weeklyDemand - shortage.weeklySales).toLocaleString()}台不足`, panel: 'factories', tone: 'warning' };
  const project = state.projects.find((item) => item.stage !== 'ready' && !item.paused);
  if (project) return { label: '開発中', text: `${project.codeName} · ${Math.round(project.progress)}%`, panel: 'development', tone: 'info' };
  return { label: '次の行動', text: '次世代設計を開始する', panel: 'development', tone: 'info' };
}

export function renderEvent(state: GameState): string {
  const event = state.activeEvent;
  if (!event) return '';
  const source = { market: 'MARKET', competitor: 'RIVAL', factory: 'FACTORY', internal: 'TEAM' }[event.source];
  return `<section class="decision-sheet" role="dialog" aria-modal="true"><header><span>${source}</span><h2>${esc(event.title)}</h2><small>${state.date.year} · ${state.date.week}週</small></header><p>${esc(event.description)}</p><div class="decision-options">${event.choices.map((choice) => `<button class="${choice.tone ? `is-${choice.tone}` : ''}" data-action="event-choice" data-id="${choice.id}"><b>${esc(choice.label)}</b><span>${esc(choice.description)}</span>${choice.cost ? `<em>${yen.format(choice.cost)}</em>` : ''}</button>`).join('')}</div></section>`;
}
