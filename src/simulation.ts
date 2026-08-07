import { SERIES_FOCUS_LABELS } from './data';
import { advanceBusinessWeek, advanceTechnologyWeek, BUSINESS_WEEK_SECONDS, nextBusinessEventWeek } from './business-cycle';
import { businessFinanceSummary } from './business-finance';
import {
  availableNodes, availablePackages, calculateMetrics, createSeries, defaultDesign, defaultTechnology,
  designCaps, getFacilityLevel, inferAudience, resolveProjectIssue, startGeneration, startResearch,
  toggleProjectPause, toggleResearchPause,
} from './design-system';
import {
  cancelContract, changeContractCapacity, changeProductAllocation, changeProductPrice, contractFactory,
  endProductNow, getFactoryDefinition, improveProductSupport, launchProduct, releaseProductUpdate,
  runMarketingCampaign,
} from './manufacturing-system';
import { activeCompetitorModels, updateCompetitorsWeekly } from './competitor-system';
import {
  dismissStaff, giveStaffBonus, hireCandidate, loanOffers, recurringWeeklyBurn, runwayWeeks,
  takeLoan, upgradeFacility,
} from './company-system';
import { trainStaffEnhanced, updateStaffCareer } from './staff-career';
import { advanceStaffDrivenRealtime } from './staff-runtime';
import {
  addLedger, addNotice, clamp, createInitialState, dateLabel, dismissNotification, loadState, normalizeState,
  resetState, saveState,
} from './state';
import type { GameState, SeriesFocus } from './types';

export {
  activeCompetitorModels, availableNodes, availablePackages, calculateMetrics, cancelContract,
  changeContractCapacity, changeProductAllocation, changeProductPrice, contractFactory, createInitialState,
  createSeries, dateLabel, defaultDesign, defaultTechnology, designCaps, dismissNotification, dismissStaff,
  endProductNow, businessFinanceSummary as financeSummary, getFactoryDefinition, getFacilityLevel, giveStaffBonus, hireCandidate,
  improveProductSupport, inferAudience, launchProduct, loadState, loanOffers, normalizeState, recurringWeeklyBurn,
  releaseProductUpdate, resetState, resolveProjectIssue, runMarketingCampaign, runwayWeeks, saveState,
  startGeneration, startResearch, takeLoan, toggleProjectPause, toggleResearchPause,
  trainStaffEnhanced as trainStaff, upgradeFacility,
};

export function focusLabel(focus: SeriesFocus): string { return SERIES_FOCUS_LABELS[focus]; }

export function resolveDecisionEvent(state: GameState, choiceId: string): { ok: boolean; message: string } {
  const event = state.activeEvent;
  const choice = event?.choices.find((item) => item.id === choiceId);
  if (!event || !choice) return { ok: false, message: 'イベントが見つかりません。' };
  if (choice.cost && state.cash < choice.cost) return { ok: false, message: '選択に必要な資金が不足しています。' };
  if (choice.cost) {
    state.cash -= choice.cost;
    addLedger(state, event.title, -choice.cost, event.source === 'factory' ? 'factory' : 'other');
  }
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
    if (choiceId === 'hold') product.marketingBoost = Math.max(.82, product.marketingBoost * .9);
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
  state.activeEvent = null;
  state.nextEventWeek = nextBusinessEventWeek(state.absoluteWeek);
  return { ok: true, message: '判断を反映しました。' };
}

const businessAccumulators = new WeakMap<GameState, number>();

export function advanceRealtime(state: GameState, deltaSeconds: number, speed: GameState['speed']): boolean {
  if (speed === 0) return false;
  let changed = advanceStaffDrivenRealtime(state, deltaSeconds, speed);
  let accumulator = (businessAccumulators.get(state) ?? 0) + deltaSeconds;
  while (accumulator >= BUSINESS_WEEK_SECONDS) {
    accumulator -= BUSINESS_WEEK_SECONDS;
    advanceBusinessWeek(state);
    updateStaffCareer(state);
    updateCompetitorsWeekly(state);
    changed = true;
  }
  businessAccumulators.set(state, accumulator);
  return changed;
}

/** Slow technical-history clock. Main calls this roughly once every 5m46s. */
export function advanceWeek(state: GameState): void {
  advanceTechnologyWeek(state);
}
