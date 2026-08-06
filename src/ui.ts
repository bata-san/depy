import { RESEARCH_DEFINITIONS } from './data';
import {
  cancelContract,
  changeContractCapacity,
  changeProductAllocation,
  changeProductPrice,
  contractFactory,
  createSeries,
  dateLabel,
  defaultDesign,
  defaultTechnology,
  dismissNotification,
  dismissStaff,
  endProductNow,
  financeSummary,
  giveStaffBonus,
  hireCandidate,
  improveProductSupport,
  launchProduct,
  releaseProductUpdate,
  resetState,
  resolveDecisionEvent,
  resolveProjectIssue,
  runMarketingCampaign,
  runwayWeeks,
  saveState,
  startGeneration,
  startResearch,
  takeLoan,
  toggleProjectPause,
  toggleResearchPause,
  trainStaff,
  upgradeFacility,
} from './simulation';
import { showToast } from './toast';
import type {
  CompanyTab,
  DesignValues,
  GameState,
  LaunchDraft,
  PackageType,
  PanelId,
  ProductCategory,
  ResearchArea,
  RiskPosture,
  SeriesFocus,
  SkuProfile,
} from './types';
import { renderCompetitors, renderFactories, renderProducts } from './ui-business';
import { renderCompany, renderResearch } from './ui-company';
import { renderDevelopment } from './ui-development';
import { esc, panelName, pct, yen } from './ui-format';
import type { UIModel } from './ui-model';

interface Hooks {
  onStateChange: () => void;
  onReset: (state: GameState) => void;
  onOpenSaveManager: () => void;
  onResetCamera: () => void;
}

interface ActionResult { ok: boolean; message: string }

const panelItems: Array<[PanelId, string, string]> = [
  ['development', '開発', '◈'], ['products', '製品', '▥'], ['factories', '工場', '▦'],
  ['competitors', '競合', '◎'], ['research', '研究', '⌁'], ['company', '会社', '◇'],
];

export class GameUI {
  private state: GameState;
  private model: UIModel = {
    draft: null,
    seriesName: '',
    seriesCategory: 'cpu',
    seriesFocus: 'balanced',
    launchProjectId: null,
    launchSku: 'standard',
    launchPrice: 50_000,
    launchLife: 78,
    launchMarketing: 3_000_000,
    panelCompact: false,
  };

  constructor(private root: HTMLElement, state: GameState, private hooks: Hooks) {
    this.state = state;
    root.addEventListener('click', (event) => this.handleClick(event));
    root.addEventListener('input', (event) => this.handleInput(event, false));
    root.addEventListener('change', (event) => this.handleInput(event, true));
  }

  setState(state: GameState): void { this.state = state; }

  render(): void {
    this.ensureSelections();
    const drawer = this.root.querySelector<HTMLElement>('.management-drawer-body');
    const scrollTop = drawer?.scrollTop ?? 0;
    const focused = document.activeElement instanceof HTMLElement && this.root.contains(document.activeElement) ? document.activeElement : null;
    const focusKey = focused ? this.focusKey(focused) : '';
    const selection = focused instanceof HTMLInputElement ? [focused.selectionStart, focused.selectionEnd] as const : null;

    this.root.innerHTML = `${this.renderHud()}${this.renderNavigation()}${this.renderObjective()}${this.renderNotifications()}${this.renderDrawer()}${this.renderDecisionEvent()}<div class="legal-note">実在企業の未来モデルはゲーム内の非公式予測です。</div>`;

    const replacementDrawer = this.root.querySelector<HTMLElement>('.management-drawer-body');
    if (replacementDrawer) replacementDrawer.scrollTop = scrollTop;
    if (focusKey) {
      const replacement = [...this.root.querySelectorAll<HTMLElement>('input,select,textarea')].find((item) => this.focusKey(item) === focusKey);
      replacement?.focus({ preventScroll: true });
      if (selection && replacement instanceof HTMLInputElement) replacement.setSelectionRange(selection[0], selection[1]);
    }
  }

