import type {
  CompetitorCompany,
  FacilityId,
  FactoryDefinition,
  ProductCategory,
  RecruitCandidate,
  ResearchArea,
  SeriesFocus,
  StaffMember,
  StaffRole,
  StaffSpecialty,
  StaffTrait,
} from './types';

export const SERIES_FOCUS_LABELS: Record<SeriesFocus, string> = {
  performance: '最高性能',
  balanced: '総合力',
  value: '価格性能',
  efficient: '省電力',
  reliable: '高信頼性',
};

export const SERIES_FOCUS_DESCRIPTIONS: Record<SeriesFocus, string> = {
  performance: '開発費・発熱・歩留まりを許容し、世代トップを狙う。',
  balanced: '性能、価格、効率、品質の大きな弱点を減らす。',
  value: '製造原価と販売価格を抑え、普及帯の販売量を狙う。',
  efficient: 'ワット性能、静音性、冷却余裕を重視する。',
  reliable: '法人需要、長期運用、故障率、供給安定性を重視する。',
};

export const ROLE_LABELS: Record<StaffRole, string> = {
  architect: 'アーキテクト',
  circuit: '回路設計',
  thermal: '熱・電源',
  software: 'ソフトウェア',
  validation: '検証',
  marketing: '企画・販促',
  operations: '生産管理',
};

export const SPECIALTY_LABELS: Record<StaffSpecialty, string> = {
  architecture: '新設計',
  clock: '高クロック',
  cache: 'キャッシュ・帯域',
  yield: '歩留まり',
  power: '電力・冷却',
  driver: 'ドライバー',
  quality: '品質保証',
  brand: 'ブランド',
  supply: '工場交渉',
};

export const SPECIALTY_IMPACTS: Record<StaffSpecialty, string> = {
  architecture: '性能設計と新アーキテクチャの完成度を上げる',
  clock: '高クロック設計の性能効率を上げる',
  cache: 'キャッシュ・帯域不足による性能損失を減らす',
  yield: '量産歩留まりと実際の週産数を増やす',
  power: '消費電力、温度、効率を改善する',
  driver: 'ドライバー品質と発売後評価を上げる',
  quality: '信頼性を高め、開発リスクを抑える',
  brand: '需要、シリーズ評価、販促効果を伸ばす',
  supply: '工場契約費と量産効率を改善する',
};

export const TRAIT_LABELS: Record<StaffTrait, string> = {
  prodigy: '天才肌',
  veteran: 'ベテラン',
  meticulous: '几帳面',
  pragmatic: '現実主義',
  workhorse: '仕事人',
  communicator: '調整上手',
  temperamental: '気分屋',
  loyal: '忠誠心',
  negotiator: '交渉巧者',
};

export const TRAIT_DESCRIPTIONS: Record<StaffTrait, string> = {
  prodigy: 'ひらめきと成長が速いが給与要求も高い。',
  veteran: '問題発見と安定性に強いが成長は遅い。',
  meticulous: '品質と歩留まりを改善する。',
  pragmatic: '開発費と期間を抑える。',
  workhorse: '疲労が溜まりにくく進行速度が高い。',
  communicator: 'チーム全体の士気低下を抑える。',
  temperamental: '高い能力を持つが退職リスクが高い。',
  loyal: '引き抜きと退職に強い。',
  negotiator: '工場契約と採用費を抑える。',
};

