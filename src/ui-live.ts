import { ROLE_LABELS, SPECIALTY_LABELS, TRAIT_LABELS } from './data';
import { businessDateLabel } from './business-cycle';
import { operationsStaffEffect, projectStaffEffect, researchStaffEffect, salesStaffEffect } from './staff-effects';
import { addLedger, addNotice, clamp, saveState } from './state';
import type { DevelopmentProject, GameState, ProjectStage, StaffMember, StaffRole } from './types';
import { esc } from './ui-format';

const stages: Record<ProjectStage, string> = {
  concept: '企画', architecture: '詳細設計', tapeout: 'テープアウト', prototype: '試作', validation: '検証', ready: '完成',
};
const staffRoles = Object.keys(ROLE_LABELS) as StaffRole[];
const yen = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 });

const setText = (element: Element | null, value: string): void => {
  if (element && element.textContent !== value) element.textContent = value;
};

const setMeter = (element: Element | null, value: number): void => {
  if (!(element instanceof HTMLElement)) return;
  const width = `${Math.max(0, Math.min(100, value))}%`;
  if (element.style.width !== width) element.style.width = width;
};

function ensureLiveLine(parent: HTMLElement, className: string): HTMLElement {
  const existing = parent.querySelector<HTMLElement>(`.${className}`);
  if (existing) return existing;
  const node = document.createElement('div');
  node.className = className;
  parent.append(node);
  return node;
}

function pulseBusinessWeek(root: HTMLElement, state: GameState): void {
  const current = String(state.absoluteWeek);
  if (root.dataset.businessWeek === current) return;
  root.dataset.businessWeek = current;
  root.classList.remove('business-tick');
  requestAnimationFrame(() => {
    root.classList.add('business-tick');
    window.setTimeout(() => root.classList.remove('business-tick'), 420);
  });
}

function updateHud(root: HTMLElement, state: GameState): void {
  pulseBusinessWeek(root, state);
  const stats = root.querySelectorAll<HTMLElement>('.top-hud .hud-stat');
  const business = stats[0];
  if (business) {
    setText(business.querySelector('small'), 'BUSINESS CALENDAR');
    setText(business.querySelector('b'), businessDateLabel(state));
    setText(business.querySelector('span'), `技術年 ${state.date.year}年 · ${state.date.week}週`);
  }
  const cash = stats[1];
  if (cash) setText(cash.querySelector('b'), yen.format(state.cash));

  const activeProject = state.projects.find((project) => project.stage !== 'ready' && !project.paused);
  const activeProduct = state.products.find((product) => product.status === 'selling');
  const hud = root.querySelector('.progress-stat');
  if (hud) {
    setText(hud.querySelector('small'), activeProject ? 'DEVELOPMENT' : activeProduct ? 'SALES / 5 SEC' : 'STATUS');
    setText(hud.querySelector('b'), activeProject ? `${Math.round(activeProject.progress)}%` : activeProduct ? `${activeProduct.weeklySales.toLocaleString()}台` : '準備中');
    setText(hud.querySelector('span'), activeProject?.codeName ?? activeProduct?.name ?? '最初の世代を開発');
  }
}

function staffOptionText(member: StaffMember): string {
  return `${member.name} · ${ROLE_LABELS[member.role]} · ${SPECIALTY_LABELS[member.specialty]} · 能力${Math.round(member.skill)}`;
}

function ensureProjectLeadControl(card: HTMLElement, state: GameState, project: DevelopmentProject): void {
  let control = card.querySelector<HTMLElement>('.project-lead-live');
  let select = control?.querySelector<HTMLSelectElement>('select');
  if (!control || !select) {
    control = document.createElement('label');
    control.className = 'project-lead-live';
    const caption = document.createElement('span');
    caption.textContent = '開発責任者';
    select = document.createElement('select');
    control.append(caption, select);
    const impact = card.querySelector('.staff-impact-live');
    if (impact) impact.before(control); else card.append(control);
    select.addEventListener('change', () => {
      const next = select?.value ?? '';
      const liveProject = state.projects.find((item) => item.id === project.id);
      if (!liveProject || !next) return;
      liveProject.leadStaffId = next;
      const member = state.staff.find((item) => item.id === next);
      addNotice(state, '責任者変更', `${liveProject.codeName}の責任者を${member?.name ?? '社員'}へ変更しました。`, 'info');
      saveState(state);
    });
  }
  const staffKey = state.staff.map((member) => `${member.id}:${member.role}:${Math.round(member.skill)}`).join('|');
  if (select.dataset.staffKey !== staffKey) {
    select.dataset.staffKey = staffKey;
    select.innerHTML = state.staff.map((member) => `<option value="${member.id}">${esc(staffOptionText(member))}</option>`).join('');
  }
  const fallback = state.staff[0]?.id ?? '';
  const wanted = project.leadStaffId ?? fallback;
  if (select.value !== wanted) select.value = wanted;
}

