import { generateDecisionEvent } from './event-system';
import { updateCompanyWeekly } from './company-system';
import { activeCompetitorModels, updateCompetitorsWeekly } from './competitor-system';
import { getFactoryDefinition, updateContractsWeekly } from './manufacturing-system';
import { operationsStaffEffect, salesStaffEffect } from './staff-effects';
import { addLedger, addNotice, clamp, dateToIndex, saveState } from './state';
import type { GameState, ReleasedProduct } from './types';

export const BUSINESS_WEEK_SECONDS = 5;
export const BUSINESS_WEEKS_PER_MONTH = 4;
export const BUSINESS_MONTHS_PER_YEAR = 12;
export const BUSINESS_WEEKS_PER_YEAR = BUSINESS_WEEKS_PER_MONTH * BUSINESS_MONTHS_PER_YEAR;

interface RuntimeProduct extends ReleasedProduct { businessAgeWeeks?: number }

export function nextBusinessEventWeek(absoluteWeek: number, initial = false): number {
  return absoluteWeek + (initial ? 48 : 84 + Math.floor(Math.random() * 61));
}

export function businessDateLabel(state: GameState): string {
  const monthIndex = Math.floor(Math.max(0, state.absoluteWeek) / BUSINESS_WEEKS_PER_MONTH);
  const businessYear = Math.floor(monthIndex / BUSINESS_MONTHS_PER_YEAR) + 1;
  const month = ((3 + monthIndex) % 12) + 1;
  const week = Math.max(0, state.absoluteWeek) % BUSINESS_WEEKS_PER_MONTH + 1;
  return `Year ${businessYear} · ${month}月 ${week}週`;
}

function marketFactor(state: GameState, product: ReleasedProduct): number {
  const audience = product.audience[0]?.id ?? 'value';
  return (state.market as unknown as Record<string, number>)[audience] ?? 1;
}

function factoryOutput(state: GameState, product: ReleasedProduct): number {
  const operations = operationsStaffEffect(state);
  let total = 0;
  for (const allocation of product.factoryAllocations) {
    const contract = state.contracts.find((item) => item.id === allocation.contractId && item.active);
    const factory = contract && getFactoryDefinition(contract);
    if (!contract || !factory || contract.setupRemaining > 0) continue;
    const quality = clamp((factory.quality + factory.reliability) / 200 * contract.reliabilityModifier, .45, 1.08);
    total += Math.min(allocation.allocation, contract.committedCapacity) * quality * product.metrics.yieldRate / 100 * operations;
  }
  return Math.max(0, Math.floor(total));
}

function updateReasons(product: ReleasedProduct, produced: number): void {
  const positive: string[] = [];
  const negative: string[] = [];
  if (product.review.performance >= 7.5) positive.push('競合に対して性能が高い');
  if (product.review.value >= 7) positive.push('価格性能が良い');
  if (product.review.reliability >= 7.5) positive.push('信頼性評価が高い');
  if (produced < product.weeklyDemand * .82) negative.push('供給不足で販売機会を失っている');
  if (product.review.value < 5.5) negative.push('価格が性能に対して高い');
  if (product.review.software < 6) negative.push('ドライバー・ソフト評価が弱い');
  product.reasons = {
    positive: positive.length ? positive : ['シリーズ認知が需要を支えている'],
    negative: negative.length ? negative : ['大きな失速要因はない'],
  };
}

