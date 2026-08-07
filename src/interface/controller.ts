import { ROLE_LABELS } from '../data';
import {
  cancelContract, changeContractCapacity, changeProductAllocation, changeProductPrice, contractFactory,
  createSeries, defaultDesign, defaultTechnology, dismissStaff, endProductNow, expandFactoryLine, giveStaffBonus, hireCandidate,
  improveFactoryLine, improveProductSupport, launchProduct, releaseProductUpdate, resetState, resolveDecisionEvent, resolveProjectIssue,
  runMarketingCampaign, saveState, serviceFactoryLine, startGeneration, startResearch, takeLoan, toggleProjectPause, toggleResearchPause,
  trainStaff, upgradeFacility, calculateMetrics, inferAudience,
} from '../simulation';
import { addLedger, addNotice, clamp } from '../state';
import type {
  CompanyTab, DesignValues, GameState, LaunchDraft, PackageType, PanelId, ProductCategory, ResearchArea,
  RiskPosture, SeriesFocus, SkuProfile, StaffRole,
} from '../types';
import { num, pct, yen } from './format';
import { patchLiveInterface, panelStructureKey } from './live';
import { createInterfaceModel, type InterfaceModel } from './model';
import { panelNames, renderEvent, renderPanel, renderShell } from './render-shell';
import { ToastCenter } from './toasts';

interface Hooks { onReset: (state: GameState) => void; onOpenSaveManager: () => void; onResetCamera: () => void; }
interface ActionResult { ok: boolean; message: string }

export class InterfaceController {
  private state: GameState;
  private readonly model: InterfaceModel = createInterfaceModel();
  private readonly toasts: ToastCenter;
  private structureKey = '';
  private eventKey = '';
  private readonly seenNotices = new Set<string>();
  private previewFrame = 0;

  constructor(private readonly root: HTMLElement, state: GameState, private readonly hooks: Hooks) {
    this.state = state;
    this.root.innerHTML = renderShell(state);
    this.toasts = new ToastCenter(this.root);
    state.notifications.forEach((notice) => this.seenNotices.add(notice.id));
    this.root.addEventListener('click', (event) => this.handleClick(event));
    this.root.addEventListener('input', (event) => this.handleInput(event, false));
    this.root.addEventListener('change', (event) => this.handleInput(event, true));
    this.root.addEventListener('submit', (event) => event.preventDefault());
    this.sync(state, true);
  }

  setState(state: GameState): void { this.state = state; state.notifications.forEach((notice) => this.seenNotices.add(notice.id)); this.structureKey = ''; this.eventKey = ''; }
  openPanel(panel: PanelId): void { if (this.state.activePanel === panel) return; this.state.activePanel = panel; saveState(this.state); this.sync(this.state, true); }

  live(state = this.state): void {
    this.state = state;
    this.syncNotices();
    patchLiveInterface(this.root, state);
  }

  sync(state = this.state, forceStructure = false): void {
    this.state = state;
    this.ensureSelection();
    this.syncNotices();
    this.syncChrome();
    const modelKey = `${this.model.draft ? this.model.draft.seriesId : 'none'}:${this.model.launchProjectId ?? 'none'}`;
    const nextKey = panelStructureKey(state, modelKey);
    if (forceStructure || nextKey !== this.structureKey) { this.structureKey = nextKey; this.renderPanelRegion(); }
    const nextEvent = state.activeEvent?.id ?? '';
    if (forceStructure || nextEvent !== this.eventKey) { this.eventKey = nextEvent; const layer = this.root.querySelector<HTMLElement>('[data-region="event"]'); if (layer) layer.innerHTML = renderEvent(state); }
    patchLiveInterface(this.root, state);
  }

  private ensureSelection(): void { if (!this.state.selectedSeriesId || !this.state.series.some((series) => series.id === this.state.selectedSeriesId)) this.state.selectedSeriesId = this.state.series[0]?.id ?? null; if (this.model.draft && this.model.draft.seriesId !== this.state.selectedSeriesId) this.model.draft = null; }
  private syncChrome(): void { this.root.querySelectorAll<HTMLElement>('.command-link').forEach((button) => button.classList.toggle('is-active', button.dataset.panel === this.state.activePanel)); const window = this.root.querySelector<HTMLElement>('[data-region="panel"]'); if (window) window.hidden = this.state.activePanel === 'home'; const title = this.root.querySelector<HTMLElement>('[data-panel-title]'); if (title) title.textContent = panelNames[this.state.activePanel]; }

