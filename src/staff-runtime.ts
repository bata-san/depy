import { RESEARCH_DEFINITIONS } from './data';
import { isFoundingProject } from './design-system';
import { researchDurationSeconds, STANDARD_DEVELOPMENT_SECONDS } from './game-clock';
import { rewardStaffSuccess, staffPairSynergy, teamChemistry } from './staff-life';
import { addLedger, addNotice, clamp, uid } from './state';
import { projectStaffEffect, researchStaffEffect } from './staff-effects';
import type { DevelopmentProject, GameState, ProjectIssue, ProjectStage, StaffMember, StaffRole } from './types';

const ENGINEERING_ROLES: StaffRole[] = ['architect', 'circuit', 'thermal', 'software', 'validation'];

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

function createIssue(project: DevelopmentProject, quality: number, missingRole: boolean): ProjectIssue {
  const severityBoost = (100 - quality) / 100 + (missingRole ? .18 : 0);
  const severe = project.metrics.risk / 100 + severityBoost > .72 && Math.random() < .58;
  return {
    id: uid('issue'),
    title: severe ? '担当不足による重大な検証不良' : '工程間の設計すり合わせ不足',
    description: severe
      ? '必要な専門人材が不足し、高負荷条件で再現性の低い不安定動作が確認されました。'
      : '担当者間の能力差により設計マージンが不足しています。人材構成か費用で補う必要があります。',
    severity: severe ? 'critical' : 'major',
    status: 'open',
    fixCost: severe ? 6_800_000 : 3_200_000,
    delayWeeks: severe ? 4 : 2,
    performancePenalty: severe ? 8 : 3,
    reliabilityPenalty: severe ? 13 : 5,
  };
}

function projectPair(state: GameState, project: DevelopmentProject): { lead?: StaffMember; partner?: StaffMember; synergy: number } {
  const lead = state.staff.find((member) => member.id === project.leadStaffId) ?? state.staff[0];
  if (!lead) return { synergy: 50 };
  const partners = state.staff.filter((member) => member.id !== lead.id);
  const partner = partners.sort((a, b) => staffPairSynergy(lead, b) - staffPairSynergy(lead, a))[0];
  return partner
    ? { lead, partner, synergy: staffPairSynergy(lead, partner) }
    : { lead, synergy: 50 };
}

function applyStageCraft(state: GameState, project: DevelopmentProject, stage: ProjectStage, quality: number, leadName: string, synergy: number): void {
  const excellence = clamp((quality - 65) / 35, -1, 1);
  const combo = clamp((synergy - 55) / 45, 0, 1);
  if (stage === 'architecture' || stage === 'tapeout') {
    project.metrics.performance *= 1 + excellence * .032 + combo * .008;
    project.metrics.singlePerformance *= 1 + excellence * .03 + combo * .006;
    project.metrics.multiPerformance *= 1 + excellence * .034 + combo * .009;
    project.metrics.efficiency = clamp(project.metrics.efficiency + excellence * 3.5 + combo * 1.3, 10, 180);
  }
  if (stage === 'prototype') {
    project.metrics.yieldRate = clamp(project.metrics.yieldRate + excellence * 5.5 + combo * 1.8, 20, 99);
    project.metrics.thermals = clamp(project.metrics.thermals + excellence * 4.2 + combo * 1.4, 15, 99);
    project.metrics.unitCost *= clamp(1 - excellence * .045 - combo * .012, .88, 1.08);
  }
  if (stage === 'validation' || stage === 'ready') {
    project.metrics.reliability = clamp(project.metrics.reliability + excellence * 5.8 + combo * 1.8, 30, 99);
    project.metrics.softwareQuality = clamp(project.metrics.softwareQuality + excellence * 5.2 + combo * 1.5, 25, 99);
  }

  const inspirationChance = .12 + Math.max(0, quality - 78) / 180 + combo * .1;
  if (stage !== 'ready' && Math.random() < inspirationChance) {
    const boost = 1.01 + Math.random() * (.014 + combo * .018);
    project.metrics.performance *= boost;
    project.metrics.efficiency = clamp(project.metrics.efficiency + 1.2 + Math.random() * 2.4 + combo, 10, 180);
    rewardStaffSuccess(state, synergy >= 78 ? 2.6 : 1.6, ENGINEERING_ROLES, .6);
    addNotice(state, synergy >= 78 ? 'チームコンボ' : 'ひらめき', synergy >= 78
      ? `${leadName}を中心に部門間の連携が噛み合い、${project.codeName}の設計が一段洗練されました。`
      : `${leadName}を中心に設計上のブレイクスルーが発生。${project.codeName}の完成度が上がりました。`, 'good');
  }
}

