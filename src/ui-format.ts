import type { GameState, PanelId } from './types';

export const yen = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 });
export const num = new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 1 });
export const esc = (value: unknown): string => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] ?? character));
export const pct = (value: number): string => `${Math.round(value)}%`;
export const bar = (value: number, max = 100, tone = ''): string => `<span class="meter ${tone}"><i style="width:${Math.max(0, Math.min(100, value / max * 100))}%"></i></span>`;
export const badge = (text: string, tone = ''): string => `<span class="badge ${tone}">${esc(text)}</span>`;
export const moneyTone = (value: number): string => value >= 0 ? 'good' : 'bad';
export const panelName: Record<PanelId, string> = { home: 'オフィス', development: '世代開発', products: '製品・売上', factories: '工場・供給', competitors: '競合市場', research: '研究', company: '会社経営' };
export const dateText = (state: GameState): string => `${state.date.year}年 ${state.date.week}週`;
