import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AmbientAnimationSystem } from './ambient-animations';
import { CameraController } from './camera-controller';
import { cityBackdrop } from './city-backdrop';
import { buildOfficeLayout } from './office-layout';
import { buildOfficeLifeDetails } from './office-life-details';
import { staffPresentAtHour, type StaffLifeInput } from './staff-life';
import type { StaffVisualState } from './character-animations';
import type { PanelId, StaffRole } from './types';

export type OfficeStaffVisual = StaffVisualState & StaffLifeInput;

export interface OfficeSnapshot {
  activePanel: PanelId;
  projectProgress: number;
  productGlow: number;
  staffCount: number;
  staff: OfficeStaffVisual[];
  officeLevel: number;
  researchActive: boolean;
  cashHealth: number;
  timeSpeed: number;
}

export interface OfficeScene {
  update: (delta: number, snapshot: OfficeSnapshot) => void;
  resize: () => void;
  resetCamera: () => void;
  dispose: () => void;
}

interface Hotspot {
  id: PanelId;
  object: THREE.Object3D;
  marker: HTMLButtonElement;
}

interface SpeechMarker {
  root: HTMLDivElement;
  name: HTMLElement;
  line: HTMLElement;
  staffIndex: number;
}

const roleLines: Record<StaffRole, string[]> = {
  architect: ['次の世代、ここを変えたい。', '帯域の詰まりを先に潰そう。', 'この設計ならまだ伸ばせる。', '仕様を一度整理しよう。'],
  circuit: ['配線、もう一段詰められる。', 'ここはタイミングが厳しいな。', '試作で確認してみよう。', '歩留まりも見ながら攻める。'],
  thermal: ['温度マージンが少ない。', '電源回りを見直そう。', '冷却側から性能を稼げるかも。', '熱密度が上がってきた。'],
  software: ['ドライバー側で吸収できそう。', 'この不具合、再現条件を絞る。', '互換性テストを増やしたい。', '更新で評価を戻せる。'],
  validation: ['この条件でもう一周テスト。', '量産前にここだけ潰したい。', '再現した。原因を追う。', '品質は妥協したくない。'],
  marketing: ['この価格なら訴求を変えよう。', '競合より何が刺さるか考える。', '発売初動を取りにいこう。', 'この製品、見せ方で化ける。'],
  operations: ['ラインの負荷が上がってる。', '供給枠、もう一本欲しいな。', '在庫と需要を合わせよう。', '工場側と条件を詰める。'],
};

const tiredLines = ['ちょっと休憩したい…。', '集中が切れてきた。', '今日は長いな…。'];
const lowMoraleLines = ['最近うまく噛み合わないな。', '一度立て直したい。', 'このままだと厳しいかも。'];
const happyLines = ['いい流れ。次もいけそう。', '今のチーム、かなり噛み合ってる。', 'この結果はうれしい。'];
const leavingLines = ['今日はここまで。', '続きは明日やろう。', 'お先に失礼します。', '最終チェックして帰ろう。'];

const materialIntensity = (mesh: THREE.Mesh, value: number): void => {
  if (mesh.material instanceof THREE.MeshStandardMaterial) mesh.material.emissiveIntensity = value;
};

function lineFor(member: StaffVisualState, animation: string, epoch: number, hour: number): string {
  const pool = hour >= 17.5 ? leavingLines : member.fatigue >= 82 ? tiredLines : member.morale <= 30 ? lowMoraleLines : member.morale >= 88 && animation === 'celebrating' ? happyLines : roleLines[member.role];
  return pool[(epoch + member.name.length + member.id.length) % pool.length] ?? pool[0] ?? '';
}

