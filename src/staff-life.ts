import type { GameState, StaffMember, StaffRole } from './types';

export type StaffArchetype = 'ace' | 'craftsperson' | 'inventor' | 'captain' | 'steady' | 'sprinter';

export interface StaffLifeProfile {
  archetype: StaffArchetype;
  title: string;
  arrivalHour: number;
  leaveHour: number;
  focus: number;
  resilience: number;
  teamwork: number;
  ambition: number;
  overtime: number;
  contribution: number;
  summary: string;
}

const roleTitle: Record<StaffRole, string> = {
  architect: '設計リード',
  circuit: '回路エンジニア',
  thermal: '熱・電源エンジニア',
  software: 'ソフトウェアエンジニア',
  validation: '検証エンジニア',
  marketing: 'プロダクトプランナー',
  operations: '生産オペレーター',
};

const clamp = (value: number, min = 0, max = 100): number => Math.max(min, Math.min(max, value));

function hash01(text: string, salt = 0): number {
  let hash = 2166136261 ^ salt;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10000) / 10000;
}

function archetypeFor(member: StaffMember): StaffArchetype {
  if (member.traits.includes('prodigy') || member.creativity >= 84) return 'inventor';
  if (member.traits.includes('veteran') || member.discipline >= 86) return 'craftsperson';
  if (member.traits.includes('communicator') || member.loyalty >= 88) return 'captain';
  if (member.traits.includes('workhorse')) return 'sprinter';
  if (member.skill >= 78) return 'ace';
  return 'steady';
}

export function staffLifeProfile(member: StaffMember): StaffLifeProfile {
  const archetype = archetypeFor(member);
  const jitter = hash01(member.id, 17) - .5;
  const morningBias = member.discipline / 100 * .55 + (member.traits.includes('veteran') ? .15 : 0);
  const arrivalHour = clamp(9.35 - morningBias * 1.7 + jitter * .55, 7.45, 9.65);
  const overtime = clamp(
    18 + member.loyalty * .18 + member.discipline * .12 + (member.traits.includes('workhorse') ? 22 : 0)
      - member.fatigue * .15 - (member.traits.includes('temperamental') ? 8 : 0),
    8,
    72,
  );
  const leaveHour = clamp(17.35 + overtime / 100 * 4.65 + (hash01(member.id, 41) - .5) * .45, 17.25, 22.25);
  const focus = clamp(member.skill * .44 + member.discipline * .34 + member.morale * .18 - member.fatigue * .24 + 16);
  const resilience = clamp(member.discipline * .42 + member.loyalty * .24 + (member.traits.includes('workhorse') ? 22 : 0) + (member.traits.includes('veteran') ? 10 : 0) - (member.traits.includes('temperamental') ? 13 : 0));
  const teamwork = clamp(member.loyalty * .38 + member.morale * .28 + member.discipline * .12 + (member.traits.includes('communicator') ? 24 : 0));
  const ambition = clamp(member.growth * .42 + member.creativity * .3 + member.skill * .12 + (member.traits.includes('prodigy') ? 16 : 0));
  const contribution = clamp(member.skill * .42 + member.creativity * .2 + member.discipline * .16 + teamwork * .12 + resilience * .1 - member.fatigue * .12);
  const title = `${roleTitle[member.role]} Lv.${member.level}`;
  const summary = archetype === 'inventor' ? 'ひらめきで停滞を崩す発明型'
    : archetype === 'craftsperson' ? '品質と再現性を積み上げる職人型'
      : archetype === 'captain' ? '周囲の調子を引き上げるまとめ役'
        : archetype === 'sprinter' ? '長時間の集中に強い推進役'
          : archetype === 'ace' ? '高い基礎能力で結果を出すエース'
            : '大崩れせず仕事を積み上げる安定型';
  return { archetype, title, arrivalHour, leaveHour, focus, resilience, teamwork, ambition, overtime, contribution, summary };
}

export function isStaffAtOffice(member: StaffMember, hour: number): boolean {
  const profile = staffLifeProfile(member);
  return hour >= profile.arrivalHour && hour < profile.leaveHour;
}

export function staffPresentAtHour(staff: StaffMember[], hour: number): StaffMember[] {
  return staff.filter((member) => isStaffAtOffice(member, hour));
}

export function teamChemistry(state: GameState): number {
  if (!state.staff.length) return 0;
  const roles = new Set(state.staff.map((member) => member.role)).size;
  const profiles = state.staff.map(staffLifeProfile);
  const teamwork = profiles.reduce((sum, profile) => sum + profile.teamwork, 0) / profiles.length;
  const morale = state.staff.reduce((sum, member) => sum + member.morale, 0) / state.staff.length;
  const fatigue = state.staff.reduce((sum, member) => sum + member.fatigue, 0) / state.staff.length;
  const communicator = state.staff.some((member) => member.traits.includes('communicator')) ? 8 : 0;
  return clamp(teamwork * .48 + morale * .3 + roles * 3.1 + communicator - fatigue * .12);
}

export function staffWeeklyConditionDelta(member: StaffMember, workload: number, chemistry: number): { fatigue: number; morale: number; xp: number } {
  const profile = staffLifeProfile(member);
  const workloadPressure = Math.max(0, workload);
  const resilience = profile.resilience / 100;
  const fatigue = workloadPressure > 0
    ? (1.05 + workloadPressure) * (1.18 - resilience * .52)
    : -3.4 - resilience * .7;
  const morale = chemistry >= 72 ? .55 : chemistry < 42 ? -.8 : .1;
  const xp = workloadPressure > 0 ? 1.8 + workloadPressure * .55 + profile.ambition / 75 : .2;
  return { fatigue, morale, xp };
}

export function staffPairSynergy(a: StaffMember, b: StaffMember): number {
  const pa = staffLifeProfile(a);
  const pb = staffLifeProfile(b);
  const specialtyBonus = a.specialty !== b.specialty ? 6 : -2;
  const roleBonus = a.role !== b.role ? 4 : 0;
  const communication = (pa.teamwork + pb.teamwork) / 2;
  return clamp(communication * .72 + specialtyBonus + roleBonus - Math.abs(a.morale - b.morale) * .08);
}

export function staffArchetypeLabel(archetype: StaffArchetype): string {
  return ({ ace: 'エース', craftsperson: '職人', inventor: '発明家', captain: 'まとめ役', steady: '安定型', sprinter: '推進役' })[archetype];
}
