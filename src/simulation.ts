import { SERIES_FOCUS_LABELS } from './data';
import { generateDecisionEvent, nextDecisionEventWeek } from './event-system';
import {
  advanceDesignRealtime, availableNodes, availablePackages, calculateMetrics, createSeries, defaultDesign,
  defaultTechnology, designCaps, getFacilityLevel, inferAudience, resolveProjectIssue, startGeneration,
  startResearch, toggleProjectPause, toggleResearchPause,
} from './design-system';
import {
  cancelContract, changeContractCapacity, changeProductAllocation, changeProductPrice, contractFactory,
  endProductNow, getFactoryDefinition, improveProductSupport, launchProduct, releaseProductUpdate,
  runMarketingCampaign, updateContractsWeekly, updateProductsWeekly,
} from './manufacturing-system';
import { activeCompetitorModels, updateCompetitorsWeekly } from './competitor-system';
import {
  dismissStaff, financeSummary, giveStaffBonus, hireCandidate, loanOffers, recurringWeeklyBurn, runwayWeeks,
  takeLoan, trainStaff, updateCompanyWeekly, upgradeFacility,
} from './company-system';
import {
  addLedger, addNotice, clamp, createInitialState, dateLabel, dismissNotification, loadState, normalizeState,
  resetState, saveState,
} from './state';
import type { GameState, SeriesFocus } from './types';

export {
  activeCompetitorModels, availableNodes, availablePackages, calculateMetrics, cancelContract,
  changeContractCapacity, changeProductAllocation, changeProductPrice, contractFactory, createInitialState,
  createSeries, dateLabel, defaultDesign, defaultTechnology, designCaps, dismissNotification, dismissStaff,
  endProductNow, financeSummary, getFactoryDefinition, getFacilityLevel, giveStaffBonus, hireCandidate,
  improveProductSupport, inferAudience, launchProduct, loadState, loanOffers, normalizeState, recurringWeeklyBurn,
  releaseProductUpdate, resetState, resolveProjectIssue, runMarketingCampaign, runwayWeeks, saveState,
  startGeneration, startResearch, takeLoan, toggleProjectPause, toggleResearchPause, trainStaff, upgradeFacility,
};

export function focusLabel(focus: SeriesFocus): string { return SERIES_FOCUS_LABELS[focus]; }

function updateMarket(state: GameState): void {
  state.market.weeksRemaining -= 1;
  if (state.market.weeksRemaining > 0) return;
  const themes = [
    { headline: '大型ゲーム発売でGPU需要が増加', gaming: 1.25, creator: .95, value: .92, business: .9, efficiency: .92, enthusiast: 1.18 },
    { headline: '法人PC更新期で信頼性需要が増加', gaming: .9, creator: .95, value: 1.02, business: 1.28, efficiency: 1.08, enthusiast: .9 },
    { headline: '電力価格上昇で効率重視へ', gaming: .9, creator: .92, value: 1.05, business: 1.05, efficiency: 1.32, enthusiast: .82 },
    { headline: '景気減速で価格性能が重視', gaming: .92, creator: .88, value: 1.35, business: .95, efficiency: 1.05, enthusiast: .78 },
    { headline: '制作需要拡大で多コア・GPUが好調', gaming: 1.02, creator: 1.3, value: .92, business: 1.03, efficiency: .9, enthusiast: 1.06 },
  ];
  const theme = themes[Math.floor(Math.random() * themes.length)] ?? themes[0]!;
  Object.assign(state.market, theme, { weeksRemaining: 18 + Math.floor(Math.random() * 15) });
  state.market.cpuPool = Math.round(state.market.cpuPool * (1.008 + Math.random() * .008));
  state.market.gpuPool = Math.round(state.market.gpuPool * (1.008 + Math.random() * .01));
}