export const RESEARCH_DEFINITIONS: Record<ResearchArea, { name: string; description: string; baseWeeks: number; baseCash: number; baseRp: number }> = {
  cpuArchitecture: { name: 'CPUアーキテクチャ', description: 'IPC、コア設計、分岐予測、キャッシュ制御の上限を上げる。', baseWeeks: 20, baseCash: 4_800_000, baseRp: 10 },
  gpuArchitecture: { name: 'GPUアーキテクチャ', description: '演算器、フロントエンド、RT・AI処理の上限を上げる。', baseWeeks: 22, baseCash: 5_400_000, baseRp: 11 },
  process: { name: '製造プロセス', description: 'より微細なノードを選べるようにし、面積と電力を改善する。', baseWeeks: 24, baseCash: 6_200_000, baseRp: 12 },
  packaging: { name: '実装・パッケージ', description: 'チップレットや3D積層を解禁し、大規模設計の歩留まりを改善する。', baseWeeks: 18, baseCash: 4_600_000, baseRp: 9 },
  software: { name: 'ドライバー・ソフト', description: '互換性、発売時評価、長期的な満足度を高める。', baseWeeks: 16, baseCash: 3_800_000, baseRp: 8 },
  manufacturing: { name: '量産・品質管理', description: '歩留まり、工場交渉、生産事故への耐性を高める。', baseWeeks: 18, baseCash: 4_200_000, baseRp: 9 },
};

export const FACILITY_DEFINITIONS: Record<FacilityId, { name: string; description: string; baseUpgrade: number; weeklyMaintenance: number }> = {
  office: { name: '本社オフィス', description: '採用上限、社員士気、同時開発力を高める。', baseUpgrade: 12_000_000, weeklyMaintenance: 120_000 },
  architectureLab: { name: 'アーキテクチャ研究室', description: '性能設計と基礎研究の速度を高める。', baseUpgrade: 9_000_000, weeklyMaintenance: 85_000 },
  prototypeLab: { name: '試作ラボ', description: '試作費とテープアウト後の遅延を減らす。', baseUpgrade: 8_500_000, weeklyMaintenance: 78_000 },
  validationLab: { name: '検証センター', description: '不具合発見率と製品信頼性を高める。', baseUpgrade: 10_000_000, weeklyMaintenance: 92_000 },
  softwareLab: { name: 'ソフトウェア部門', description: 'ドライバー品質と発売後アップデート効果を高める。', baseUpgrade: 7_500_000, weeklyMaintenance: 70_000 },
  marketingStudio: { name: 'マーケティング室', description: '発売初動、ブランド、販促効率を高める。', baseUpgrade: 6_800_000, weeklyMaintenance: 64_000 },
};

export const FACTORIES: FactoryDefinition[] = [
  { id: 'harbor-28', name: 'Harbor Silicon Fab', country: '台湾', nodeClass: 28, quality: 68, weeklyCapacity: 1800, unitMultiplier: .9, signupFee: 4_800_000, minimumWeeks: 52, reliability: 89, unlockYear: 2015, setupWeeks: 5, reservationRate: 92, description: '旧世代設備を安価に確保できる。大型ダイでは歩留まりが厳しい。' },
  { id: 'shinano-16', name: 'Shinano Micro Works', country: '日本', nodeClass: 16, quality: 82, weeklyCapacity: 2200, unitMultiplier: 1.04, signupFee: 8_800_000, minimumWeeks: 52, reliability: 96, unlockYear: 2015, setupWeeks: 7, reservationRate: 118, description: '品質と納期が安定。高信頼性シリーズと相性が良い。' },
  { id: 'meridian-10', name: 'Meridian Foundry', country: '米国', nodeClass: 10, quality: 87, weeklyCapacity: 2600, unitMultiplier: 1.18, signupFee: 15_500_000, minimumWeeks: 78, reliability: 91, unlockYear: 2015, setupWeeks: 9, reservationRate: 148, description: '高性能設計向け。先端枠は高価で最低契約も長い。' },
  { id: 'aurora-7', name: 'Aurora Advanced Nodes', country: '韓国', nodeClass: 7, quality: 91, weeklyCapacity: 2400, unitMultiplier: 1.36, signupFee: 26_000_000, minimumWeeks: 104, reliability: 88, unlockYear: 2020, setupWeeks: 11, reservationRate: 186, description: '高密度・高性能。供給事故が起きると損失が大きい。' },
  { id: 'polar-5', name: 'Polar Lithography Alliance', country: '欧州', nodeClass: 5, quality: 93, weeklyCapacity: 2000, unitMultiplier: 1.49, signupFee: 39_000_000, minimumWeeks: 104, reliability: 92, unlockYear: 2023, setupWeeks: 12, reservationRate: 228, description: '高品質な先端プロセス。量は少ないが法人向けに強い。' },
  { id: 'quantum-3', name: 'Quantum Gate Systems', country: 'シンガポール', nodeClass: 3, quality: 96, weeklyCapacity: 1600, unitMultiplier: 1.7, signupFee: 62_000_000, minimumWeeks: 130, reliability: 86, unlockYear: 2027, setupWeeks: 15, reservationRate: 285, description: '未来世代向け最先端工場。契約失敗は会社を傾ける。' },
];

