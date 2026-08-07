import { FACTORIES } from './data';
import { operationsStaffEffect } from './staff-effects';
import { addLedger, addNotice, clamp } from './state';
import type { FactoryContract, GameState, ReleasedProduct } from './types';

type ProductionLine = FactoryContract & {
  lineNumber?: number;
  /** Legacy save field. Maintenance no longer affects gameplay. */
  maintenance?: number;
  processControl?: number;
  lineExperience?: number;
  lastUtilization?: number;
  capacityTier?: number;
};

const CAPACITY_MULTIPLIERS = [1, 4, 16, 64, 256, 1024, 4096] as const;

export interface FactoryLineSnapshot {
  lineNumber: number;
  capacityTier: number;
  /** Compatibility-only value for old UI/save readers. Always 100. */
  maintenance: number;
  processControl: number;
  experience: number;
  utilization: number;
  management: number;
  effectiveCapacity: number;
  maximumCapacity: number;
  allocated: number;
}

function line(contract: FactoryContract, state: GameState): ProductionLine {
  const runtime = contract as ProductionLine;
  if (!runtime.lineNumber) {
    const siblings = state.contracts.filter((item) => item.factoryId === contract.factoryId);
    runtime.lineNumber = Math.max(1, siblings.indexOf(contract) + 1);
  }
  // Old saves may contain a degraded maintenance value. Neutralize it permanently.
  runtime.maintenance = 100;
  runtime.processControl ??= 68;
  runtime.lineExperience ??= 12;
  runtime.lastUtilization ??= 0;
  runtime.capacityTier ??= 0;
  return runtime;
}

function definition(contract: FactoryContract) {
  return FACTORIES.find((factory) => factory.id === contract.factoryId);
}

export function activeFactoryLines(state: GameState): FactoryContract[] {
  return state.contracts.filter((contract) => contract.active);
}

export function factoryMaximumCapacity(state: GameState, contract: FactoryContract): number {
  const factory = definition(contract);
  if (!factory) return contract.committedCapacity;
  const runtime = line(contract, state);
  const tier = clamp(Math.round(runtime.capacityTier ?? 0), 0, CAPACITY_MULTIPLIERS.length - 1);
  const multiplier = CAPACITY_MULTIPLIERS[tier] ?? 1;
  return Math.round(factory.weeklyCapacity * multiplier);
}

function lineWorkload(state: GameState, contract: FactoryContract): number {
  const factory = definition(contract);
  const runtime = line(contract, state);
  const base = Math.max(1, factory?.weeklyCapacity ?? contract.committedCapacity);
  const scale = Math.max(1, contract.committedCapacity / base);
  const tier = runtime.capacityTier ?? 0;
  const utilization = Math.max(.15, runtime.lastUtilization ?? 0);
  return 1 + tier * 2.15 + Math.sqrt(scale) * .72 + utilization * (1.15 + tier * .18);
}

export function factoryManagementCapacity(state: GameState): number {
  const operations = state.staff.filter((member) => member.role === 'operations');
  const validators = state.staff.filter((member) => member.role === 'validation');
  const operationsSkill = operations.reduce((sum, member) => sum + member.skill * (1 - member.fatigue / 145) * (.72 + member.morale / 350), 0);
  const validationSkill = validators.reduce((sum, member) => sum + member.skill * (1 - member.fatigue / 180) * .34, 0);
  const supplySpecialists = state.staff.filter((member) => member.specialty === 'supply').length;
  const yieldSpecialists = state.staff.filter((member) => member.specialty === 'yield').length;
  return Math.max(.5,
    1.1
    + operations.length * 1.85
    + operationsSkill / 48
    + validationSkill / 105
    + supplySpecialists * .72
    + yieldSpecialists * .38
    + state.research.manufacturing * .72
    + state.officeLevel * .24,
  );
}

export function factoryManagementFactor(state: GameState): number {
  const lines = activeFactoryLines(state);
  if (!lines.length) return 1;
  const workload = lines.reduce((sum, contract) => sum + lineWorkload(state, contract), 0);
  const capacity = factoryManagementCapacity(state);
  return clamp(capacity / Math.max(1, workload), .12, 1.1);
}

function allocatedToLine(state: GameState, contractId: string): number {
  return state.products
    .filter((product) => product.status !== 'eol')
    .reduce((sum, product) => sum + (product.factoryAllocations.find((allocation) => allocation.contractId === contractId)?.allocation ?? 0), 0);
}

export function getFactoryLineSnapshot(state: GameState, contract: FactoryContract): FactoryLineSnapshot {
  const runtime = line(contract, state);
  const factory = definition(contract);
  const allocated = allocatedToLine(state, contract.id);
  const utilization = contract.committedCapacity > 0 ? allocated / contract.committedCapacity : 0;
  const globalManagement = factoryManagementFactor(state);
  const localOperations = operationsStaffEffect(state);
  const management = clamp(globalManagement * (.72 + localOperations * .28), .1, 1.12);
  const processFactor = clamp(.68 + (runtime.processControl ?? 68) / 220, .68, 1.14);
  const experienceFactor = clamp(.8 + (runtime.lineExperience ?? 12) / 285, .8, 1.12);
  const factoryFactor = factory ? clamp((factory.quality + factory.reliability) / 190, .58, 1.08) : .8;
  const effectiveCapacity = Math.max(0, Math.floor(contract.committedCapacity * management * processFactor * experienceFactor * factoryFactor));
  return {
    lineNumber: runtime.lineNumber ?? 1,
    capacityTier: runtime.capacityTier ?? 0,
    maintenance: 100,
    processControl: runtime.processControl ?? 68,
    experience: runtime.lineExperience ?? 12,
    utilization,
    management,
    effectiveCapacity,
    maximumCapacity: factoryMaximumCapacity(state, contract),
    allocated,
  };
}

