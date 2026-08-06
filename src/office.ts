import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AmbientAnimationSystem } from './ambient-animations';
import { CameraController } from './camera-controller';
import { CharacterAnimationSystem } from './character-animations';
import {
  addFloorTiles, box, cityBackdrop, deliveryRobot, desk, emissiveMaterial, floatingDataCube,
  material, meetingArea, partsShelf, plant, productShowcase, researchBench, serverRack, staffPerson,
  waferInspectionStation, wallDisplay,
} from './office-models';
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

export function createOfficeScene(canvasHost: HTMLElement, overlay: HTMLElement, open: (id: PanelId) => void): OfficeScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111a26);
  scene.fog = new THREE.FogExp2(0x111a26, .014);

  const camera = new THREE.PerspectiveCamera(33, 1, .1, 140);
  camera.position.set(16, 14.2, 18.8);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  (renderer as unknown as { toneMappingExposure: number }).toneMappingExposure = 1.08;
  canvasHost.append(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  const cameraController = new CameraController(camera, controls);
  controls.minDistance = 9;
  controls.maxDistance = 36;
  controls.maxPolarAngle = Math.PI * .49;

  scene.add(new THREE.HemisphereLight(0xd8eeff, 0x1b2633, 2.15));
  const sun = new THREE.DirectionalLight(0xffe3bd, 4.4);
  sun.position.set(-9, 14, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -14;
  sun.shadow.camera.right = 14;
  sun.shadow.camera.top = 14;
  sun.shadow.camera.bottom = -14;
  scene.add(sun);
  const coolFill = new THREE.PointLight(0x4b9fff, 32, 19, 2);
  coolFill.position.set(5.5, 5.5, -2.5);
  scene.add(coolFill);
  const warmFill = new THREE.PointLight(0xffb867, 28, 15, 2);
  warmFill.position.set(-5, 4.2, 3.8);
  scene.add(warmFill);

  cityBackdrop(scene);
  const office = new THREE.Group();
  addFloorTiles(office);
  const wallMaterial = material(0x253442, .82);
  office.add(box(16.4, 5.6, .28, wallMaterial, 0, 2.65, -6.12), box(.28, 5.6, 12.4, wallMaterial, -8.12, 2.65, 0));
  office.add(box(16.4, .18, .3, material(0x111a24, .55, .45), 0, 5.45, -6));
  for (const x of [-6.2, -3.7, -1.2, 1.3, 3.8, 6.3]) {
    office.add(box(2.1, 2.85, .1, new THREE.MeshPhysicalMaterial({ color: 0x7db6d9, transparent: true, opacity: .18, transmission: .55, roughness: .18 }), x, 3.28, -6));
    office.add(box(.08, 3.1, .15, material(0x15222d, .45, .55), x - 1.08, 3.28, -5.94));
  }
  office.add(box(5.4, .08, 3.55, material(0x203b50, .9), -3.65, .04, -2.05));
  office.add(box(4.25, .08, 3.45, material(0x3b2c42, .9), 3.7, .04, 2.85));

  const developmentDesks = [
    desk(-5.55, -3.7, 0, 0x5aaeff),
    desk(-2.85, -3.7, 0, 0x62c9ff),
    desk(-5.55, -.9, Math.PI, 0x6fd6b0),
    desk(-2.85, -.9, Math.PI, 0xffbc6b),
  ];
  developmentDesks.forEach((item) => office.add(item));

  const operationsDesk = desk(4.9, -3.65, 0, 0x79d8ff);
  const competitorDesk = desk(1.9, -3.65, 0, 0xff7c88);
  office.add(operationsDesk, competitorDesk);

  const research = researchBench(-4.85, 3.9);
  const showcase = productShowcase(4.65, 3.65);
  const meeting = meetingArea(.2, 3.5);
  office.add(research, showcase, meeting);

  const racks = [serverRack(6.85, -1.15), serverRack(5.55, -1.15), serverRack(6.85, 1.05)];
  racks.forEach((item) => office.add(item));
  const waferStation = waferInspectionStation(-7.02, 2.55);
  office.add(waferStation, partsShelf(7.02, 3.25));
  const cableTray = material(0x192631, .4, .68);
  office.add(box(13.8, .16, .38, cableTray, -.1, 4.95, -4.9), box(.36, .16, 8.4, cableTray, 7.25, 4.95, -.8));
  for (let x = -6.2; x <= 6.2; x += 1.55) office.add(box(.07, .1, .28, emissiveMaterial(0xffffff, 0x8ecfff, .32), x, 4.87, -4.91));

  const competitorScreen = wallDisplay(2.2, 3.9, -5.93, 3.4, 0xff626e, 'competitor-screen');
  const financeScreen = wallDisplay(5.9, 3.9, -5.93, 2.7, 0x70d8a4, 'finance-screen');
  office.add(competitorScreen, financeScreen);

  office.add(plant(-7.25, -5.15, 1.05), plant(7.25, 5.15, 1.2), plant(-7.1, 5.05, .85));
  office.add(box(3.7, 1.3, .12, material(0xe7edf2, .76), -5.8, 3.6, -5.88));
  const logoPlate = box(2.5, .65, .1, emissiveMaterial(0x172a3a, 0x3f9fff, .65), -5.8, 4.65, -5.84);
  logoPlate.name = 'office-logo';
  office.add(logoPlate);

  const ceilingLights: THREE.Mesh[] = [];
  for (const x of [-5.5, -1.8, 1.8, 5.5]) {
    const fixture = box(2.5, .09, .32, emissiveMaterial(0xffffff, 0xffefcf, .9), x, 5.25, -1.3);
    ceilingLights.push(fixture);
    office.add(fixture);
  }

  const robot = deliveryRobot();
  office.add(robot);
  const dataCubes = [
    floatingDataCube(0x5ec6ff, -4.15, 2.45, 3.5),
    floatingDataCube(0x62e6ad, -5.5, 2.15, 3.85),
    floatingDataCube(0xffbd68, 4.0, 2.25, 3.1),
    floatingDataCube(0xc58cff, 5.2, 2.55, 3.75),
  ];
  dataCubes.forEach((cube) => office.add(cube));

  const staffColors = [0x5aa7ff, 0xff8d71, 0x79d69c, 0xc998ff, 0xffc56f, 0x62cbd3, 0xf178a7, 0x95c76f, 0x7398e8, 0xe89f73, 0x70d1b6, 0xb286e8];
  const staffPositions: [number, number, number][] = [
    [-5.55, -2.65, Math.PI], [-2.85, -2.65, Math.PI], [-5.55, -1.95, 0], [-2.85, -1.95, 0],
    [4.9, -2.58, Math.PI], [1.9, -2.58, Math.PI], [-4.85, 2.65, Math.PI], [.2, 2.2, 0],
    [4.65, 2.35, 0], [6, -.1, Math.PI / 2], [-.8, 4.7, Math.PI / 2], [2.1, 4.7, -Math.PI / 2],
  ];
  const people = staffPositions.map(([x, z, rotation], index) => staffPerson(staffColors[index] ?? 0x6dafff, x, z, rotation, index));
  people.forEach((person) => office.add(person));
  const characterAnimations = new CharacterAnimationSystem(people);
  const robotBeacon = robot.getObjectByName('robot-beacon') as THREE.Mesh;
  const ambientAnimations = new AmbientAnimationSystem({ deliveryRobot: robot, robotBeacon, dataCubes, ceilingLights });

  const glassPartition = new THREE.MeshPhysicalMaterial({ color: 0x86bdd8, transparent: true, opacity: .13, transmission: .65, roughness: .14 });
  office.add(box(.08, 2.65, 4.2, glassPartition, 1.0, 1.55, 3.3));
  for (const z of [1.25, 3.3, 5.35]) office.add(box(.12, 2.8, .12, material(0x263743, .4, .5), 1, 1.55, z));

  scene.add(office);

  const hotspotDefinitions: [PanelId, THREE.Object3D, string, string][] = [
    ['development', developmentDesks[0] ?? office, '世代開発', '設計・進行・問題対応'],
    ['products', showcase, '製品・売上', '評価・需要・在庫'],
    ['factories', racks[0] ?? office, '工場', '契約・生産能力'],
    ['competitors', competitorScreen, '競合', '企業・現行モデル'],
    ['research', research, '研究', '技術プログラム'],
    ['company', meeting, '会社', '社員・設備・資金'],
  ];
  const hotspots: Hotspot[] = hotspotDefinitions.map(([id, object, label, sublabel]) => {
    const marker = document.createElement('button');
    marker.className = 'scene-hotspot';
    marker.innerHTML = `<b>${label}</b><small>${sublabel}</small>`;
    marker.onclick = () => open(id);
    overlay.append(marker);
    return { id, object, marker };
  });

  const resize = (): void => {
    const rect = canvasHost.getBoundingClientRect();
    renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height), false);
    camera.aspect = Math.max(1, rect.width) / Math.max(1, rect.height);
    camera.updateProjectionMatrix();
  };
  resize();

  let frame = 0;
  let snapshot: OfficeSnapshot = { activePanel: 'home', projectProgress: 0, productGlow: .1, staffCount: 5, officeLevel: 1, researchActive: false, cashHealth: .5, timeSpeed: 1 };
  const clock = new THREE.Clock();
  const chip = showcase.getObjectByName('product-chip') as THREE.Mesh;
  const gpu = showcase.getObjectByName('product-gpu') as THREE.Mesh;
  const showcaseLight = showcase.getObjectByName('showcase-light') as THREE.PointLight;
  const researchScreen = research.getObjectByName('research-screen') as THREE.Mesh;
  const researchChamber = research.getObjectByName('research-chamber') as THREE.Mesh;
  const waferPlatter = waferStation.getObjectByName('wafer-platter') as THREE.Mesh;
  const waferScreen = waferStation.getObjectByName('wafer-screen') as THREE.Mesh;
  const progressScreens = developmentDesks.flatMap((item) => [item.getObjectByName('screen')]).filter(Boolean) as THREE.Mesh[];
  const gpuFans = showcase.getObjectsByProperty('name', 'gpu-fan') as THREE.Group[];
  const serverLights = racks.flatMap((rack) => rack.children.filter((child: THREE.Object3D) => child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial && child.material.emissive.getHex() !== 0)) as THREE.Mesh[];

  const animate = (): void => {
    frame = requestAnimationFrame(animate);
    const delta = Math.min(.05, clock.getDelta());
    cameraController.update(delta);

    const time = performance.now() * .001;
    characterAnimations.update(time, {
      staffCount: snapshot.staffCount,
      projectActive: snapshot.projectProgress > 0 && snapshot.projectProgress < 100,
      researchActive: snapshot.researchActive,
      productActive: snapshot.productGlow > .16,
      timeSpeed: snapshot.timeSpeed,
    });

    if (chip?.material instanceof THREE.MeshStandardMaterial) {
      chip.rotation.y += delta * (.28 + snapshot.productGlow * .65);
      chip.material.emissiveIntensity = .38 + snapshot.productGlow * 1.9;
    }
    if (gpu) gpu.rotation.y = Math.sin(time * .48) * .08;
    if (showcaseLight) showcaseLight.intensity = 14 + snapshot.productGlow * 24;
    if (researchScreen?.material instanceof THREE.MeshStandardMaterial) researchScreen.material.emissiveIntensity = snapshot.researchActive ? 2.1 + Math.sin(time * 3) * .4 : .65;
    if (researchChamber) researchChamber.rotation.y += delta * (snapshot.researchActive ? .7 : .12);
    if (waferPlatter) waferPlatter.rotation.y += delta * (snapshot.researchActive ? 1.15 : .22);
    if (waferScreen?.material instanceof THREE.MeshStandardMaterial) waferScreen.material.emissiveIntensity = snapshot.researchActive ? 1.7 + Math.sin(time * 4.2) * .35 : .55;
    progressScreens.forEach((screen, index) => {
      if (screen.material instanceof THREE.MeshStandardMaterial) screen.material.emissiveIntensity = .7 + snapshot.projectProgress / 100 * 1.55 + Math.sin(time * 1.4 + index) * .08;
    });
    gpuFans.forEach((fan, index) => {
      fan.rotation.z -= delta * (1.4 + snapshot.productGlow * 4 + index * .2);
    });
    serverLights.forEach((light, index) => {
      if (light.material instanceof THREE.MeshStandardMaterial) light.material.emissiveIntensity = .45 + Math.max(0, Math.sin(time * (2.4 + index % 3) + index)) * 1.2;
    });
    coolFill.intensity = 25 + snapshot.projectProgress * .16;
    warmFill.intensity = 22 + snapshot.cashHealth * 14;
    ambientAnimations.update(time, delta, {
      speed: snapshot.timeSpeed,
      projectProgress: snapshot.projectProgress,
      productGlow: snapshot.productGlow,
      researchActive: snapshot.researchActive,
      cashHealth: snapshot.cashHealth,
    });

    const rect = canvasHost.getBoundingClientRect();
    hotspots.forEach((hotspot) => {
      const vector = new THREE.Vector3();
      hotspot.object.getWorldPosition(vector);
      vector.y += hotspot.id === 'competitors' ? .5 : 2.15;
      vector.project(camera);
      const visible = vector.z < 1 && snapshot.activePanel === 'home';
      hotspot.marker.style.left = `${(vector.x * .5 + .5) * rect.width}px`;
      hotspot.marker.style.top = `${(-vector.y * .5 + .5) * rect.height}px`;
      hotspot.marker.style.opacity = visible ? '1' : snapshot.activePanel === hotspot.id ? '.95' : '0';
      hotspot.marker.style.pointerEvents = visible ? 'auto' : 'none';
      hotspot.marker.classList.toggle('active', hotspot.id === snapshot.activePanel);
    });
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
