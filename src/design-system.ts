import { RESEARCH_DEFINITIONS } from './data';
import { researchDurationSeconds, STANDARD_DEVELOPMENT_SECONDS } from './game-clock';
import { addLedger, addNotice, clamp, uid } from './state';
import type {
  AudienceFit, DesignValues, DevelopmentProject, GameState, PackageType, ProductCategory, ProductSeries,
  ProjectIssue, ProjectStage, ResearchArea, SeriesFocus, TechnicalMetrics, TechnologyPlan,
} from './types';

const STAGES: ProjectStage[] = ['concept', 'architecture', 'tapeout', 'prototype', 'validation', 'ready'];
const gateAt = [0, 20, 45, 67, 84, 100];

export function getFacilityLevel(state: GameState, id: GameState['facilities'][number]['id']): number {
  return state.facilities.find((facility) => facility.id === id)?.level ?? 0;
}

export function createSeries(state: GameState, name: string, category: ProductCategory, focus: SeriesFocus): { ok: boolean; message: string; series?: ProductSeries } {
  const trimmed = name.trim().slice(0, 28);
  if (!trimmed) return { ok: false, message: 'シリーズ名を入力してください。' };
  if (state.series.some((series) => series.name.toLowerCase() === trimmed.toLowerCase())) return { ok: false, message: '同名シリーズが存在します。' };
  const cost = 2_000_000;
  if (state.cash < cost) return { ok: false, message: 'ブランド立ち上げ費が不足しています。' };
  state.cash -= cost; addLedger(state, `${trimmed}シリーズ企画`, -cost, 'development');
  const series: ProductSeries = { id: uid('series'), name: trimmed, category, focus, generation: 0, legacy: 0, brand: 4, active: true, createdAt: { ...state.date }, lifetimeUnits: 0, lifetimeProfit: 0 };
  state.series.push(series); state.selectedSeriesId = series.id;
  return { ok: true, message: `${trimmed}シリーズを立ち上げました。`, series };
}

export function availableNodes(state: GameState): number[] {
  const level = state.research.process + getFacilityLevel(state, 'architectureLab');
  return [28, 22, 16, 14, 10, 7, 5, 3].filter((_, index) => index <= Math.floor(level / 2) + 1);
}
export function availablePackages(state: GameState): PackageType[] {
  const options: PackageType[] = ['monolithic'];
  if (state.research.packaging >= 2) options.push('chiplet');
  if (state.research.packaging >= 5) options.push('stacked');
  return options;
}
export function defaultTechnology(state: GameState): TechnologyPlan {
  const nodes = availableNodes(state);
  return { node: nodes[nodes.length - 1] ?? 28, packageType: 'monolithic', riskPosture: 'balanced', softwareInvestment: 45 };
}
export function defaultDesign(_state: GameState, series: ProductSeries): DesignValues {
  const perf = series.focus === 'performance' ? 56 : series.focus === 'value' ? 36 : 45;
  return { computeScale: perf, clockTarget: series.category === 'cpu' ? 3.4 : 1.25, architecture: 44, cacheBandwidth: 40, powerBudget: series.category === 'cpu' ? 88 : 165, qualityFocus: 50 };
}
export function designCaps(state: GameState, series: ProductSeries): Record<keyof DesignValues, number> {
  const arch = state.research[series.category === 'cpu' ? 'cpuArchitecture' : 'gpuArchitecture'];
  return { computeScale: 62 + arch * 8, clockTarget: series.category === 'cpu' ? 4.1 + arch * .22 : 1.7 + arch * .12, architecture: 62 + arch * 7, cacheBandwidth: 62 + arch * 6, powerBudget: series.category === 'cpu' ? 175 + arch * 10 : 360 + arch * 20, qualityFocus: 100 };
}

const packageEffect = (type: PackageType): { perf: number; die: number; yield: number; cost: number; heat: number; risk: number } => type === 'chiplet'
  ? { perf: 1.04, die: .78, yield: 1.12, cost: 1.13, heat: 1.05, risk: 1.08 }
  : type === 'stacked' ? { perf: 1.15, die: .66, yield: .9, cost: 1.42, heat: 1.28, risk: 1.35 }
    : { perf: 1, die: 1, yield: 1, cost: 1, heat: 1, risk: 1 };

