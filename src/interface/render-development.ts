import { SERIES_FOCUS_DESCRIPTIONS, SERIES_FOCUS_LABELS, ROLE_LABELS, SPECIALTY_LABELS } from '../data';
import { availableNodes, availablePackages, calculateMetrics, designCaps, focusLabel, inferAudience } from '../simulation';
import type { GameState, PackageType, ProductSeries, ProjectStage } from '../types';
import type { InterfaceModel } from './model';
import { packageLabels, riskLabels } from './model';
import { esc, meter, num, pct, yen } from './format';

const stageLabels: Record<ProjectStage, string> = {
  concept: '企画', architecture: '詳細設計', tapeout: 'テープアウト', prototype: '試作', validation: '検証', ready: '完成',
};

function staffOptions(state: GameState, selected: string | null): string {
  return state.staff.map((member) => `<option value="${member.id}" ${member.id === selected ? 'selected' : ''}>${esc(member.name)} · ${esc(ROLE_LABELS[member.role])} · ${esc(SPECIALTY_LABELS[member.specialty])} · ${Math.round(member.skill)}</option>`).join('');
}

function renderSeriesRail(state: GameState, model: InterfaceModel): string {
  return `<aside class="series-rail">
    <div class="series-list">${state.series.map((series) => `<button class="series-link ${state.selectedSeriesId === series.id ? 'is-active' : ''}" data-action="select-series" data-id="${series.id}"><span>${series.category.toUpperCase()}</span><b>${esc(series.name)}</b><small>Gen ${series.generation || 0} · Brand ${num.format(series.brand)}</small></button>`).join('')}</div>
    <form class="inline-create" data-passive-form>
      <span class="eyebrow">NEW SERIES</span>
      <input aria-label="シリーズ名" placeholder="シリーズ名" data-model="seriesName" value="${esc(model.seriesName)}">
      <div class="field-row"><select aria-label="カテゴリ" data-model="seriesCategory"><option value="cpu" ${model.seriesCategory === 'cpu' ? 'selected' : ''}>CPU</option><option value="gpu" ${model.seriesCategory === 'gpu' ? 'selected' : ''}>GPU</option></select><select aria-label="方針" data-model="seriesFocus">${Object.entries(SERIES_FOCUS_LABELS).map(([id, label]) => `<option value="${id}" ${model.seriesFocus === id ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></div>
      <small>${esc(SERIES_FOCUS_DESCRIPTIONS[model.seriesFocus])}</small>
      <button type="button" data-action="create-series">シリーズ作成</button>
    </form>
  </aside>`;
}

function renderDraft(state: GameState, series: ProductSeries, model: InterfaceModel): string {
  const draft = model.draft;
  const founding = state.projects.length === 0 && state.stats.generationsLaunched === 0;
  if (!draft || draft.seriesId !== series.id) {
    return `<section class="empty-state"><span class="eyebrow">NEXT GENERATION</span><h3>次世代設計を開始</h3><p>${founding ? '創業支援により最初の製品開発は0円です。まず1製品を完成させて販売ループへ入れます。' : '社員構成と技術投資が開発速度・品質・不具合率を直接変えます。'}</p><button class="action-primary" data-action="new-design">設計を始める</button></section>`;
  }

  const metrics = calculateMetrics(state, series, draft.values, draft.technology);
  const caps = designCaps(state, series);
  const audience = inferAudience(metrics, metrics.suggestedPrice, series);
  const controls: Array<[keyof typeof draft.values, string, number, number, number]> = [
    ['computeScale', series.category === 'cpu' ? '演算規模' : '演算ユニット', 10, caps.computeScale, 1],
    ['clockTarget', 'クロック目標', series.category === 'cpu' ? 2.2 : .8, caps.clockTarget, .05],
    ['architecture', 'アーキテクチャ', 10, caps.architecture, 1],
    ['cacheBandwidth', 'キャッシュ / 帯域', 10, caps.cacheBandwidth, 1],
    ['powerBudget', '電力上限', series.category === 'cpu' ? 35 : 75, caps.powerBudget, 5],
    ['qualityFocus', '品質 / 歩留まり', 10, 100, 1],
  ];
  const normalInitial = metrics.developmentCost * .28 + 2_200_000;
  const normalTotal = metrics.developmentCost + metrics.maskCost + metrics.prototypeCost + metrics.validationCost + metrics.softwareCost;

  return `<section class="design-workspace">
    <div class="design-inputs">
      <div class="view-subhead"><div><span class="eyebrow">DESIGN INPUT</span><h3>${esc(series.name)} Gen ${series.generation + 1}</h3></div><span>${founding ? '創業支援 · FREE' : series.category.toUpperCase()}</span></div>
      <label class="field"><span>コードネーム</span><input data-design="codeName" value="${esc(draft.codeName)}" maxlength="28"></label>
      <label class="field"><span>開発責任者</span><select data-design-lead>${staffOptions(state, draft.leadStaffId)}</select></label>
      ${controls.map(([key, label, min, max, step]) => `<label class="range-field"><span><em>${esc(label)}</em><b data-range-readout>${num.format(draft.values[key])}</b></span><input type="range" min="${min}" max="${max}" step="${step}" value="${draft.values[key]}" data-design-value="${key}"></label>`).join('')}
      <div class="field-grid"><label class="field"><span>プロセス</span><select data-tech="node">${availableNodes(state).map((node) => `<option value="${node}" ${node === draft.technology.node ? 'selected' : ''}>${node}nm</option>`).join('')}</select></label><label class="field"><span>実装</span><select data-tech="packageType">${availablePackages(state).map((item: PackageType) => `<option value="${item}" ${item === draft.technology.packageType ? 'selected' : ''}>${esc(packageLabels[item])}</option>`).join('')}</select></label><label class="field"><span>リスク</span><select data-tech="riskPosture">${Object.entries(riskLabels).map(([id, label]) => `<option value="${id}" ${id === draft.technology.riskPosture ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></label><label class="field"><span>ソフト投資</span><input type="number" min="10" max="100" step="5" value="${draft.technology.softwareInvestment}" data-tech="softwareInvestment"></label></div>
      <button class="action-primary action-wide" data-action="start-generation">${founding ? '無料で最初の開発を開始' : '開発開始'} <span>${founding ? '¥0' : yen.format(normalInitial)}</span></button>
    </div>
    <div class="design-readout" data-design-readout>
      <span class="eyebrow">LIVE ESTIMATE</span>
      <div class="hero-number"><strong>${num.format(metrics.performance)}</strong><span>PERFORMANCE</span></div>
      <div class="metric-lines"><div><span>効率</span><b>${num.format(metrics.efficiency)}</b>${meter(metrics.efficiency, 140, 'good')}</div><div><span>信頼性</span><b>${pct(metrics.reliability)}</b>${meter(metrics.reliability)}</div><div><span>歩留まり</span><b>${pct(metrics.yieldRate)}</b>${meter(metrics.yieldRate, 100, metrics.yieldRate < 55 ? 'bad' : '')}</div><div><span>推奨価格</span><b>${yen.format(metrics.suggestedPrice)}</b></div><div><span>推定原価</span><b>${yen.format(metrics.unitCost)}</b></div><div><span>開発総額</span><b>${founding ? '¥0 · 創業支援' : yen.format(normalTotal)}</b></div></div>
      <div class="audience-ranking"><span class="eyebrow">AUTO MARKET FIT</span>${audience.slice(0, 3).map((item, index) => `<div><b>${index + 1}</b><span><strong>${esc(item.name)}</strong><small>${esc(item.reason)}</small></span><em>${num.format(item.score)}</em></div>`).join('')}</div>
      <p class="diagnostic ${metrics.bottleneckSeverity > 30 ? 'is-warning' : ''}">${esc(metrics.bottleneck)}</p>
    </div>
  </section>`;
}

function renderLaunch(state: GameState, projectId: string, model: InterfaceModel): string {
  const contracts = state.contracts.filter((contract) => contract.active);
  return `<section class="launch-editor"><span class="eyebrow">LAUNCH</span><div class="field-grid"><label class="field"><span>SKU</span><select data-launch="sku"><option value="standard" ${model.launchSku === 'standard' ? 'selected' : ''}>標準</option><option value="flagship" ${model.launchSku === 'flagship' ? 'selected' : ''}>上位選別</option><option value="efficient" ${model.launchSku === 'efficient' ? 'selected' : ''}>省電力</option><option value="salvage" ${model.launchSku === 'salvage' ? 'selected' : ''}>歩留まり活用</option></select></label><label class="field"><span>価格</span><input type="number" data-launch="price" value="${model.launchPrice}" step="1000"></label><label class="field"><span>販売期間</span><input type="number" data-launch="life" value="${model.launchLife}" min="20" max="140"></label><label class="field"><span>発売広告</span><input type="number" data-launch="marketing" value="${model.launchMarketing}" step="500000"></label></div><div class="allocation-lines">${contracts.map((contract) => `<label><span>契約工場 <small>最大 ${contract.committedCapacity.toLocaleString()} / 5秒</small></span><input type="number" min="0" max="${contract.committedCapacity}" step="50" value="${Math.min(500, contract.committedCapacity)}" data-launch-allocation="${contract.id}"></label>`).join('') || '<p>利用可能な工場がありません。</p>'}</div><button class="action-primary action-wide" data-action="launch-product" data-id="${projectId}">製品を発売</button></section>`;
}

function renderProject(state: GameState, projectId: string, model: InterfaceModel): string {
  const project = state.projects.find((item) => item.id === projectId);
  if (!project) return '';
  const series = state.series.find((item) => item.id === project.seriesId);
  const openIssues = project.issues.filter((issue) => issue.status === 'open');
  const launchOpen = project.stage === 'ready' && model.launchProjectId === project.id;
  const founding = state.stats.generationsLaunched === 0 && state.projects[0]?.id === project.id && project.generation === 1;
  return `<article class="line-card project-line" data-project-card="${project.id}"><header><div><span class="status-text" data-project-stage>${stageLabels[project.stage]}</span><h3>${esc(project.codeName)}</h3><small>${esc(series?.name ?? '')} · Gen ${project.generation}${founding ? ' · 創業支援' : ''}</small></div><strong class="project-progress" data-project-progress>${Math.round(project.progress)}%</strong></header>${meter(project.progress, 100, 'accent')}<div class="metric-row"><span>性能 <b data-project-performance>${num.format(project.metrics.performance * (1 - project.performancePenalty / 100))}</b></span><span>信頼性 <b data-project-reliability>${pct(project.metrics.reliability - project.reliabilityPenalty)}</b></span><span>投資 <b>${founding ? '¥0' : yen.format(project.spent)}</b></span></div>${project.stage !== 'ready' ? `<label class="inline-select"><span>責任者</span><select data-project-lead="${project.id}">${staffOptions(state, project.leadStaffId)}</select></label><p class="team-impact" data-project-team="${project.id}"></p>` : ''}${openIssues.map((issue) => `<section class="issue-line ${issue.severity}"><div><b>${esc(issue.title)}</b><p>${esc(issue.description)}</p></div><div class="action-row"><button data-action="resolve-issue" data-project="${project.id}" data-issue="${issue.id}" data-choice="fix">根本修正 ${founding ? '¥0' : yen.format(issue.fixCost)}</button><button data-action="resolve-issue" data-project="${project.id}" data-issue="${issue.id}" data-choice="workaround">回避策</button><button class="action-danger" data-action="resolve-issue" data-project="${project.id}" data-issue="${issue.id}" data-choice="ignore">無視</button></div></section>`).join('')}<footer class="action-row"><button data-action="toggle-project" data-id="${project.id}">${project.paused ? '開発再開' : '一時停止'}</button>${project.stage === 'ready' ? `<button class="action-primary" data-action="prepare-launch" data-id="${project.id}">${launchOpen ? '発売設定を閉じる' : 'SKUを発売'}</button>` : ''}</footer>${launchOpen ? renderLaunch(state, project.id, model) : ''}</article>`;
}

export function renderDevelopment(state: GameState, model: InterfaceModel): string {
  const selected = state.series.find((series) => series.id === state.selectedSeriesId) ?? state.series[0];
  return `<section class="view view-development"><header class="view-head"><div><span class="eyebrow">PRODUCT ROADMAP</span><h2>開発</h2></div><p>設計値よりも、誰を雇い誰を責任者にするかが結果へ強く影響します。</p></header><div class="development-layout">${renderSeriesRail(state, model)}<main class="development-main">${selected ? `<div class="series-heading"><div><span>${selected.category.toUpperCase()} · ${esc(focusLabel(selected.focus))}</span><h2>${esc(selected.name)}</h2></div><b>累計 ${selected.lifetimeUnits.toLocaleString()}台</b></div>${renderDraft(state, selected, model)}` : '<section class="empty-state">シリーズを作成してください。</section>'}</main></div><section class="project-stack"><div class="section-label"><span>ACTIVE PROJECTS</span><b>${state.projects.length}</b></div>${state.projects.length ? state.projects.map((project) => renderProject(state, project.id, model)).join('') : '<section class="empty-state">進行中のプロジェクトはありません。</section>'}</section></section>`;
}
