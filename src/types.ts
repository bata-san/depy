export type ProductCategory = 'cpu' | 'gpu';
export type SeriesFocus = 'performance' | 'balanced' | 'value' | 'efficient' | 'reliable';
export type ProjectStage = 'concept' | 'architecture' | 'tapeout' | 'prototype' | 'validation' | 'ready';
export type CompanyStatus = 'active' | 'struggling' | 'acquired' | 'exited';
export type PanelId = 'home' | 'development' | 'products' | 'factories' | 'competitors' | 'research' | 'company';
export type CompanyTab = 'team' | 'facilities' | 'finance';
export type StaffRole = 'architect' | 'circuit' | 'thermal' | 'software' | 'validation' | 'marketing' | 'operations';
export type StaffTrait = 'prodigy' | 'veteran' | 'meticulous' | 'pragmatic' | 'workhorse' | 'communicator' | 'temperamental' | 'loyal' | 'negotiator';
export type StaffSpecialty = 'architecture' | 'clock' | 'cache' | 'yield' | 'power' | 'driver' | 'quality' | 'brand' | 'supply';
export type ResearchArea = 'cpuArchitecture' | 'gpuArchitecture' | 'process' | 'packaging' | 'software' | 'manufacturing';
export type FacilityId = 'office' | 'architectureLab' | 'prototypeLab' | 'validationLab' | 'softwareLab' | 'marketingStudio';
export type PackageType = 'monolithic' | 'chiplet' | 'stacked';
export type RiskPosture = 'conservative' | 'balanced' | 'aggressive';
export type SkuProfile = 'flagship' | 'standard' | 'efficient' | 'salvage';

export interface GameDate { year: number; week: number; }

export interface DesignValues {
  computeScale: number;
  clockTarget: number;
  architecture: number;
  cacheBandwidth: number;
  powerBudget: number;
  qualityFocus: number;
}

export interface TechnologyPlan {
  node: number;
  packageType: PackageType;
  riskPosture: RiskPosture;
  softwareInvestment: number;
}

export interface TechnicalMetrics {
  performance: number;
  singlePerformance: number;
  multiPerformance: number;
  efficiency: number;
  reliability: number;
  softwareQuality: number;
  thermals: number;
  dieSize: number;
  yieldRate: number;
  unitCost: number;
  developmentCost: number;
  maskCost: number;
  prototypeCost: number;
  validationCost: number;
  softwareCost: number;
  suggestedPrice: number;
  complexity: number;
  scheduleWeeks: number;
  risk: number;
  bottleneck: string;
  bottleneckSeverity: number;
}

export interface AudienceFit { id: string; name: string; score: number; reason: string; }

export interface ProductSeries {
  id: string;
  name: string;
  category: ProductCategory;
  focus: SeriesFocus;
  generation: number;
  legacy: number;
  brand: number;
  active: boolean;
  createdAt: GameDate;
  lifetimeUnits: number;
  lifetimeProfit: number;
}

export interface ProjectIssue {
  id: string;
  title: string;
  description: string;
  severity: 'minor' | 'major' | 'critical';
  status: 'open' | 'resolved';
  fixCost: number;
  delayWeeks: number;
  performancePenalty: number;
  reliabilityPenalty: number;
}

export interface DevelopmentProject {
  id: string;
  seriesId: string;
  generation: number;
  codeName: string;
  values: DesignValues;
  technology: TechnologyPlan;
  metrics: TechnicalMetrics;
  audience: AudienceFit[];
  stage: ProjectStage;
  progress: number;
  startedAt: GameDate;
  spent: number;
  weeklyBurn: number;
  paused: boolean;
  leadStaffId: string | null;
  issues: ProjectIssue[];
  paidGates: ProjectStage[];
  delayWeeks: number;
  reliabilityPenalty: number;
  performancePenalty: number;
}

export interface FactoryDefinition {
  id: string;
  name: string;
  country: string;
  nodeClass: number;
  quality: number;
  weeklyCapacity: number;
  unitMultiplier: number;
  signupFee: number;
  minimumWeeks: number;
  reliability: number;
  unlockYear: number;
  setupWeeks: number;
  reservationRate: number;
  description: string;
}

export interface FactoryContract {
  id: string;
  factoryId: string;
  startedAt: GameDate;
  committedCapacity: number;
  remainingWeeks: number;
  setupRemaining: number;
  active: boolean;
  reliabilityModifier: number;
  modifierWeeks: number;
}

export interface ReviewBreakdown {
  performance: number;
  value: number;
  efficiency: number;
  reliability: number;
  software: number;
}

export interface ProductReasons { positive: string[]; negative: string[]; }

export interface ProductHistoryPoint {
  week: number;
  demand: number;
  produced: number;
  sold: number;
  lostSales: number;
  inventory: number;
  revenue: number;
  profit: number;
  rating: number;
  marketShare: number;
}

export interface ProductFactoryAllocation {
  contractId: string;
  allocation: number;
}

