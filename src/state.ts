import { createCompetitors, FACTORIES, generateCandidate, STARTING_STAFF } from './data';
import { nextDecisionEventWeek } from './event-system';
import { saveActiveState } from './save-manager';
import type {
  GameDate, GameState, LedgerEntry, NotificationItem, ProductSeries, RecruitCandidate, ResearchArea,
} from './types';

export const VERSION = 7;
export const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
export const uid = (prefix = 'id'): string => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
export const dateToIndex = (date: GameDate): number => date.year * 52 + date.week;
export const addWeeks = (date: GameDate, weeks: number): GameDate => {
  const index = dateToIndex(date) + weeks;
  return { year: Math.floor(index / 52), week: Math.max(1, index % 52) };
};
export const dateLabel = (date: GameDate): string => `${date.year}年 ${date.week}週`;

type BusinessLedgerEntry = LedgerEntry & { businessWeek?: number };

export function addLedger(state: GameState, label: string, amount: number, category: LedgerEntry['category']): void {
  const entry: BusinessLedgerEntry = { id: uid('ledger'), date: { ...state.date }, label, amount, category, businessWeek: state.absoluteWeek };
  state.ledger.unshift(entry);
  state.ledger = state.ledger.slice(0, 300);
  if (amount > 0) state.stats.lifetimeRevenue += amount;
  state.stats.lifetimeProfit += amount;
}

export function addNotice(state: GameState, title: string, message: string, tone: NotificationItem['tone'] = 'info'): void {
  state.notifications.unshift({ id: uid('notice'), title, message, tone, date: { ...state.date } });
  state.notifications = state.notifications.slice(0, 16);
}

function initialSeries(): ProductSeries[] {
  return [{
    id: 'frontier-core', name: 'Frontier Core', category: 'cpu', focus: 'balanced', generation: 0,
    legacy: 0, brand: 8, active: true, createdAt: { year: 2015, week: 1 }, lifetimeUnits: 0, lifetimeProfit: 0,
  }];
}

function initialCandidates(): RecruitCandidate[] {
  return [generateCandidate(0, 2015, 'validation'), generateCandidate(0, 2015, 'marketing'), generateCandidate(0, 2015, 'operations')];
}

export function createInitialState(): GameState {
  const starter = FACTORIES.find((factory) => factory.id === 'harbor-28') ?? FACTORIES[0]!;
  const research = Object.fromEntries(['cpuArchitecture', 'gpuArchitecture', 'process', 'packaging', 'software', 'manufacturing'].map((area) => [area, 0])) as Record<ResearchArea, number>;
  const state: GameState = {
    version: VERSION,
    companyName: 'PC Frontier Lab',
    date: { year: 2015, week: 1 }, absoluteWeek: 0, cash: 90_000_000, researchPoints: 120, reputation: 6,
    speed: 1, activePanel: 'home', companyTab: 'team', selectedSeriesId: 'frontier-core', selectedProductId: null,
    selectedProjectId: null, officeLevel: 1, research, activeResearch: null, series: initialSeries(), projects: [], products: [],
    contracts: [{ id: uid('contract'), factoryId: starter.id, startedAt: { year: 2015, week: 1 }, committedCapacity: Math.min(600, starter.weeklyCapacity), remainingWeeks: starter.minimumWeeks, setupRemaining: 0, active: true, reliabilityModifier: 1, modifierWeeks: 0 }],
    competitors: createCompetitors(), staff: structuredClone(STARTING_STAFF), candidates: initialCandidates(), lastCandidateRefreshWeek: 0,
    facilities: ['office', 'architectureLab', 'prototypeLab', 'validationLab', 'softwareLab', 'marketingStudio'].map((id) => ({ id: id as GameState['facilities'][number]['id'], level: id === 'office' ? 1 : 0 })),
    loans: [], ledger: [],
    market: { gaming: 1, creator: .8, value: 1.1, business: .75, efficiency: .65, enthusiast: .9, headline: 'PC市場は価格性能を重視しています', weeksRemaining: 24, cpuPool: 16_000, gpuPool: 13_500 },
    notifications: [], activeEvent: null, nextEventWeek: nextDecisionEventWeek(0, true),
    stats: { lifetimeRevenue: 0, lifetimeProfit: 0, lifetimeUnits: 0, generationsLaunched: 0, productsLaunched: 0, failedProjects: 0 },
  };
  addLedger(state, '創業資金', state.cash, 'other');
  addNotice(state, '創業', '小規模なオフィスと低品質なHarbor 28nm工場から事業を開始しました。', 'info');
  return state;
}

export function normalizeState(input: GameState): GameState {
  const fresh = createInitialState();
  const state = { ...fresh, ...structuredClone(input), version: VERSION } as GameState;
  state.date = state.date ?? fresh.date;
  state.series = Array.isArray(state.series) ? state.series : fresh.series;
  state.projects = Array.isArray(state.projects) ? state.projects : [];
  state.products = Array.isArray(state.products) ? state.products : [];
  state.contracts = Array.isArray(state.contracts) && state.contracts.length ? state.contracts : fresh.contracts;
  state.staff = Array.isArray(state.staff) ? state.staff : fresh.staff;
  state.competitors = Array.isArray(state.competitors) ? state.competitors : fresh.competitors;
  state.candidates = Array.isArray(state.candidates) ? state.candidates : fresh.candidates;
  state.loans = Array.isArray(state.loans) ? state.loans : [];
  state.ledger = Array.isArray(state.ledger) ? state.ledger : [];
  state.notifications = Array.isArray(state.notifications) ? state.notifications : [];
  state.facilities = Array.isArray(state.facilities) ? state.facilities : fresh.facilities;
  state.research = { ...fresh.research, ...(state.research ?? {}) };
  state.nextEventWeek ||= nextDecisionEventWeek(state.absoluteWeek, true);
  for (const product of state.products) {
    product.factoryAllocations ??= product.factoryContractId ? [{ contractId: product.factoryContractId, allocation: product.allocation ?? 500 }] : [];
    product.history ??= [];
    product.reasons ??= { positive: [], negative: [] };
  }
  return state;
}

export function saveState(state: GameState): void {
  try { saveActiveState(state); } catch { /* storage can be unavailable */ }
}

export function loadState(): GameState { return createInitialState(); }
export function resetState(): GameState { return createInitialState(); }
export function dismissNotification(state: GameState, id: string): void { state.notifications = state.notifications.filter((item) => item.id !== id); }
