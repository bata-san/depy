import './styles.css';
import { secondsPerWeek } from './game-clock';
import { createOfficeScene, type OfficeScene } from './office';
import { openSaveScreen } from './save-screen';
import { advanceRealtime, advanceWeek, createInitialState, normalizeState, saveState } from './simulation';
import type { GameState, PanelId } from './types';
import { GameUI } from './ui';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('#app was not found');

app.innerHTML = `
  <main class="app-shell" aria-label="PC Frontier Lab">
    <div id="office-canvas" class="office-canvas" aria-hidden="true"></div>
    <div id="office-hotspots" class="office-hotspots"></div>
    <div id="ui-root"></div>
  </main>
`;

const uiRootCandidate = document.querySelector<HTMLElement>('#ui-root');
const canvasHostCandidate = document.querySelector<HTMLElement>('#office-canvas');
const hotspotHostCandidate = document.querySelector<HTMLElement>('#office-hotspots');
if (!uiRootCandidate || !canvasHostCandidate || !hotspotHostCandidate) throw new Error('Application hosts were not created');
const uiRoot: HTMLElement = uiRootCandidate;
const canvasHost: HTMLElement = canvasHostCandidate;
const hotspotHost: HTMLElement = hotspotHostCandidate;

let state: GameState;
let office: OfficeScene;
let ui: GameUI;
let lastFrame = performance.now();
let weekAccumulator = 0;
let renderAccumulator = 0;
let saveAccumulator = 0;
let renderQueued = false;
let saveManagerOpen = false;

const projectProgress = (): number => {
  const active = state.projects.find((project) => project.stage !== 'ready' && !project.paused);
  return active?.progress ?? 0;
};

const activeProductGlow = (): number => {
  const active = state.products.filter((product) => product.status === 'selling');
  if (!active.length) return 0.12;
  return Math.min(1, active.reduce((sum, product) => sum + product.rating, 0) / active.length / 10);
};

const renderUI = (): void => {
  ui.setState(state);
  ui.render();
};

const scheduleRender = (): void => {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    renderUI();
  });
};

const openPanel = (panel: PanelId): void => {
  state.activePanel = panel;
  saveState(state);
  scheduleRender();
};

const openManager = async (): Promise<void> => {
  if (saveManagerOpen) return;
  saveManagerOpen = true;
  const previousSpeed = state.speed;
  state.speed = 0;
  saveState(state);
  scheduleRender();
  const replacement = await openSaveScreen({ currentState: state, createState: createInitialState, allowClose: true });
  if (replacement) {
    state = normalizeState(replacement);
    weekAccumulator = 0;
  } else {
    state.speed = previousSpeed;
  }
  saveManagerOpen = false;
  scheduleRender();
};

async function start(): Promise<void> {
  const selected = await openSaveScreen({ createState: createInitialState });
  state = normalizeState(selected ?? createInitialState());

  ui = new GameUI(uiRoot, state, {
    onStateChange: scheduleRender,
    onReset: (replacement) => {
      state = normalizeState(replacement);
      saveState(state);
      scheduleRender();
    },
    onOpenSaveManager: () => { void openManager(); },
    onResetCamera: () => office.resetCamera(),
  });

  office = createOfficeScene(canvasHost, hotspotHost, openPanel);
  renderUI();
  requestAnimationFrame(loop);

  const resizeObserver = new ResizeObserver(() => office.resize());
  resizeObserver.observe(canvasHost);
  window.addEventListener('beforeunload', () => saveState(state));
}

const loop = (now: number): void => {
  const deltaSeconds = Math.min(0.1, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;

  office.update(deltaSeconds, {
    activePanel: state.activePanel,
    projectProgress: projectProgress(),
    productGlow: activeProductGlow(),
    staffCount: state.staff.length,
    officeLevel: state.officeLevel,
    researchActive: Boolean(state.activeResearch && !state.activeResearch.paused),
    cashHealth: Math.max(0, Math.min(1, state.cash / 80_000_000)),
    timeSpeed: state.speed,
  });

  const realtimeChanged = advanceRealtime(state, deltaSeconds, state.speed);
  if (state.speed !== 0) {
    weekAccumulator += deltaSeconds;
    const threshold = secondsPerWeek(state.speed);
    if (weekAccumulator >= threshold) {
      weekAccumulator %= threshold;
      advanceWeek(state);
      app.classList.remove('week-tick');
      requestAnimationFrame(() => app.classList.add('week-tick'));
      window.setTimeout(() => app.classList.remove('week-tick'), 720);
      scheduleRender();
    }
  }

  renderAccumulator += deltaSeconds;
  if (realtimeChanged && renderAccumulator >= 0.75) {
    renderAccumulator = 0;
    const active = document.activeElement as HTMLElement | null;
    const editing = Boolean(active && uiRoot.contains(active) && (active.tagName === 'INPUT' || active.tagName === 'SELECT'));
    if (!editing) scheduleRender();
  }

  saveAccumulator += deltaSeconds;
  if (saveAccumulator >= 12) {
    saveAccumulator = 0;
    saveState(state);
  }
  requestAnimationFrame(loop);
};

void start();
