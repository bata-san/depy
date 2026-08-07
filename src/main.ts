import './styles.css';
import { createOfficeScene, type OfficeScene } from './office';
import { openSaveScreen } from './save-screen';
import { advanceRealtime, advanceWeek, createInitialState, normalizeState, saveState } from './simulation';
import type { GameState, PanelId } from './types';
import { InterfaceController } from './interface/controller';

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`${selector} was not found`);
  return element;
}

const app = requireElement<HTMLElement>('#app');
app.innerHTML = `<main class="app-shell" aria-label="PC Frontier Lab"><div id="office-canvas" class="office-canvas" aria-hidden="true"></div><div id="office-hotspots" class="office-hotspots"></div><div id="ui-root"></div></main>`;

const uiRoot = requireElement<HTMLElement>('#ui-root');
const canvasHost = requireElement<HTMLElement>('#office-canvas');
const hotspotHost = requireElement<HTMLElement>('#office-hotspots');

let state: GameState;
let office: OfficeScene;
let ui: InterfaceController;
let lastTick = performance.now();
let technologyAccumulator = 0;
let uiAccumulator = 0;
let saveAccumulator = 0;
let saveManagerOpen = false;
let lastBusinessWeek = -1;
let runtimeStructure = '';
let gameTimer = 0;
const secondsPerTechnologyWeek = 30 * 60 / 52;

const projectProgress = (): number => state.projects.find((project) => project.stage !== 'ready' && !project.paused)?.progress ?? 0;
const activeProductGlow = (): number => {
  const active = state.products.filter((product) => product.status === 'selling');
  return active.length ? Math.min(1, active.reduce((sum, product) => sum + product.rating, 0) / active.length / 10) : .12;
};

const runtimeStructureKey = (): string => {
  const projects = state.projects.map((project) => `${project.id}:${project.stage}:${project.paused}:${project.issues.filter((issue) => issue.status === 'open').length}`).join('|');
  const research = state.activeResearch ? `${state.activeResearch.area}:${state.activeResearch.paused}` : 'none';
  return `${projects}#${research}#${state.activeEvent?.id ?? 'none'}`;
};

const pulseBusinessWeek = (): void => {
  if (lastBusinessWeek === state.absoluteWeek) return;
  lastBusinessWeek = state.absoluteWeek;
  uiRoot.classList.remove('business-tick');
  requestAnimationFrame(() => uiRoot.classList.add('business-tick'));
  window.setTimeout(() => uiRoot.classList.remove('business-tick'), 320);
};

const openPanel = (panel: PanelId): void => ui.openPanel(panel);

const openManager = async (): Promise<void> => {
  if (saveManagerOpen) return;
  saveManagerOpen = true;
  state.speed = 0;
  saveState(state);
  const replacement = await openSaveScreen({ currentState: state, createState: createInitialState, allowClose: true });
  if (replacement) {
    state = normalizeState(replacement);
    technologyAccumulator = 0;
    lastBusinessWeek = state.absoluteWeek;
    runtimeStructure = runtimeStructureKey();
    ui.setState(state);
  }
  state.speed = 1;
  saveManagerOpen = false;
  lastTick = performance.now();
  ui.sync(state, true);
};

const gameTick = (): void => {
  const now = performance.now();
  const deltaSeconds = Math.min(.12, Math.max(0, (now - lastTick) / 1000));
  lastTick = now;

  office.update(deltaSeconds, {
    activePanel: state.activePanel,
    projectProgress: projectProgress(),
    productGlow: activeProductGlow(),
    staffCount: Math.min(30, state.staff.length),
    staff: state.staff.slice(0, 30).map((member) => ({
      id: member.id,
      name: member.name,
      role: member.role,
      specialty: member.specialty,
      traits: member.traits,
      level: member.level,
      skill: member.skill,
      creativity: member.creativity,
      discipline: member.discipline,
      growth: member.growth,
      morale: member.morale,
      fatigue: member.fatigue,
      loyalty: member.loyalty,
    })),
    officeLevel: state.officeLevel,
    researchActive: Boolean(state.activeResearch && !state.activeResearch.paused),
    cashHealth: Math.max(0, Math.min(1, state.cash / 80_000_000)),
    timeSpeed: saveManagerOpen ? 0 : 1,
  });

  const beforeWeek = state.absoluteWeek;
  const changed = saveManagerOpen ? false : advanceRealtime(state, deltaSeconds, 1);

  if (!saveManagerOpen) {
    technologyAccumulator += deltaSeconds;
    if (technologyAccumulator >= secondsPerTechnologyWeek) {
      technologyAccumulator %= secondsPerTechnologyWeek;
      advanceWeek(state);
      ui.sync(state);
      runtimeStructure = runtimeStructureKey();
    }
  }

  if (state.absoluteWeek !== beforeWeek) {
    pulseBusinessWeek();
    ui.sync(state);
    runtimeStructure = runtimeStructureKey();
    uiAccumulator = 0;
  } else if (changed) {
    uiAccumulator += deltaSeconds;
    if (uiAccumulator >= .25) {
      uiAccumulator = 0;
      const nextStructure = runtimeStructureKey();
      if (nextStructure !== runtimeStructure) {
        runtimeStructure = nextStructure;
        ui.sync(state);
      } else {
        ui.live(state);
      }
    }
  }

  saveAccumulator += deltaSeconds;
  if (saveAccumulator >= 12) {
    saveAccumulator = 0;
    saveState(state);
  }
};

async function start(): Promise<void> {
  const selected = await openSaveScreen({ createState: createInitialState });
  state = normalizeState(selected ?? createInitialState());
  state.speed = 1;
  lastBusinessWeek = state.absoluteWeek;
  runtimeStructure = runtimeStructureKey();

  ui = new InterfaceController(uiRoot, state, {
    onReset: (replacement) => {
      state = normalizeState(replacement);
      state.speed = 1;
      lastBusinessWeek = state.absoluteWeek;
      runtimeStructure = runtimeStructureKey();
      saveState(state);
      ui.setState(state);
      ui.sync(state, true);
    },
    onOpenSaveManager: () => { void openManager(); },
    onResetCamera: () => office.resetCamera(),
  });

  office = createOfficeScene(canvasHost, hotspotHost, openPanel);
  lastTick = performance.now();
  gameTimer = window.setInterval(gameTick, 50);
  const resizeObserver = new ResizeObserver(() => office.resize());
  resizeObserver.observe(canvasHost);
  window.addEventListener('beforeunload', () => {
    window.clearInterval(gameTimer);
    saveState(state);
  });
}

void start();
