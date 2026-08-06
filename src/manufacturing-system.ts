import { FACTORIES } from './data';
import { activeCompetitorModels } from './competitor-system';
import { addLedger, addNotice, addWeeks, clamp, dateToIndex, uid } from './state';
import type {
  FactoryContract, GameState, LaunchDraft, ProductFactoryAllocation, ReleasedProduct, ReviewBreakdown,
  SkuProfile, TechnicalMetrics,
} from './types';

export function getFactoryDefinition(contract: FactoryContract) { return FACTORIES.find((factory) => factory.id === contract.factoryId); }

export function contractFactory(state: GameState, factoryId: string, committedCapacity: number): { ok: boolean; message: string; contract?: FactoryContract } {
  const factory = FACTORIES.find((item) => item.id === factoryId);
  if (!factory || factory.unlockYear > state.date.year) return { ok: false, message: 'この工場はまだ契約できません。' };
  const capacity = clamp(Math.round(committedCapacity / 50) * 50, 100, factory.weeklyCapacity);
  const fee = Math.round(factory.signupFee + capacity * factory.reservationRate * 4);
  if (state.cash < fee) return { ok: false, message: `契約金が不足しています。必要額 ¥${fee.toLocaleString()}` };
  state.cash -= fee; addLedger(state, `${factory.name} 契約`, -fee, 'factory');
  const contract: FactoryContract = { id: uid('contract'), factoryId, startedAt: { ...state.date }, committedCapacity: capacity, remainingWeeks: factory.minimumWeeks, setupRemaining: factory.setupWeeks, active: true, reliabilityModifier: 1, modifierWeeks: 0 };
  state.contracts.push(contract); addNotice(state, '工場契約', `${factory.name}と週${capacity.toLocaleString()}個の契約を結びました。`, 'good');
  return { ok: true, message: `${factory.name}と契約しました。`, contract };
}

export function changeContractCapacity(state: GameState, contractId: string, capacity: number): { ok: boolean; message: string } {
  const contract = state.contracts.find((item) => item.id === contractId && item.active); const factory = contract && getFactoryDefinition(contract);
  if (!contract || !factory) return { ok: false, message: '契約が見つかりません。' };
  const next = clamp(Math.round(capacity / 50) * 50, 100, factory.weeklyCapacity); const increase = Math.max(0, next - contract.committedCapacity); const fee = Math.round(increase * factory.reservationRate * 2.5);
  if (state.cash < fee) return { ok: false, message: '増枠費用が不足しています。' };
  state.cash -= fee; if (fee) addLedger(state, `${factory.name} 生産枠増設`, -fee, 'factory'); contract.committedCapacity = next; if (increase) contract.setupRemaining = Math.max(contract.setupRemaining, 2);
  return { ok: true, message: `週産枠を${next.toLocaleString()}個へ変更しました。` };
}
export function cancelContract(state: GameState, contractId: string): { ok: boolean; message: string } {
  const contract = state.contracts.find((item) => item.id === contractId && item.active); const factory = contract && getFactoryDefinition(contract);
  if (!contract || !factory) return { ok: false, message: '契約が見つかりません。' };
  const penalty = contract.remainingWeeks > 0 ? Math.round(factory.signupFee * .45 + contract.remainingWeeks * contract.committedCapacity * factory.reservationRate * .35) : 0;
  if (state.cash < penalty) return { ok: false, message: `違約金 ¥${penalty.toLocaleString()}を支払えません。` };
  state.cash -= penalty; if (penalty) addLedger(state, `${factory.name} 解約`, -penalty, 'factory'); contract.active = false;
  for (const product of state.products) product.factoryAllocations = product.factoryAllocations.filter((allocation) => allocation.contractId !== contract.id);
  return { ok: true, message: `${factory.name}との契約を終了しました。` };
}

const skuEffect = (profile: SkuProfile): { suffix: string; perf: number; efficiency: number; reliability: number; yield: number; cost: number; price: number } => ({
  flagship: { suffix: ' X', perf: 1.09, efficiency: .9, reliability: -.035, yield: .7, cost: 1.13, price: 1.25 },
  standard: { suffix: '', perf: 1, efficiency: 1, reliability: 0, yield: 1, cost: 1, price: 1 },
  efficient: { suffix: ' E', perf: .88, efficiency: 1.3, reliability: .04, yield: 1.08, cost: .94, price: .93 },
  salvage: { suffix: ' S', perf: .71, efficiency: 1.08, reliability: .02, yield: 1.35, cost: .77, price: .68 },
})[profile];

