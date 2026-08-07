export type ToastTone = 'good' | 'warning' | 'bad' | 'info';

interface ToastOptions {
  id?: string;
  title?: string;
  message: string;
  tone?: ToastTone;
  duration?: number;
}

interface ToastRecord {
  key: string;
  node: HTMLElement;
  count: number;
  duration: number;
  remaining: number;
  startedAt: number;
  timer: number | null;
}

const titleFor = (tone: ToastTone): string => tone === 'good' ? '完了' : tone === 'bad' ? '実行できません' : tone === 'warning' ? '注意' : '更新';
const markFor = (tone: ToastTone): string => tone === 'good' ? '✓' : tone === 'bad' ? '×' : tone === 'warning' ? '!' : '•';

export class ToastCenter {
  private readonly host: HTMLElement;
  private readonly records = new Map<string, ToastRecord>();

  constructor(parent: HTMLElement) {
    this.host = document.createElement('section');
    this.host.className = 'toast-center';
    this.host.setAttribute('aria-live', 'polite');
    this.host.setAttribute('aria-label', '通知');
    parent.append(this.host);
  }

  push(options: ToastOptions): void {
    const tone = options.tone ?? 'info';
    const key = options.id ?? `${tone}:${options.title ?? ''}:${options.message}`;
    const existing = this.records.get(key);
    if (existing) {
      existing.count += 1;
      const count = existing.node.querySelector<HTMLElement>('[data-toast-count]');
      if (count) count.textContent = `×${existing.count}`;
      this.restart(existing, options.duration ?? existing.duration);
      existing.node.classList.remove('toast-bump');
      requestAnimationFrame(() => existing.node.classList.add('toast-bump'));
      return;
    }

    while (this.records.size >= 4) {
      const oldest = this.records.values().next().value as ToastRecord | undefined;
      if (!oldest) break;
      this.remove(oldest);
    }

    const duration = options.duration ?? (tone === 'bad' ? 6500 : tone === 'warning' ? 5600 : 4400);
    const node = document.createElement('article');
    node.className = `toast-item tone-${tone}`;
    node.innerHTML = `<span class="toast-mark">${markFor(tone)}</span><div class="toast-copy"><span class="toast-title"></span><p></p></div><span class="toast-count" data-toast-count></span><button type="button" class="toast-close" aria-label="閉じる">×</button><i class="toast-progress"></i>`;
    const title = node.querySelector<HTMLElement>('.toast-title');
    const message = node.querySelector<HTMLElement>('p');
    if (title) title.textContent = options.title ?? titleFor(tone);
    if (message) message.textContent = options.message;

    const record: ToastRecord = { key, node, count: 1, duration, remaining: duration, startedAt: performance.now(), timer: null };
    this.records.set(key, record);
    this.host.append(node);
    node.querySelector('button')?.addEventListener('click', () => this.remove(record));
    node.addEventListener('mouseenter', () => this.pause(record));
    node.addEventListener('mouseleave', () => this.resume(record));
    requestAnimationFrame(() => node.classList.add('is-visible'));
    this.restart(record, duration);
  }

  private restart(record: ToastRecord, duration: number): void {
    if (record.timer !== null) window.clearTimeout(record.timer);
    record.duration = duration;
    record.remaining = duration;
    record.startedAt = performance.now();
    record.node.style.setProperty('--toast-duration', `${duration}ms`);
    record.node.classList.remove('is-paused');
    const progress = record.node.querySelector<HTMLElement>('.toast-progress');
    if (progress) {
      progress.style.animation = 'none';
      void progress.offsetWidth;
      progress.style.animation = '';
    }
    record.timer = window.setTimeout(() => this.remove(record), duration);
  }

  private pause(record: ToastRecord): void {
    if (record.timer !== null) window.clearTimeout(record.timer);
    record.timer = null;
    record.remaining = Math.max(500, record.remaining - (performance.now() - record.startedAt));
    record.node.classList.add('is-paused');
  }

  private resume(record: ToastRecord): void {
    if (record.timer !== null) return;
    record.startedAt = performance.now();
    record.node.classList.remove('is-paused');
    record.timer = window.setTimeout(() => this.remove(record), record.remaining);
  }

  private remove(record: ToastRecord): void {
    if (!this.records.has(record.key)) return;
    if (record.timer !== null) window.clearTimeout(record.timer);
    this.records.delete(record.key);
    record.node.classList.remove('is-visible');
    window.setTimeout(() => record.node.remove(), 180);
  }
}
