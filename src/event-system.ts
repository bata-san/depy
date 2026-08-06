import { FACTORIES } from './data';
import type { DecisionEvent, GameState, ReleasedProduct, StaffMember } from './types';

const random = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)] as T;
const uid = (): string => `event-${Math.random().toString(36).slice(2, 9)}`;

/** Important decisions are rare and predictable: about one or two per in-game year. */
export function nextDecisionEventWeek(absoluteWeek: number, initial = false): number {
  return absoluteWeek + (initial ? 26 : 32 + Math.floor(Math.random() * 17));
}

function poachEvent(member: StaffMember): DecisionEvent {
  return {
    id: uid(),
    source: 'internal',
    kind: 'poach',
    title: '競合からの引き抜き',
    description: `${member.name}に競合企業から高額オファーが届きました。`,
    staffId: member.id,
    choices: [
      { id: 'raise', label: '昇給と特別賞与', description: '給与を12%上げ、4か月分の賞与を支払う。', tone: 'good' },
      { id: 'promise', label: '次世代の責任者にする', description: '費用は少ないが、忠誠心の回復は限定的。', tone: 'warning' },
      { id: 'leave', label: '退職を受け入れる', description: '重要人材を失うが費用は発生しない。', tone: 'bad' },
    ],
  };
}

function highestDemand(products: ReleasedProduct[]): ReleasedProduct {
  return [...products].sort((a, b) => b.weeklyDemand - a.weeklyDemand)[0] ?? products[0] as ReleasedProduct;
}

/**
 * Four clear event sources only: market, competitor, factory, internal.
 * Every generated event references an existing employee, factory contract, or product.
 */
export function generateDecisionEvent(state: GameState): DecisionEvent | null {
  const factories = state.contracts.filter((contract) => contract.active && contract.setupRemaining === 0);
  const products = state.products.filter((product) => product.status === 'selling');
  const atRiskStaff = state.staff.filter((member) => member.loyalty < 42 || member.morale < 36);
  const candidates: Array<() => DecisionEvent> = [];

  if (factories.length && products.some((product) => product.factoryAllocations.length > 0)) candidates.push(() => {
    const contract = random(factories);
    const factory = FACTORIES.find((entry) => entry.id === contract.factoryId);
    return {
      id: uid(), source: 'factory', kind: 'factory', title: '契約工場の設備障害',
      description: `${factory?.name ?? '契約工場'}で設備障害が発生しました。現在の製品供給へ直接影響します。`,
      contractId: contract.id,
      choices: [
        { id: 'expedite', label: '復旧費を共同負担', description: '費用を払い、供給低下を2週間へ抑える。', cost: 4_500_000, tone: 'good' },
        { id: 'accept', label: '通常復旧を待つ', description: '6週間、該当工場の供給能力が約45%低下する。', tone: 'warning' },
        { id: 'pressure', label: '契約補償を要求', description: '補償の可能性があるが契約期間が延びる場合がある。', tone: 'bad' },
      ],
    };
  });

  if (products.length) {
    const now = state.date.year * 52 + state.date.week;
    const rivalModels = state.competitors.flatMap((company) => company.models)
      .filter((model) => model.launchDate.year * 52 + model.launchDate.week <= now && model.endDate.year * 52 + model.endDate.week >= now);
    if (rivalModels.length) candidates.push(() => {
      const product = highestDemand(products);
      const rival = [...rivalModels].filter((model) => model.category === product.category).sort((a, b) => b.performance - a.performance)[0] ?? rivalModels[0]!;
      return {
        id: uid(), source: 'competitor', kind: 'competitive', title: '競合モデルが価格攻勢',
        description: `${rival.name}が値下げされ、${product.name}の価格性能評価へ直接影響しています。`,
        productId: product.id,
        choices: [
          { id: 'match', label: '価格を8%引き下げる', description: '需要を守るが、1個あたり利益が減少する。', tone: 'warning' },
          { id: 'differentiate', label: '比較広告と最適化で対抗', description: '費用を使い、評価と認知を押し上げる。', cost: 2_500_000, tone: 'good' },
          { id: 'hold', label: '価格を維持する', description: '利益率を守るが、短期需要が落ちる。', tone: 'bad' },
        ],
      };
    });
  }

  if (products.length) candidates.push(() => {
    const product = highestDemand(products);
    return {
      id: uid(), source: 'market', kind: 'corporate', title: '大口導入の打診',
      description: `${product.name}に法人から大口導入の相談が届きました。供給余力とサポート費用を判断してください。`,
      productId: product.id,
      choices: [
        { id: 'premium', label: '専用サポート付きで受注', description: '前受金を得る代わりにサポート体制を増強する。', cost: 3_000_000, tone: 'good' },
        { id: 'standard', label: '小規模契約へ調整', description: '利益は小さいが供給への負担も少ない。', tone: 'warning' },
        { id: 'decline', label: '今回は断る', description: '供給と開発を優先する。' },
      ],
    };
  });

  const qualityRisk = products.filter((product) => product.review.reliability < 6.6 || product.metrics.softwareQuality < 60);
  if (qualityRisk.length) candidates.push(() => {
    const product = random(qualityRisk);
    return {
      id: uid(), source: 'market', kind: 'quality', title: '品質報告が増加',
      description: `${product.name}で不安定動作の報告が増えています。評価と返品率へ影響します。`,
      productId: product.id,
      choices: [
        { id: 'recall', label: '自主交換プログラム', description: '高額だが長期的な信頼を守る。', cost: Math.max(3_000_000, product.weeklySales * product.unitCost * .25), tone: 'good' },
        { id: 'patch', label: '緊急アップデート', description: '中程度の費用で問題を緩和する。', cost: 1_800_000, tone: 'warning' },
        { id: 'deny', label: '限定的な問題として扱う', description: '費用はないが評価が悪化する。', tone: 'bad' },
      ],
    };
  });

  if (atRiskStaff.length) candidates.push(() => poachEvent(random(atRiskStaff)));
  return candidates.length ? random(candidates)() : null;
}
