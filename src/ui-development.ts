import { SERIES_FOCUS_DESCRIPTIONS, SERIES_FOCUS_LABELS } from './data';
import { availableNodes, availablePackages, calculateMetrics, designCaps, focusLabel, inferAudience } from './simulation';
import type { GameState, PackageType, ProductSeries, ProjectStage } from './types';
import type { UIModel } from './ui-model';
import { badge, bar, esc, num, pct, yen } from './ui-format';

const stages: Record<ProjectStage, string> = { concept: '企画', architecture: '詳細設計', tapeout: 'テープアウト', prototype: '試作', validation: '検証', ready: '完成' };
const packageLabel: Record<PackageType, string> = { monolithic: 'モノリシック', chiplet: 'チップレット', stacked: '3D積層' };

function seriesList(state: GameState): string {
  return state.series.map((series) => `<button class="series-row ${state.selectedSeriesId === series.id ? 'selected' : ''}" data-action="select-series" data-id="${series.id}">
    <span>${series.category.toUpperCase()}</span><b>${esc(series.name)}</b><small>第${series.generation || 0}世代 · ブランド ${num.format(series.brand)}</small>
  </button>`).join('');
}

function designForm(state: GameState, series: ProductSeries, model: UIModel): string {
  const draft = model.draft; if (!draft || draft.seriesId !== series.id) return `<div class="empty-card"><b>次世代設計を作成</b><p>シリーズ思想を引き継ぎ、主要6項目だけを調整します。対象市場は設計結果から自動判定されます。</p><button class="primary" data-action="new-design">次世代を設計</button></div>`;
  const metrics = calculateMetrics(state, series, draft.values, draft.technology); const caps = designCaps(state, series); const audience = inferAudience(metrics, metrics.suggestedPrice, series);
  const controls: Array<[keyof typeof draft.values, string, number, number, number]> = [
    ['computeScale', series.category === 'cpu' ? 'コア・演算規模' : '演算ユニット規模', 10, caps.computeScale, 1],
    ['clockTarget', 'クロック目標', series.category === 'cpu' ? 2.2 : .8, caps.clockTarget, .05],
    ['architecture', 'アーキテクチャ投資', 10, caps.architecture, 1],
    ['cacheBandwidth', 'キャッシュ・帯域', 10, caps.cacheBandwidth, 1],
    ['powerBudget', '電力上限', series.category === 'cpu' ? 35 : 75, caps.powerBudget, 5],
    ['qualityFocus', '品質・歩留まり重視', 10, 100, 1],
  ];
  return `<section class="design-grid">
    <div class="design-controls card">
      <label>コードネーム<input data-design="codeName" value="${esc(draft.codeName)}" maxlength="28"></label>
      ${controls.map(([key, label, min, max, step]) => `<label class="slider"><span>${label}<b>${num.format(draft.values[key])}</b></span><input type="range" min="${min}" max="${max}" step="${step}" value="${draft.values[key]}" data-design-value="${key}"></label>`).join('')}
      <div class="form-grid"><label>プロセス<select data-tech="node">${availableNodes(state).map((node) => `<option value="${node}" ${node === draft.technology.node ? 'selected' : ''}>${node}nm</option>`).join('')}</select></label>
      <label>実装<select data-tech="packageType">${availablePackages(state).map((item) => `<option value="${item}" ${item === draft.technology.packageType ? 'selected' : ''}>${packageLabel[item]}</option>`).join('')}</select></label>
      <label>リスク<select data-tech="riskPosture"><option value="conservative" ${draft.technology.riskPosture === 'conservative' ? 'selected' : ''}>保守的</option><option value="balanced" ${draft.technology.riskPosture === 'balanced' ? 'selected' : ''}>標準</option><option value="aggressive" ${draft.technology.riskPosture === 'aggressive' ? 'selected' : ''}>攻める</option></select></label>
      <label>ソフト投資<input type="number" min="10" max="100" step="5" value="${draft.technology.softwareInvestment}" data-tech="softwareInvestment"></label></div>
      <button class="primary large" data-action="start-generation">開発開始 · ${yen.format(metrics.developmentCost * .28 + 2_200_000)}</button>
    </div>
    <div class="design-preview card"><header><div><small>自動推定市場</small><h3>${esc(audience[0]?.name ?? '未判定')}</h3></div>${badge(`${series.category.toUpperCase()} 第${series.generation + 1}世代`, 'accent')}</header>
      <div class="metric-quad"><div><small>性能</small><b>${num.format(metrics.performance)}</b>${bar(metrics.performance, 180, 'accent')}</div><div><small>効率</small><b>${num.format(metrics.efficiency)}</b>${bar(metrics.efficiency, 140, 'good')}</div><div><small>信頼性</small><b>${pct(metrics.reliability)}</b>${bar(metrics.reliability, 100)}</div><div><small>歩留まり</small><b>${pct(metrics.yieldRate)}</b>${bar(metrics.yieldRate, 100, metrics.yieldRate < 55 ? 'bad' : '')}</div></div>
      <dl class="cost-list"><div><dt>推奨価格</dt><dd>${yen.format(metrics.suggestedPrice)}</dd></div><div><dt>推定原価</dt><dd>${yen.format(metrics.unitCost)}</dd></div><div><dt>マスク費</dt><dd>${yen.format(metrics.maskCost)}</dd></div><div><dt>総開発規模</dt><dd>${yen.format(metrics.developmentCost + metrics.maskCost + metrics.prototypeCost + metrics.validationCost + metrics.softwareCost)}</dd></div></dl>
      <div class="audience-list">${audience.map((item, index) => `<div class="audience"><b>${index + 1}. ${esc(item.name)}</b><span>${num.format(item.score)}</span><small>${esc(item.reason)}</small></div>`).join('')}</div>
      <p class="bottleneck ${metrics.bottleneckSeverity > 30 ? 'warning' : ''}"><b>設計診断</b>${esc(metrics.bottleneck)}</p>
    </div>
  </section>`;
}

