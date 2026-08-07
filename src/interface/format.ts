export const yen = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 });
export const num = new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 1 });

export const esc = (value: unknown): string => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

export const pct = (value: number): string => `${Math.round(value)}%`;

export function meter(value: number, max = 100, tone = ''): string {
  const width = Math.max(0, Math.min(100, max ? value / max * 100 : 0));
  return `<span class="ui-meter ${tone}"><i style="width:${width}%"></i></span>`;
}

export function toneForNumber(value: number): string {
  return value > 0 ? 'is-good' : value < 0 ? 'is-bad' : '';
}
