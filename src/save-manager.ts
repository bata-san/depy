import type { GameState } from './types';

const INDEX_KEY = 'pc-frontier-lab-save-index-v1';
const ACTIVE_SLOT_KEY = 'pc-frontier-lab-active-slot-v1';
const SLOT_PREFIX = 'pc-frontier-lab-save-v1:';
const LEGACY_KEYS = ['pc-frontier-lab-v4'];
const EXPORT_FORMAT = 'pc-frontier-lab-save';
const EXPORT_VERSION = 1;

export interface SaveSlotMetadata {
  id: string;
  name: string;
  companyName: string;
  year: number;
  week: number;
  cash: number;
  absoluteWeek: number;
  createdAt: string;
  updatedAt: string;
}

interface StoredSaveSlot {
  metadata: SaveSlotMetadata;
  state: GameState;
}

interface SaveIndex {
  version: 1;
  slots: SaveSlotMetadata[];
}

interface ExportEnvelope {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  slot: StoredSaveSlot;
}

const storageAvailable = (): boolean => typeof localStorage !== 'undefined';
const nowIso = (): string => new Date().toISOString();

const createId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `save-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

function readIndex(): SaveIndex {
  if (!storageAvailable()) return { version: 1, slots: [] };
  try {
    const parsed = JSON.parse(localStorage.getItem(INDEX_KEY) ?? 'null') as SaveIndex | null;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.slots)) return { version: 1, slots: [] };
    return parsed;
  } catch {
    return { version: 1, slots: [] };
  }
}

function writeIndex(index: SaveIndex): void {
  if (!storageAvailable()) return;
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

function metadataFor(state: GameState, id: string, name: string, createdAt: string, updatedAt = nowIso()): SaveSlotMetadata {
  return {
    id,
    name: name.trim() || state.companyName || 'セーブデータ',
    companyName: state.companyName,
    year: state.date.year,
    week: state.date.week,
    cash: state.cash,
    absoluteWeek: state.absoluteWeek,
    createdAt,
    updatedAt,
  };
}

function writeSlot(slot: StoredSaveSlot): void {
  if (!storageAvailable()) return;
  localStorage.setItem(`${SLOT_PREFIX}${slot.metadata.id}`, JSON.stringify(slot));
  const index = readIndex();
  const nextSlots = index.slots.filter((item) => item.id !== slot.metadata.id);
  nextSlots.unshift(slot.metadata);
  nextSlots.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  writeIndex({ version: 1, slots: nextSlots.slice(0, 12) });
}

function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<GameState>;
  return typeof state.version === 'number'
    && typeof state.companyName === 'string'
    && typeof state.cash === 'number'
    && typeof state.absoluteWeek === 'number'
    && Boolean(state.date && typeof state.date.year === 'number' && typeof state.date.week === 'number')
    && Array.isArray(state.series)
    && Array.isArray(state.staff);
}

export function listSaveSlots(): SaveSlotMetadata[] {
  return readIndex().slots.filter((metadata) => {
    if (!storageAvailable()) return true;
    return localStorage.getItem(`${SLOT_PREFIX}${metadata.id}`) !== null;
  });
}

export function getActiveSlotId(): string | null {
  if (!storageAvailable()) return null;
  return localStorage.getItem(ACTIVE_SLOT_KEY);
}

export function setActiveSlot(id: string | null): void {
  if (!storageAvailable()) return;
  if (id) localStorage.setItem(ACTIVE_SLOT_KEY, id);
  else localStorage.removeItem(ACTIVE_SLOT_KEY);
}

export function loadSaveSlot(id: string): GameState | null {
  if (!storageAvailable()) return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(`${SLOT_PREFIX}${id}`) ?? 'null') as StoredSaveSlot | null;
    if (!parsed || parsed.metadata.id !== id || !isGameState(parsed.state)) return null;
    setActiveSlot(id);
    return structuredClone(parsed.state);
  } catch {
    return null;
  }
}

export function loadActiveSave(): GameState | null {
  const activeId = getActiveSlotId();
  if (activeId) {
    const active = loadSaveSlot(activeId);
    if (active) return active;
  }
  const first = listSaveSlots()[0];
  return first ? loadSaveSlot(first.id) : null;
}

export function createSaveSlot(state: GameState, name?: string): SaveSlotMetadata {
  const id = createId();
  const createdAt = nowIso();
  const metadata = metadataFor(state, id, name ?? state.companyName, createdAt, createdAt);
  writeSlot({ metadata, state: structuredClone(state) });
  setActiveSlot(id);
  return metadata;
}

export function saveActiveState(state: GameState): SaveSlotMetadata {
  const activeId = getActiveSlotId();
  if (!activeId) return createSaveSlot(state, state.companyName);
  const existing = readStoredSlot(activeId);
  if (!existing) return createSaveSlot(state, state.companyName);
  const metadata = metadataFor(state, activeId, existing.metadata.name, existing.metadata.createdAt);
  writeSlot({ metadata, state: structuredClone(state) });
  return metadata;
}

export function overwriteSaveSlot(id: string, state: GameState): SaveSlotMetadata | null {
  const existing = readStoredSlot(id);
  if (!existing) return null;
  const metadata = metadataFor(state, id, existing.metadata.name, existing.metadata.createdAt);
  writeSlot({ metadata, state: structuredClone(state) });
  return metadata;
}

export function renameSaveSlot(id: string, name: string): SaveSlotMetadata | null {
  const existing = readStoredSlot(id);
  if (!existing) return null;
  existing.metadata.name = name.trim() || existing.metadata.name;
  existing.metadata.updatedAt = nowIso();
  writeSlot(existing);
  return existing.metadata;
}

export function deleteSaveSlot(id: string): boolean {
  if (!storageAvailable()) return false;
  localStorage.removeItem(`${SLOT_PREFIX}${id}`);
  const index = readIndex();
  writeIndex({ version: 1, slots: index.slots.filter((item) => item.id !== id) });
  if (getActiveSlotId() === id) setActiveSlot(null);
  return true;
}

export function exportSaveSlot(id: string): string | null {
  const slot = readStoredSlot(id);
  if (!slot) return null;
  const envelope: ExportEnvelope = { format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedAt: nowIso(), slot };
  return JSON.stringify(envelope, null, 2);
}

export function importSaveSlot(serialized: string): SaveSlotMetadata {
  const parsed = JSON.parse(serialized) as Partial<ExportEnvelope>;
  if (parsed.format !== EXPORT_FORMAT || parsed.version !== EXPORT_VERSION || !parsed.slot || !isGameState(parsed.slot.state)) {
    throw new Error('PC Frontier Labの有効なセーブデータではありません。');
  }
  const id = createId();
  const createdAt = nowIso();
  const importedName = `${parsed.slot.metadata?.name ?? parsed.slot.state.companyName}（読込）`;
  const metadata = metadataFor(parsed.slot.state, id, importedName, createdAt, createdAt);
  writeSlot({ metadata, state: structuredClone(parsed.slot.state) });
  setActiveSlot(id);
  return metadata;
}

export function migrateLegacySave(): SaveSlotMetadata | null {
  if (!storageAvailable() || listSaveSlots().length > 0) return null;
  for (const key of LEGACY_KEYS) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const state = JSON.parse(raw) as unknown;
      if (!isGameState(state)) continue;
      const metadata = createSaveSlot(state, `${state.companyName}（旧セーブ）`);
      localStorage.removeItem(key);
      return metadata;
    } catch {
      // Broken legacy data is ignored so the manager can still open.
    }
  }
  return null;
}

function readStoredSlot(id: string): StoredSaveSlot | null {
  if (!storageAvailable()) return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(`${SLOT_PREFIX}${id}`) ?? 'null') as StoredSaveSlot | null;
    return parsed && parsed.metadata?.id === id && isGameState(parsed.state) ? parsed : null;
  } catch {
    return null;
  }
}