function updateProjects(root: HTMLElement, state: GameState): void {
  const cards = root.querySelectorAll<HTMLElement>('.project-card');
  cards.forEach((card, index) => {
    const project = state.projects[index];
    if (!project) return;
    setText(card.querySelector('.project-percent'), `${Math.round(project.progress)}%`);
    setText(card.querySelector('header .badge'), stages[project.stage]);
    setMeter(card.querySelector('.meter i'), project.progress);
    if (project.stage === 'ready') return;
    const effect = projectStaffEffect(state, project);
    const line = ensureLiveLine(card, 'staff-impact-live');
    ensureProjectLeadControl(card, state, project);
    const weak = effect.weakRole ? ` · 不足 ${ROLE_LABELS[effect.weakRole]}` : '';
    const quality = effect.quality >= 82 ? '最高' : effect.quality >= 68 ? '良好' : effect.quality >= 54 ? '不安' : '危険';
    setText(line, `TEAM ×${effect.speed.toFixed(2)} · ${effect.leadName} · 適性${Math.round(effect.coverage * 100)}% · 品質 ${quality}${weak}`);
    line.dataset.tone = effect.quality >= 68 ? 'good' : effect.quality >= 54 ? 'warning' : 'bad';
  });
}

function updateResearch(root: HTMLElement, state: GameState): void {
  const research = state.activeResearch;
  const card = root.querySelector<HTMLElement>('.research-card.active');
  if (!research || !card) return;
  setText(card.querySelector('.research-progress b'), `${Math.round(research.progress)}%`);
  setMeter(card.querySelector('.research-progress .meter i'), research.progress);
  const factor = researchStaffEffect(state, research.area);
  const line = ensureLiveLine(card, 'staff-impact-live');
  setText(line, `研究チーム ×${factor.toFixed(2)} · 人材構成で研究速度が変化`);
  line.dataset.tone = factor >= 1.15 ? 'good' : factor >= .8 ? 'warning' : 'bad';
}

function updateProducts(root: HTMLElement, state: GameState): void {
  const selling = state.products.filter((product) => product.status === 'selling');
  const cards = root.querySelectorAll<HTMLElement>('.product-list > .product-card');
  cards.forEach((card, index) => {
    const product = selling[index];
    if (!product) return;
    const hero = card.querySelectorAll<HTMLElement>('.sales-hero > div');
    const lost = Math.max(0, product.weeklyDemand - product.weeklySales);
    const supplyRate = product.weeklyDemand ? product.weeklyProduced / product.weeklyDemand * 100 : 100;
    if (hero[0]) {
      setText(hero[0].querySelector('b'), product.weeklySales.toLocaleString());
      setText(hero[0].querySelector('span'), `需要 ${product.weeklyDemand.toLocaleString()}`);
    }
    if (hero[1]) {
      setText(hero[1].querySelector('b'), product.weeklyProduced.toLocaleString());
      setText(hero[1].querySelector('span'), `供給率 ${Math.round(supplyRate)}%`);
    }
    if (hero[2]) setText(hero[2].querySelector('b'), lost.toLocaleString());
    if (hero[3]) setText(hero[3].querySelector('b'), yen.format(product.weeklyProfit));
    setText(card.querySelector('.rating b'), product.rating.toFixed(1));
  });

  const panel = root.querySelector<HTMLElement>('.product-list')?.closest<HTMLElement>('.panel-section');
  const summary = panel?.querySelectorAll<HTMLElement>('.summary-strip > div');
  if (summary?.length) {
    const demand = selling.reduce((sum, product) => sum + product.weeklyDemand, 0);
    const produced = selling.reduce((sum, product) => sum + product.weeklyProduced, 0);
    const sold = selling.reduce((sum, product) => sum + product.weeklySales, 0);
    const profit = selling.reduce((sum, product) => sum + product.weeklyProfit, 0);
    setText(summary[0]?.querySelector('b') ?? null, demand.toLocaleString());
    setText(summary[1]?.querySelector('b') ?? null, produced.toLocaleString());
    setText(summary[2]?.querySelector('b') ?? null, sold.toLocaleString());
    setText(summary[3]?.querySelector('b') ?? null, yen.format(profit));
  }

  const teamLineHost = panel?.querySelector<HTMLElement>('.section-head');
  if (teamLineHost) {
    const line = ensureLiveLine(teamLineHost, 'business-team-live');
    setText(line, `販促チーム ×${salesStaffEffect(state).toFixed(2)} · 生産管理 ×${operationsStaffEffect(state).toFixed(2)} · 5秒ごとに販売`);
  }
}

