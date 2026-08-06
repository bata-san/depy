import {
  createSaveSlot,
  deleteSaveSlot,
  exportSaveSlot,
  importSaveSlot,
  listSaveSlots,
  loadSaveSlot,
  migrateLegacySave,
  renameSaveSlot,
  saveActiveState,
  type SaveSlotMetadata,
} from './save-manager';
import type { GameState } from './types';

const yen = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 });
const esc = (value: unknown): string => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] ?? character));

interface SaveScreenOptions {
  currentState?: GameState;
  createState: () => GameState;
  allowClose?: boolean;
}

function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function slotCard(slot: SaveSlotMetadata): string {
  return `<article class="save-slot" data-slot="${slot.id}">
    <div class="save-slot-preview"><span>PF</span><i></i></div>
    <div class="save-slot-copy"><small>${slot.year}年 ${slot.week}週 · ${yen.format(slot.cash)}</small><h2>${esc(slot.name)}</h2><p>${esc(slot.companyName)} · 更新 ${new Date(slot.updatedAt).toLocaleString('ja-JP')}</p></div>
    <div class="save-slot-actions"><button class="primary" data-save-action="load" data-id="${slot.id}">続きから</button><button data-save-action="rename" data-id="${slot.id}">名前変更</button><button data-save-action="export" data-id="${slot.id}">書き出し</button><button class="danger-text" data-save-action="delete" data-id="${slot.id}">削除</button></div>
  </article>`;
}

export function openSaveScreen(options: SaveScreenOptions): Promise<GameState | null> {
  migrateLegacySave();
  if (options.currentState) saveActiveState(options.currentState);
  return new Promise((resolve) => {
    const overlay = document.createElement('section');
    overlay.className = 'save-manager-overlay';
    overlay.innerHTML = `<div class="save-manager-window voxel-panel">
      <header><div><small>PC FRONTIER LAB</small><h1>セーブデータマネージャー</h1><p>会社を選択してゲームを開始します。データはブラウザ内へ保存されます。</p></div>${options.allowClose ? '<button class="save-close" data-save-action="close" aria-label="閉じる">×</button>' : ''}</header>
      <div class="save-manager-toolbar"><button class="primary large" data-save-action="new">＋ 新しい会社</button><button data-save-action="import">セーブを読み込む</button><input class="save-import-input" type="file" accept="application/json,.json" hidden></div>
      <div class="save-slot-list"></div>
      <footer><span>最大12スロット · 自動保存対応</span><span>書き出したJSONは別ブラウザでも読み込めます</span></footer>
    </div>`;
    document.body.append(overlay);
    const list = overlay.querySelector<HTMLElement>('.save-slot-list')!;
    const input = overlay.querySelector<HTMLInputElement>('.save-import-input')!;

    const refresh = (): void => {
      const slots = listSaveSlots();
      list.innerHTML = slots.length ? slots.map(slotCard).join('') : '<div class="save-empty"><b>セーブデータがありません</b><p>「新しい会社」からゲームを開始してください。</p></div>';
    };
    const finish = (state: GameState | null): void => {
      overlay.classList.add('closing');
      window.setTimeout(() => overlay.remove(), 220);
      resolve(state);
    };
    overlay.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-save-action]');
      if (!button) return;
      const action = button.dataset.saveAction;
      const id = button.dataset.id;
      if (action === 'close') finish(null);
      if (action === 'new') {
        const state = options.createState();
        const name = prompt('会社名を入力してください', state.companyName)?.trim();
        if (name) state.companyName = name.slice(0, 32);
        createSaveSlot(state, state.companyName);
        finish(state);
      }
      if (action === 'load' && id) {
        const state = loadSaveSlot(id);
        if (state) finish(state);
      }
      if (action === 'rename' && id) {
        const slot = listSaveSlots().find((item) => item.id === id);
        const name = prompt('セーブ名を入力してください', slot?.name ?? '')?.trim();
        if (name) { renameSaveSlot(id, name); refresh(); }
      }
      if (action === 'export' && id) {
        const text = exportSaveSlot(id);
        if (text) downloadText(`pc-frontier-lab-${id}.json`, text);
      }
      if (action === 'delete' && id && confirm('このセーブデータを削除しますか？元に戻せません。')) {
        deleteSaveSlot(id);
        refresh();
      }
      if (action === 'import') input.click();
    });
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const metadata = importSaveSlot(await file.text());
        const state = loadSaveSlot(metadata.id);
        if (state) finish(state);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'セーブデータを読み込めませんでした。');
      }
    });
    refresh();
    requestAnimationFrame(() => overlay.classList.add('visible'));
  });
}