export function advanceStaffDrivenRealtime(state: GameState, deltaSeconds: number, speed: GameState['speed']): boolean {
  if (speed === 0) return false;
  let changed = false;
  const chemistry = teamChemistry(state);

  for (const project of state.projects.filter((item) => item.stage !== 'ready' && !item.paused)) {
    if (isFoundingProject(state, project)) project.weeklyBurn = 0;
    if (project.issues.some((issue) => issue.status === 'open')) continue;
    const staff = projectStaffEffect(state, project);
    const pair = projectPair(state, project);
    const chemistrySpeed = clamp(.9 + chemistry / 420 + pair.synergy / 900, .92, 1.28);
    const gain = deltaSeconds / STANDARD_DEVELOPMENT_SECONDS * 100 * staff.speed * chemistrySpeed;
    const beforeStage = project.stage;
    project.progress = clamp(project.progress + gain, 0, 100);
    project.stage = stageFor(project.progress);

    if (project.stage !== beforeStage) {
      const cost = isFoundingProject(state, project) ? 0 : Math.round(gateCost(project, project.stage));
      if (cost > 0 && !project.paidGates.includes(project.stage)) {
        if (state.cash < cost) {
          project.paused = true;
          addNotice(state, '開発停止', `${project.codeName}は${project.stage}工程の費用不足で停止しました。`, 'bad');
        } else {
          state.cash -= cost;
          project.spent += cost;
          project.paidGates.push(project.stage);
          addLedger(state, `${project.codeName} ${project.stage}`, -cost, 'development');
        }
      } else if (!project.paidGates.includes(project.stage)) project.paidGates.push(project.stage);

      applyStageCraft(state, project, project.stage, staff.quality, staff.leadName, pair.synergy);
      if (pair.lead) pair.lead.xp += 2.5 + pair.synergy / 55;
      if (pair.partner) pair.partner.xp += 1.4 + pair.synergy / 80;
      const weakness = Math.max(0, 72 - staff.quality);
      project.performancePenalty += weakness * .025;
      project.reliabilityPenalty += weakness * .045;
      const issueChance = clamp(project.metrics.risk / 235 * staff.issueRisk * (1.08 - chemistry / 600), .02, .58);
      const issueCreated = project.stage !== 'ready' && Math.random() < issueChance;
      if (issueCreated) project.issues.push(createIssue(project, staff.quality, Boolean(staff.weakRole)));
      else if (project.stage !== 'ready') rewardStaffSuccess(state, staff.quality >= 78 ? 1.4 : .7, ENGINEERING_ROLES, .25);

      if (project.stage === 'ready') {
        state.stats.generationsLaunched += 1;
        const successMorale = staff.quality >= 84 ? 8 : staff.quality >= 70 ? 5.5 : 3;
        rewardStaffSuccess(state, successMorale, ENGINEERING_ROLES, staff.quality >= 70 ? 3 : 1.5);
        rewardStaffSuccess(state, successMorale * .45, ['marketing', 'operations'], 1);
        const verdict = staff.quality >= 82 ? 'チームの完成度が高く、量産設計まできれいにまとまりました。' : staff.quality >= 65 ? '量産設計が完成しました。' : '完成しましたが、人材構成の弱さが製品品質に残っています。';
        addNotice(state, '開発完了', `${project.codeName}: ${verdict} チーム相性 ${Math.round(chemistry)}。社員の士気が上がりました。`, staff.quality >= 70 ? 'good' : 'warning');
      }
    }
    changed = true;
  }

  if (state.activeResearch && !state.activeResearch.paused) {
    const program = state.activeResearch;
    const staffFactor = researchStaffEffect(state, program.area) * clamp(.92 + chemistry / 650, .94, 1.08);
    const duration = researchDurationSeconds(program.totalWeeks);
    program.progress = clamp(program.progress + deltaSeconds / duration * 100 * staffFactor, 0, 100);
    if (program.progress >= 100) {
      state.research[program.area] += 1;
      state.researchPoints += 22;
      rewardStaffSuccess(state, 4.5, ENGINEERING_ROLES, 1.5);
      addNotice(state, '研究完了', `${RESEARCH_DEFINITIONS[program.area].name} Lv.${state.research[program.area]}を獲得しました。研究チームの士気が上がりました。`, 'good');
      state.activeResearch = null;
    }
    changed = true;
  }

  return changed;
}