const FIRST_NAMES = ['玲', '凛', '湊', '葵', '悠真', '陽菜', '蓮', '結衣', '蒼', '美月', '直樹', '七海', '翔', '紬', '慧', '咲'];
const LAST_NAMES = ['三浦', '森田', '高橋', '小林', '藤原', '中村', '石井', '松本', '井上', '岡田', '山岸', '西村'];
const ROLES: StaffRole[] = ['architect', 'circuit', 'thermal', 'software', 'validation', 'marketing', 'operations'];
const SPECIALTIES: StaffSpecialty[] = ['architecture', 'clock', 'cache', 'yield', 'power', 'driver', 'quality', 'brand', 'supply'];
const TRAITS: StaffTrait[] = ['prodigy', 'veteran', 'meticulous', 'pragmatic', 'workhorse', 'communicator', 'temperamental', 'loyal', 'negotiator'];

function randomItem<T>(items: T[]): T { return items[Math.floor(Math.random() * items.length)] as T; }
function id(prefix: string): string { return `${prefix}-${Math.random().toString(36).slice(2, 9)}`; }

export function generateCandidate(absoluteWeek: number, year: number, forcedRole?: StaffRole): RecruitCandidate {
  const role = forcedRole ?? randomItem(ROLES);
  const level = Math.max(1, Math.min(8, Math.floor((year - 2014) / 3) + (Math.random() < .18 ? 2 : 0)));
  const baseSkill = 19 + level * 5 + Math.random() * 16;
  const traits: StaffTrait[] = [randomItem(TRAITS)];
  if (Math.random() < .28) {
    const second = randomItem(TRAITS);
    if (!traits.includes(second)) traits.push(second);
  }
  const prodigy = traits.includes('prodigy');
  const veteran = traits.includes('veteran');
  const skill = Math.round(baseSkill + (prodigy ? 7 : 0) + (veteran ? 5 : 0));
  const salary = Math.round((300_000 + skill * 8_800 + level * 42_000) / 10_000) * 10_000;
  return {
    id: id('candidate'),
    name: `${randomItem(LAST_NAMES)} ${randomItem(FIRST_NAMES)}`,
    role,
    specialty: randomItem(SPECIALTIES),
    traits,
    level,
    skill,
    creativity: Math.round(32 + Math.random() * 58 + (prodigy ? 8 : 0)),
    discipline: Math.round(38 + Math.random() * 55 + (veteran ? 7 : 0)),
    growth: Math.round(28 + Math.random() * 62 + (prodigy ? 15 : 0) - (veteran ? 14 : 0)),
    salary,
    morale: 78 + Math.round(Math.random() * 15),
    fatigue: Math.round(Math.random() * 10),
    loyalty: 45 + Math.round(Math.random() * 45) + (traits.includes('loyal') ? 15 : 0),
    xp: 0,
    joinedAt: { year, week: 1 },
    signingBonus: Math.round(salary * (2.5 + Math.random() * 3) / 10_000) * 10_000,
    expiresAtWeek: absoluteWeek + 10 + Math.floor(Math.random() * 8),
  };
}