function clockLabel(hour: number): string {
  const whole = Math.floor(hour) % 24;
  const minute = Math.floor((hour % 1) * 60);
  return `${String(whole).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function createOfficeScene(
  canvasHost: HTMLElement,
  overlay: HTMLElement,
  open: (panel: PanelId) => void,
  onWorkdayEnded: () => void = () => undefined,
): OfficeScene {
  const scene = new THREE.Scene();
  const fog = new THREE.FogExp2(0x758a9a, .00235);
  scene.fog = fog;
  const city = cityBackdrop(scene);

  const camera = new THREE.PerspectiveCamera(32, 1, .1, 700);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  const maxPixelRatio = Math.min(window.devicePixelRatio || 1, 1.4);
  let pixelRatio = Math.min(maxPixelRatio, 1.2);
  renderer.setPixelRatio(pixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.domElement.style.touchAction = 'none';
  canvasHost.append(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  const cameraController = new CameraController(camera, controls);
  controls.minDistance = 8.5;
  controls.maxDistance = 62;
  controls.minPolarAngle = Math.PI * .12;
  controls.maxPolarAngle = Math.PI * .49;

  const hemisphere = new THREE.HemisphereLight(0xcdeaff, 0x15202a, 1.75);
  scene.add(hemisphere);
  const sun = new THREE.DirectionalLight(0xffd7b0, 3.35);
  sun.position.set(-10, 15, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -24;
  sun.shadow.camera.right = 24;
  sun.shadow.camera.top = 22;
  sun.shadow.camera.bottom = -18;
  sun.shadow.camera.near = 3;
  sun.shadow.camera.far = 48;
  sun.shadow.bias = -.00035;
  scene.add(sun);

  const windowFill = new THREE.DirectionalLight(0x78bfff, 1.05);
  windowFill.position.set(0, 7, -12);
  scene.add(windowFill);
  const localGlow = new THREE.PointLight(0x6dbdff, 18, 24, 2);
  localGlow.position.set(2.5, 4.2, -.6);
  scene.add(localGlow);

  const layout = buildOfficeLayout(scene);
  const officeDetails = buildOfficeLifeDetails(layout.office);
  const robotBeacon = layout.robot.getObjectByName('robot-beacon') as THREE.Mesh;
  const ambientAnimations = new AmbientAnimationSystem({
    deliveryRobot: layout.robot,
    robotBeacon,
    dataCubes: layout.dataCubes,
    ceilingLights: layout.ceilingLights,
  });

  const definitions: Array<[PanelId, THREE.Object3D, string, string]> = [
    ['development', layout.developmentDesks[0] ?? layout.office, '世代開発', '設計・進行・問題対応'],
    ['products', layout.showcase, '製品・販売', '評価・需要・在庫'],
    ['factories', layout.racks[0] ?? layout.office, '工場', '契約・生産能力'],
    ['competitors', layout.competitorScreen, '競合', '企業・製品・シェア'],
    ['research', layout.research, '研究', '技術プログラム'],
    ['company', layout.meeting, '会社', '人材・設備・資金'],
  ];
  const hotspots: Hotspot[] = definitions.map(([id, object, label, sublabel]) => {
    const marker = document.createElement('button');
    marker.className = 'scene-hotspot';
    marker.innerHTML = `<b>${label}</b><small>${sublabel}</small>`;
    marker.onclick = () => open(id);
    overlay.append(marker);
    return { id, object, marker };
  });

  const officeClock = document.createElement('div');
  officeClock.setAttribute('aria-hidden', 'true');
  Object.assign(officeClock.style, {
    position: 'absolute', left: '18px', bottom: '18px', zIndex: '5', pointerEvents: 'none',
    padding: '7px 10px', borderRadius: '8px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: '12px', letterSpacing: '.04em', color: '#eaf6ff', background: 'rgba(8,18,27,.72)',
    border: '1px solid rgba(139,205,240,.26)', boxShadow: '0 8px 24px rgba(0,0,0,.22)', backdropFilter: 'blur(8px)',
  });
  overlay.append(officeClock);

  const speechMarkers: SpeechMarker[] = Array.from({ length: 4 }, () => {
    const root = document.createElement('div');
    root.className = 'employee-speech';
    const name = document.createElement('b');
    const line = document.createElement('span');
    root.append(name, line);
    overlay.append(root);
    return { root, name, line, staffIndex: -1 };
  });

  const progressScreens = layout.developmentDesks
    .map((desk) => desk.getObjectByName('screen'))
    .filter((item): item is THREE.Mesh => item instanceof THREE.Mesh);
  const gpuFans = layout.showcase.getObjectsByProperty('name', 'gpu-fan') as THREE.Group[];
  const serverLights = layout.racks.flatMap((rack) => rack.getObjectsByProperty('name', 'server-light')) as THREE.Mesh[];
  const pcFans = layout.office.getObjectsByProperty('name', 'pc-fan') as THREE.Group[];
  const waferPlatter = layout.waferStation.getObjectByName('wafer-platter') as THREE.Mesh | undefined;
  const waferScreen = layout.waferStation.getObjectByName('wafer-screen') as THREE.Mesh | undefined;
  const researchScreen = layout.research.getObjectByName('research-screen') as THREE.Mesh | undefined;
  const researchChamber = layout.research.getObjectByName('research-chamber');
  const chip = layout.showcase.getObjectByName('product-chip') ?? layout.showcase;
  const gpu = layout.showcase.getObjectByName('product-gpu') ?? layout.showcase;

  chip.traverse((object) => { if (object instanceof THREE.Mesh) object.castShadow = false; });
  gpu.traverse((object) => { if (object instanceof THREE.Mesh) object.castShadow = false; });

  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;

  const clock = new THREE.Clock();
  let snapshot: OfficeSnapshot = {
    activePanel: 'home', projectProgress: 0, productGlow: .1, staffCount: 5, staff: [],
    officeLevel: 1, researchActive: false, cashHealth: .5, timeSpeed: 1,
  };
  let visibleStaff: OfficeStaffVisual[] = [];
  let visualHour = 8;
  let qualitySeconds = 0;
  let qualityFrames = 0;
  let hotspotSeconds = 0;
  let speechSeconds = 0;
  let speechEpoch = -1;

  const resize = (): void => {
    const rect = canvasHost.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();

  const updateAdaptiveResolution = (rawDelta: number): void => {
    qualitySeconds += rawDelta;
    qualityFrames += 1;
    if (qualitySeconds < 2.5) return;
    const fps = qualityFrames / qualitySeconds;
    let nextRatio = pixelRatio;
    if (fps < 43) nextRatio = Math.max(.82, pixelRatio - .14);
    else if (fps > 57) nextRatio = Math.min(maxPixelRatio, pixelRatio + .08);
    if (Math.abs(nextRatio - pixelRatio) >= .04) {
      pixelRatio = nextRatio;
      renderer.setPixelRatio(pixelRatio);
      resize();
    }
    qualitySeconds = 0;
    qualityFrames = 0;
  };

  const updateHotspots = (): void => {
    const rect = canvasHost.getBoundingClientRect();
    const point = new THREE.Vector3();
    hotspots.forEach((hotspot) => {
      hotspot.object.getWorldPosition(point);
      point.y += hotspot.id === 'competitors' ? .55 : 2.2;
      point.project(camera);
      const visible = point.z < 1 && point.x > -1.15 && point.x < 1.15 && point.y > -1.15 && point.y < 1.15 && snapshot.activePanel === 'home';
      hotspot.marker.style.left = `${(point.x * .5 + .5) * rect.width}px`;
      hotspot.marker.style.top = `${(-point.y * .5 + .5) * rect.height}px`;
      hotspot.marker.style.opacity = visible ? '1' : snapshot.activePanel === hotspot.id ? '.96' : '0';
      hotspot.marker.style.pointerEvents = visible ? 'auto' : 'none';
      hotspot.marker.classList.toggle('active', hotspot.id === snapshot.activePanel);
    });
  };

  const assignSpeech = (epoch: number): void => {
    const available = Math.min(visibleStaff.length, layout.people.length);
    if (!available) { speechMarkers.forEach((marker) => { marker.staffIndex = -1; marker.root.style.opacity = '0'; }); return; }
    speechMarkers.forEach((marker, slot) => {
      const index = (epoch * 3 + slot * 7) % available;
      const member = visibleStaff[index];
      const person = layout.people[index];
      if (!member || !person || !person.parent?.visible) { marker.staffIndex = -1; marker.root.style.opacity = '0'; return; }
      marker.staffIndex = index;
      marker.name.textContent = member.name;
      marker.line.textContent = lineFor(member, String(person.userData.animation ?? ''), epoch + slot, visualHour);
    });
  };

  const updateSpeechPositions = (): void => {
    const rect = canvasHost.getBoundingClientRect();
    const point = new THREE.Vector3();
    speechMarkers.forEach((marker) => {
      const person = marker.staffIndex >= 0 ? layout.people[marker.staffIndex] : undefined;
      if (!person || snapshot.activePanel !== 'home' || !person.parent?.visible) { marker.root.style.opacity = '0'; return; }
      person.getWorldPosition(point);
      point.y += 2.25;
      point.project(camera);
      const visible = point.z < 1 && Math.abs(point.x) < 1.05 && Math.abs(point.y) < 1.05;
      marker.root.style.left = `${(point.x * .5 + .5) * rect.width}px`;
      marker.root.style.top = `${(-point.y * .5 + .5) * rect.height}px`;
      marker.root.style.opacity = visible ? '1' : '0';
    });
  };

  let frame = 0;
  const animate = (): void => {
    frame = requestAnimationFrame(animate);
    const rawDelta = clock.getDelta();
    const delta = Math.min(.05, rawDelta);
    const time = performance.now() * .001;
    cameraController.update(delta);
    updateAdaptiveResolution(rawDelta);

    let lighting = city.update(snapshot.timeSpeed === 0 ? 0 : delta);
    visualHour = lighting.hour;
    const staffPool = snapshot.staff.slice(0, Math.min(snapshot.staffCount, 30));
    visibleStaff = staffPresentAtHour(staffPool, visualHour);
    if (visualHour >= 17 && staffPool.length > 0 && visibleStaff.length === 0) {
      onWorkdayEnded();
      city.skipToMorning();
      lighting = city.update(0);
      visualHour = lighting.hour;
      visibleStaff = staffPresentAtHour(staffPool, visualHour);
      speechEpoch = -1;
    }

    const workdayState = visualHour < 10 ? '出社中' : visualHour < 17 ? '勤務中' : '退勤中';
    officeClock.textContent = `${clockLabel(visualHour)} · ${workdayState} ${visibleStaff.length}/${staffPool.length}`;
    officeClock.style.opacity = snapshot.activePanel === 'home' ? '1' : '.35';

    layout.expansionGroups.forEach((group, index) => { group.visible = snapshot.officeLevel >= index + 2; });
    layout.characterAnimations.update(time, {
      staffCount: visibleStaff.length,
      staff: visibleStaff,
      projectActive: snapshot.projectProgress > 0 && snapshot.projectProgress < 100,
      researchActive: snapshot.researchActive,
      productActive: snapshot.productGlow > .16,
      timeSpeed: snapshot.timeSpeed,
    });
    ambientAnimations.update(time, delta, {
      speed: snapshot.timeSpeed,
      projectProgress: snapshot.projectProgress,
      productGlow: snapshot.productGlow,
      researchActive: snapshot.researchActive,
      cashHealth: snapshot.cashHealth,
    });
    officeDetails.update(time, {
      officeLevel: snapshot.officeLevel,
      presentStaff: visibleStaff.length,
      totalStaff: staffPool.length,
      night: lighting.night,
      projectProgress: snapshot.projectProgress,
      productGlow: snapshot.productGlow,
      researchActive: snapshot.researchActive,
      cashHealth: snapshot.cashHealth,
    });

    hemisphere.color.copy(lighting.hemisphereSky);
    hemisphere.groundColor.copy(lighting.hemisphereGround);
    hemisphere.intensity = .42 + lighting.daylight * 1.35 + lighting.night * .18;
    sun.color.copy(lighting.sunColor);
    sun.intensity = lighting.sunIntensity;
    windowFill.color.copy(lighting.windowFill);
    windowFill.intensity = .35 + lighting.daylight * .9 + lighting.night * .32;
    fog.color.copy(lighting.fogColor);
    renderer.toneMappingExposure = lighting.exposure;

    progressScreens.forEach((screen, index) => materialIntensity(screen, .78 + snapshot.projectProgress / 100 * 1.25 + Math.sin(time * 1.4 + index) * .06));
    gpuFans.forEach((fan, index) => { fan.rotation.z -= delta * (1.8 + snapshot.productGlow * 4.2 + index * .16); });
    pcFans.forEach((fan, index) => { fan.rotation.z -= delta * (1.1 + snapshot.projectProgress * .015 + index % 3 * .1); });
    chip.rotation.y += delta * (.22 + snapshot.productGlow * .55);
    chip.position.y = .72 + Math.sin(time * .7) * .022;
    gpu.rotation.y = .12 + Math.sin(time * .42) * .068;
    gpu.position.y = .98 + Math.sin(time * .62 + 1.4) * .022;
    if (waferPlatter) waferPlatter.rotation.y += delta * (snapshot.researchActive ? 1.1 : .2);
    if (researchChamber) researchChamber.rotation.y += delta * (snapshot.researchActive ? .68 : .1);
    if (researchScreen) materialIntensity(researchScreen, snapshot.researchActive ? 1.9 + Math.sin(time * 3) * .32 : .68);
    if (waferScreen) materialIntensity(waferScreen, snapshot.researchActive ? 1.6 + Math.sin(time * 4.2) * .28 : .58);
    serverLights.forEach((light, index) => materialIntensity(light, .48 + Math.max(0, Math.sin(time * (2.1 + index % 3) + index)) * .95));
    localGlow.intensity = 9 + lighting.night * (visibleStaff.length ? 13 : 4) + snapshot.projectProgress * .08 + snapshot.productGlow * 5;

    hotspotSeconds += rawDelta;
    if (hotspotSeconds >= .12) { hotspotSeconds = 0; updateHotspots(); }
    speechSeconds += rawDelta;
    const nextEpoch = Math.floor(time / 8.5);
    if (nextEpoch !== speechEpoch) { speechEpoch = nextEpoch; assignSpeech(nextEpoch); }
    if (speechSeconds >= .24) { speechSeconds = 0; updateSpeechPositions(); }
    renderer.render(scene, camera);
  };
  animate();

  return {
    update(_delta, nextSnapshot) { snapshot = nextSnapshot; },
    resize,
    resetCamera() { cameraController.reset(); },
    dispose() {
      cancelAnimationFrame(frame);
      cameraController.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      hotspots.forEach((hotspot) => hotspot.marker.remove());
      speechMarkers.forEach((marker) => marker.root.remove());
      officeClock.remove();
    },
  };
}
