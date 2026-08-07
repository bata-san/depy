import { RESEARCH_DEFINITIONS } from './data';
import { researchDurationSeconds, STANDARD_DEVELOPMENT_SECONDS } from './game-clock';
import { addLedger, addNotice, clamp, uid } from './state';
import { projectStaffEffect, researchStaffEffect } from './staff-effects';
import type { DevelopmentProject, GameState, ProjectIssue, ProjectStage } from './types';

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

export function advanceStaffDrivenRealtime(state: GameState, deltaSeconds: number, speed: GameState['speed']): boolean {
  if (speed === 0) return false;
  let changed = false;

  for (const project of state.projects.filter((item) => item.stage !== 'ready' && !item.paused)) {
    if (project.issues.some((issue) => issue.status === 'open')) continue;
    const staff = projectStaffEffect(state, project);
    const gain = deltaSeconds / STANDARD_DEVELOPMENT_SECONDS * 100 * staff.speed;
    const beforeStage = project.stage;
    project.progress = clamp(project.progress + gain, 0, 100);
    project.stage = stageFor(project.progress);

    if (project.stage !== beforeStage) {
      const cost = Math.round(gateCost(project, project.stage));
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
      }

      const weakness = Math.max(0, 72 - staff.quality);
      project.performancePenalty += weakness * .025;
      project.reliabilityPenalty += weakness * .045;
      const issueChance = clamp(project.metrics.risk / 235 * staff.issueRisk, .025, .58);
      if (project.stage !== 'ready' && Math.random() < issueChance) project.issues.push(createIssue(project, staff.quality, Boolean(staff.weakRole)));

      if (project.stage === 'ready') {
        state.stats.generationsLaunched += 1;
        const verdict = staff.quality >= 82 ? 'チームの完成度が高く、量産設計まできれいにまとまりました。' : staff.quality >= 65 ? '量産設計が完成しました。' : '完成しましたが、人材構成の弱さが製品品質に残っています。';
        addNotice(state, '開発完了', `${project.codeName}: ${verdict}`, staff.quality >= 70 ? 'good' : 'warning');
      }
    }
    changed = true;
  }

  if (state.activeResearch && !state.activeResearch.paused) {
    const program = state.activeResearch;
    const staffFactor = researchStaffEffect(state, program.area);
    const duration = researchDurationSeconds(program.totalWeeks);
    program.progress = clamp(program.progress + deltaSeconds / duration * 100 * staffFactor, 0, 100);
    if (program.progress >= 100) {
      state.research[program.area] += 1;
      state.researchPoints += 22;
      addNotice(state, '研究完了', `${RESEARCH_DEFINITIONS[program.area].name} Lv.${state.research[program.area]}を獲得しました。`, 'good');
      state.activeResearch = null;
    }
    changed = true;
  }

  return changed;
}