export function calculateMetrics(state: GameState, series: ProductSeries, values: DesignValues, technology: TechnologyPlan): TechnicalMetrics {
  const cap = designCaps(state, series); const pkg = packageEffect(technology.packageType);
  const nodeFactor = Math.pow(28 / technology.node, .43);
  const archSkill = state.research[series.category === 'cpu' ? 'cpuArchitecture' : 'gpuArchitecture'];
  const team = state.staff.reduce((sum, member) => sum + member.skill, 0) / Math.max(1, state.staff.length) / 100;
  const risk = technology.riskPosture === 'aggressive' ? 1.17 : technology.riskPosture === 'conservative' ? .88 : 1;
  const compute = clamp(values.computeScale, 10, cap.computeScale);
  const clock = clamp(values.clockTarget, .8, cap.clockTarget);
  const architecture = clamp(values.architecture, 10, cap.architecture);
  const bandwidth = clamp(values.cacheBandwidth, 10, cap.cacheBandwidth);
  const scale = series.category === 'cpu' ? Math.pow(compute / 44, .72) * Math.pow(clock / 3.4, .76) : Math.pow(compute / 45, .9) * Math.pow(clock / 1.25, .68);
  const balance = Math.min(1, bandwidth / Math.max(22, compute * .82));
  const performance = 88 * scale * (.72 + architecture / 180) * (.76 + balance * .24) * nodeFactor * pkg.perf * risk * (1 + archSkill * .025 + team * .06);
  const power = values.powerBudget;
  const efficiency = performance / Math.max(45, power) * (series.category === 'cpu' ? 90 : 180) / pkg.heat;
  const dieSize = (series.category === 'cpu' ? 116 : 215) * (compute / 45) * Math.pow(technology.node / 28, .72) * pkg.die;
  const quality = values.qualityFocus / 100;
  const yieldRate = clamp((91 - dieSize * .075 + state.research.manufacturing * 3.8 + quality * 16) * pkg.yield / risk, 24, 97);
  const reliability = clamp(70 + quality * 23 + state.research.manufacturing * 2.2 - (risk - 1) * 42 - Math.max(0, power - (series.category === 'cpu' ? 110 : 230)) * .035, 42, 98);
  const softwareQuality = clamp(45 + technology.softwareInvestment * .42 + state.research.software * 4.2 + getFacilityLevel(state, 'softwareLab') * 4, 35, 98);
  const thermals = clamp(100 - power / (series.category === 'cpu' ? 2.6 : 4.8) - pkg.heat * 7 + quality * 10, 20, 94);
  const waferCost = (series.category === 'cpu' ? 7_800 : 13_500) * Math.pow(28 / technology.node, .42);
  const unitCost = (waferCost * (dieSize / (series.category === 'cpu' ? 120 : 220)) / (yieldRate / 100) + power * 38 + technology.softwareInvestment * 70) * pkg.cost;
  const complexity = clamp(compute * .55 + architecture * .7 + bandwidth * .42 + (28 / technology.node) * 7 + (technology.packageType !== 'monolithic' ? 20 : 0), 40, 180);
  const maskCost = 4_000_000 + Math.pow(28 / technology.node, 1.35) * 5_800_000;
  const developmentCost = 9_000_000 + complexity * 145_000;
  const prototypeCost = 3_500_000 + complexity * 54_000;
  const validationCost = 3_000_000 + complexity * 48_000 + (100 - reliability) * 90_000;
  const softwareCost = 2_000_000 + technology.softwareInvestment * 105_000;
  const bottleneck = balance < .78 ? 'キャッシュ・メモリ帯域が演算規模に追いついていません。' : thermals < 52 ? '電力と熱がブースト維持を制限しています。' : reliability < 72 ? '攻めた設計に対して検証・品質余力が不足しています。' : '大きなボトルネックはありません。';
  return { performance, singlePerformance: performance * (series.category === 'cpu' ? .92 : .54), multiPerformance: performance * (series.category === 'cpu' ? 1.28 : 1.08), efficiency, reliability, softwareQuality, thermals, dieSize, yieldRate, unitCost, developmentCost, maskCost, prototypeCost, validationCost, softwareCost, suggestedPrice: Math.ceil(unitCost * (series.focus === 'value' ? 1.55 : 1.9) / 1000) * 1000, complexity, scheduleWeeks: Math.round(12 + complexity / 15), risk: clamp((100 - reliability) + (100 - yieldRate) * .5, 5, 90), bottleneck, bottleneckSeverity: bottleneck.startsWith('大きな') ? 8 : 45 };
}

