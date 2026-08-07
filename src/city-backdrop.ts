import * as THREE from 'three';
import { box, material, sphere } from './office-primitives';
import { cityWindowTexture } from './voxel-textures';

// One complete visual day is intentionally short. The office skips the empty late night,
// so players see a new morning roughly every two minutes of normal play.
const VISUAL_DAY_SECONDS = 3 * 60;
const VISUAL_MORNING_HOUR = 7.5;
const CITY_GROUND_Y = -84;
const blendA = new THREE.Color();
const blendB = new THREE.Color();

export interface CityLightingSample {
  daylight: number;
  night: number;
  sunIntensity: number;
  sunColor: THREE.Color;
  hemisphereSky: THREE.Color;
  hemisphereGround: THREE.Color;
  fogColor: THREE.Color;
  windowFill: THREE.Color;
  exposure: number;
  phase: number;
  hour: number;
  minute: number;
}

export interface CityBackdropController {
  update: (delta: number) => CityLightingSample;
  skipToMorning: () => void;
}

interface BuildingSpec {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  color: THREE.Color;
  lightColor: THREE.Color;
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0xffffffff;
  };
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const smooth = (edge0: number, edge1: number, value: number): number => {
  const t = clamp01((value - edge0) / Math.max(.0001, edge1 - edge0));
  return t * t * (3 - 2 * t);
};

function phaseColor(phase: number, dawn: number, day: number, dusk: number, night: number, out: THREE.Color): THREE.Color {
  if (phase < .25) return out.lerpColors(blendA.setHex(dawn), blendB.setHex(day), smooth(0, .25, phase));
  if (phase < .5) return out.lerpColors(blendA.setHex(day), blendB.setHex(dusk), smooth(.25, .5, phase));
  if (phase < .75) return out.lerpColors(blendA.setHex(dusk), blendB.setHex(night), smooth(.5, .75, phase));
  return out.lerpColors(blendA.setHex(night), blendB.setHex(dawn), smooth(.75, 1, phase));
}