function updateFactories(root: HTMLElement, state: GameState): void {
  const active = state.contracts.filter((contract) => contract.active);
  const cards = root.querySelectorAll<HTMLElement>('.factory-list > .factory-card');
  cards.forEach((card, index) => {
    const contract = active[index];
    if (!contract) return;
    const badge = card.querySelector<HTMLElement>('header .badge');
    if (badge) {
      setText(badge, contract.setupRemaining ? '立上げ中' : '稼働中');
      badge.classList.toggle('warning', contract.setupRemaining > 0);
      badge.classList.toggle('good', contract.setupRemaining === 0);
    }
    setText(card.querySelector('header > b'), `${contract.committedCapacity.toLocaleString()} / 5秒`);
    const metrics = card.querySelectorAll<HTMLElement>('.metric-quad > div');
    setText(metrics[3]?.querySelector('b') ?? null, `${contract.remainingWeeks}経営週`);
  });
}

function ensureRoleControl(card: HTMLElement, state: GameState, member: StaffMember): void {
  let control = card.querySelector<HTMLElement>('.staff-role-live');
  let select = control?.querySelector<HTMLSelectElement>('select');
  if (!control || !select) {
    control = document.createElement('label');
    control.className = 'staff-role-live';
    const caption = document.createElement('span');
    caption.textContent = '職種変更';
    select = document.createElement('select');
    select.innerHTML = staffRoles.map((role) => `<option value="${role}">${esc(ROLE_LABELS[role])}</option>`).join('');
    control.append(caption, select);
    const footer = card.querySelector('footer');
    if (footer) footer.before(control); else card.append(control);
    select.addEventListener('change', () => {
      const liveMember = state.staff.find((item) => item.id === member.id);
      const nextRole = select?.value as StaffRole | undefined;
      if (!liveMember || !nextRole || nextRole === liveMember.role) return;
      const previousRole = liveMember.role;
      const cost = Math.round((900_000 + liveMember.level * 180_000) / 10_000) * 10_000;
      if (state.cash < cost) {
        select.value = previousRole;
        addNotice(state, '職種変更できません', `${liveMember.name}の転向には${yen.format(cost)}必要です。`, 'warning');
        return;
      }
      state.cash -= cost;
      addLedger(state, `${liveMember.name} 職種変更`, -cost, 'salary');
      liveMember.role = nextRole;
      liveMember.fatigue = clamp(liveMember.fatigue + 8, 0, 100);
      liveMember.morale = clamp(liveMember.morale - 3, 0, 100);
      addNotice(state, '職種変更', `${liveMember.name}: ${ROLE_LABELS[previousRole]} → ${ROLE_LABELS[nextRole]}`, 'info');
      saveState(state);
    });
  }
  if (select.value !== member.role) select.value = member.role;
}

