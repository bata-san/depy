import { FACTORIES } from './data';
import { operationsStaffEffect } from './staff-effects';
import { addLedger, addNotice, clamp } from './state';
import type { FactoryContract, GameState, ReleasedProduct } from './types';

type ProductionLine = FactoryContract & {
  lineNumber?: number;
  maintenance?: number;
  processControl?: number;
  lineExperience?: number;
  lastUtilization?: number;
};

export interface FactoryLineSnapshot {
  lineNumber: number;
  maintenance: number;
  processControl: number;
  experience: number;
  utilization: number;
  management: number;
  effectiveCapacity: number;
  allocated: number;
}

function line(contract: FactoryContract, state: GameState): ProductionLine {
  const runtime = contract as ProductionLine;
  if (!runtime.lineNumber) {
    const siblings = state.contracts.filter((item) => item.factoryId === contract.factoryId);
    runtime.lineNumber = Math.max(1, siblings.indexOf(contract) + 1);
  }
  runtime.maintenance ??= 88;
  runtime.processControl ??= 68;
  runtime.lineExperience ??= 12;
  runtime.lastUtilization ??= 0;
  return runtime;
}

function definition(contract: FactoryContract) {
  return FACTORIES.find((factory) => factory.id === contract.factoryId);
}

export function activeFactoryLines(state: GameState): FactoryContract[] {
  return state.contracts.filter((contract) => contract.active);
}

export function factoryManagementCapacity(state: GameState): number {
  const operations = state.staff.filter((member) => member.role === 'operations');
  const validators = state.staff.filter((member) => member.role === 'validation');
  const operationsSkill = operations.reduce((sum, member) => sum + member.skill * (1 - member.fatigue / 170), 0);
  const validationSkill = validators.reduce((sum, member) => sum + member.skill * .28, 0);
  return Math.max(1, 1.3 + operations.length * 1.55 + operationsSkill / 62 + validationSkill / 120 + state.research.manufacturing * .65 + state.officeLevel * .35);
}

export function factoryManagementFactor(state: GameState): number {
  const lines = Math.max(1, activeFactoryLines(state).length);
  const capacity = factoryManagementCapacity(state);
  return clamp(capacity / lines, .28, 1.08);
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
  const management = factoryManagementFactor(state);
  const maintenanceFactor = clamp((runtime.maintenance ?? 88) / 86, .42, 1.08);
  const processFactor = clamp(.72 + (runtime.processControl ?? 68) / 250, .72, 1.12);
  const experienceFactor = clamp(.84 + (runtime.lineExperience ?? 12) / 360, .84, 1.09);
  const factoryFactor = factory ? clamp((factory.quality + factory.reliability) / 190, .62, 1.08) : .8;
  const effectiveCapacity = Math.max(0, Math.floor(contract.committedCapacity * management * maintenanceFactor * processFactor * experienceFactor * factoryFactor));
  return {
    lineNumber: runtime.lineNumber ?? 1,
    maintenance: runtime.maintenance ?? 88,
    processControl: runtime.processControl ?? 68,
    experience: runtime.lineExperience ?? 12,
    utilization,
    management,
    effectiveCapacity,
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
    const overbook = Math.min(1, contract.committedCapacity / totalAllocated);
    const snapshot = getFactoryLineSnapshot(state, contract);
    const maintenance = clamp((runtime.maintenance ?? 88) / 100, .3, 1);
    const process = clamp(.72 + (runtime.processControl ?? 68) / 240, .72, 1.13);
    const experience = clamp(.82 + (runtime.lineExperience ?? 12) / 330, .82, 1.1);
    const baseQuality = clamp((factory.quality + factory.reliability) / 200 * contract.reliabilityModifier, .42, 1.08);
    const staff = clamp(.42 + operations * .56, .38, 1.36);
    const requested = allocation.allocation * overbook;
    total += requested * baseQuality * maintenance * process * experience * snapshot.management * staff * (product.metrics.yieldRate / 100);
  }
  return Math.max(0, Math.floor(total));
}

export function updateFactoryLineOperations(state: GameState): void {
  const management = factoryManagementFactor(state);
  for (const contract of activeFactoryLines(state)) {
    const runtime = line(contract, state);
    const allocation = allocatedToLine(state, contract.id);
    const utilization = clamp(allocation / Math.max(1, contract.committedCapacity), 0, 1.6);
    runtime.lastUtilization = utilization;
    const previousMaintenance = runtime.maintenance ?? 88;
    const overload = Math.max(0, utilization - 1);
    runtime.maintenance = clamp(previousMaintenance - (.45 + utilization * .78 + overload * 2.2 + Math.max(0, .78 - management) * 1.25), 0, 100);
    runtime.lineExperience = clamp((runtime.lineExperience ?? 12) + utilization * (.55 + management * .35), 0, 100);
    if (runtime.maintenance < 18) contract.reliabilityModifier = Math.min(contract.reliabilityModifier, .58);
    else if (runtime.maintenance < 35) contract.reliabilityModifier = Math.min(contract.reliabilityModifier, .78);
    if (previousMaintenance >= 30 && runtime.maintenance < 30) addNotice(state, '工場ライン要整備', `${definition(contract)?.name ?? '工場'} 第${runtime.lineNumber}ラインの保守状態が悪化しています。`, 'warning');
  }
}

export function serviceFactoryLine(state: GameState, contractId: string): { ok: boolean; message: string } {
  const contract = state.contracts.find((item) => item.id === contractId && item.active);
  const factory = contract && definition(contract);
  if (!contract || !factory) return { ok: false, message: '工場ラインが見つかりません。' };
  const runtime = line(contract, state);
  const cost = Math.round(factory.signupFee * .055 + contract.committedCapacity * factory.reservationRate * .65);
  if (state.cash < cost) return { ok: false, message: 'ライン整備費が不足しています。' };
  state.cash -= cost;
  addLedger(state, `${factory.name} 第${runtime.lineNumber}ライン整備`, -cost, 'factory');
  runtime.maintenance = clamp((runtime.maintenance ?? 88) + 38, 0, 100);
  contract.reliabilityModifier = Math.max(contract.reliabilityModifier, .94);
  return { ok: true, message: `第${runtime.lineNumber}ラインを整備しました。` };
}

export function improveFactoryLine(state: GameState, contractId: string): { ok: boolean; message: string } {
  const contract = state.contracts.find((item) => item.id === contractId && item.active);
  const factory = contract && definition(contract);
  if (!contract || !factory) return { ok: false, message: '工場ラインが見つかりません。' };
  const runtime = line(contract, state);
  if ((runtime.processControl ?? 68) >= 100) return { ok: false, message: '工程管理はすでに最大です。' };
  const cost = Math.round(factory.signupFee * .09 + (runtime.processControl ?? 68) * 55_000);
  if (state.cash < cost) return { ok: false, message: '工程改善費が不足しています。' };
  state.cash -= cost;
  addLedger(state, `${factory.name} 第${runtime.lineNumber}ライン工程改善`, -cost, 'factory');
  runtime.processControl = clamp((runtime.processControl ?? 68) + 7, 0, 100);
  runtime.maintenance = clamp((runtime.maintenance ?? 88) + 8, 0, 100);
  return { ok: true, message: `第${runtime.lineNumber}ラインの工程管理を改善しました。` };
}