function reviewFor(metrics: TechnicalMetrics, price: number, state: GameState, productMetrics: TechnicalMetrics): ReviewBreakdown {
  const top = activeCompetitorModels(state).filter((model) => model.category === (productMetrics.multiPerformance > productMetrics.singlePerformance * 1.2 ? 'cpu' : 'gpu')).sort((a, b) => b.performance - a.performance)[0];
  const marketTop = top?.performance ?? 84; const parity = metrics.performance / Math.max(50, marketTop);
  return {
    performance: clamp(7 + (parity - 1) * 4.2, 3, 9.8),
    value: clamp(5.8 + (metrics.performance / Math.max(1, price / 55_000) - 78) / 30, 2.8, 9.5),
    efficiency: clamp(5.2 + (metrics.efficiency - 60) / 18 + (metrics.thermals - 60) / 30, 3, 9.5),
    reliability: clamp(4.5 + metrics.reliability / 20, 3, 9.7),
    software: clamp(4 + metrics.softwareQuality / 20, 3, 9.5),
  };
}

export function launchProduct(state: GameState, draft: LaunchDraft): { ok: boolean; message: string; product?: ReleasedProduct } {
  const project = state.projects.find((item) => item.id === draft.projectId && item.stage === 'ready'); const series = project && state.series.find((item) => item.id === project.seriesId);
  if (!project || !series) return { ok: false, message: '発売可能な設計がありません。' };
  const allocations = draft.factoryAllocations.filter((allocation) => allocation.allocation > 0 && state.contracts.some((contract) => contract.id === allocation.contractId && contract.active));
  if (!allocations.length) return { ok: false, message: '少なくとも1つの工場へ生産を割り当ててください。' };
  const launchCost = Math.max(2_000_000, draft.launchMarketing) + project.metrics.softwareCost * .18 + 1_500_000;
  if (state.cash < launchCost) return { ok: false, message: `発売費用 ¥${Math.round(launchCost).toLocaleString()}が不足しています。` };
  const effect = skuEffect(draft.skuProfile); const metrics = structuredClone(project.metrics);
  metrics.performance *= effect.perf * (1 - project.performancePenalty / 100); metrics.efficiency *= effect.efficiency; metrics.reliability = clamp(metrics.reliability * (1 + effect.reliability) - project.reliabilityPenalty, 30, 99); metrics.yieldRate = clamp(metrics.yieldRate * effect.yield, 25, 99); metrics.unitCost *= effect.cost;
  const price = Math.max(Math.round(draft.price / 1000) * 1000, Math.ceil(metrics.unitCost * 1.15 / 1000) * 1000); const review = reviewFor(metrics, price, state, metrics); const rating = Object.values(review).reduce((sum, score) => sum + score, 0) / 5;
  state.cash -= launchCost; addLedger(state, `${project.codeName} 発売`, -launchCost, 'marketing');
  const product: ReleasedProduct = { id: uid('product'), projectId: project.id, seriesId: series.id, generation: project.generation, name: `${series.name} ${project.generation}${effect.suffix}`, category: series.category, skuProfile: draft.skuProfile, launchedAt: { ...state.date }, endOfLifeAt: addWeeks(state.date, clamp(draft.lifeWeeks, 26, 104)), price, unitCost: metrics.unitCost, metrics, audience: project.audience, factoryAllocations: allocations, inventory: 0, lifetimeProduced: 0, lifetimeSold: 0, lifetimeLostSales: 0, lifetimeRevenue: 0, lifetimeProfit: -launchCost, weeklyDemand: 0, weeklySales: 0, weeklyProduced: 0, weeklyProfit: -launchCost, trend: 1, marketShare: 0, rating, review, reasons: { positive: [], negative: [] }, status: 'launching', history: [], marketingBoost: 1 + draft.launchMarketing / 30_000_000, marketingWeeks: 8, supportLevel: 1, firmwareLevel: 0, warrantyReserve: 0 };
  state.products.push(product); state.selectedProductId = product.id; state.stats.productsLaunched += 1; series.generation = Math.max(series.generation, project.generation); series.brand += rating * .25;
  addNotice(state, '新製品発売', `${product.name}を発売しました。初回評価 ${rating.toFixed(1)}/10`, rating >= 7 ? 'good' : 'warning');
  return { ok: true, message: `${product.name}を発売しました。`, product };
}