  private renderPanelRegion(): void {
    const body = this.root.querySelector<HTMLElement>('[data-region="panel-body"]'); if (!body) return;
    if (this.state.activePanel === 'home') { body.replaceChildren(); return; }
    const scrollTop = body.scrollTop;
    const focus = document.activeElement instanceof HTMLElement && body.contains(document.activeElement) ? this.focusDescriptor(document.activeElement) : null;
    body.innerHTML = renderPanel(this.state, this.model); body.scrollTop = scrollTop;
    if (focus) { const replacement = body.querySelector<HTMLElement>(focus.selector); replacement?.focus({ preventScroll: true }); if (replacement instanceof HTMLInputElement && focus.selection) replacement.setSelectionRange(focus.selection[0], focus.selection[1]); }
  }

  private focusDescriptor(element: HTMLElement): { selector: string; selection: [number | null, number | null] | null } | null {
    const entries = Object.entries(element.dataset); if (!entries.length) return null;
    const [key, value] = entries[0]!; const dataName = key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
    return { selector: `[data-${dataName}="${CSS.escape(value ?? '')}"]`, selection: element instanceof HTMLInputElement ? [element.selectionStart, element.selectionEnd] : null };
  }

  private syncNotices(): void { for (const notice of [...this.state.notifications].reverse()) { if (this.seenNotices.has(notice.id)) continue; this.seenNotices.add(notice.id); this.toasts.push({ id: notice.id, title: notice.title, message: notice.message, tone: notice.tone }); } }
  private markNoticesSeen(): void { this.state.notifications.forEach((notice) => this.seenNotices.add(notice.id)); }
  private toastResult(result?: ActionResult): void { if (result) this.toasts.push({ message: result.message, tone: result.ok ? 'good' : 'bad' }); }
  private finish(result?: ActionResult, forceStructure = false): void { this.toastResult(result); this.markNoticesSeen(); saveState(this.state); this.sync(this.state, forceStructure); }
  private selectedSeries() { return this.state.series.find((series) => series.id === this.state.selectedSeriesId) ?? this.state.series[0]; }

