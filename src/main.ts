import './styles.css';
import { createOfficeScene, type OfficeScene } from './office';
import { advanceWeek, loadState, saveState } from './simulation';
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

const uiRoot = document.querySelector<HTMLElement>('#ui-root');
const canvasHost = document.querySelector<HTMLElement>('#office-canvas');
const hotspotHost = document.querySelector<HTMLElement>('#office-hotspots');
if (!uiRoot || !canvasHost || !hotspotHost) throw new Error('Application hosts were not created');

let state: GameState = loadState();
let office: OfficeScene;
let lastFrame = performance.now();
let weekAccumulator = 0;
let renderQueued = false;

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

const ui = new GameUI(uiRoot, state, {
  onStateChange: scheduleRender,
  onReset: (replacement) => {
    state = replacement;
    scheduleRender();
  },
});

office = createOfficeScene(canvasHost, hotspotHost, openPanel);
renderUI();

const secondsPerWeek = (speed: GameState['speed']): number => {
  if (speed === 0) return Number.POSITIVE_INFINITY;
  if (speed === 1) return 6;
  if (speed === 3) return 2.1;
  return 0.72;
};

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
  });

  if (state.speed !== 0) {
    weekAccumulator += deltaSeconds;
    const threshold = secondsPerWeek(state.speed);
    if (weekAccumulator >= threshold) {
      weekAccumulator %= threshold;
      advanceWeek(state);
      const active = document.activeElement as HTMLElement | null;
      const editing = Boolean(active && uiRoot.contains(active) && (active.tagName === 'INPUT' || active.tagName === 'SELECT'));
      if (!editing) renderUI();
    }
  } else {
    weekAccumulator = 0;
  }

  requestAnimationFrame(loop);
};
requestAnimationFrame(loop);

const resizeObserver = new ResizeObserver(() => office.resize());
resizeObserver.observe(canvasHost);
window.addEventListener('beforeunload', () => saveState(state));
