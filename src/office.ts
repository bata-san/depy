import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AmbientAnimationSystem } from './ambient-animations';
import { CameraController } from './camera-controller';
import { cityBackdrop } from './city-backdrop';
import { buildOfficeLayout } from './office-layout';
import type { PanelId } from './types';

export interface OfficeSnapshot {
  activePanel: PanelId;
  projectProgress: number;
  productGlow: number;
  staffCount: number;
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

const materialIntensity = (mesh: THREE.Mesh, value: number): void => {
  if (mesh.material instanceof THREE.MeshStandardMaterial) mesh.material.emissiveIntensity = value;
};

export function createOfficeScene(
  canvasHost: HTMLElement,
  overlay: HTMLElement,
  open: (panel: PanelId) => void,
): OfficeScene {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x142033, .0085);
  const city = cityBackdrop(scene);

  const camera = new THREE.PerspectiveCamera(32, 1, .1, 180);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  const maxPixelRatio = Math.min(window.devicePixelRatio || 1, 1.4);
  let pixelRatio = Math.min(maxPixelRatio, 1.2);
  renderer.setPixelRatio(pixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.domElement.style.touchAction = 'none';
  canvasHost.append(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  const cameraController = new CameraController(camera, controls);
  controls.minDistance = 8.5;
  controls.maxDistance = 38;
  controls.minPolarAngle = Math.PI * .12;
  controls.maxPolarAngle = Math.PI * .49;

  scene.add(new THREE.HemisphereLight(0xcdeaff, 0x15202a, 1.75));
  const sun = new THREE.DirectionalLight(0xffd7b0, 3.35);
  sun.position.set(-10, 15, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -12;
  sun.shadow.camera.right = 12;
  sun.shadow.camera.top = 11;
  sun.shadow.camera.bottom = -11;
  sun.shadow.camera.near = 3;
  sun.shadow.camera.far = 34;
  sun.shadow.bias = -.00035;
  scene.add(sun);

  const windowFill = new THREE.DirectionalLight(0x78bfff, 1.05);
  windowFill.position.set(0, 7, -12);
  scene.add(windowFill);
  const localGlow = new THREE.PointLight(0x6dbdff, 18, 18, 2);
  localGlow.position.set(2.5, 4.2, -.6);
  scene.add(localGlow);

  const layout = buildOfficeLayout(scene);
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
    activePanel: 'home', projectProgress: 0, productGlow: .1, staffCount: 5,
    officeLevel: 1, researchActive: false, cashHealth: .5, timeSpeed: 1,
  };
  let qualitySeconds = 0;
  let qualityFrames = 0;
  let hotspotSeconds = 0;

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

  let frame = 0;
  const animate = (): void => {
    frame = requestAnimationFrame(animate);
    const rawDelta = clock.getDelta();
    const delta = Math.min(.05, rawDelta);
    const time = performance.now() * .001;
    cameraController.update(delta);
    updateAdaptiveResolution(rawDelta);

    layout.characterAnimations.update(time, {
      staffCount: snapshot.staffCount,
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
    city.update(delta);

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
    localGlow.intensity = 14 + snapshot.projectProgress * .08 + snapshot.productGlow * 5;

    hotspotSeconds += rawDelta;
    if (hotspotSeconds >= .09) {
      hotspotSeconds = 0;
      updateHotspots();
    }
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
    },
  };
}