  private handleClick(event: Event): void {
    const button = (event.target as HTMLElement).closest<HTMLElement>('[data-action]'); if (!button) return;
    const action = button.dataset.action; let result: ActionResult | undefined; let structural = false;
    if (action === 'panel') { this.state.activePanel = button.dataset.panel as PanelId; structural = true; }
    else if (action === 'objective') { this.state.activePanel = button.dataset.panel as PanelId; structural = true; }
    else if (action === 'close-panel') { this.state.activePanel = 'home'; structural = true; }
    else if (action === 'camera-reset') { this.hooks.onResetCamera(); this.toasts.push({ title: 'カメラ', message: '視点を初期位置へ戻しました。', tone: 'info' }); return; }
    else if (action === 'save-manager') { this.hooks.onOpenSaveManager(); return; }
    else if (action === 'select-series') { this.state.selectedSeriesId = button.dataset.id ?? null; this.model.draft = null; structural = true; }
    else if (action === 'create-series') { result = createSeries(this.state, this.model.seriesName, this.model.seriesCategory, this.model.seriesFocus); if (result.ok) this.model.seriesName = ''; structural = true; }
    else if (action === 'new-design') { const series = this.selectedSeries(); if (series) this.model.draft = { seriesId: series.id, codeName: `${series.name.replaceAll(' ', '')}-${series.generation + 1}`, values: defaultDesign(this.state, series), technology: defaultTechnology(this.state), leadStaffId: this.state.staff[0]?.id ?? null }; structural = true; }
    else if (action === 'start-generation') { const series = this.selectedSeries(); const draft = this.model.draft; if (series && draft) result = startGeneration(this.state, series.id, draft.codeName, draft.values, draft.technology, draft.leadStaffId); if (result?.ok) this.model.draft = null; structural = true; }
    else if (action === 'toggle-project') { toggleProjectPause(this.state, button.dataset.id ?? ''); structural = true; }
    else if (action === 'resolve-issue') { result = resolveProjectIssue(this.state, button.dataset.project ?? '', button.dataset.issue ?? '', button.dataset.choice as 'fix' | 'workaround' | 'ignore'); structural = true; }
    else if (action === 'prepare-launch') { const id = button.dataset.id ?? ''; if (this.model.launchProjectId === id) this.model.launchProjectId = null; else { const project = this.state.projects.find((item) => item.id === id); this.model.launchProjectId = id; this.model.launchSku = 'standard'; this.model.launchPrice = Math.round((project?.metrics.suggestedPrice ?? 50_000) / 1000) * 1000; this.model.launchLife = 78; this.model.launchMarketing = 3_000_000; } structural = true; }
    else if (action === 'launch-product') { const allocations = [...this.root.querySelectorAll<HTMLInputElement>('[data-launch-allocation]')].map((input) => ({ contractId: input.dataset.launchAllocation ?? '', allocation: Number(input.value) })).filter((item) => item.contractId && item.allocation > 0); const draft: LaunchDraft = { projectId: button.dataset.id ?? '', factoryAllocations: allocations, skuProfile: this.model.launchSku, price: this.model.launchPrice, lifeWeeks: this.model.launchLife, launchMarketing: this.model.launchMarketing }; result = launchProduct(this.state, draft); if (result.ok) { this.model.launchProjectId = null; this.state.activePanel = 'products'; } structural = true; }
    else if (action === 'product-update') result = releaseProductUpdate(this.state, button.dataset.id ?? '');
    else if (action === 'product-support') result = improveProductSupport(this.state, button.dataset.id ?? '');
    else if (action === 'product-marketing') result = runMarketingCampaign(this.state, button.dataset.id ?? '', 3_000_000);
    else if (action === 'product-eol') { if (!confirm('この製品を今すぐ終売しますか？')) return; endProductNow(this.state, button.dataset.id ?? ''); structural = true; }
    else if (action === 'contract-factory') { result = contractFactory(this.state, button.dataset.id ?? '', Number(button.dataset.capacity ?? 1000)); structural = Boolean(result?.ok); }
    else if (action === 'expand-factory') { result = expandFactoryLine(this.state, button.dataset.id ?? ''); structural = Boolean(result?.ok); }
    else if (action === 'service-factory') { result = serviceFactoryLine(this.state, button.dataset.id ?? ''); structural = Boolean(result?.ok); }
    else if (action === 'improve-factory') { result = improveFactoryLine(this.state, button.dataset.id ?? ''); structural = Boolean(result?.ok); }
    else if (action === 'cancel-contract') { if (!confirm('工場契約を解約しますか？最低期間中は違約金が発生します。')) return; result = cancelContract(this.state, button.dataset.id ?? ''); structural = Boolean(result?.ok); }
    else if (action === 'start-research') { result = startResearch(this.state, button.dataset.area as ResearchArea); structural = Boolean(result?.ok); }
    else if (action === 'toggle-research') { toggleResearchPause(this.state); structural = true; }
    else if (action === 'company-tab') { this.state.companyTab = button.dataset.tab as CompanyTab; structural = true; }
    else if (action === 'hire') { result = hireCandidate(this.state, button.dataset.id ?? ''); structural = Boolean(result?.ok); }
    else if (action === 'staff-train') result = trainStaff(this.state, button.dataset.id ?? '');
    else if (action === 'staff-bonus') result = giveStaffBonus(this.state, button.dataset.id ?? '');
    else if (action === 'staff-dismiss') { if (!confirm('退職金を支払い契約を終了しますか？')) return; result = dismissStaff(this.state, button.dataset.id ?? ''); structural = Boolean(result?.ok); }
    else if (action === 'facility-upgrade') result = upgradeFacility(this.state, button.dataset.id as Parameters<typeof upgradeFacility>[1]);
    else if (action === 'loan') { result = takeLoan(this.state, Number(button.dataset.amount) as 25_000_000 | 60_000_000 | 120_000_000); structural = Boolean(result?.ok); }
    else if (action === 'event-choice') { result = resolveDecisionEvent(this.state, button.dataset.id ?? ''); structural = true; }
    else if (action === 'reset-game') { if (!confirm('現在の会社を初期状態へ戻しますか？')) return; this.hooks.onReset(resetState()); return; }
    else return;
    this.finish(result, structural);
  }

