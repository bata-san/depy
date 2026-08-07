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
  return `${company.name} ${word} ${tier}${category === 'gpu' ? ' Graphics' : ''}`;
}

function launchModel(state: GameState, company: CompetitorCompany): void {
  if (company.status === 'exited' || company.status === 'acquired') return;
  const category = company.specialties[(state.absoluteWeek + company.models.length) % company.specialties.length] ?? 'cpu';
  const yearDelta = state.date.year - 2015;
  const strategy = company.strategy;
  const performance = 70 + yearDelta * 8.2 + company.technology * .56 + (strategy === 'performance' ? 11 : strategy === 'efficient' ? -3 : 0) + Math.random() * 9;
  const price = Math.round((category === 'cpu' ? 32_000 : 48_000) * (1 + yearDelta * .06) * (strategy === 'value' ? .78 : strategy === 'performance' ? 1.3 : 1) / 1000) * 1000;
  const model: CompetitorModel = {
    id: uid('rival'), companyId: company.id, name: modelName(company, category, state.date.year), category,
    launchDate: { ...state.date }, endDate: { year: state.date.year + 1, week: Math.max(1, state.date.week - 1) },
    price, performance, efficiency: 54 + company.technology * .5 + Math.random() * 11,
    reliability: clamp(66 + company.brand * .14 + Math.random() * 11, 52, 96),
    software: clamp(62 + company.technology * .45 + Math.random() * 11, 42, 96), brand: company.brand,
    fictional: true, salesMomentum: .78 + Math.random() * .32, marketShare: 0,
  };
  company.models.push(model);
  company.cash -= price * 120;
  company.nextLaunchWeek = state.absoluteWeek + 32 + Math.floor(Math.random() * 34);
  company.history.unshift(`${state.date.year}年: ${model.name}を投入`);
  addNotice(state, '競合新製品', `${company.name}が${model.name}を発売しました。`, 'warning');
}

function latestPerformance(company: CompetitorCompany, category: ProductCategory): number {
  return company.models.filter((model) => model.category === category).reduce((best, model) => Math.max(best, model.performance), category === 'gpu' ? 180 : 150);
}

function launchFutureRealModel(state: GameState, company: CompetitorCompany, category: ProductCategory): void {
  const current = activeCompetitorModels(state, category).some((model) => model.companyId === company.id);
  if (current || state.date.year < 2024) return;
  const last = latestPerformance(company, category);
  const annualScale = company.id === 'nvidia' ? 1.27 : company.id === 'amd' ? 1.235 : 1.205;
  const performance = Math.max(last * annualScale, 260 + (state.date.year - 2020) * (company.id === 'nvidia' ? 72 : 58));
  const priceBase = category === 'gpu' ? 118_000 : 72_000;
  const premium = company.id === 'nvidia' ? 1.28 : company.id === 'intel' ? 1.08 : 1;
  const price = Math.round(priceBase * premium * (1 + Math.max(0, state.date.year - 2024) * .055) / 1000) * 1000;
  const model: CompetitorModel = {
    id: `future-${company.id}-${category}-${state.date.year}`,
    companyId: company.id,
    name: modelName(company, category, state.date.year),
    category,
    launchDate: { ...state.date },
    endDate: { year: state.date.year + 1, week: 52 },
    price,
    performance,
    efficiency: clamp(82 + company.technology * .17 + (state.date.year - 2024) * 1.6, 78, 99),
    reliability: clamp(88 + company.brand * .055, 86, 98),
    software: clamp(86 + company.technology * .09 + (company.id === 'nvidia' ? 4 : 0), 84, 99),
    brand: company.brand,
    fictional: false,
    salesMomentum: company.id === 'nvidia' ? 1.38 : company.id === 'intel' ? 1.24 : 1.2,
    marketShare: 0,
  };
  company.models.push(model);
  company.history.unshift(`${state.date.year}年: ${model.name}を投入`);
  addNotice(state, '大手新世代', `${company.name}が${model.name}を投入。市場基準が引き上がりました。`, 'warning');
}

function spawnStartup(state: GameState): void {
  const names = ['Aster Silicon', 'Northstar Logic', 'Kumo Compute', 'Helix Forge', 'Mosaic Micro'];
  const name = names.find((candidate) => !state.competitors.some((company) => company.name === candidate));
  if (!name) return;
  const company: CompetitorCompany = {
    id: uid('startup'), name, real: false, color: `hsl(${Math.floor(Math.random() * 360)} 70% 58%)`,
    specialties: [Math.random() < .5 ? 'cpu' : 'gpu'],
    strategy: (['value', 'efficient', 'performance'] as const)[Math.floor(Math.random() * 3)] ?? 'balanced',
    cash: 85_000_000, technology: 24 + Math.random() * 16, brand: 8, momentum: .75 + Math.random() * .25,
    marketShare: 0, status: 'active', foundedYear: state.date.year, models: [], nextLaunchWeek: state.absoluteWeek + 8,
    history: [`${state.date.year}年: 創業`],
  };
  state.competitors.push(company);
  addNotice(state, '新興企業', `${name}が市場参入しました。成功すれば主要競合へ成長します。`, 'info');
}