export function cityBackdrop(scene: THREE.Scene): CityBackdropController {
  const skyUniforms = {
    topColor: { value: new THREE.Color(0x6baee1) },
    upperColor: { value: new THREE.Color(0x9bc9e8) },
    horizonColor: { value: new THREE.Color(0xe7f3ff) },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(760, 24, 14),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: skyUniforms,
      vertexShader: 'varying vec3 vWorld; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vWorld=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
      fragmentShader: 'varying vec3 vWorld; uniform vec3 topColor; uniform vec3 upperColor; uniform vec3 horizonColor; void main(){ float h=normalize(vWorld).y; vec3 c=mix(horizonColor,upperColor,smoothstep(-.08,.34,h)); c=mix(c,topColor,smoothstep(.3,.9,h)); gl_FragColor=vec4(c,1.0); }',
    }),
  );
  scene.add(sky);

  const sunDiscMaterial = new THREE.MeshBasicMaterial({ color: 0xfff0c3, toneMapped: false, transparent: true, opacity: .95 });
  const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xdde9ff, toneMapped: false, transparent: true, opacity: 0 });
  const sunDisc = sphere(8.5, sunDiscMaterial, 0, 110, -390);
  const moon = sphere(6.5, moonMaterial, 0, 100, -410);
  sunDisc.castShadow = false;
  moon.castShadow = false;
  scene.add(sunDisc, moon);

  const city = new THREE.Group();
  scene.add(city);
  city.add(box(460, 1.8, 460, material(0x111820, .98), 0, CITY_GROUND_Y - .9, -170));

  const random = seededRandom(8713);
  const facadePalette = [0x172733, 0x1d3040, 0x243844, 0x1a2b39, 0x2b3e49, 0x203542, 0x293944];
  const lightPalette = [0xffd08a, 0x8fd7ff, 0xffae7a, 0xb9ddff, 0xa8f1d4];
  const specs: BuildingSpec[] = [];
  const layers = [
    { z: -30, count: 16, span: 120, width: [14, 27] as const, height: [145, 260] as const, depth: [13, 25] as const },
    { z: -62, count: 19, span: 155, width: [16, 31] as const, height: [160, 290] as const, depth: [15, 28] as const },
    { z: -105, count: 21, span: 195, width: [18, 36] as const, height: [175, 325] as const, depth: [17, 31] as const },
    { z: -158, count: 23, span: 235, width: [20, 41] as const, height: [190, 350] as const, depth: [19, 34] as const },
    { z: -220, count: 25, span: 285, width: [22, 47] as const, height: [205, 385] as const, depth: [21, 38] as const },
    { z: -295, count: 27, span: 345, width: [25, 54] as const, height: [225, 420] as const, depth: [23, 42] as const },
  ];

  layers.forEach((layer, layerIndex) => {
    for (let index = 0; index < layer.count; index += 1) {
      const width = layer.width[0] + random() * (layer.width[1] - layer.width[0]);
      const height = layer.height[0] + random() * (layer.height[1] - layer.height[0]);
      const depth = layer.depth[0] + random() * (layer.depth[1] - layer.depth[0]);
      specs.push({
        x: -layer.span / 2 + index * (layer.span / Math.max(1, layer.count - 1)) + (random() - .5) * (7 + layerIndex * 1.6),
        y: CITY_GROUND_Y + height / 2,
        z: layer.z - random() * (13 + layerIndex * 3.5),
        width,
        height,
        depth,
        color: new THREE.Color(facadePalette[Math.floor(random() * facadePalette.length)] ?? facadePalette[0]!),
        lightColor: new THREE.Color(lightPalette[Math.floor(random() * lightPalette.length)] ?? lightPalette[0]!),
      });
    }
  });

  const landmarks: Array<[number, number, number, number, number]> = [
    [-42, -42, 28, 310, 24], [36, -58, 32, 350, 27], [78, -112, 38, 395, 32],
    [-94, -152, 42, 380, 35], [4, -210, 48, 445, 40], [126, -276, 54, 485, 44],
  ];
  landmarks.forEach(([x, z, width, height, depth], index) => specs.push({
    x, y: CITY_GROUND_Y + height / 2, z, width, height, depth,
    color: new THREE.Color(index % 2 ? 0x243c4b : 0x2b414d),
    lightColor: new THREE.Color(index % 2 ? 0x7ed9ff : 0xffc77e),
  }));

  const dummy = new THREE.Object3D();
  const buildings = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .9, metalness: .06 }),
    specs.length,
  );
  specs.forEach((spec, index) => {
    dummy.position.set(spec.x, spec.y, spec.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(spec.width, spec.height, spec.depth);
    dummy.updateMatrix();
    buildings.setMatrixAt(index, dummy.matrix);
    buildings.setColorAt(index, spec.color);
  });
  buildings.instanceMatrix.needsUpdate = true;
  if (buildings.instanceColor) buildings.instanceColor.needsUpdate = true;
  city.add(buildings);

  const windowMaterial = new THREE.MeshBasicMaterial({
    map: cityWindowTexture(), color: 0xffffff, toneMapped: false, transparent: true, opacity: .28, depthWrite: false,
  });
  const windows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), windowMaterial, specs.length);
  specs.forEach((spec, index) => {
    dummy.position.set(spec.x, spec.y, spec.z + spec.depth / 2 + .02);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(spec.width * .86, spec.height * .91, 1);
    dummy.updateMatrix();
    windows.setMatrixAt(index, dummy.matrix);
    windows.setColorAt(index, spec.lightColor);
  });
  windows.instanceMatrix.needsUpdate = true;
  if (windows.instanceColor) windows.instanceColor.needsUpdate = true;
  city.add(windows);

  const roofMaterial = new THREE.MeshBasicMaterial({ color: 0xff5964, toneMapped: false, transparent: true, opacity: .2 });
  const roofLights = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), roofMaterial, Math.ceil(specs.length / 5));
  let roofIndex = 0;
  specs.forEach((spec, index) => {
    if (index % 5 !== 0) return;
    dummy.position.set(spec.x, CITY_GROUND_Y + spec.height + .8, spec.z);
    dummy.scale.set(.5, .34, .5);
    dummy.updateMatrix();
    roofLights.setMatrixAt(roofIndex, dummy.matrix);
    roofIndex += 1;
  });
  roofLights.count = roofIndex;
  roofLights.instanceMatrix.needsUpdate = true;
  city.add(roofLights);

  const horizonMaterial = new THREE.MeshBasicMaterial({ color: 0x9bccec, transparent: true, opacity: .12, depthWrite: false, toneMapped: false });
  const horizonGlow = new THREE.Mesh(new THREE.PlaneGeometry(520, 190), horizonMaterial);
  horizonGlow.position.set(0, 28, -390);
  city.add(horizonGlow);

  const morningPhase = (VISUAL_MORNING_HOUR - 6) / 24;
  let elapsed = VISUAL_DAY_SECONDS * morningPhase;
  const top = new THREE.Color();
  const upper = new THREE.Color();
  const horizon = new THREE.Color();
  const sunColor = new THREE.Color();
  const hemiSky = new THREE.Color();
  const hemiGround = new THREE.Color();
  const fogColor = new THREE.Color();
  const windowFill = new THREE.Color();
  const sample: CityLightingSample = {
    daylight: 1,
    night: 0,
    sunIntensity: 3,
    sunColor,
    hemisphereSky: hemiSky,
    hemisphereGround: hemiGround,
    fogColor,
    windowFill,
    exposure: 1,
    phase: morningPhase,
    hour: VISUAL_MORNING_HOUR,
    minute: 30,
  };

  const update = (delta: number): CityLightingSample => {
    elapsed = (elapsed + delta) % VISUAL_DAY_SECONDS;
    const phase = elapsed / VISUAL_DAY_SECONDS;
    const solar = Math.sin(phase * Math.PI * 2);
    const daylight = smooth(-.18, .2, solar);
    const night = 1 - daylight;
    const twilight = 1 - Math.min(1, Math.abs(solar) * 2.4);
    const hour = (6 + phase * 24) % 24;

    phaseColor(phase, 0x5a8fc5, 0x57a9e4, 0xc95f58, 0x061124, top);
    phaseColor(phase, 0xe5a86f, 0x9ed1ef, 0xf09a6b, 0x10233c, upper);
    phaseColor(phase, 0xffc88e, 0xe8f4ff, 0xff8a68, 0x273852, horizon);
    skyUniforms.topColor.value.copy(top);
    skyUniforms.upperColor.value.copy(upper);
    skyUniforms.horizonColor.value.copy(horizon);

    const orbit = phase * Math.PI * 2;
    sunDisc.position.set(Math.cos(orbit) * 300, 30 + Math.max(-.15, solar) * 220, -390);
    moon.position.set(-Math.cos(orbit) * 320, 36 + Math.max(-.08, -solar) * 205, -420);
    sunDiscMaterial.opacity = clamp01(daylight * 1.25);
    moonMaterial.opacity = clamp01(night * 1.15);
    windowMaterial.opacity = .12 + night * .88 + twilight * .12;
    roofMaterial.opacity = .08 + night * .9;
    horizonMaterial.opacity = .04 + twilight * .18 + night * .04;

    phaseColor(phase, 0xffb57a, 0xffe2b8, 0xff9b70, 0x7186aa, sunColor);
    phaseColor(phase, 0xa8c8df, 0xd7efff, 0xb89c9b, 0x24344c, hemiSky);
    phaseColor(phase, 0x3f3b37, 0x52606a, 0x4a3538, 0x101823, hemiGround);
    phaseColor(phase, 0x6f8292, 0xa8c1d0, 0x775d63, 0x1a2637, fogColor);
    phaseColor(phase, 0xffc798, 0xb9dcff, 0xff9a78, 0x779cff, windowFill);

    sample.daylight = daylight;
    sample.night = night;
    sample.sunIntensity = .35 + daylight * 3.15 + twilight * .7;
    sample.exposure = .88 + daylight * .28 + twilight * .08;
    sample.phase = phase;
    sample.hour = hour;
    sample.minute = Math.floor((hour % 1) * 60);
    return sample;
  };

  const skipToMorning = (): void => {
    elapsed = VISUAL_DAY_SECONDS * morningPhase;
  };

  return { update, skipToMorning };
}