export function changeProductPrice(state: GameState, productId: string, price: number): { ok: boolean; message: string } {
  const product = state.products.find((item) => item.id === productId && item.status !== 'eol'); if (!product) return { ok: false, message: '製品が見つかりません。' };
  product.price = Math.max(1_000, Math.round(price / 1000) * 1000); return { ok: true, message: `価格を¥${product.price.toLocaleString()}へ変更しました。` };
}
export function changeProductAllocation(state: GameState, productId: string, contractId: string, allocation: number): { ok: boolean; message: string } {
  const product = state.products.find((item) => item.id === productId); const contract = state.contracts.find((item) => item.id === contractId && item.active); if (!product || !contract) return { ok: false, message: '製品または工場契約が見つかりません。' };
  const value = clamp(Math.round(allocation / 50) * 50, 0, contract.committedCapacity); const existing = product.factoryAllocations.find((item) => item.contractId === contractId);
  if (existing) existing.allocation = value; else product.factoryAllocations.push({ contractId, allocation: value }); product.factoryAllocations = product.factoryAllocations.filter((item) => item.allocation > 0);
  return { ok: true, message: '工場割り当てを更新しました。' };
}
export function runMarketingCampaign(state: GameState, productId: string, budget: number): { ok: boolean; message: string } {
  const product = state.products.find((item) => item.id === productId && item.status === 'selling'); budget = clamp(Math.round(budget / 100_000) * 100_000, 500_000, 20_000_000);
  if (!product || state.cash < budget) return { ok: false, message: '製品または予算を確認してください。' };
  state.cash -= budget; addLedger(state, `${product.name} 販促`, -budget, 'marketing'); product.marketingBoost += budget / 18_000_000; product.marketingWeeks = Math.max(product.marketingWeeks, 6); return { ok: true, message: '販促キャンペーンを開始しました。' };
}
export function releaseProductUpdate(state: GameState, productId: string): { ok: boolean; message: string } {
  const product = state.products.find((item) => item.id === productId && item.status === 'selling'); const cost = 1_800_000 + product!.firmwareLevel * 700_000;
  if (!product || state.cash < cost) return { ok: false, message: '製品または資金を確認してください。' };
  state.cash -= cost; addLedger(state, `${product.name} 更新`, -cost, 'support'); product.firmwareLevel += 1; product.metrics.softwareQuality = clamp(product.metrics.softwareQuality + 4, 0, 99); product.review.software = clamp(product.review.software + .3, 0, 10); return { ok: true, message: 'BIOS・ドライバー更新を配信しました。' };
}
export function improveProductSupport(state: GameState, productId: string): { ok: boolean; message: string } {
  const product = state.products.find((item) => item.id === productId && item.status === 'selling'); const cost = 2_200_000 + product!.supportLevel * 800_000;
  if (!product || state.cash < cost) return { ok: false, message: '製品または資金を確認してください。' };
  state.cash -= cost; addLedger(state, `${product.name} サポート強化`, -cost, 'support'); product.supportLevel += 1; product.review.reliability = clamp(product.review.reliability + .25, 0, 10); return { ok: true, message: '保証・サポートを強化しました。' };
}
export function endProductNow(state: GameState, productId: string): void { const product = state.products.find((item) => item.id === productId); if (product) { product.status = 'eol'; product.factoryAllocations = []; addNotice(state, '終売', `${product.name}を終売しました。`, 'info'); } }

function factoryOutput(state: GameState, product: ReleasedProduct): number {
  let total = 0;
  for (const allocation of product.factoryAllocations) {
    const contract = state.contracts.find((item) => item.id === allocation.contractId && item.active); const factory = contract && getFactoryDefinition(contract); if (!contract || !factory || contract.setupRemaining > 0) continue;
    const quality = clamp((factory.quality + factory.reliability) / 200 * contract.reliabilityModifier, .45, 1.08); total += Math.min(allocation.allocation, contract.committedCapacity) * quality * (product.metrics.yieldRate / 100);
  }
  return Math.max(0, Math.floor(total));
}

export function updateContractsWeekly(state: GameState): void {
  for (const contract of state.contracts.filter((item) => item.active)) {
    const factory = getFactoryDefinition(contract); if (!factory) continue;
    if (contract.setupRemaining > 0) contract.setupRemaining -= 1; if (contract.remainingWeeks > 0) contract.remainingWeeks -= 1;
    if (contract.modifierWeeks > 0) contract.modifierWeeks -= 1; else contract.reliabilityModifier = 1;
    const reservation = Math.round(contract.committedCapacity * factory.reservationRate); state.cash -= reservation; addLedger(state, `${factory.name} 予約費`, -reservation, 'factory');
  }
}