  private focusKey(element: HTMLElement): string {
    const data = Object.entries(element.dataset).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}:${value}`).join('|');
    return `${element.tagName}:${element.getAttribute('name') ?? ''}:${data}`;
  }

  private ensureSelections(): void {
    if (!this.state.selectedSeriesId || !this.state.series.some((item) => item.id === this.state.selectedSeriesId)) this.state.selectedSeriesId = this.state.series[0]?.id ?? null;
    if (this.model.draft && this.model.draft.seriesId !== this.state.selectedSeriesId) this.model.draft = null;
  }

  private renderHud(): string {
    const finance = financeSummary(this.state, 4);
    const runway = runwayWeeks(this.state);
    const project = this.state.projects.find((item) => item.stage !== 'ready' && !item.paused);
    const activeProduct = this.state.products.find((item) => item.status === 'selling');
    return `<header class="top-hud voxel-panel">
      <button class="company-button" data-action="panel" data-panel="home"><span class="company-logo">PF</span><span><strong>${esc(this.state.companyName)}</strong><small>Office Lv.${this.state.officeLevel} · 社員${this.state.staff.length}名</small></span></button>
      <div class="hud-stat"><small>DATE</small><b>${dateLabel(this.state.date)}</b><span>標準 1年≈5時間</span></div>
      <div class="hud-stat"><small>CASH</small><b class="${this.state.cash < 10_000_000 ? 'bad' : ''}">${yen.format(this.state.cash)}</b><span>4週 ${finance.net >= 0 ? '+' : ''}${yen.format(finance.net)}</span></div>
      <div class="hud-stat"><small>RUNWAY</small><b class="${runway < 18 ? 'bad' : ''}">${runway > 999 ? '∞' : `${Math.floor(runway)}週`}</b><span>評判 ${this.state.reputation.toFixed(1)}</span></div>
      <div class="hud-stat progress-stat"><small>${project ? 'DEVELOPMENT' : activeProduct ? 'SALES' : 'STATUS'}</small><b>${project ? `${Math.round(project.progress)}%` : activeProduct ? `${activeProduct.weeklySales.toLocaleString()}台` : '準備中'}</b><span>${project?.codeName ?? activeProduct?.name ?? '最初の世代を開発'}</span></div>
      <div class="time-controls">${([0, 1, 3, 8] as const).map((speed) => `<button class="${this.state.speed === speed ? 'active' : ''}" data-action="speed" data-speed="${speed}">${speed === 0 ? 'Ⅱ' : `×${speed}`}</button>`).join('')}<button data-action="camera-reset" title="カメラを初期位置へ">⌂</button><button data-action="save-manager" title="セーブ管理">▣</button></div>
    </header>`;
  }

  private renderNavigation(): string {
    return `<nav class="quick-nav voxel-panel"><button class="nav-item home ${this.state.activePanel === 'home' ? 'active' : ''}" data-action="panel" data-panel="home"><b>⌂</b><span>オフィス</span></button>${panelItems.map(([id, label, icon]) => `<button class="nav-item ${this.state.activePanel === id ? 'active' : ''}" data-action="panel" data-panel="${id}"><b>${icon}</b><span>${label}</span></button>`).join('')}</nav>`;
  }

  private nextAction(): { title: string; text: string; panel: PanelId; tone: string } {
    if (this.state.activeEvent) return { title: '経営判断', text: this.state.activeEvent.title, panel: 'company', tone: 'bad' };
    const issue = this.state.projects.find((project) => project.issues.some((item) => item.status === 'open'));
    if (issue) return { title: '開発停止', text: `${issue.codeName}の問題へ対応`, panel: 'development', tone: 'bad' };
    const ready = this.state.projects.find((project) => project.stage === 'ready' && !this.state.products.some((product) => product.projectId === project.id));
    if (ready) return { title: '発売準備', text: `${ready.codeName}のSKUと工場割当を決定`, panel: 'development', tone: 'good' };
    const product = this.state.products.find((item) => item.status === 'selling' && item.weeklyDemand > item.weeklySales * 1.2);
    if (product) return { title: '供給不足', text: `${product.name}: ${Math.max(0, product.weeklyDemand - product.weeklySales).toLocaleString()}台の機会損失`, panel: 'factories', tone: 'warning' };
    const project = this.state.projects.find((item) => item.stage !== 'ready' && !item.paused);
    if (project) return { title: '世代開発中', text: `${project.codeName} ${Math.round(project.progress)}% · 約4分で完了`, panel: 'development', tone: 'info' };
    return { title: '次の判断', text: 'シリーズを選んで次世代設計を開始', panel: 'development', tone: 'info' };
  }

  private renderObjective(): string {
    const item = this.nextAction();
    return `<button class="objective-card voxel-panel ${item.tone}" data-action="panel" data-panel="${item.panel}"><i></i><span><small>${esc(item.title)}</small><b>${esc(item.text)}</b></span><strong>→</strong></button>`;
  }

  private renderNotifications(): string {
    return `<div class="notification-rail">${this.state.notifications.slice(0, 3).map((item) => `<article class="notice ${item.tone}"><span></span><div><b>${esc(item.title)}</b><p>${esc(item.message)}</p></div><button data-action="dismiss-notice" data-id="${item.id}">×</button></article>`).join('')}</div>`;
  }

  private renderDrawer(): string {
    if (this.state.activePanel === 'home') return '';
    return `<aside class="management-drawer voxel-panel ${this.model.panelCompact ? 'compact' : ''}"><header><div><small>MANAGEMENT</small><h1>${esc(panelName[this.state.activePanel])}</h1></div><div><button data-action="panel-compact" title="${this.model.panelCompact ? '展開' : '最小化'}">${this.model.panelCompact ? '□' : '−'}</button><button data-action="close-panel">×</button></div></header>${this.model.panelCompact ? `<button class="drawer-restore" data-action="panel-compact">${esc(panelName[this.state.activePanel])}を開く</button>` : `<div class="management-drawer-body">${this.renderPanelContent()}</div>`}</aside>`;
  }

  private renderPanelContent(): string {
    if (this.state.activePanel === 'development') return renderDevelopment(this.state, this.model);
    if (this.state.activePanel === 'products') return renderProducts(this.state);
    if (this.state.activePanel === 'factories') return renderFactories(this.state);
    if (this.state.activePanel === 'competitors') return renderCompetitors(this.state);
    if (this.state.activePanel === 'research') return renderResearch(this.state);
    if (this.state.activePanel === 'company') return renderCompany(this.state);
    return '';
  }

  private renderDecisionEvent(): string {
    const event = this.state.activeEvent;
    if (!event) return '';
    const source = { market: '市場', competitor: '競合', factory: '工場', internal: '社内' }[event.source];
    return `<div class="decision-backdrop"><section class="decision-modal voxel-panel"><header><div><small>${source} EVENT</small><h2>${esc(event.title)}</h2></div><span>${this.state.date.year}年 ${this.state.date.week}週</span></header><p>${esc(event.description)}</p><div class="decision-choices">${event.choices.map((choice) => `<button class="${choice.tone ?? ''}" data-action="event-choice" data-id="${choice.id}"><b>${esc(choice.label)}</b><span>${esc(choice.description)}</span>${choice.cost ? `<small>${yen.format(choice.cost)}</small>` : ''}</button>`).join('')}</div></section></div>`;
  }

  private selectedSeries() { return this.state.series.find((series) => series.id === this.state.selectedSeriesId) ?? this.state.series[0]; }

  private result(result: ActionResult | undefined): void {
    if (!result) return;
    showToast(result.message, result.ok ? 'good' : 'bad');
  }

  private finish(result?: ActionResult): void {
    this.result(result);
    saveState(this.state);
    this.hooks.onStateChange();
  }

  private handleClick(event: Event): void {
    const button = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    let result: ActionResult | undefined;

    if (action === 'panel') { this.state.activePanel = button.dataset.panel as PanelId; this.model.panelCompact = false; }
    else if (action === 'close-panel') this.state.activePanel = 'home';
    else if (action === 'panel-compact') this.model.panelCompact = !this.model.panelCompact;
    else if (action === 'speed') this.state.speed = Number(button.dataset.speed) as GameState['speed'];
    else if (action === 'camera-reset') { this.hooks.onResetCamera(); showToast('カメラを初期位置へ戻しました。普段の操作では視点を上書きしません。', 'info', '3Dカメラ'); }
    else if (action === 'save-manager') { this.hooks.onOpenSaveManager(); return; }
    else if (action === 'dismiss-notice') dismissNotification(this.state, button.dataset.id ?? '');
    else if (action === 'select-series') { this.state.selectedSeriesId = button.dataset.id ?? null; this.model.draft = null; }
    else if (action === 'create-series') { result = createSeries(this.state, this.model.seriesName, this.model.seriesCategory, this.model.seriesFocus); if (result.ok) this.model.seriesName = ''; }
    else if (action === 'new-design') {
      const series = this.selectedSeries();
      if (series) this.model.draft = { seriesId: series.id, codeName: `${series.name.replaceAll(' ', '')}-${series.generation + 1}`, values: defaultDesign(this.state, series), technology: defaultTechnology(this.state), leadStaffId: null };
    }
    else if (action === 'start-generation') {
      const series = this.selectedSeries(); const draft = this.model.draft;
      if (series && draft) result = startGeneration(this.state, series.id, draft.codeName, draft.values, draft.technology, draft.leadStaffId);
      if (result?.ok) this.model.draft = null;
    }
    else if (action === 'toggle-project') toggleProjectPause(this.state, button.dataset.id ?? '');
    else if (action === 'resolve-issue') result = resolveProjectIssue(this.state, button.dataset.project ?? '', button.dataset.issue ?? '', button.dataset.choice as 'fix' | 'workaround' | 'ignore');
    else if (action === 'prepare-launch') {
      const id = button.dataset.id ?? '';
      if (this.model.launchProjectId === id) this.model.launchProjectId = null;
      else {
        const project = this.state.projects.find((item) => item.id === id);
        this.model.launchProjectId = id; this.model.launchSku = 'standard'; this.model.launchPrice = Math.round((project?.metrics.suggestedPrice ?? 50_000) / 1000) * 1000; this.model.launchLife = 78; this.model.launchMarketing = 3_000_000;
      }
    }
    else if (action === 'launch-product') {
      const allocations = [...this.root.querySelectorAll<HTMLInputElement>('[data-launch-allocation]')].map((input) => ({ contractId: input.dataset.launchAllocation ?? '', allocation: Number(input.value) })).filter((item) => item.contractId && item.allocation > 0);
      const draft: LaunchDraft = { projectId: button.dataset.id ?? '', factoryAllocations: allocations, skuProfile: this.model.launchSku, price: this.model.launchPrice, lifeWeeks: this.model.launchLife, launchMarketing: this.model.launchMarketing };
      result = launchProduct(this.state, draft); if (result.ok) { this.model.launchProjectId = null; this.state.activePanel = 'products'; }
    }
    else if (action === 'product-update') result = releaseProductUpdate(this.state, button.dataset.id ?? '');
    else if (action === 'product-support') result = improveProductSupport(this.state, button.dataset.id ?? '');
    else if (action === 'product-marketing') result = runMarketingCampaign(this.state, button.dataset.id ?? '', 3_000_000);
    else if (action === 'product-eol') { if (confirm('この製品を今すぐ終売しますか？')) endProductNow(this.state, button.dataset.id ?? ''); }
    else if (action === 'contract-factory') result = contractFactory(this.state, button.dataset.id ?? '', Math.min(1000, Number(button.dataset.capacity ?? 1000)));
    else if (action === 'cancel-contract') { if (confirm('工場契約を解約しますか？最低期間中は違約金が発生します。')) result = cancelContract(this.state, button.dataset.id ?? ''); }
    else if (action === 'start-research') result = startResearch(this.state, button.dataset.area as ResearchArea);
    else if (action === 'toggle-research') toggleResearchPause(this.state);
    else if (action === 'company-tab') this.state.companyTab = button.dataset.tab as CompanyTab;
    else if (action === 'hire') result = hireCandidate(this.state, button.dataset.id ?? '');
    else if (action === 'staff-train') result = trainStaff(this.state, button.dataset.id ?? '');
    else if (action === 'staff-bonus') result = giveStaffBonus(this.state, button.dataset.id ?? '');
    else if (action === 'staff-dismiss') { if (confirm('退職金を支払い契約を終了しますか？')) result = dismissStaff(this.state, button.dataset.id ?? ''); }
    else if (action === 'facility-upgrade') result = upgradeFacility(this.state, button.dataset.id as Parameters<typeof upgradeFacility>[1]);
    else if (action === 'loan') result = takeLoan(this.state, Number(button.dataset.amount) as 25_000_000 | 60_000_000 | 120_000_000);
    else if (action === 'event-choice') result = resolveDecisionEvent(this.state, button.dataset.id ?? '');
    else if (action === 'reset-game' && confirm('現在の会社を初期状態へ戻しますか？')) { const next = resetState(); this.state = next; this.model.draft = null; this.hooks.onReset(next); return; }

    this.finish(result);
  }

  private handleInput(event: Event, commit: boolean): void {
    const input = event.target as HTMLInputElement | HTMLSelectElement;
    if (input.dataset.model === 'seriesName') this.model.seriesName = input.value;
    if (input.dataset.model === 'seriesCategory') this.model.seriesCategory = input.value as ProductCategory;
    if (input.dataset.model === 'seriesFocus') this.model.seriesFocus = input.value as SeriesFocus;
    if (this.model.draft && input.dataset.design === 'codeName') this.model.draft.codeName = input.value;
    if (this.model.draft && input.dataset.designValue) this.model.draft.values[input.dataset.designValue as keyof DesignValues] = Number(input.value);
    if (this.model.draft && input.dataset.tech === 'node') this.model.draft.technology.node = Number(input.value);
    if (this.model.draft && input.dataset.tech === 'packageType') this.model.draft.technology.packageType = input.value as PackageType;
    if (this.model.draft && input.dataset.tech === 'riskPosture') this.model.draft.technology.riskPosture = input.value as RiskPosture;
    if (this.model.draft && input.dataset.tech === 'softwareInvestment') this.model.draft.technology.softwareInvestment = Number(input.value);
    if (input.dataset.launch === 'sku') this.model.launchSku = input.value as SkuProfile;
    if (input.dataset.launch === 'price') this.model.launchPrice = Number(input.value);
    if (input.dataset.launch === 'life') this.model.launchLife = Number(input.value);
    if (input.dataset.launch === 'marketing') this.model.launchMarketing = Number(input.value);

    let result: ActionResult | undefined;
    if (commit && input.dataset.productPrice) result = changeProductPrice(this.state, input.dataset.productPrice, Number(input.value));
    if (commit && input.dataset.productAllocation && input.dataset.contract) result = changeProductAllocation(this.state, input.dataset.productAllocation, input.dataset.contract, Number(input.value));
    if (commit && input.dataset.contractCapacity) result = changeContractCapacity(this.state, input.dataset.contractCapacity, Number(input.value));

    if (commit) this.finish(result); else if (input.type === 'range') this.hooks.onStateChange();
  }
}