function updateStaff(root: HTMLElement, state: GameState): void {
  const cards = root.querySelectorAll<HTMLElement>('.staff-grid > .staff-card');
  cards.forEach((card, index) => {
    const member = state.staff[index];
    if (!member) return;
    ensureRoleControl(card, state, member);
    setText(card.querySelector('header p'), `${SPECIALTY_LABELS[member.specialty]} · Lv.${member.level}`);
    const roleBadge = card.querySelector<HTMLElement>('header .badge');
    if (roleBadge) setText(roleBadge, ROLE_LABELS[member.role]);
    const core = card.querySelectorAll<HTMLElement>('.staff-core-stats span b');
    setText(core[0] ?? null, String(Math.round(member.skill)));
    setText(core[1] ?? null, String(Math.round(member.creativity)));
    setText(core[2] ?? null, String(Math.round(member.discipline)));
    setText(core[3] ?? null, String(Math.round(member.growth)));
    const bars = card.querySelectorAll<HTMLElement>('.staff-bars label');
    const values = [member.morale, member.fatigue, member.loyalty, Math.min(80, member.xp)];
    bars.forEach((label, barIndex) => {
      const value = values[barIndex] ?? 0;
      setText(label.querySelector('b'), String(Math.round(value)));
      setMeter(label.querySelector('.meter i'), barIndex === 3 ? value / 80 * 100 : value);
    });
    const traitRow = card.querySelector<HTMLElement>('.trait-row');
    if (traitRow) {
      const html = member.traits.map((trait) => `<span>${esc(TRAIT_LABELS[trait])}</span>`).join('');
      if (traitRow.innerHTML !== html) traitRow.innerHTML = html;
    }
  });

  const teamPower = root.querySelectorAll<HTMLElement>('.team-power-strip > div b');
  if (teamPower.length >= 3) {
    const projects = state.projects.filter((project) => project.stage !== 'ready');
    const engineering = projects.length ? projectStaffEffect(state, projects[0]!).speed : 1;
    setText(teamPower[0] ?? null, `×${engineering.toFixed(2)}`);
    setText(teamPower[1] ?? null, `×${salesStaffEffect(state).toFixed(2)}`);
    setText(teamPower[2] ?? null, `×${operationsStaffEffect(state).toFixed(2)}`);
  }

  const candidates = root.querySelectorAll<HTMLElement>('.candidate-grid > .candidate-card');
  candidates.forEach((card, index) => {
    const candidate = state.candidates[index];
    if (!candidate) return;
    const footer = card.querySelector<HTMLElement>('footer > span');
    setText(footer, `${yen.format(candidate.salary)}/月 · 残り${Math.max(0, candidate.expiresAtWeek - state.absoluteWeek)}経営週`);
  });
}

function updateFinance(root: HTMLElement, state: GameState): void {
  const hero = root.querySelectorAll<HTMLElement>('.finance-hero > div');
  if (hero[0]) setText(hero[0].querySelector('b'), yen.format(state.cash));
  const loans = root.querySelectorAll<HTMLElement>('.active-loans > .card');
  loans.forEach((card, index) => {
    const loan = state.loans[index];
    if (!loan) return;
    setText(card.querySelector('h3'), `残高 ${yen.format(loan.balance)}`);
    setText(card.querySelector('header > b'), `残り${loan.remainingWeeks}経営週`);
    setMeter(card.querySelector('.meter i'), loan.balance / Math.max(1, loan.principal * (1 + loan.interestRate)) * 100);
  });
}

function updateNotifications(root: HTMLElement, state: GameState): void {
  const rail = root.querySelector<HTMLElement>('.notification-rail');
  if (!rail) return;
  const wanted = state.notifications.slice(0, 3);
  const currentIds = [...rail.querySelectorAll<HTMLElement>('[data-action="dismiss-notice"]')].map((button) => button.dataset.id ?? '').join('|');
  const wantedIds = wanted.map((item) => item.id).join('|');
  if (currentIds === wantedIds) return;
  rail.innerHTML = wanted.map((item) => `<article class="notice ${item.tone}"><span></span><div><b>${esc(item.title)}</b><p>${esc(item.message)}</p></div><button data-action="dismiss-notice" data-id="${item.id}">×</button></article>`).join('');
}

export function updateRealtimeUI(root: HTMLElement, state: GameState): void {
  updateHud(root, state);
  updateProjects(root, state);
  updateResearch(root, state);
  updateProducts(root, state);
  updateFactories(root, state);
  updateStaff(root, state);
  updateFinance(root, state);
  updateNotifications(root, state);
}

export function realtimeStructureKey(state: GameState): string {
  const projects = state.projects.map((project) => `${project.id}:ready=${project.stage === 'ready'}:paused=${project.paused}:issues=${project.issues.filter((issue) => issue.status === 'open').length}`).join('|');
  const products = state.products.map((product) => `${product.id}:${product.status}`).join('|');
  const research = state.activeResearch ? `${state.activeResearch.area}:${state.activeResearch.paused}` : 'none';
  const event = state.activeEvent?.id ?? 'none';
  const candidates = state.candidates.map((candidate) => candidate.id).join(',');
  const competitors = state.competitors.map((company) => `${company.id}:${company.status}:${company.models.length}`).join(',');
  const loans = state.loans.map((loan) => loan.id).join(',');
  return `${projects}#research:${research}#products:${products}#event:${event}#candidates:${candidates}#staff:${state.staff.length}#rivals:${competitors}#loans:${loans}#market:${state.market.headline}`;
}
