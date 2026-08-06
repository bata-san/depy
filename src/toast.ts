export type ToastTone = 'good' | 'warning' | 'bad' | 'info';

let container: HTMLElement | null = null;

function getContainer(): HTMLElement {
  if (container?.isConnected) return container;
  container = document.createElement('div');
  container.className = 'game-toast-stack';
  container.setAttribute('role', 'status');
  container.setAttribute('aria-live', 'polite');
  document.body.append(container);
  return container;
}

const iconFor = (tone: ToastTone): string => ({ good: '✓', warning: '!', bad: '×', info: 'i' })[tone];

export function showToast(message: string, tone: ToastTone = 'info', title?: string): void {
  const host = getContainer();
  while (host.children.length >= 3) host.firstElementChild?.remove();
  const toast = document.createElement('article');
  toast.className = `game-toast ${tone}`;
  toast.innerHTML = `
    <span class="game-toast-icon">${iconFor(tone)}</span>
    <div><strong>${title ?? (tone === 'good' ? '完了' : tone === 'bad' ? '実行できません' : tone === 'warning' ? '注意' : '更新')}</strong><p></p></div>
    <button type="button" aria-label="閉じる">×</button>
  `;
  const paragraph = toast.querySelector('p');
  if (paragraph) paragraph.textContent = message;
  toast.querySelector('button')?.addEventListener('click', () => toast.remove());
  host.append(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  const timeout = window.setTimeout(() => {
    toast.classList.remove('visible');
    window.setTimeout(() => toast.remove(), 260);
  }, tone === 'bad' ? 6200 : 4600);
  toast.addEventListener('mouseenter', () => window.clearTimeout(timeout), { once: true });
}