function addHistoricalModels(state: GameState): void {
  const existing = new Set(state.competitors.flatMap((company) => company.models.map((model) => model.id)));
  for (const source of HISTORICAL_MODELS as readonly { companyId: string; name: string; category: ProductCategory; year: number; week: number; price: number; performance: number; efficiency: number; reliability: number; software: number; brand: number }[]) {
    const sourceId = `history-${source.companyId}-${source.year}-${source.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    if (existing.has(sourceId) || source.year > state.date.year || (source.year === state.date.year && (source.week ?? 1) > state.date.week)) continue;
    const company = state.competitors.find((item) => item.id === source.companyId);
    if (!company) continue;
    company.models.push({
      id: sourceId, companyId: source.companyId, name: source.name, category: source.category,
      launchDate: { year: source.year, week: source.week ?? 1 }, endDate: { year: source.year + 2, week: 1 },
      price: source.price, performance: source.performance, efficiency: source.efficiency ?? 70,
      reliability: source.reliability ?? 82, software: source.software ?? 82, brand: company.brand,
      fictional: false, salesMomentum: company.id === 'nvidia' ? 1.34 : company.id === 'intel' ? 1.22 : 1.17, marketShare: 0,
    });
  }
}

function realMomentum(company: CompetitorCompany): number {
  if (company.id === 'nvidia') return 1.72;
  if (company.id === 'intel') return 1.55;
  if (company.id === 'amd') return 1.48;
  return 1.22;
}

export function updateCompetitorsWeekly(state: GameState): void {
  addHistoricalModels(state);
  for (const company of state.competitors) {
    if (company.real) {
      company.status = 'active';
      company.momentum = Math.max(company.momentum, realMomentum(company));
      company.cash += 16_000_000 + company.brand * 180_000;
      company.technology = Math.max(company.technology, company.id === 'nvidia' ? 98 : company.id === 'intel' ? 93 : 91);
      company.brand = Math.max(company.brand, company.id === 'nvidia' ? 96 : company.id === 'intel' ? 94 : 89);
      for (const category of company.specialties) launchFutureRealModel(state, company, category);
    } else {
      if (company.momentum <= .05) company.momentum = .72 + Math.random() * .28;
      company.cash += Math.max(350_000, company.models.length * 1_350_000 * company.momentum) - 1_350_000;
    }

    if (!company.real && company.status === 'active' && state.absoluteWeek >= company.nextLaunchWeek) launchModel(state, company);
    const current = activeCompetitorModels(state).filter((model) => model.companyId === company.id);
    const rawShare = current.reduce((sum, model) => sum + model.performance / Math.max(1, model.price / 45_000) * model.salesMomentum, 0);
    company.marketShare = clamp(rawShare * (company.real ? .0045 : .003) * company.momentum, 0, company.real ? .62 : .3);

    if (!company.real) {
      if (company.cash < -20_000_000 && company.status === 'active') {
        company.status = 'struggling'; company.momentum *= .72; company.history.unshift(`${state.date.year}年: 資金難`);
        addNotice(state, '競合資金難', `${company.name}が資金難に陥っています。`, 'info');
      }
      if (company.status === 'struggling' && company.cash < -55_000_000) {
        const buyer = state.competitors.filter((item) => item.status === 'active' && item.id !== company.id).sort((a, b) => b.cash - a.cash)[0];
        if (buyer && Math.random() < .65) {
          company.status = 'acquired'; company.history.unshift(`${state.date.year}年: ${buyer.name}に買収`);
          addNotice(state, '競合買収', `${company.name}が${buyer.name}に買収されました。`, 'warning');
        } else {
          company.status = 'exited'; company.history.unshift(`${state.date.year}年: 市場撤退`);
          addNotice(state, '競合撤退', `${company.name}が市場から撤退しました。`, 'info');
        }
      }
      if (company.marketShare > .1 && company.status === 'active') {
        company.brand = clamp(company.brand + .055, 0, 100);
        company.technology += .004;
        company.cash += 1_400_000;
      }
    }
  }
  if (state.date.year >= 2017 && state.competitors.filter((company) => !company.real && company.status === 'active').length < 3 && state.absoluteWeek % 78 === 0) spawnStartup(state);
}
