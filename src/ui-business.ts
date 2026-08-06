import { FACTORIES } from './data';
import { activeCompetitorModels, getFactoryDefinition } from './simulation';
import type { CompetitorCompany, GameState, ReleasedProduct } from './types';
import { badge, bar, esc, moneyTone, num, pct, yen } from './ui-format';

function reviewRows(product: ReleasedProduct): string {
  const labels: Record<string, string> = { performance: '性能', value: '価格性能', efficiency: '効率・静音', reliability: '信頼性', software: 'ソフトウェア' };
  return Object.entries(product.review).map(([key, value]) => `<div class="review-row"><span>${labels[key]}</span>${bar(value, 10, value >= 7 ? 'good' : value < 5.5 ? 'bad' : '')}<b>${value.toFixed(1)}</b></div>`).join('');
}

function sparkline(product: ReleasedProduct): string {
  const points = [...product.history].reverse().slice(-16); if (points.length < 2) return '<div class="spark-empty">販売データ待ち</div>';
  const max = Math.max(...points.map((point) => point.demand), 1); const path = points.map((point, index) => `${index ? 'L' : 'M'}${index / (points.length - 1) * 100},${38 - point.sold / max * 34}`).join(' '); const demand = points.map((point, index) => `${index ? 'L' : 'M'}${index / (points.length - 1) * 100},${38 - point.demand / max * 34}`).join(' ');
  return `<svg class="spark" viewBox="0 0 100 40" preserveAspectRatio="none"><path class="demand" d="${demand}"/><path class="sales" d="${path}"/></svg>`;
}

function allocationEditor(state: GameState, product: ReleasedProduct): string {
  const contracts = state.contracts.filter((contract) => contract.active);
  return `<div class="allocation-editor"><h4>生産割り当て</h4>${contracts.map((contract) => { const factory = getFactoryDefinition(contract); const value = product.factoryAllocations.find((allocation) => allocation.contractId === contract.id)?.allocation ?? 0; return `<label><span><b>${esc(factory?.name ?? '工場')}</b><small>${contract.setupRemaining ? `立上げ残り${contract.setupRemaining}週` : `上限 ${contract.committedCapacity.toLocaleString()}個/週`}</small></span><input type="number" min="0" max="${contract.committedCapacity}" step="50" value="${value}" data-product-allocation="${product.id}" data-contract="${contract.id}"></label>`; }).join('') || '<p>契約中の工場がありません。</p>'}</div>`;
}

function productCard(state: GameState, product: ReleasedProduct): string {
  const lost = Math.max(0, product.weeklyDemand - product.weeklySales); const supplyRate = product.weeklyDemand ? product.weeklyProduced / product.weeklyDemand * 100 : 100; const margin = product.price - product.unitCost; const inventoryCash = product.inventory * product.unitCost;
  const action = lost > product.weeklySales * .2 ? '工場を追加・増枠してください' : product.review.value < 5.5 ? '値下げか上位評価の改善が必要です' : product.inventory > product.weeklySales * 4 ? '生産を減らすか販促を行ってください' : product.review.software < 6.2 ? '更新プログラムで評価を改善できます' : '販売状態は安定しています';
  return `<article class="product-card card ${product.status}"><header><div>${badge(product.status === 'selling' ? '販売中' : product.status === 'eol' ? '終売' : '発売準備', product.status === 'selling' ? 'good' : '')}<h3>${esc(product.name)}</h3><p>${product.category.toUpperCase()} · 第${product.generation}世代 · ${esc(product.audience[0]?.name ?? '')}</p></div><div class="rating"><b>${product.rating.toFixed(1)}</b><small>/10</small></div></header>
    <div class="sales-hero"><div><small>今週販売</small><b>${product.weeklySales.toLocaleString()}</b><span>需要 ${product.weeklyDemand.toLocaleString()}</span></div><div><small>生産</small><b>${product.weeklyProduced.toLocaleString()}</b><span>供給率 ${pct(supplyRate)}</span></div><div class="${lost > 0 ? 'bad' : ''}"><small>機会損失</small><b>${lost.toLocaleString()}</b><span>累計 ${product.lifetimeLostSales.toLocaleString()}</span></div><div class="${moneyTone(product.weeklyProfit)}"><small>今週利益</small><b>${yen.format(product.weeklyProfit)}</b><span>1個粗利 ${yen.format(margin)}</span></div></div>
    ${sparkline(product)}
    <div class="product-columns"><div><h4>評価内訳</h4>${reviewRows(product)}</div><div><h4>売れる・失速する理由</h4><ul class="reason good">${product.reasons.positive.map((reason) => `<li>${esc(reason)}</li>`).join('')}</ul><ul class="reason bad">${product.reasons.negative.map((reason) => `<li>${esc(reason)}</li>`).join('')}</ul></div></div>
    <div class="next-action"><b>次の判断</b><span>${esc(action)}</span></div>
    <dl class="cost-list"><div><dt>価格</dt><dd>${yen.format(product.price)}</dd></div><div><dt>原価</dt><dd>${yen.format(product.unitCost)}</dd></div><div><dt>在庫</dt><dd>${product.inventory.toLocaleString()}個</dd></div><div><dt>在庫資金</dt><dd>${yen.format(inventoryCash)}</dd></div><div><dt>自動終売</dt><dd>${product.endOfLifeAt.year}年${product.endOfLifeAt.week}週</dd></div></dl>
    ${product.status !== 'eol' ? `<div class="product-actions"><label>価格<input type="number" value="${product.price}" step="1000" data-product-price="${product.id}"></label><button data-action="product-update" data-id="${product.id}">BIOS/ドライバー更新</button><button data-action="product-support" data-id="${product.id}">保証・サポート強化</button><button data-action="product-marketing" data-id="${product.id}">販促 300万円</button><button class="danger-text" data-action="product-eol" data-id="${product.id}">今すぐ終売</button></div>${allocationEditor(state, product)}` : ''}
  </article>`;
}