export function resolveDecisionEvent(state: GameState, choiceId: string): { ok: boolean; message: string } {
  const event = state.activeEvent; const choice = event?.choices.find((item) => item.id === choiceId);
  if (!event || !choice) return { ok: false, message: 'イベントが見つかりません。' };
  if (choice.cost && state.cash < choice.cost) return { ok: false, message: '選択に必要な資金が不足しています。' };
  if (choice.cost) { state.cash -= choice.cost; addLedger(state, event.title, -choice.cost, event.source === 'factory' ? 'factory' : 'other'); }
  const product = event.productId ? state.products.find((item) => item.id === event.productId) : undefined;
  const contract = event.contractId ? state.contracts.find((item) => item.id === event.contractId) : undefined;
  const member = event.staffId ? state.staff.find((item) => item.id === event.staffId) : undefined;
  if (event.kind === 'factory' && contract) {
    if (choiceId === 'expedite') { contract.reliabilityModifier = .9; contract.modifierWeeks = 2; }
    if (choiceId === 'accept') { contract.reliabilityModifier = .55; contract.modifierWeeks = 6; }
    if (choiceId === 'pressure') { contract.reliabilityModifier = .72; contract.modifierWeeks = 4; contract.remainingWeeks += 8; state.cash += 1_500_000; }
  }
  if (event.kind === 'competitive' && product) {
    if (choiceId === 'match') product.price = Math.round(product.price * .92 / 1000) * 1000;
    if (choiceId === 'differentiate') { product.marketingBoost += .35; product.marketingWeeks = 8; product.review.software = clamp(product.review.software + .25, 0, 10); }
    if (choiceId === 'hold') { product.marketingBoost = Math.max(.82, product.marketingBoost * .9); }
  }
  if (event.kind === 'corporate' && product) {
    if (choiceId === 'premium') { state.cash += 8_000_000; product.supportLevel += 1; product.weeklyDemand = Math.round(product.weeklyDemand * 1.2); }
    if (choiceId === 'standard') { state.cash += 2_500_000; product.weeklyDemand = Math.round(product.weeklyDemand * 1.07); }
  }
  if (event.kind === 'quality' && product) {
    if (choiceId === 'recall') { product.metrics.reliability = clamp(product.metrics.reliability + 8, 0, 99); product.review.reliability = clamp(product.review.reliability + .7, 0, 10); }
    if (choiceId === 'patch') { product.metrics.softwareQuality = clamp(product.metrics.softwareQuality + 5, 0, 99); product.review.software = clamp(product.review.software + .35, 0, 10); }
    if (choiceId === 'deny') { product.review.reliability = clamp(product.review.reliability - .75, 0, 10); state.reputation = clamp(state.reputation - 2, 0, 100); }
  }
  if (event.kind === 'poach' && member) {
    if (choiceId === 'raise') { member.salary = Math.round(member.salary * 1.12); member.loyalty = clamp(member.loyalty + 32, 0, 100); member.morale = clamp(member.morale + 20, 0, 100); }
    if (choiceId === 'promise') { member.loyalty = clamp(member.loyalty + 13, 0, 100); member.morale = clamp(member.morale + 10, 0, 100); }
    if (choiceId === 'leave') state.staff = state.staff.filter((item) => item.id !== member.id);
  }
  addNotice(state, event.title, `${choice.label}を選択しました。`, choice.tone === 'bad' ? 'warning' : 'info');
  state.activeEvent = null; state.nextEventWeek = nextDecisionEventWeek(state.absoluteWeek); return { ok: true, message: '判断を反映しました。' };
}

export function advanceRealtime(state: GameState, deltaSeconds: number, speed: GameState['speed']): boolean {
  return advanceDesignRealtime(state, deltaSeconds, speed);
}

export function advanceWeek(state: GameState): void {
  state.absoluteWeek += 1; state.date.week += 1;
  if (state.date.week > 52) { state.date.week = 1; state.date.year += 1; state.researchPoints += 35; addNotice(state, `${state.date.year}年`, '市場・競合ロードマップが更新されました。', 'info'); }
  updateContractsWeekly(state); updateProductsWeekly(state); updateCompetitorsWeekly(state); updateCompanyWeekly(state); updateMarket(state);
  if (!state.activeEvent && state.absoluteWeek >= state.nextEventWeek) { state.activeEvent = generateDecisionEvent(state); state.nextEventWeek = nextDecisionEventWeek(state.absoluteWeek); }
  saveState(state);
}