function projectCard(state: GameState, projectId: string, model: UIModel): string {
  const project = state.projects.find((item) => item.id === projectId); if (!project) return '';
  const series = state.series.find((item) => item.id === project.seriesId); const openIssues = project.issues.filter((issue) => issue.status === 'open');
  const launch = project.stage === 'ready' && model.launchProjectId === project.id;
  return `<article class="project-card card ${project.paused ? 'paused' : ''}"><header><div>${badge(stages[project.stage], project.stage === 'ready' ? 'good' : '')}<h3>${esc(project.codeName)}</h3><p>${esc(series?.name ?? '')} 第${project.generation}世代</p></div><div class="project-percent">${Math.round(project.progress)}%</div></header>${bar(project.progress, 100, 'accent')}
    <div class="mini-metrics"><span>性能 <b>${num.format(project.metrics.performance * (1 - project.performancePenalty / 100))}</b></span><span>信頼性 <b>${pct(project.metrics.reliability - project.reliabilityPenalty)}</b></span><span>投資 <b>${yen.format(project.spent)}</b></span><span>週次費 <b>${yen.format(project.weeklyBurn)}</b></span></div>
    ${openIssues.map((issue) => `<div class="issue ${issue.severity}"><b>${esc(issue.title)}</b><p>${esc(issue.description)}</p><div><button data-action="resolve-issue" data-project="${project.id}" data-issue="${issue.id}" data-choice="fix">根本修正 ${yen.format(issue.fixCost)}</button><button data-action="resolve-issue" data-project="${project.id}" data-issue="${issue.id}" data-choice="workaround">回避策</button><button class="danger-text" data-action="resolve-issue" data-project="${project.id}" data-issue="${issue.id}" data-choice="ignore">無視</button></div></div>`).join('')}
    <footer><button data-action="toggle-project" data-id="${project.id}">${project.paused ? '開発再開' : '一時停止'}</button>${project.stage === 'ready' ? `<button class="primary" data-action="prepare-launch" data-id="${project.id}">${launch ? '発売設定を閉じる' : 'SKUを発売'}</button>` : ''}</footer>
    ${launch ? launchForm(state, project.id, model) : ''}
  </article>`;
}