function staff(idValue: string, name: string, role: StaffRole, specialty: StaffSpecialty, traits: StaffTrait[], skill: number, salary: number): StaffMember {
  return { id: idValue, name, role, specialty, traits, level: 1, skill, creativity: 48 + Math.round(Math.random() * 20), discipline: 55 + Math.round(Math.random() * 18), growth: 54 + Math.round(Math.random() * 18), salary, morale: 84, fatigue: 6, loyalty: 72, xp: 0, joinedAt: { year: 2015, week: 1 } };
}

export const STARTING_STAFF: StaffMember[] = [
  staff('s1', '三浦 玲', 'architect', 'architecture', ['prodigy'], 34, 560_000),
  staff('s2', '森田 凛', 'circuit', 'yield', ['meticulous'], 30, 485_000),
  staff('s3', '高橋 湊', 'validation', 'quality', ['veteran'], 29, 470_000),
  staff('s4', '小林 葵', 'marketing', 'brand', ['communicator'], 25, 425_000),
  staff('s5', '藤原 悠真', 'operations', 'supply', ['negotiator'], 24, 410_000),
];

const realCompany = (idValue: string, name: string, color: string, specialties: ProductCategory[], strategy: SeriesFocus, brand: number, technology: number, foundedYear: number): CompetitorCompany => ({
  id: idValue, name, real: true, color, specialties, strategy, brand, technology, cash: 4_000_000_000, momentum: 0, marketShare: 0, status: 'active', foundedYear, models: [], nextLaunchWeek: Number.MAX_SAFE_INTEGER, history: [],
});

const fictionalCompany = (idValue: string, name: string, color: string, specialties: ProductCategory[], strategy: SeriesFocus, foundedYear: number): CompetitorCompany => ({
  id: idValue, name, real: false, color, specialties, strategy, cash: 150_000_000, technology: 48, brand: 16, momentum: 0, marketShare: 0, status: 'active', foundedYear, models: [], nextLaunchWeek: 20 + Math.floor(Math.random() * 24), history: [],
});

export function createCompetitors(): CompetitorCompany[] {
  return [
    realCompany('intel', 'Intel', '#59b9ff', ['cpu'], 'balanced', 93, 80, 1968),
    realCompany('amd', 'AMD', '#ff646d', ['cpu', 'gpu'], 'value', 78, 75, 1969),
    realCompany('nvidia', 'NVIDIA', '#8add55', ['gpu'], 'performance', 94, 85, 1993),
    fictionalCompany('aster', 'Aster Computing', '#b58cff', ['cpu', 'gpu'], 'efficient', 2013),
    fictionalCompany('ironclad', 'Ironclad Systems', '#f0b15d', ['cpu'], 'reliable', 2011),
  ];
}