export function renderProducts(state: GameState): string {
  const selling = state.products.filter((product) => product.status !== 'eol'); const eol = state.products.filter((product) => product.status === 'eol');
  const demand = selling.reduce((sum, product) => sum + product.weeklyDemand, 0); const produced = selling.reduce((sum, product) => sum + product.weeklyProduced, 0); const sold = selling.reduce((sum, product) => sum + product.weeklySales, 0); const profit = selling.reduce((sum, product) => sum + product.weeklyProfit, 0);
  return `<div class="panel-section"><header class="section-head"><div><small>PRODUCT PERFORMANCE</small><h2>商品評価と売れ行き</h2><p>需要・供給・販売・利益を同じ画面で比較できます。</p></div></header><div class="summary-strip"><div><small>総需要</small><b>${demand.toLocaleString()}</b></div><div><small>総生産</small><b>${produced.toLocaleString()}</b></div><div><small>総販売</small><b>${sold.toLocaleString()}</b></div><div class="${moneyTone(profit)}"><small>製品利益</small><b>${yen.format(profit)}</b></div></div>
  <div class="product-list">${selling.length ? selling.map((product) => productCard(state, product)).join('') : '<div class="empty-card"><b>販売中の製品がありません</b><p>完成した世代設計からSKUを発売してください。</p></div>'}</div>${eol.length ? `<details><summary>終売製品 ${eol.length}件</summary>${eol.map((product) => productCard(state, product)).join('')}</details>` : ''}</div>`;
}

function contractCard(state: GameState, contractId: string): string {
  const contract = state.contracts.find((item) => item.id === contractId); if (!contract) return ''; const factory = getFactoryDefinition(contract); if (!factory) return '';
  const allocated = state.products.reduce((sum, product) => sum + (product.factoryAllocations.find((item) => item.contractId === contract.id)?.allocation ?? 0), 0);
  return `<article class="factory-card card"><header><div>${badge(contract.setupRemaining ? '立上げ中' : '稼働中', contract.setupRemaining ? 'warning' : 'good')}<h3>${esc(factory.name)}</h3><p>${esc(factory.country)} · ${factory.nodeClass}nm級 · ${esc(factory.description)}</p></div><b>${contract.committedCapacity.toLocaleString()} /週</b></header><div class="metric-quad"><div><small>品質</small><b>${factory.quality}</b>${bar(factory.quality)}</div><div><small>信頼性</small><b>${factory.reliability}</b>${bar(factory.reliability)}</div><div><small>割当済み</small><b>${allocated}</b>${bar(allocated, contract.committedCapacity, allocated > contract.committedCapacity ? 'bad' : '')}</div><div><small>最低期間</small><b>${contract.remainingWeeks}週</b></div></div><footer><label>契約枠<input type="number" min="100" max="${factory.weeklyCapacity}" step="50" value="${contract.committedCapacity}" data-contract-capacity="${contract.id}"></label><button class="danger-text" data-action="cancel-contract" data-id="${contract.id}">解約</button></footer></article>`;
}