export function inferAudience(metrics: TechnicalMetrics, price: number, series: ProductSeries): AudienceFit[] {
  const value = metrics.performance / Math.max(1, price / 50_000) * .9;
  const candidates = [
    { id: 'gaming', name: 'ゲーマー', score: metrics.performance * 1.05 + metrics.softwareQuality * .12, reason: '性能とドライバー品質' },
    { id: 'creator', name: 'クリエイター', score: metrics.multiPerformance * .86 + metrics.reliability * .18, reason: '並列性能と安定性' },
    { id: 'value', name: '価格重視層', score: value + metrics.yieldRate * .12, reason: '価格性能と供給性' },
    { id: 'business', name: '法人', score: metrics.reliability * .72 + metrics.softwareQuality * .34, reason: '信頼性とサポート' },
    { id: 'efficiency', name: '省電力層', score: metrics.efficiency * .9 + metrics.thermals * .22, reason: '効率と温度' },
    { id: 'enthusiast', name: '自作愛好家', score: metrics.performance * 1.15 + series.brand * .3, reason: '性能とシリーズ評価' },
  ];
  return candidates.sort((a, b) => b.score - a.score).slice(0, 3).map((entry, index) => ({ ...entry, score: clamp(entry.score / (index ? 1.12 : 1), 0, 100) }));
}

function initialCost(metrics: TechnicalMetrics): number { return Math.round(metrics.developmentCost * .28 + 2_200_000); }
export function startGeneration(state: GameState, seriesId: string, codeName: string, values: DesignValues, technology: TechnologyPlan, leadStaffId: string | null = null): { ok: boolean; message: string; project?: DevelopmentProject } {
  const series = state.series.find((item) => item.id === seriesId);
  if (!series) return { ok: false, message: 'シリーズが見つかりません。' };
  if (state.projects.some((project) => project.seriesId === seriesId && project.stage !== 'ready')) return { ok: false, message: 'このシリーズは開発中です。' };
  if (!availableNodes(state).includes(technology.node) || !availablePackages(state).includes(technology.packageType)) return { ok: false, message: '未解禁技術が含まれています。' };
  const metrics = calculateMetrics(state, series, values, technology); const cost = initialCost(metrics);
  if (state.cash < cost) return { ok: false, message: `着手金が不足しています。必要額 ¥${cost.toLocaleString()}` };
  state.cash -= cost; addLedger(state, `${series.name}次世代 着手`, -cost, 'development');
  const generation = series.generation + 1;
  const project: DevelopmentProject = { id: uid('project'), seriesId, generation, codeName: codeName.trim().slice(0, 28) || `${series.name} Gen ${generation}`, values: { ...values }, technology: { ...technology }, metrics, audience: inferAudience(metrics, metrics.suggestedPrice, series), stage: 'concept', progress: 0, startedAt: { ...state.date }, spent: cost, weeklyBurn: Math.round(220_000 + metrics.complexity * 5_500), paused: false, leadStaffId: leadStaffId ?? state.staff[0]?.id ?? null, issues: [], paidGates: ['concept'], delayWeeks: 0, reliabilityPenalty: 0, performancePenalty: 0 };
  state.projects.push(project); state.selectedProjectId = project.id; state.activePanel = 'development';
  return { ok: true, message: `${project.codeName}の開発を開始しました。`, project };
}

function stageFor(progress: number): ProjectStage {
  if (progress >= 100) return 'ready';
  if (progress >= 84) return 'validation';
  if (progress >= 67) return 'prototype';
  if (progress >= 45) return 'tapeout';
  if (progress >= 20) return 'architecture';
  return 'concept';
}
function gateCost(project: DevelopmentProject, stage: ProjectStage): number {
  if (stage === 'architecture') return project.metrics.developmentCost * .26;
  if (stage === 'tapeout') return project.metrics.maskCost;
  if (stage === 'prototype') return project.metrics.prototypeCost;
  if (stage === 'validation') return project.metrics.validationCost + project.metrics.softwareCost * .45;
  return stage === 'ready' ? project.metrics.softwareCost * .55 : 0;
}
function createIssue(project: DevelopmentProject): ProjectIssue {
  const severe = project.metrics.risk > 45 && Math.random() < .45;
  return { id: uid('issue'), title: severe ? '検証で重大な不安定性' : '試作で設計マージン不足', description: severe ? '高負荷時に再現性の低い停止が確認されました。' : '目標クロックと電力の両立に余裕がありません。', severity: severe ? 'critical' : 'major', status: 'open', fixCost: severe ? 6_500_000 : 3_000_000, delayWeeks: severe ? 4 : 2, performancePenalty: severe ? 7 : 3, reliabilityPenalty: severe ? 12 : 5 };
}