export const HISTORICAL_MODELS = [
  { companyId: 'intel', name: 'Core i7-4790K', category: 'cpu', year: 2014, week: 24, price: 43_000, performance: 84, efficiency: 55, reliability: 88, software: 88, brand: 93 },
  { companyId: 'amd', name: 'FX-9590', category: 'cpu', year: 2013, week: 28, price: 39_000, performance: 68, efficiency: 31, reliability: 76, software: 78, brand: 67 },
  { companyId: 'nvidia', name: 'GeForce GTX 980', category: 'gpu', year: 2014, week: 38, price: 72_000, performance: 92, efficiency: 67, reliability: 88, software: 92, brand: 94 },
  { companyId: 'amd', name: 'Radeon R9 290X', category: 'gpu', year: 2013, week: 43, price: 58_000, performance: 78, efficiency: 41, reliability: 79, software: 78, brand: 70 },
  { companyId: 'intel', name: 'Core i7-6700K', category: 'cpu', year: 2015, week: 32, price: 48_000, performance: 100, efficiency: 61, reliability: 88, software: 89, brand: 93 },
  { companyId: 'nvidia', name: 'GeForce GTX 980 Ti', category: 'gpu', year: 2015, week: 22, price: 92_000, performance: 112, efficiency: 58, reliability: 86, software: 92, brand: 94 },
  { companyId: 'nvidia', name: 'GeForce GTX 1080', category: 'gpu', year: 2016, week: 20, price: 88_000, performance: 154, efficiency: 73, reliability: 88, software: 94, brand: 95 },
  { companyId: 'amd', name: 'Radeon RX 480', category: 'gpu', year: 2016, week: 26, price: 34_000, performance: 104, efficiency: 69, reliability: 81, software: 79, brand: 72 },
  { companyId: 'intel', name: 'Core i7-7700K', category: 'cpu', year: 2017, week: 2, price: 50_000, performance: 119, efficiency: 63, reliability: 87, software: 90, brand: 93 },
  { companyId: 'amd', name: 'Ryzen 7 1700', category: 'cpu', year: 2017, week: 9, price: 44_000, performance: 132, efficiency: 75, reliability: 84, software: 78, brand: 73 },
  { companyId: 'intel', name: 'Core i9-9900K', category: 'cpu', year: 2018, week: 40, price: 75_000, performance: 168, efficiency: 57, reliability: 88, software: 91, brand: 92 },
  { companyId: 'nvidia', name: 'GeForce RTX 2080 Ti', category: 'gpu', year: 2018, week: 38, price: 168_000, performance: 225, efficiency: 68, reliability: 86, software: 95, brand: 95 },
  { companyId: 'amd', name: 'Ryzen 9 3950X', category: 'cpu', year: 2019, week: 46, price: 92_000, performance: 230, efficiency: 82, reliability: 87, software: 84, brand: 80 },
  { companyId: 'amd', name: 'Radeon RX 5700 XT', category: 'gpu', year: 2019, week: 27, price: 55_000, performance: 178, efficiency: 72, reliability: 80, software: 79, brand: 78 },
  { companyId: 'amd', name: 'Ryzen 9 5950X', category: 'cpu', year: 2020, week: 45, price: 110_000, performance: 302, efficiency: 88, reliability: 90, software: 88, brand: 87 },
  { companyId: 'nvidia', name: 'GeForce RTX 3080', category: 'gpu', year: 2020, week: 38, price: 105_000, performance: 308, efficiency: 74, reliability: 86, software: 96, brand: 96 },
  { companyId: 'intel', name: 'Core i9-12900K', category: 'cpu', year: 2021, week: 44, price: 82_000, performance: 325, efficiency: 72, reliability: 88, software: 91, brand: 91 },
  { companyId: 'amd', name: 'Radeon RX 7900 XTX', category: 'gpu', year: 2022, week: 50, price: 150_000, performance: 386, efficiency: 78, reliability: 84, software: 85, brand: 84 },
  { companyId: 'nvidia', name: 'GeForce RTX 4090', category: 'gpu', year: 2022, week: 41, price: 298_000, performance: 505, efficiency: 82, reliability: 89, software: 97, brand: 97 },
  { companyId: 'amd', name: 'Ryzen 9 7950X3D', category: 'cpu', year: 2023, week: 9, price: 118_000, performance: 430, efficiency: 91, reliability: 90, software: 90, brand: 90 },
] as const;

export const FUTURE_SERIES_WORDS: Record<string, string[]> = {
  intel: ['Core Horizon', 'Core Vector', 'Core Meridian'],
  amd: ['Ryzen Aurora', 'Ryzen Helix', 'Radeon Nova'],
  nvidia: ['GeForce RTX Zenith', 'GeForce RTX Nova', 'NVIDIA Creator GX'],
  aster: ['Aster Photon', 'Aster Nova', 'Aster Pulse'],
  ironclad: ['Ironclad Forge', 'Ironclad Bastion', 'Ironclad Atlas'],
};

export const MARKET_NAMES: Record<string, string> = {
  gaming: 'ゲーム性能重視',
  creator: 'クリエイター',
  value: '価格重視',
  business: '法人・安定性',
  efficiency: '省電力・静音',
  enthusiast: '自作PC愛好家',
};