export function factoryOutputForProduct(state: GameState, product: ReleasedProduct): number {
  const operations = operationsStaffEffect(state);
  let total = 0;
  for (const allocation of product.factoryAllocations) {
    const contract = state.contracts.find((item) => item.id === allocation.contractId && item.active);
    if (!contract || contract.setupRemaining > 0) continue;
    const factory = definition(contract);
    if (!factory) continue;
    const runtime = line(contract, state);
    const totalAllocated = Math.max(1, allocatedToLine(state, contract.id));
    const snapshot = getFactoryLineSnapshot(state, contract);
    const share = clamp(allocation.allocation / totalAllocated, 0, 1);
    const lineShare = snapshot.effectiveCapacity * share;
    const requested = Math.min(allocation.allocation, lineShare);
    const baseQuality = clamp((factory.quality + factory.reliability) / 200 * contract.reliabilityModifier, .4, 1.08);
    const process = clamp(.82 + (runtime.processControl ?? 68) / 420, .82, 1.07);
    const experience = clamp(.9 + (runtime.lineExperience ?? 12) / 700, .9, 1.05);
    const staffQuality = clamp(.76 + operations * .2, .72, 1.16);
    total += requested * baseQuality * process * experience * staffQuality * (product.metrics.yieldRate / 100);
  }
  return Math.max(0, Math.floor(total));
}

export function updateFactoryLineOperations(state: GameState): void {
  const management = factoryManagementFactor(state);
  for (const contract of activeFactoryLines(state)) {
    const runtime = line(contract, state);
    const allocation = allocatedToLine(state, contract.id);
    const utilization = clamp(allocation / Math.max(1, contract.committedCapacity), 0, 1.8);
    runtime.lastUtilization = utilization;
    runtime.maintenance = 100;
    runtime.lineExperience = clamp((runtime.lineExperience ?? 12) + utilization * (.48 + management * .42), 0, 100);
  }
}

/** Kept only so older UI code cannot crash while hot-reloading. There is no maintenance system anymore. */
export function serviceFactoryLine(_state: GameState, _contractId: string): { ok: boolean; message: string } {
  return { ok: false, message: 'ライン整備は廃止されました。工程改善と生産管理で効率を上げてください。' };
}

export function improveFactoryLine(state: GameState, contractId: string): { ok: boolean; message: string } {
  const contract = state.contracts.find((item) => item.id === contractId && item.active);
  const factory = contract && definition(contract);
  if (!contract || !factory) return { ok: false, message: '工場ラインが見つかりません。' };
  const runtime = line(contract, state);
  if ((runtime.processControl ?? 68) >= 100) return { ok: false, message: '工程管理はすでに最大です。' };
  const tier = runtime.capacityTier ?? 0;
  const cost = Math.round(factory.signupFee * (.1 + tier * .035) + (runtime.processControl ?? 68) * 62_000);
  if (state.cash < cost) return { ok: false, message: '工程改善費が不足しています。' };
  state.cash -= cost;
  addLedger(state, `${factory.name} 第${runtime.lineNumber}ライン工程改善`, -cost, 'factory');
  runtime.processControl = clamp((runtime.processControl ?? 68) + 8, 0, 100);
  return { ok: true, message: `第${runtime.lineNumber}ラインの工程管理を改善しました。` };
}

export function expandFactoryLine(state: GameState, contractId: string): { ok: boolean; message: string } {
  const contract = state.contracts.find((item) => item.id === contractId && item.active);
  const factory = contract && definition(contract);
  if (!contract || !factory) return { ok: false, message: '工場ラインが見つかりません。' };
  const runtime = line(contract, state);
  const tier = runtime.capacityTier ?? 0;
  if (tier >= CAPACITY_MULTIPLIERS.length - 1) return { ok: false, message: 'このラインは最大規模まで拡張されています。' };
  const nextTier = tier + 1;
  const scale = Math.pow(nextTier + 1, 1.72);
  const cost = Math.round(factory.signupFee * (.62 + scale) + factory.weeklyCapacity * factory.reservationRate * 10 * Math.pow(nextTier, 1.28));
  if (state.cash < cost) return { ok: false, message: `ライン拡張には¥${cost.toLocaleString()}必要です。` };
  state.cash -= cost;
  addLedger(state, `${factory.name} 第${runtime.lineNumber}ライン Tier ${nextTier + 1}`, -cost, 'factory');
  runtime.capacityTier = nextTier;
  const maximum = factoryMaximumCapacity(state, contract);
  contract.committedCapacity = Math.min(maximum, Math.max(contract.committedCapacity, Math.round(maximum * .5 / 50) * 50));
  contract.setupRemaining = Math.max(contract.setupRemaining, 2 + Math.min(6, nextTier));
  runtime.processControl = clamp((runtime.processControl ?? 68) - 2, 45, 100);
  addNotice(state, '量産ライン拡張', `${factory.name} 第${runtime.lineNumber}ラインをTier ${nextTier + 1}へ拡張。最大${maximum.toLocaleString()}個/5秒まで増枠できます。`, 'good');
  return { ok: true, message: `ラインをTier ${nextTier + 1}へ拡張しました。` };
}
