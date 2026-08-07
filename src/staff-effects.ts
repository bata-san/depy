import type {
  DevelopmentProject, GameState, ProjectStage, ResearchArea, StaffMember, StaffRole, StaffSpecialty,
} from './types';

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

type ActiveStage = Exclude<ProjectStage, 'ready'>;

const stageRoles: Record<ActiveStage, Partial<Record<StaffRole, number>>> = {
  concept: { architect: 1.65, marketing: 1.35, software: .82, circuit: .72, thermal: .58, validation: .62, operations: .68 },
  architecture: { architect: 1.62, circuit: 1.52, thermal: 1.08, software: .9, validation: .68, marketing: .46, operations: .62 },
  tapeout: { circuit: 1.68, architect: 1.34, thermal: 1.22, validation: .82, operations: .86, software: .58, marketing: .38 },
  prototype: { thermal: 1.5, circuit: 1.36, validation: 1.24, operations: 1.12, software: .82, architect: .78, marketing: .38 },
  validation: { validation: 1.72, software: 1.42, thermal: 1.14, circuit: 1.02, operations: .84, architect: .72, marketing: .42 },
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
  const fatigue = member.fatigue > 85 ? .48 : member.fatigue > 70 ? .7 : member.fatigue > 50 ? .88 : 1;
  const morale = .72 + member.morale / 100 * .38;
  const loyalty = .9 + member.loyalty / 100 * .12;
  return fatigue * morale * loyalty;
}

function traitMultiplier(member: StaffMember, stage: ActiveStage): number {
  let value = 1;
  if (member.traits.includes('prodigy')) value *= 1.12;
  if (member.traits.includes('veteran')) value *= 1.07;
  if (member.traits.includes('meticulous') && (stage === 'prototype' || stage === 'validation')) value *= 1.13;
  if (member.traits.includes('pragmatic') && (stage === 'tapeout' || stage === 'prototype')) value *= 1.09;
  if (member.traits.includes('communicator') && stage === 'concept') value *= 1.11;
  if (member.traits.includes('workhorse')) value *= 1.04;
  if (member.traits.includes('temperamental') && member.morale < 45) value *= .82;
  return value;
}

function memberStagePower(member: StaffMember, stage: ActiveStage): number {
  const roleWeight = stageRoles[stage][member.role] ?? .55;
  const specialty = stageSpecialties[stage].includes(member.specialty) ? 1.22 : 1;
  const base = member.skill * .58 + member.creativity * .2 + member.discipline * .22;
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
  const power = top.reduce((sum, entry, index) => sum + entry.power * (1 - index * .11), 0);
  const required = essentialRoles[stage];
  const present = required.filter((role) => state.staff.some((member) => member.role === role)).length;
  const coverage = required.length ? present / required.length : 1;
  const weakRole = required.find((role) => !state.staff.some((member) => member.role === role)) ?? null;
  const lead = state.staff.find((member) => member.id === project.leadStaffId) ?? top[0]?.member;
  const leadPower = lead ? memberStagePower(lead, stage) : 0;
  const leadFit = lead ? (stageRoles[stage][lead.role] ?? .55) * (stageSpecialties[stage].includes(lead.specialty) ? 1.12 : 1) : .55;
  const speed = clamp(.16 + power / 380 + coverage * .22 + leadPower / 700 * leadFit, .34, 2.05);
  const quality = clamp(32 + power / 10 + coverage * 28 + leadPower / 15, 28, 100);
  const issueRisk = clamp(1.62 - coverage * .62 - quality / 175 + (weakRole ? .28 : 0), .34, 1.9);
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
    const role = roles.includes(member.role) ? 1.45 : .62;
    const specialty = specialties.includes(member.specialty) ? 1.28 : 1;
    const traits = member.traits.includes('prodigy') ? 1.13 : member.traits.includes('veteran') ? 1.06 : 1;
    return (member.skill * .62 + member.creativity * .24 + member.discipline * .14) * role * specialty * condition(member) * traits;
  }).sort((a, b) => b - a);
  const combined = scores.slice(0, 4).reduce((sum, score, index) => sum + score * (1 - index * .15), 0);
  const coverage = roles.filter((role) => state.staff.some((member) => member.role === role)).length / roles.length;
  return clamp(.35 + combined / 250 + coverage * .35, .42, 2.35);
}

export function salesStaffEffect(state: GameState): number {
  const scores = state.staff.map((member) => {
    const role = member.role === 'marketing' ? 1.7 : member.role === 'operations' ? 1.05 : .5;
    const specialty = member.specialty === 'brand' ? 1.35 : member.specialty === 'supply' ? 1.08 : 1;
    const social = member.traits.includes('communicator') ? 1.16 : member.traits.includes('negotiator') ? 1.12 : 1;
    return (member.skill * .45 + member.creativity * .35 + member.discipline * .2) * role * specialty * social * condition(member);
  }).sort((a, b) => b - a);
  return clamp(.58 + scores.slice(0, 3).reduce((sum, score, index) => sum + score * (1 - index * .22), 0) / 300, .62, 1.65);
}

export function operationsStaffEffect(state: GameState): number {
  const scores = state.staff.map((member) => {
    const role = member.role === 'operations' ? 1.75 : member.role === 'validation' ? 1.08 : .52;
    const specialty = member.specialty === 'supply' ? 1.35 : member.specialty === 'yield' ? 1.18 : member.specialty === 'quality' ? 1.1 : 1;
    return (member.skill * .5 + member.discipline * .42 + member.creativity * .08) * role * specialty * condition(member);
  }).sort((a, b) => b - a);
  return clamp(.65 + scores.slice(0, 3).reduce((sum, score, index) => sum + score * (1 - index * .2), 0) / 330, .68, 1.55);
}

export function engineeringStaffEffect(state: GameState): number {
  const engineeringRoles: StaffRole[] = ['architect', 'circuit', 'thermal', 'software', 'validation'];
  const scores = state.staff.filter((member) => engineeringRoles.includes(member.role)).map((member) => (member.skill * .55 + member.creativity * .22 + member.discipline * .23) * condition(member)).sort((a, b) => b - a);
  return clamp(.65 + scores.slice(0, 5).reduce((sum, score, index) => sum + score * (1 - index * .1), 0) / 360, .68, 1.62);
}