function launchForm(state: GameState, projectId: string, model: UIModel): string {
  const contracts = state.contracts.filter((contract) => contract.active);
  return `<div class="launch-form"><h4>発売・量産設定</h4><div class="form-grid"><label>SKU<select data-launch="sku"><option value="standard" ${model.launchSku === 'standard' ? 'selected' : ''}>標準</option><option value="flagship" ${model.launchSku === 'flagship' ? 'selected' : ''}>上位選別</option><option value="efficient" ${model.launchSku === 'efficient' ? 'selected' : ''}>省電力</option><option value="salvage" ${model.launchSku === 'salvage' ? 'selected' : ''}>歩留まり活用</option></select></label><label>価格<input type="number" data-launch="price" value="${model.launchPrice}" step="1000"></label><label>販売期間<input type="number" data-launch="life" value="${model.launchLife}" min="26" max="104">週</label><label>発売広告<input type="number" data-launch="marketing" value="${model.launchMarketing}" step="500000"></label></div>
  <div class="allocation-list">${contracts.map((contract) => `<label><span>${esc(state.contracts.find((item) => item.id === contract.id) ? '契約工場' : '')} ${contract.committedCapacity.toLocaleString()}個/週</span><input type="number" min="0" max="${contract.committedCapacity}" step="50" value="${Math.min(500, contract.committedCapacity)}" data-launch-allocation="${contract.id}"></label>`).join('') || '<p>利用可能な工場がありません。</p>'}</div><button class="primary large" data-action="launch-product" data-id="${projectId}">製品を発売</button></div>`;
}

export function renderDevelopment(state: GameState, model: UIModel): string {
  const selected = state.series.find((series) => series.id === state.selectedSeriesId) ?? state.series[0];
  return `<div class="panel-section"><header class="section-head"><div><small>PRODUCT ROADMAP</small><h2>シリーズと世代開発</h2><p>シリーズの思想を継承しながら、世代ごとに技術とSKUを更新します。</p></div></header>
    <section class="series-layout"><aside class="series-sidebar">${seriesList(state)}<div class="new-series card"><input placeholder="新シリーズ名" data-model="seriesName" value="${esc(model.seriesName)}"><div class="form-grid"><select data-model="seriesCategory"><option value="cpu" ${model.seriesCategory === 'cpu' ? 'selected' : ''}>CPU</option><option value="gpu" ${model.seriesCategory === 'gpu' ? 'selected' : ''}>GPU</option></select><select data-model="seriesFocus">${Object.entries(SERIES_FOCUS_LABELS).map(([id, label]) => `<option value="${id}" ${model.seriesFocus === id ? 'selected' : ''}>${label}</option>`).join('')}</select></div><small>${SERIES_FOCUS_DESCRIPTIONS[model.seriesFocus]}</small><button data-action="create-series">シリーズ作成</button></div></aside>
    <div class="series-main">${selected ? `<div class="series-title"><div><small>${selected.category.toUpperCase()} · ${focusLabel(selected.focus)}</small><h2>${esc(selected.name)}</h2></div>${badge(`累計 ${selected.lifetimeUnits.toLocaleString()}台`)}</div>${designForm(state, selected, model)}` : '<div class="empty-card">シリーズを作成してください。</div>'}</div></section>
    <section class="project-list"><h3>開発プロジェクト</h3>${state.projects.length ? state.projects.map((project) => projectCard(state, project.id, model)).join('') : '<div class="empty-card">進行中のプロジェクトはありません。</div>'}</section>
  </div>`;
}
