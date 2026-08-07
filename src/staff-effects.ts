import type {
  DevelopmentProject, GameState, ProjectStage, ResearchArea, StaffMember, StaffRole, StaffSpecialty,
} from './types';

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

type ActiveStage = Exclude<ProjectStage, 'ready'>;

const stageRoles: Record<ActiveStage, Partial<Record<StaffRole, number>>> = {
  concept: { architect: 1.82, marketing: 1.55, software: .72, circuit: .68, thermal: .48, validation: .52, operations: .58 },
  architecture: { architect: 1.88, circuit: 1.72, thermal: 1.08, software: .82, validation: .58, marketing: .34, operations: .5 },
  tapeout: { circuit: 1.92, architect: 1.42, thermal: 1.32, validation: .76, operations: .82, software: .48, marketing: .28 },
  prototype: { thermal: 1.72, circuit: 1.5, validation: 1.42, operations: 1.15, software: .7, architect: .68, marketing: .26 },
  validation: { validation: 1.96, software: 1.58, thermal: 1.2, circuit: 1.06, operations: .78, architect: .6, marketing: .28 },
};

const stageSpecialties: Record<ActiveStage, StaffSpecialty[]> = {
  concept: ['architecture', 'brand'],
  architecture: ['architecture', 'clock', 'cache'],
  tapeout: ['clock', 'cache', 'yield'],
  prototype: ['power', 'yield', 'quality'],
  validation: ['quality', 'driver', 'power'],
};

const essentialRoles: Record<ActiveStage, StaffRole[]> = {
  concept: ['architect', 'marketing'],
  architecture: ['architect', 'circuit'],
  tapeout: ['circuit', 'thermal'],
  prototype: ['circuit', 'thermal', 'validation'],
  validation: ['validation', 'software'],
};

function condition(member: StaffMember): number {
  const fatigue = member.fatigue > 92 ? .25 : member.fatigue > 82 ? .48 : member.fatigue > 68 ? .72 : member.fatigue > 50 ? .9 : 1;
  const morale = .58 + member.morale / 100 * .5;
  const loyalty = .86 + member.loyalty / 100 * .16;
  return fatigue * morale * loyalty;
}

function traitMultiplier(member: StaffMember, stage: ActiveStage): number {
  let value = 1;
  if (member.traits.includes('prodigy')) value *= 1.16;
  if (member.traits.includes('veteran')) value *= 1.09;
  if (member.traits.includes('meticulous') && (stage === 'prototype' || stage === 'validation')) value *= 1.16;
  if (member.traits.includes('pragmatic') && (stage === 'tapeout' || stage === 'prototype')) value *= 1.11;
  if (member.traits.includes('communicator') && stage === 'concept') value *= 1.14;
  if (member.traits.includes('workhorse')) value *= 1.06;
  if (member.traits.includes('temperamental') && member.morale < 45) value *= .7;
  return value;
}

function memberStagePower(member: StaffMember, stage: ActiveStage): number {
  const roleWeight = stageRoles[stage][member.role] ?? .42;
  const specialty = stageSpecialties[stage].includes(member.specialty) ? 1.28 : .94;
  const base = member.skill * .56 + member.creativity * .22 + member.discipline * .22;
  return base * roleWeight * specialty * condition(member) * traitMultiplier(member, stage);
}

export interface ProjectStaffEffect {
  speed: number;
  quality: number;
  issueRisk: number;
  coverage: number;
  leadName: string;
  weakRole: StaffRole | null;
}

export function projectStaffEffect(state: GameState, project: DevelopmentProject): ProjectStaffEffect {
  const stage: ActiveStage = project.stage === 'ready' ? 'validation' : project.stage;
  const ranked = state.staff.map((member) => ({ member, power: memberStagePower(member, stage) })).sort((a, b) => b.power - a.power);
  const top = ranked.slice(0, Math.min(5, ranked.length));
  const power = top.reduce((sum, entry, index) => sum + entry.power * (1 - index * .13), 0);
  const required = essentialRoles[stage];
  const present = required.filter((role) => state.staff.some((member) => member.role === role)).length;
  const coverage = required.length ? present / required.length : 1;
  const weakRole = required.find((role) => !state.staff.some((member) => member.role === role)) ?? null;
  const lead = state.staff.find((member) => member.id === project.leadStaffId) ?? top[0]?.member;
  const leadPower = lead ? memberStagePower(lead, stage) : 0;
  const rawLeadFit = lead ? (stageRoles[stage][lead.role] ?? .42) * (stageSpecialties[stage].includes(lead.specialty) ? 1.16 : .9) : .35;
  const leadFit = clamp(rawLeadFit / 1.65, .22, 1.16);
  const coverageMultiplier = .24 + coverage * .76;
  const speedBase = .06 + power / 335 + leadPower / 620;
  const speed = clamp(speedBase * coverageMultiplier * (.68 + leadFit * .38), .12, 2.25);
  const quality = clamp(18 + power / 8.4 + coverage * 28 + leadPower / 13 * leadFit - (weakRole ? 11 : 0), 18, 100);
  const issueRisk = clamp(2.05 - coverage * .78 - quality / 155 + (weakRole ? .48 : 0) + (leadFit < .55 ? .22 : 0), .28, 2.4);
  return { speed, quality, issueRisk, coverage, leadName: lead?.name ?? '未設定', weakRole };
}