export interface ReleasedProduct {
  id: string;
  projectId: string;
  seriesId: string;
  generation: number;
  name: string;
  category: ProductCategory;
  skuProfile: SkuProfile;
  launchedAt: GameDate;
  endOfLifeAt: GameDate;
  price: number;
  unitCost: number;
  metrics: TechnicalMetrics;
  audience: AudienceFit[];
  factoryAllocations: ProductFactoryAllocation[];
  /** Legacy fields kept for automatic migration of older saves. */
  factoryContractId?: string;
  allocation?: number;
  inventory: number;
  lifetimeProduced: number;
  lifetimeSold: number;
  lifetimeLostSales: number;
  lifetimeRevenue: number;
  lifetimeProfit: number;
  weeklyDemand: number;
  weeklySales: number;
  weeklyProduced: number;
  weeklyProfit: number;
  trend: number;
  marketShare: number;
  rating: number;
  review: ReviewBreakdown;
  reasons: ProductReasons;
  status: 'launching' | 'selling' | 'eol';
  history: ProductHistoryPoint[];
  marketingBoost: number;
  marketingWeeks: number;
  supportLevel: number;
  firmwareLevel: number;
  warrantyReserve: number;
}

export interface CompetitorModel {
  id: string;
  companyId: string;
  name: string;
  category: ProductCategory;
  launchDate: GameDate;
  endDate: GameDate;
  price: number;
  performance: number;
  efficiency: number;
  reliability: number;
  software: number;
  brand: number;
  fictional: boolean;
  salesMomentum: number;
  marketShare: number;
}

export interface CompetitorCompany {
  id: string;
  name: string;
  real: boolean;
  color: string;
  specialties: ProductCategory[];
  strategy: SeriesFocus;
  cash: number;
  technology: number;
  brand: number;
  momentum: number;
  marketShare: number;
  status: CompanyStatus;
  foundedYear: number;
  models: CompetitorModel[];
  nextLaunchWeek: number;
  history: string[];
}

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  specialty: StaffSpecialty;
  traits: StaffTrait[];
  level: number;
  skill: number;
  creativity: number;
  discipline: number;
  growth: number;
  salary: number;
  morale: number;
  fatigue: number;
  loyalty: number;
  xp: number;
  joinedAt: GameDate;
}

export interface RecruitCandidate extends StaffMember {
  signingBonus: number;
  expiresAtWeek: number;
}

export interface FacilityState {
  id: FacilityId;
  level: number;
}

export interface ResearchProgram {
  id: string;
  area: ResearchArea;
  progress: number;
  totalWeeks: number;
  weeklyCost: number;
  spent: number;
  paused: boolean;
}

export interface Loan {
  id: string;
  lender: string;
  principal: number;
  balance: number;
  weeklyPayment: number;
  remainingWeeks: number;
  originalTermWeeks: number;
  interestRate: number;
}

export interface LedgerEntry {
  id: string;
  date: GameDate;
  label: string;
  amount: number;
  category: 'sales' | 'development' | 'factory' | 'salary' | 'research' | 'facility' | 'marketing' | 'support' | 'inventory' | 'loan' | 'overhead' | 'other';
}

export interface MarketState {
  gaming: number;
  creator: number;
  value: number;
  business: number;
  efficiency: number;
  enthusiast: number;
  headline: string;
  weeksRemaining: number;
  cpuPool: number;
  gpuPool: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  tone: 'good' | 'warning' | 'bad' | 'info';
  date: GameDate;
}

export interface DecisionChoice {
  id: string;
  label: string;
  description: string;
  cost?: number;
  tone?: 'good' | 'warning' | 'bad';
}

export interface DecisionEvent {
  id: string;
  source: 'market' | 'competitor' | 'factory' | 'internal';
  kind: 'poach' | 'factory' | 'corporate' | 'quality' | 'competitive';
  title: string;
  description: string;
  choices: DecisionChoice[];
  staffId?: string;
  contractId?: string;
  productId?: string;
}

export interface GameStats {
  lifetimeRevenue: number;
  lifetimeProfit: number;
  lifetimeUnits: number;
  generationsLaunched: number;
  productsLaunched: number;
  failedProjects: number;
}

export interface GameState {
  version: number;
  companyName: string;
  date: GameDate;
  absoluteWeek: number;
  cash: number;
  researchPoints: number;
  reputation: number;
  speed: 0 | 1 | 3 | 8;
  activePanel: PanelId;
  companyTab: CompanyTab;
  selectedSeriesId: string | null;
  selectedProductId: string | null;
  selectedProjectId: string | null;
  officeLevel: number;
  research: Record<ResearchArea, number>;
  activeResearch: ResearchProgram | null;
  series: ProductSeries[];
  projects: DevelopmentProject[];
  products: ReleasedProduct[];
  contracts: FactoryContract[];
  competitors: CompetitorCompany[];
  staff: StaffMember[];
  candidates: RecruitCandidate[];
  lastCandidateRefreshWeek: number;
  facilities: FacilityState[];
  loans: Loan[];
  ledger: LedgerEntry[];
  market: MarketState;
  notifications: NotificationItem[];
  activeEvent: DecisionEvent | null;
  nextEventWeek: number;
  stats: GameStats;
}

export interface LaunchDraft {
  projectId: string;
  factoryAllocations: ProductFactoryAllocation[];
  skuProfile: SkuProfile;
  price: number;
  lifeWeeks: number;
  launchMarketing: number;
}