function marketFactor(state: GameState, product: ReleasedProduct): number {
  const audience = product.audience[0]?.id ?? 'value'; return (state.market as unknown as Record<string, number>)[audience] ?? 1;
}
function productReasons(product: ReleasedProduct, produced: number): void {
  const positive: string[] = []; const negative: string[] = [];
  if (product.review.performance >= 7.5) positive.push('競合に対して性能が高い');
  if (product.review.value >= 7) positive.push('価格性能が良い');
  if (product.review.reliability >= 7.5) positive.push('信頼性評価が高い');
  if (produced < product.weeklyDemand * .8) negative.push('供給不足で販売機会を失っている');
  if (product.review.value < 5.5) negative.push('価格が性能に対して高い');
  if (product.review.software < 6) negative.push('ドライバー・ソフト評価が弱い');
  product.reasons = { positive: positive.length ? positive : ['シリーズ認知が需要を支えている'], negative: negative.length ? negative : ['大きな失速要因はない'] };
}

export function updateProductsWeekly(state: GameState): void {
  const competitors = activeCompetitorModels(state);
  for (const product of state.products) {
    if (product.status === 'eol') continue;
    if (dateToIndex(state.date) >= dateToIndex(product.endOfLifeAt)) { product.status = 'eol'; product.factoryAllocations = []; addNotice(state, '自動終売', `${product.name}は製品寿命を迎えました。`, 'info'); continue; }
    if (product.status === 'launching') product.status = 'selling';
    const age = Math.max(0, state.absoluteWeek - dateToIndex(product.launchedAt)); const rival = competitors.filter((model) => model.category === product.category).sort((a, b) => b.performance - a.performance)[0];
    const perf = product.metrics.performance / Math.max(55, rival?.performance ?? 80); const value = (product.metrics.performance / product.price) / Math.max(.0008, (rival?.performance ?? 80) / (rival?.price ?? 50_000));
    const demandBase = product.category === 'cpu' ? state.market.cpuPool : state.market.gpuPool; const appeal = clamp(perf * .34 + value * .27 + product.rating / 10 * .2 + product.metrics.reliability / 100 * .1 + product.marketingBoost * .09, .18, 2.2);
    const lifecycle = Math.max(.18, 1 - age / Math.max(24, dateToIndex(product.endOfLifeAt) - dateToIndex(product.launchedAt)) * .72); const demand = Math.max(0, Math.round(demandBase * marketFactor(state, product) * appeal * lifecycle * .09));
    const produced = factoryOutput(state, product); product.inventory += produced; const sold = Math.min(product.inventory, demand); product.inventory -= sold;
    const returns = Math.round(sold * (100 - product.metrics.reliability) / 480); const revenue = sold * product.price; const productionCost = produced * product.unitCost; const distribution = revenue * .285 + sold * 1900; const support = returns * product.price * .45 + (product.supportLevel * 120_000); const holding = product.inventory * product.unitCost * .008; const operations = age === 0 ? 2_200_000 : 1_100_000; const profit = revenue - productionCost - distribution - support - holding - operations;
    state.cash += profit; addLedger(state, `${product.name} 売上`, revenue, 'sales'); addLedger(state, `${product.name} 製造・流通`, -(productionCost + distribution + support + holding + operations), 'inventory');
    const lost = Math.max(0, demand - sold); product.weeklyDemand = demand; product.weeklyProduced = produced; product.weeklySales = sold; product.weeklyProfit = profit; product.lifetimeProduced += produced; product.lifetimeSold += sold; product.lifetimeLostSales += lost; product.lifetimeRevenue += revenue; product.lifetimeProfit += profit; product.trend = product.history.length ? sold / Math.max(1, product.history[0]!.sold) : 1; product.marketShare = sold / Math.max(1, demandBase * .12); product.marketingWeeks = Math.max(0, product.marketingWeeks - 1); if (!product.marketingWeeks) product.marketingBoost = Math.max(1, product.marketingBoost * .86); product.rating = Object.values(product.review).reduce((sum, score) => sum + score, 0) / 5;
    productReasons(product, produced); product.history.unshift({ week: state.absoluteWeek, demand, produced, sold, lostSales: lost, inventory: product.inventory, revenue, profit, rating: product.rating, marketShare: product.marketShare }); product.history = product.history.slice(0, 52);
    state.stats.lifetimeUnits += sold; state.reputation = clamp(state.reputation + sold / 18_000 + (product.rating - 6.5) * .015, 0, 100);
    const series = state.series.find((item) => item.id === product.seriesId); if (series) { series.lifetimeUnits += sold; series.lifetimeProfit += profit; series.brand = clamp(series.brand + sold / 40_000 + (product.rating - 6.5) * .01, 0, 100); }
  }
}