  private handleInput(event: Event, commit: boolean): void {
    const input = event.target; if (!(input instanceof HTMLInputElement || input instanceof HTMLSelectElement)) return;
    if (input.dataset.model === 'seriesName') this.model.seriesName = input.value;
    if (input.dataset.model === 'seriesCategory') this.model.seriesCategory = input.value as ProductCategory;
    if (input.dataset.model === 'seriesFocus') this.model.seriesFocus = input.value as SeriesFocus;
    if (this.model.draft && input.dataset.design === 'codeName') this.model.draft.codeName = input.value;
    if (this.model.draft && input.dataset.designValue) { this.model.draft.values[input.dataset.designValue as keyof DesignValues] = Number(input.value); const readout = input.closest('label')?.querySelector<HTMLElement>('[data-range-readout]'); if (readout) readout.textContent = Number(input.value).toLocaleString('ja-JP'); this.scheduleDesignPreview(); }
    if (this.model.draft && input.dataset.designLead !== undefined) this.model.draft.leadStaffId = input.value || null;
    if (this.model.draft && input.dataset.tech === 'node') { this.model.draft.technology.node = Number(input.value); this.scheduleDesignPreview(); }
    if (this.model.draft && input.dataset.tech === 'packageType') { this.model.draft.technology.packageType = input.value as PackageType; this.scheduleDesignPreview(); }
    if (this.model.draft && input.dataset.tech === 'riskPosture') { this.model.draft.technology.riskPosture = input.value as RiskPosture; this.scheduleDesignPreview(); }
    if (this.model.draft && input.dataset.tech === 'softwareInvestment') { this.model.draft.technology.softwareInvestment = Number(input.value); this.scheduleDesignPreview(); }
    if (input.dataset.launch === 'sku') this.model.launchSku = input.value as SkuProfile;
    if (input.dataset.launch === 'price') this.model.launchPrice = Number(input.value);
    if (input.dataset.launch === 'life') this.model.launchLife = Number(input.value);
    if (input.dataset.launch === 'marketing') this.model.launchMarketing = Number(input.value);
    if (commit && input.dataset.projectLead) { const project = this.state.projects.find((item) => item.id === input.dataset.projectLead); if (project) { project.leadStaffId = input.value || null; const member = this.state.staff.find((item) => item.id === project.leadStaffId); this.toasts.push({ title: '責任者変更', message: `${project.codeName} → ${member?.name ?? '未設定'}`, tone: 'info' }); saveState(this.state); patchLiveInterface(this.root, this.state); } return; }
    if (commit && input.dataset.staffRole) { this.changeStaffRole(input.dataset.staffRole, input.value as StaffRole, input); return; }
    let result: ActionResult | undefined;
    if (commit && input.dataset.productPrice) result = changeProductPrice(this.state, input.dataset.productPrice, Number(input.value));
    if (commit && input.dataset.productAllocation && input.dataset.contract) result = changeProductAllocation(this.state, input.dataset.productAllocation, input.dataset.contract, Number(input.value));
    if (commit && input.dataset.contractCapacity) result = changeContractCapacity(this.state, input.dataset.contractCapacity, Number(input.value));
    if (commit && result) this.finish(result, false);
  }

  private changeStaffRole(staffId: string, nextRole: StaffRole, select: HTMLInputElement | HTMLSelectElement): void {
    const member = this.state.staff.find((item) => item.id === staffId); if (!member || member.role === nextRole) return;
    const previous = member.role; const cost = Math.round((900_000 + member.level * 180_000) / 10_000) * 10_000;
    if (this.state.cash < cost) { select.value = previous; this.toasts.push({ title: '職種変更できません', message: `${member.name}の転向には${yen.format(cost)}必要です。`, tone: 'warning' }); return; }
    this.state.cash -= cost; addLedger(this.state, `${member.name} 職種変更`, -cost, 'salary'); member.role = nextRole; member.fatigue = clamp(member.fatigue + 8, 0, 100); member.morale = clamp(member.morale - 3, 0, 100); addNotice(this.state, '職種変更', `${member.name}: ${ROLE_LABELS[previous]} → ${ROLE_LABELS[nextRole]}`, 'info'); this.markNoticesSeen(); this.toasts.push({ title: '職種変更', message: `${member.name}: ${ROLE_LABELS[previous]} → ${ROLE_LABELS[nextRole]}`, tone: 'info' }); saveState(this.state); patchLiveInterface(this.root, this.state);
  }

  private scheduleDesignPreview(): void { if (this.previewFrame) return; this.previewFrame = requestAnimationFrame(() => { this.previewFrame = 0; this.patchDesignPreview(); }); }
  private patchDesignPreview(): void {
    const draft = this.model.draft; const series = this.selectedSeries(); const readout = this.root.querySelector<HTMLElement>('[data-design-readout]'); if (!draft || !series || !readout) return;
    const metrics = calculateMetrics(this.state, series, draft.values, draft.technology); const audience = inferAudience(metrics, metrics.suggestedPrice, series);
    const hero = readout.querySelector('.hero-number strong'); if (hero) hero.textContent = num.format(metrics.performance);
    const metricValues = readout.querySelectorAll<HTMLElement>('.metric-lines > div > b'); const values = [num.format(metrics.efficiency), pct(metrics.reliability), pct(metrics.yieldRate), yen.format(metrics.suggestedPrice), yen.format(metrics.unitCost), yen.format(metrics.developmentCost + metrics.maskCost + metrics.prototypeCost + metrics.validationCost + metrics.softwareCost)]; metricValues.forEach((node, index) => { if (values[index] !== undefined) node.textContent = values[index]!; });
    const rows = readout.querySelectorAll<HTMLElement>('.audience-ranking > div'); rows.forEach((row, index) => { const item = audience[index]; if (!item) return; const strong = row.querySelector('strong'); const small = row.querySelector('small'); const em = row.querySelector('em'); if (strong) strong.textContent = item.name; if (small) small.textContent = item.reason; if (em) em.textContent = num.format(item.score); });
    const diagnostic = readout.querySelector<HTMLElement>('.diagnostic'); if (diagnostic) { diagnostic.textContent = metrics.bottleneck; diagnostic.classList.toggle('is-warning', metrics.bottleneckSeverity > 30); }
  }
}