export function renderFactories(state: GameState): string {
  const active = state.contracts.filter((contract) => contract.active); const total = active.reduce((sum, contract) => sum + (contract.setupRemaining ? 0 : contract.committedCapacity), 0); const allocated = state.products.filter((product) => product.status === 'selling').reduce((sum, product) => sum + product.factoryAllocations.reduce((inner, allocation) => inner + allocation.allocation, 0), 0);
  return `<div class="panel-section"><header class="section-head"><div><small>MANUFACTURING NETWORK</small><h2>複数工場と供給能力</h2><p>製品ごとに複数工場を割り当て、需要に合わせて増設します。</p></div></header><div class="summary-strip"><div><small>稼働契約</small><b>${active.length}</b></div><div><small>総週産枠</small><b>${total.toLocaleString()}</b></div><div><small>製品割当</small><b>${allocated.toLocaleString()}</b></div><div><small>余力</small><b>${Math.max(0, total - allocated).toLocaleString()}</b></div></div>
    <h3>契約中</h3><div class="factory-list">${active.map((contract) => contractCard(state, contract.id)).join('')}</div><h3>契約候補</h3><div class="factory-market">${FACTORIES.filter((factory) => factory.unlockYear <= state.date.year && !active.some((contract) => contract.factoryId === factory.id)).map((factory) => `<article class="card"><header><div><h3>${esc(factory.name)}</h3><p>${esc(factory.country)} · ${factory.nodeClass}nm級</p></div>${badge(`${factory.weeklyCapacity.toLocaleString()}個/週`)}</header><p>${esc(factory.description)}</p><div class="mini-metrics"><span>品質 <b>${factory.quality}</b></span><span>信頼性 <b>${factory.reliability}</b></span><span>契約金 <b>${yen.format(factory.signupFee)}</b></span><span>立上げ <b>${factory.setupWeeks}週</b></span></div><button class="primary" data-action="contract-factory" data-id="${factory.id}">週${Math.min(1000, factory.weeklyCapacity).toLocaleString()}個で契約</button></article>`).join('') || '<div class="empty-card">現在契約可能な新工場はありません。</div>'}</div></div>`;
}

function companyCard(company: CompetitorCompany): string {
  const status = company.status === 'active' ? '活動中' : company.status === 'struggling' ? '資金難' : company.status === 'acquired' ? '買収済み' : '撤退';
  return `<article class="competitor-card card ${company.status}"><header><div>${badge(company.real ? '実在企業' : '架空企業', company.real ? '' : 'accent')}<h3>${esc(company.name)}</h3><p>${status} · 戦略 ${esc(company.strategy)}</p></div><b>${pct(company.marketShare * 100)}</b></header><div class="mini-metrics"><span>技術 <b>${num.format(company.technology)}</b></span><span>ブランド <b>${num.format(company.brand)}</b></span><span>勢い <b>${num.format(company.momentum)}</b></span><span>資金 <b>${yen.format(company.cash)}</b></span></div><div class="rival-models">${company.models.slice(-3).reverse().map((model) => `<div><b>${esc(model.name)}</b><small>${model.category.toUpperCase()} · 性能 ${num.format(model.performance)} · ${yen.format(model.price)} ${model.fictional ? '· 非公式予測' : ''}</small></div>`).join('') || '<small>現行モデルなし</small>'}</div></article>`;
}

export function renderCompetitors(state: GameState): string {
  const current = activeCompetitorModels(state).sort((a, b) => b.performance - a.performance).slice(0, 8);
  return `<div class="panel-section"><header class="section-head"><div><small>COMPETITIVE LANDSCAPE</small><h2>競合企業とモデル</h2><p>Intel・AMD・NVIDIAは未来でも主要勢力として残り、架空企業は台頭・買収・撤退します。</p></div></header><div class="market-headline card"><b>${esc(state.market.headline)}</b><span>次の市場変化まで約${state.market.weeksRemaining}週</span></div><h3>性能上位モデル</h3><div class="rival-table">${current.map((model, index) => `<div><b>${index + 1}</b><span>${esc(model.name)}</span><small>${model.category.toUpperCase()}</small><strong>${num.format(model.performance)}</strong><em>${yen.format(model.price)}</em></div>`).join('')}</div><h3>企業</h3><div class="competitor-list">${state.competitors.map(companyCard).join('')}</div></div>`;
}
