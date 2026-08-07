import { addLedger, addNotice, clamp } from './state';
import type { GameState, StaffTrait } from './types';

const LEARNABLE_TRAITS: StaffTrait[] = ['meticulous', 'pragmatic', 'workhorse', 'communicator', 'loyal', 'negotiator'];

export function trainStaffEnhanced(state: GameState, staffId: string): { ok: boolean; message: string } {
  const member = state.staff.find((item) => item.id === staffId);
  if (!member) return { ok: false, message: '社員が見つかりません。' };
  const cost = Math.round((520_000 + member.level * 220_000) / 10_000) * 10_000;
  if (state.cash < cost) return { ok: false, message: '研修費が不足しています。' };

  state.cash -= cost;
  addLedger(state, `${member.name} 研修`, -cost, 'salary');
  const skillGain = Math.max(2, Math.round(2 + member.growth * .055 + Math.random() * 2.4));
  const creativeGain = Math.max(1, Math.round(1 + member.growth * .025 + Math.random() * 1.8));
  const disciplineGain = Math.max(1, Math.round(1 + Math.random() * 2.2));
  member.level += 1;
  member.skill = clamp(member.skill + skillGain, 0, 100);
  member.creativity = clamp(member.creativity + creativeGain, 0, 100);
  member.discipline = clamp(member.discipline + disciplineGain, 0, 100);
  member.morale = clamp(member.morale + 8, 0, 100);
  member.fatigue = clamp(member.fatigue + 7, 0, 100);
  member.xp += 4;

  let learned = '';
  if (member.traits.length < 3 && Math.random() < .18 + member.growth / 500) {
    const candidates = LEARNABLE_TRAITS.filter((trait) => !member.traits.includes(trait));
    const trait = candidates[Math.floor(Math.random() * candidates.length)];
    if (trait) {
      member.traits.push(trait);
      learned = ' 新しい特性も身につけました。';
    }
  }
  return { ok: true, message: `${member.name}: 能力+${skillGain} / 発想+${creativeGain} / 規律+${disciplineGain}。${learned}`.trim() };
}

export function updateStaffCareer(state: GameState): void {
  if (state.absoluteWeek <= 0 || state.absoluteWeek % 4 !== 0) return;
  const grown: string[] = [];
  for (const member of state.staff) {
    const threshold = 14 + member.level * 6;
    if (member.xp < threshold) continue;
    member.xp -= threshold;
    member.level += 1;
    const gain = Math.max(1, Math.round(1 + member.growth / 42 + Math.random() * 1.4));
    member.skill = clamp(member.skill + gain, 0, 100);
    if (Math.random() < member.growth / 120) member.creativity = clamp(member.creativity + 1 + Math.round(Math.random() * 2), 0, 100);
    if (Math.random() < member.discipline / 150) member.discipline = clamp(member.discipline + 1, 0, 100);
    member.morale = clamp(member.morale + 4, 0, 100);

    if (member.traits.length < 3 && member.level >= 3 && Math.random() < .1 + member.growth / 650) {
      const candidates = LEARNABLE_TRAITS.filter((trait) => !member.traits.includes(trait));
      const trait = candidates[Math.floor(Math.random() * candidates.length)];
      if (trait) member.traits.push(trait);
    }
    grown.push(`${member.name} Lv.${member.level}`);
  }
  if (grown.length) addNotice(state, '社員成長', `${grown.slice(0, 3).join(' / ')}${grown.length > 3 ? ` ほか${grown.length - 3}名` : ''}`, 'good');
}
