import type { GameState, ProjectStage } from './types';

const stages: Record<ProjectStage, string> = {
  concept: '企画', architecture: '詳細設計', tapeout: 'テープアウト', prototype: '試作', validation: '検証', ready: '完成',
};

const setText = (element: Element | null, value: string): void => {
  if (element && element.textContent !== value) element.textContent = value;
};

const setMeter = (element: Element | null, value: number): void => {
  if (element instanceof HTMLElement) {
    const width = `${Math.max(0, Math.min(100, value))}%`;
    if (element.style.width !== width) element.style.width = width;
  }
};

export function updateRealtimeUI(root: HTMLElement, state: GameState): void {
  const activeProject = state.projects.find((project) => project.stage !== 'ready' && !project.paused);
  const activeProduct = state.products.find((product) => product.status === 'selling');
  const hud = root.querySelector('.progress-stat');
  if (hud) {
    setText(hud.querySelector('small'), activeProject ? 'DEVELOPMENT' : activeProduct ? 'SALES' : 'STATUS');
    setText(hud.querySelector('b'), activeProject ? `${Math.round(activeProject.progress)}%` : activeProduct ? `${activeProduct.weeklySales.toLocaleString()}台` : '準備中');
    setText(hud.querySelector('span'), activeProject?.codeName ?? activeProduct?.name ?? '最初の世代を開発');
  }

  const cards = root.querySelectorAll<HTMLElement>('.project-card');
  cards.forEach((card, index) => {
    const project = state.projects[index];
    if (!project) return;
    setText(card.querySelector('.project-percent'), `${Math.round(project.progress)}%`);
    setText(card.querySelector('header .badge'), stages[project.stage]);
    setMeter(card.querySelector('.meter i'), project.progress);
  });

  const research = state.activeResearch;
  const activeResearchCard = root.querySelector<HTMLElement>('.research-card.active');
  if (research && activeResearchCard) {
    setText(activeResearchCard.querySelector('.research-progress b'), `${Math.round(research.progress)}%`);
    setMeter(activeResearchCard.querySelector('.research-progress .meter i'), research.progress);
  }
}

export function realtimeStructureKey(state: GameState): string {
  const projects = state.projects.map((project) => `${project.id}:ready=${project.stage === 'ready'}:paused=${project.paused}:issues=${project.issues.filter((issue) => issue.status === 'open').length}`).join('|');
  const research = state.activeResearch ? `${state.activeResearch.area}:${state.activeResearch.paused}` : 'none';
  const event = state.activeEvent?.id ?? 'none';
  return `${projects}#research:${research}#products:${state.products.length}#event:${event}#notices:${state.notifications.length}`;
}