const researchRole: Record<ResearchArea, StaffRole[]> = {
  cpuArchitecture: ['architect', 'circuit'],
  gpuArchitecture: ['architect', 'circuit'],
  process: ['circuit', 'validation'],
  packaging: ['thermal', 'operations'],
  software: ['software', 'validation'],
  manufacturing: ['operations', 'validation'],
};

const researchSpecialty: Record<ResearchArea, StaffSpecialty[]> = {
  cpuArchitecture: ['architecture', 'cache', 'clock'],
  gpuArchitecture: ['architecture', 'cache', 'clock'],
  process: ['yield', 'quality'],
  packaging: ['power', 'yield'],
  software: ['driver', 'quality'],
  manufacturing: ['supply', 'yield', 'quality'],
};

export function researchStaffEffect(state: GameState, area: ResearchArea): number {
  const roles = researchRole[area];
  const specialties = researchSpecialty[area];
  const scores = state.staff.map((member) => {
    const role = roles.includes(member.role) ? 1.62 : .42;
    const specialty = specialties.includes(member.specialty) ? 1.34 : .94;
    const traits = member.traits.includes('prodigy') ? 1.16 : member.traits.includes('veteran') ? 1.08 : 1;
    return (member.skill * .6 + member.creativity * .26 + member.discipline * .14) * role * specialty * condition(member) * traits;
  }).sort((a, b) => b - a);
  const combined = scores.slice(0, 4).reduce((sum, score, index) => sum + score * (1 - index * .17), 0);
  const coverage = roles.filter((role) => state.staff.some((member) => member.role === role)).length / roles.length;
  const coverageMultiplier = .24 + coverage * .76;
  return clamp((.12 + combined / 205) * coverageMultiplier, .15, 2.45);
}

export function salesStaffEffect(state: GameState): number {
  const hasMarketing = state.staff.some((member) => member.role === 'marketing');
  const scores = state.staff.map((member) => {
    const role = member.role === 'marketing' ? 1.95 : member.role === 'operations' ? .78 : .3;
    const specialty = member.specialty === 'brand' ? 1.42 : member.specialty === 'supply' ? 1.05 : .94;
    const social = member.traits.includes('communicator') ? 1.2 : member.traits.includes('negotiator') ? 1.14 : 1;
    return (member.skill * .42 + member.creativity * .4 + member.discipline * .18) * role * specialty * social * condition(member);
  }).sort((a, b) => b - a);
  const combined = scores.slice(0, 3).reduce((sum, score, index) => sum + score * (1 - index * .25), 0);
  const coverage = hasMarketing ? 1 : .34;
  return clamp((.16 + combined / 165) * coverage, .18, 1.9);
}

export function operationsStaffEffect(state: GameState): number {
  const hasOperations = state.staff.some((member) => member.role === 'operations');
  const scores = state.staff.map((member) => {
    const role = member.role === 'operations' ? 2 : member.role === 'validation' ? .92 : .28;
    const specialty = member.specialty === 'supply' ? 1.45 : member.specialty === 'yield' ? 1.25 : member.specialty === 'quality' ? 1.14 : .94;
    return (member.skill * .48 + member.discipline * .45 + member.creativity * .07) * role * specialty * condition(member);
  }).sort((a, b) => b - a);
  const combined = scores.slice(0, 4).reduce((sum, score, index) => sum + score * (1 - index * .22), 0);
  const coverage = hasOperations ? 1 : .3;
  return clamp((.18 + combined / 180) * coverage, .18, 1.85);
}

export function engineeringStaffEffect(state: GameState): number {
  const engineeringRoles: StaffRole[] = ['architect', 'circuit', 'thermal', 'software', 'validation'];
  const scores = state.staff.filter((member) => engineeringRoles.includes(member.role)).map((member) => (member.skill * .55 + member.creativity * .22 + member.discipline * .23) * condition(member)).sort((a, b) => b - a);
  const coverage = engineeringRoles.filter((role) => state.staff.some((member) => member.role === role)).length / engineeringRoles.length;
  return clamp((.18 + scores.slice(0, 5).reduce((sum, score, index) => sum + score * (1 - index * .11), 0) / 245) * (.48 + coverage * .52), .25, 1.85);
}