function updateSales(state: GameState): { sold: number; revenue: number; structureChanged: boolean } {
  const competitors = activeCompetitorModels(state);
  const salesTeam = salesStaffEffect(state);
  let soldTotal = 0;
  let revenueTotal = 0;
  let structureChanged = false;

  for (const base of state.products) {
    const product = base as RuntimeProduct;
    if (product.status === 'eol') continue;
    if (product.status === 'launching') {
      product.status = 'selling';
      structureChanged = true;
    }

    product.businessAgeWeeks = (product.businessAgeWeeks ?? 0) + 1;
    const plannedLife = Math.max(20, dateToIndex(product.endOfLifeAt) - dateToIndex(product.launchedAt));
    if (product.businessAgeWeeks >= plannedLife) {
      product.status = 'eol';
      product.factoryAllocations = [];
      addNotice(state, '自動終売', `${product.name}は製品サイクルを終えました。`, 'info');
      structureChanged = true;
      continue;
    }

    const rival = competitors.filter((model) => model.category === product.category).sort((a, b) => b.performance - a.performance)[0];
    const perf = product.metrics.performance / Math.max(55, rival?.performance ?? 80);
    const value = (product.metrics.performance / product.price) / Math.max(.0008, (rival?.performance ?? 80) / (rival?.price ?? 50_000));
    const demandBase = product.category === 'cpu' ? state.market.cpuPool : state.market.gpuPool;
    const appeal = clamp(perf * .34 + value * .27 + product.rating / 10 * .2 + product.metrics.reliability / 100 * .1 + product.marketingBoost * .09, .18, 2.3);
    const lifecycle = Math.max(.16, 1 - product.businessAgeWeeks / plannedLife * .76);
    const demand = Math.max(0, Math.round(demandBase * marketFactor(state, product) * appeal * lifecycle * .09 * salesTeam));
    const produced = factoryOutput(state, product);
    product.inventory += produced;
    const sold = Math.min(product.inventory, demand);
    product.inventory -= sold;

    const returns = Math.round(sold * (100 - product.metrics.reliability) / 500);
    const revenue = sold * product.price;
    const productionCost = produced * product.unitCost;
    const distribution = revenue * .255 + sold * 1500;
    const support = returns * product.price * .42 + product.supportLevel * 70_000;
    const holding = product.inventory * product.unitCost * .004;
    const operations = product.businessAgeWeeks === 1 ? 1_000_000 : 240_000;
    const profit = revenue - productionCost - distribution - support - holding - operations;

    state.cash += profit;
    addLedger(state, `${product.name} 売上`, revenue, 'sales');
    addLedger(state, `${product.name} 製造・流通`, -(productionCost + distribution + support + holding + operations), 'inventory');

    const lost = Math.max(0, demand - sold);
    product.weeklyDemand = demand;
    product.weeklyProduced = produced;
    product.weeklySales = sold;
    product.weeklyProfit = profit;
    product.lifetimeProduced += produced;
    product.lifetimeSold += sold;
    product.lifetimeLostSales += lost;
    product.lifetimeRevenue += revenue;
    product.lifetimeProfit += profit;
    product.trend = product.history.length ? sold / Math.max(1, product.history[0]!.sold) : 1;
    product.marketShare = sold / Math.max(1, demandBase * .12);
    product.marketingWeeks = Math.max(0, product.marketingWeeks - 1);
    if (!product.marketingWeeks) product.marketingBoost = Math.max(1, product.marketingBoost * .86);
    product.rating = Object.values(product.review).reduce((sum, score) => sum + score, 0) / 5;
    updateReasons(product, produced);
    product.history.unshift({ week: state.absoluteWeek, demand, produced, sold, lostSales: lost, inventory: product.inventory, revenue, profit, rating: product.rating, marketShare: product.marketShare });
    product.history = product.history.slice(0, 52);

    state.stats.lifetimeUnits += sold;
    state.reputation = clamp(state.reputation + sold / 18_000 + (product.rating - 6.5) * .012, 0, 100);
    const series = state.series.find((item) => item.id === product.seriesId);
    if (series) {
      series.lifetimeUnits += sold;
      series.lifetimeProfit += profit;
      series.brand = clamp(series.brand + sold / 42_000 + (product.rating - 6.5) * .01, 0, 100);
    }
    soldTotal += sold;
    revenueTotal += revenue;
  }
  return { sold: soldTotal, revenue: revenueTotal, structureChanged };
}

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
}

export interface BusinessWeekResult { structureChanged: boolean; sold: number; revenue: number }

export function advanceBusinessWeek(state: GameState): BusinessWeekResult {
  state.absoluteWeek += 1;
  if (state.absoluteWeek <= 2 && state.nextEventWeek - state.absoluteWeek < 46) state.nextEventWeek = nextBusinessEventWeek(state.absoluteWeek, true);
  updateContractsWeekly(state);
  const sales = updateSales(state);
  updateCompanyWeekly(state);
  updateMarket(state);
  if (!state.activeEvent && state.absoluteWeek >= state.nextEventWeek) {
    state.activeEvent = generateDecisionEvent(state);
    state.nextEventWeek = nextBusinessEventWeek(state.absoluteWeek);
  }
  saveState(state);
  return { structureChanged: sales.structureChanged || Boolean(state.activeEvent), sold: sales.sold, revenue: sales.revenue };
}

export function advanceTechnologyWeek(state: GameState): void {
  state.date.week += 1;
  if (state.date.week > 52) {
    state.date.week = 1;
    state.date.year += 1;
    state.researchPoints += 35;
    addNotice(state, `${state.date.year}年`, '技術ロードマップと実在市場の世代が更新されました。', 'info');
  }
  if (state.date.week === 1 || state.date.week === 27) updateCompetitorsWeekly(state);
  saveState(state);
}
