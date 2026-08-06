import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
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
  scene.fog = new THREE.FogExp2(0x142033, .009);
  cityBackdrop(scene);

  const camera = new THREE.PerspectiveCamera(31, 1, .1, 180);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  (renderer as unknown as { toneMappingExposure: number }).toneMappingExposure = 1.14;
  renderer.domElement.style.touchAction = 'none';
  canvasHost.append(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  const cameraController = new CameraController(camera, controls);
  controls.minDistance = 8.5;
  controls.maxDistance = 38;
  (controls as unknown as { minPolarAngle: number }).minPolarAngle = Math.PI * .12;
  controls.maxPolarAngle = Math.PI * .49;

  scene.add(new THREE.HemisphereLight(0xc8e7ff, 0x17212b, 1.55));
  const sun = new THREE.DirectionalLight(0xffd8b0, 4.1);
  sun.position.set(-11, 16, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -16;
  sun.shadow.camera.right = 16;
  sun.shadow.camera.top = 16;
  sun.shadow.camera.bottom = -16;
  sun.shadow.bias = -.0004;
  scene.add(sun);
  const windowLight = new THREE.PointLight(0x6ebdff, 38, 25, 2);
  windowLight.position.set(0, 7.2, -7.3);
  scene.add(windowLight);
  const coolFill = new THREE.PointLight(0x4b9fff, 25, 18, 2);
  coolFill.position.set(5.8, 4.4, -.8);
  scene.add(coolFill);
  const warmFill = new THREE.PointLight(0xffa968, 22, 17, 2);
  warmFill.position.set(-5.3, 3.8, 3.7);
  scene.add(warmFill);

  const layout = buildOfficeLayout(scene);
  const robotBeacon = layout.robot.getObjectByName('robot-beacon') as THREE.Mesh;
  const ambientAnimations = new AmbientAnimationSystem({
    deliveryRobot: layout.robot,
    robotBeacon,
    dataCubes: layout.dataCubes,
    ceilingLights: layout.ceilingLights,
  });

  const renderPass = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .35, .42, .82);
  bloom.threshold = .72;
  bloom.strength = .32;
  bloom.radius = .38;
  const composer = new EffectComposer(renderer);
  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

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
  const cityCars = scene.getObjectsByProperty('name', 'city-car') as THREE.Mesh[];
  const clock = new THREE.Clock();
  let snapshot: OfficeSnapshot = {
    activePanel: 'home', projectProgress: 0, productGlow: .1, staffCount: 5,
    officeLevel: 1, researchActive: false, cashHealth: .5, timeSpeed: 1,
  };

  const resize = (): void => {
    const rect = canvasHost.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();

  let frame = 0;
  const animate = (): void => {
    frame = requestAnimationFrame(animate);
    const delta = Math.min(.05, clock.getDelta());
    const time = performance.now() * .001;
    cameraController.update(delta);

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

    progressScreens.forEach((screen, index) => {
      materialIntensity(screen, .82 + snapshot.projectProgress / 100 * 1.55 + Math.sin(time * 1.4 + index) * .08);
    });
    gpuFans.forEach((fan, index) => { fan.rotation.z -= delta * (1.7 + snapshot.productGlow * 4.6 + index * .2); });
    pcFans.forEach((fan, index) => { fan.rotation.z -= delta * (1.15 + snapshot.projectProgress * .018 + index % 3 * .12); });
    chip.rotation.y += delta * (.22 + snapshot.productGlow * .6);
    chip.position.y = .72 + Math.sin(time * .7) * .025;
    gpu.rotation.y = .12 + Math.sin(time * .42) * .075;
    gpu.position.y = .98 + Math.sin(time * .62 + 1.4) * .025;
    if (waferPlatter) waferPlatter.rotation.y += delta * (snapshot.researchActive ? 1.18 : .22);
    if (researchChamber) researchChamber.rotation.y += delta * (snapshot.researchActive ? .72 : .12);
    if (researchScreen) materialIntensity(researchScreen, snapshot.researchActive ? 2.2 + Math.sin(time * 3) * .42 : .72);
    if (waferScreen) materialIntensity(waferScreen, snapshot.researchActive ? 1.8 + Math.sin(time * 4.2) * .35 : .62);
    serverLights.forEach((light, index) => materialIntensity(light, .55 + Math.max(0, Math.sin(time * (2.4 + index % 3) + index)) * 1.35));
    cityCars.forEach((car) => {
      const direction = Number(car.userData.lane ?? 0) === 0 ? 1 : -1;
      car.position.x += delta * Number(car.userData.speed ?? .4) * direction;
      if (car.position.x > 20) car.position.x = -20;
      if (car.position.x < -20) car.position.x = 20;
    });
    coolFill.intensity = 22 + snapshot.projectProgress * .14;
    warmFill.intensity = 20 + snapshot.cashHealth * 15;
    windowLight.intensity = 34 + Math.sin(time * .08) * 3;

    const rect = canvasHost.getBoundingClientRect();
    hotspots.forEach((hotspot) => {
      const point = new THREE.Vector3();
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
    composer.render();
  };
  animate();

  return {
    update(_delta, nextSnapshot) { snapshot = nextSnapshot; },
    resize,
    resetCamera() { cameraController.reset(); },
    dispose() {
      cancelAnimationFrame(frame);
      cameraController.dispose();
      composer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      hotspots.forEach((hotspot) => hotspot.marker.remove());
    },
  };
}