export function advanceDesignRealtime(state: GameState, deltaSeconds: number, speed: GameState['speed']): boolean {
  if (speed === 0) return false;
  let changed = false;
  for (const project of state.projects.filter((item) => item.stage !== 'ready' && !item.paused)) {
    if (project.issues.some((issue) => issue.status === 'open')) continue;
    const teamFactor = clamp(state.staff.reduce((sum, member) => sum + member.skill * (member.fatigue > 80 ? .55 : 1), 0) / 150, .8, 1.8);
    const gain = deltaSeconds / STANDARD_DEVELOPMENT_SECONDS * 100 * teamFactor;
    const beforeStage = project.stage; project.progress = clamp(project.progress + gain, 0, 100); project.stage = stageFor(project.progress);
    if (project.stage !== beforeStage) {
      const cost = Math.round(gateCost(project, project.stage));
      if (cost > 0 && !project.paidGates.includes(project.stage)) {
        if (state.cash < cost) { project.paused = true; addNotice(state, '開発停止', `${project.codeName}は${project.stage}工程の費用不足で停止しました。`, 'bad'); }
        else { state.cash -= cost; project.spent += cost; project.paidGates.push(project.stage); addLedger(state, `${project.codeName} ${project.stage}`, -cost, 'development'); }
      }
      if (project.stage !== 'ready' && Math.random() < project.metrics.risk / 260) project.issues.push(createIssue(project));
      if (project.stage === 'ready') { state.stats.generationsLaunched += 1; addNotice(state, '開発完了', `${project.codeName}の量産設計が完成しました。SKUと工場を決めて発売できます。`, 'good'); }
    }
    changed = true;
  }
  if (state.activeResearch && !state.activeResearch.paused) {
    const program = state.activeResearch; const duration = researchDurationSeconds(program.totalWeeks);
    program.progress = clamp(program.progress + deltaSeconds / duration * 100, 0, 100);
    if (program.progress >= 100) {
      state.research[program.area] += 1; state.researchPoints += 22; addNotice(state, '研究完了', `${RESEARCH_DEFINITIONS[program.area].name} Lv.${state.research[program.area]}を獲得しました。`, 'good'); state.activeResearch = null;
    }
    changed = true;
  }
  return changed;
}

export function resolveProjectIssue(state: GameState, projectId: string, issueId: string, choice: 'fix' | 'workaround' | 'ignore'): { ok: boolean; message: string } {
  const project = state.projects.find((item) => item.id === projectId); const issue = project?.issues.find((item) => item.id === issueId);
  if (!project || !issue || issue.status !== 'open') return { ok: false, message: '問題が見つかりません。' };
  if (choice === 'fix') { if (state.cash < issue.fixCost) return { ok: false, message: '修正費が不足しています。' }; state.cash -= issue.fixCost; project.spent += issue.fixCost; addLedger(state, `${project.codeName} 問題修正`, -issue.fixCost, 'development'); }
  if (choice === 'workaround') { project.progress = Math.max(0, project.progress - issue.delayWeeks * 1.5); project.performancePenalty += issue.performancePenalty * .45; project.reliabilityPenalty += issue.reliabilityPenalty * .35; }
  if (choice === 'ignore') { project.performancePenalty += issue.performancePenalty; project.reliabilityPenalty += issue.reliabilityPenalty; }
  issue.status = 'resolved'; return { ok: true, message: choice === 'fix' ? '根本修正しました。' : choice === 'workaround' ? '回避策で開発を継続します。' : 'リスクを受け入れました。' };
}
export function toggleProjectPause(state: GameState, projectId: string): void { const project = state.projects.find((item) => item.id === projectId); if (project) project.paused = !project.paused; }

export function startResearch(state: GameState, area: ResearchArea): { ok: boolean; message: string } {
  if (state.activeResearch) return { ok: false, message: '別の研究が進行中です。' };
  const definition = RESEARCH_DEFINITIONS[area]; const level = state.research[area]; const cash = Math.round(definition.baseCash * (1 + level * .62)); const rp = Math.round(definition.baseRp * (1 + level * .55));
  if (state.cash < cash || state.researchPoints < rp) return { ok: false, message: `研究資源が不足しています。現金 ¥${cash.toLocaleString()} / RP ${rp}` };
  state.cash -= cash; state.researchPoints -= rp; addLedger(state, `${definition.name}研究`, -cash, 'research');
  state.activeResearch = { id: uid('research'), area, progress: 0, totalWeeks: definition.baseWeeks + level * 2, weeklyCost: Math.round(cash * .035), spent: cash, paused: false };
  return { ok: true, message: `${definition.name}研究を開始しました。` };
}
export function toggleResearchPause(state: GameState): void { if (state.activeResearch) state.activeResearch.paused = !state.activeResearch.paused; }
