import { FUTURE_SERIES_WORDS, HISTORICAL_MODELS } from './data';
import { addNotice, clamp, dateToIndex, uid } from './state';
import type { CompetitorCompany, CompetitorModel, GameState, ProductCategory } from './types';

export function activeCompetitorModels(state: GameState, category?: ProductCategory): CompetitorModel[] {
  const now = dateToIndex(state.date);
  return state.competitors.flatMap((company) => company.models)
    .filter((model) => (!category || model.category === category) && dateToIndex(model.launchDate) <= now && dateToIndex(model.endDate) >= now);
}

function modelName(company: CompetitorCompany, category: ProductCategory, year: number): string {
  const words = FUTURE_SERIES_WORDS[company.id] ?? ['Nova', 'Vector', 'Prime', 'Edge'];
  const word = words[(year + company.models.length) % words.length] ?? 'Next';
  const tier = 50 + ((year + company.models.length * 3) % 8) * 10;
  return `${company.name} ${word} ${tier}${category === 'gpu' ? ' Graphics' : ''}（ゲーム内予測）`;
}

function launchModel(state: GameState, company: CompetitorCompany): void {
  if (company.status === 'exited' || company.status === 'acquired') return;
  const category = company.specialties[(state.absoluteWeek + company.models.length) % company.specialties.length] ?? 'cpu';
  const yearDelta = state.date.year - 2015; const strategy = company.strategy;
  const performance = 82 + yearDelta * 7.8 + company.technology * 4.5 + (strategy === 'performance' ? 13 : strategy === 'efficient' ? -4 : 0) + Math.random() * 12;
  const price = Math.round((category === 'cpu' ? 32_000 : 48_000) * (1 + yearDelta * .065) * (strategy === 'value' ? .78 : strategy === 'performance' ? 1.34 : 1) / 1000) * 1000;
  const model: CompetitorModel = { id: uid('rival'), companyId: company.id, name: modelName(company, category, state.date.year), category, launchDate: { ...state.date }, endDate: { year: state.date.year + 1, week: Math.max(1, state.date.week - 1) }, price, performance, efficiency: 65 + company.technology * 4 + Math.random() * 15, reliability: clamp(72 + company.brand * .15 + Math.random() * 12, 55, 98), software: clamp(68 + company.technology * 3 + Math.random() * 15, 45, 98), brand: company.brand, fictional: true, salesMomentum: .85 + Math.random() * .35, marketShare: 0 };
  company.models.push(model); company.cash -= price * 120; company.nextLaunchWeek = state.absoluteWeek + 28 + Math.floor(Math.random() * 28); company.history.unshift(`${state.date.year}年: ${model.name}を投入`);
  addNotice(state, '競合新製品', `${company.name}が${model.name}を発売しました。`, 'warning');
}

function spawnStartup(state: GameState): void {
  const names = ['Aster Silicon', 'Northstar Logic', 'Kumo Compute', 'Helix Forge', 'Mosaic Micro'];
  const name = names.find((candidate) => !state.competitors.some((company) => company.name === candidate)); if (!name) return;
  const company: CompetitorCompany = { id: uid('startup'), name, real: false, color: `hsl(${Math.floor(Math.random() * 360)} 70% 58%)`, specialties: [Math.random() < .5 ? 'cpu' : 'gpu'], strategy: (['value', 'efficient', 'performance'] as const)[Math.floor(Math.random() * 3)] ?? 'balanced', cash: 85_000_000, technology: 2 + Math.random() * 2, brand: 8, momentum: 1.2, marketShare: 0, status: 'active', foundedYear: state.date.year, models: [], nextLaunchWeek: state.absoluteWeek + 8, history: [`${state.date.year}年: 創業`] };
  state.competitors.push(company); addNotice(state, '新興企業', `${name}が市場参入しました。成功すれば主要競合へ成長します。`, 'info');
}

function addHistoricalModels(state: GameState): void {
  const existing = new Set(state.competitors.flatMap((company) => company.models.map((model) => model.id)));
  for (const source of HISTORICAL_MODELS as readonly { companyId: string; name: string; category: ProductCategory; year: number; week: number; price: number; performance: number; efficiency: number; reliability: number; software: number; brand: number }[]) {
    const sourceId = `history-${source.companyId}-${source.year}-${source.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    if (existing.has(sourceId) || source.year > state.date.year || (source.year === state.date.year && (source.week ?? 1) > state.date.week)) continue;
    const company = state.competitors.find((item) => item.id === source.companyId); if (!company) continue;
    company.models.push({ id: sourceId, companyId: source.companyId, name: source.name, category: source.category, launchDate: { year: source.year, week: source.week ?? 1 }, endDate: { year: source.year + 2, week: 1 }, price: source.price, performance: source.performance, efficiency: source.efficiency ?? 70, reliability: source.reliability ?? 82, software: source.software ?? 82, brand: company.brand, fictional: false, salesMomentum: 1, marketShare: 0 });
  }
}

export function updateCompetitorsWeekly(state: GameState): void {
  addHistoricalModels(state);
  for (const company of state.competitors) {
    if (company.real) company.cash += 4_000_000 + company.brand * 80_000;
    else company.cash += Math.max(500_000, company.models.length * 1_800_000 * company.momentum) - 1_200_000;
    if (company.status === 'active' && state.absoluteWeek >= company.nextLaunchWeek) launchModel(state, company);
    const current = activeCompetitorModels(state).filter((model) => model.companyId === company.id);
    company.marketShare = clamp(current.reduce((sum, model) => sum + model.performance / Math.max(1, model.price / 45_000), 0) * .012 * company.momentum, 0, .42);
    if (!company.real) {
      if (company.cash < -20_000_000 && company.status === 'active') { company.status = 'struggling'; company.momentum *= .72; company.history.unshift(`${state.date.year}年: 資金難`); addNotice(state, '競合資金難', `${company.name}が資金難に陥っています。`, 'info'); }
      if (company.status === 'struggling' && company.cash < -55_000_000) {
        const buyer = state.competitors.filter((item) => item.status === 'active' && item.id !== company.id).sort((a, b) => b.cash - a.cash)[0];
        if (buyer && Math.random() < .65) { company.status = 'acquired'; company.history.unshift(`${state.date.year}年: ${buyer.name}に買収`); addNotice(state, '競合買収', `${company.name}が${buyer.name}に買収されました。`, 'warning'); }
        else { company.status = 'exited'; company.history.unshift(`${state.date.year}年: 市場撤退`); addNotice(state, '競合撤退', `${company.name}が市場から撤退しました。`, 'info'); }
      }
      if (company.marketShare > .12 && company.status === 'active') { company.brand = clamp(company.brand + .08, 0, 100); company.technology += .006; company.cash += 2_000_000; }
    }
  }
  if (state.date.year >= 2017 && state.competitors.filter((company) => !company.real && company.status === 'active').length < 3 && state.absoluteWeek % 78 === 0) spawnStartup(state);
}
