import * as THREE from 'three';
import { box, material, sphere } from './office-primitives';
import { cityWindowTexture } from './voxel-textures';

const VISUAL_DAY_SECONDS = 12 * 60;
const CITY_GROUND_Y = -46;

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
}

export interface CityBackdropController {
  update: (delta: number) => CityLightingSample;
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
  if (phase < .25) return out.lerpColors(new THREE.Color(dawn), new THREE.Color(day), smooth(0, .25, phase));
  if (phase < .5) return out.lerpColors(new THREE.Color(day), new THREE.Color(dusk), smooth(.25, .5, phase));
  if (phase < .75) return out.lerpColors(new THREE.Color(dusk), new THREE.Color(night), smooth(.5, .75, phase));
  return out.lerpColors(new THREE.Color(night), new THREE.Color(dawn), smooth(.75, 1, phase));
}

export function cityBackdrop(scene: THREE.Scene): CityBackdropController {
  const skyUniforms = {
    topColor: { value: new THREE.Color(0x6baee1) },
    upperColor: { value: new THREE.Color(0x9bc9e8) },
    horizonColor: { value: new THREE.Color(0xe7f3ff) },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(620, 24, 14),
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
  const sunDisc = sphere(7.5, sunDiscMaterial, 0, 90, -300);
  const moon = sphere(5.5, moonMaterial, 0, 80, -320);
  sunDisc.castShadow = false;
  moon.castShadow = false;
  scene.add(sunDisc, moon);

  const city = new THREE.Group();
  scene.add(city);
  city.add(box(330, 1.4, 330, material(0x111820, .98), 0, CITY_GROUND_Y - .7, -120));

  const random = seededRandom(8713);
  const facadePalette = [0x172733, 0x1d3040, 0x243844, 0x1a2b39, 0x2b3e49, 0x203542, 0x293944];
  const lightPalette = [0xffd08a, 0x8fd7ff, 0xffae7a, 0xb9ddff, 0xa8f1d4];
  const specs: BuildingSpec[] = [];
  const layers = [
    { z: -24, count: 16, span: 90, width: [8, 16] as const, height: [70, 135] as const, depth: [8, 15] as const },
    { z: -48, count: 19, span: 120, width: [9, 20] as const, height: [85, 165] as const, depth: [9, 18] as const },
    { z: -82, count: 21, span: 150, width: [11, 25] as const, height: [95, 190] as const, depth: [10, 20] as const },
    { z: -122, count: 23, span: 180, width: [13, 30] as const, height: [105, 215] as const, depth: [11, 23] as const },
    { z: -172, count: 25, span: 220, width: [15, 35] as const, height: [120, 245] as const, depth: [12, 26] as const },
    { z: -232, count: 27, span: 270, width: [17, 42] as const, height: [135, 285] as const, depth: [14, 30] as const },
  ];

  layers.forEach((layer, layerIndex) => {
    for (let index = 0; index < layer.count; index += 1) {
      const width = layer.width[0] + random() * (layer.width[1] - layer.width[0]);
      const height = layer.height[0] + random() * (layer.height[1] - layer.height[0]);
      const depth = layer.depth[0] + random() * (layer.depth[1] - layer.depth[0]);
      specs.push({
        x: -layer.span / 2 + index * (layer.span / Math.max(1, layer.count - 1)) + (random() - .5) * (5 + layerIndex * 1.2),
        y: CITY_GROUND_Y + height / 2,
        z: layer.z - random() * (10 + layerIndex * 3),
        width,
        height,
        depth,
        color: new THREE.Color(facadePalette[Math.floor(random() * facadePalette.length)] ?? facadePalette[0]!),
        lightColor: new THREE.Color(lightPalette[Math.floor(random() * lightPalette.length)] ?? lightPalette[0]!),
      });
    }
  });

  const landmarks: Array<[number, number, number, number, number]> = [
    [-34, -35, 18, 190, 16], [28, -43, 22, 225, 18], [62, -86, 26, 260, 22],
    [-76, -112, 28, 245, 24], [4, -154, 34, 305, 28], [98, -198, 38, 330, 30],
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
    dummy.position.set(spec.x, CITY_GROUND_Y + spec.height + .6, spec.z);
    dummy.scale.set(.42, .28, .42);
    dummy.updateMatrix();
    roofLights.setMatrixAt(roofIndex, dummy.matrix);
    roofIndex += 1;
  });
  roofLights.count = roofIndex;
  roofLights.instanceMatrix.needsUpdate = true;
  city.add(roofLights);

  const horizonMaterial = new THREE.MeshBasicMaterial({ color: 0x9bccec, transparent: true, opacity: .12, depthWrite: false, toneMapped: false });
  const horizonGlow = new THREE.Mesh(new THREE.PlaneGeometry(380, 120), horizonMaterial);
  horizonGlow.position.set(0, 18, -300);
  city.add(horizonGlow);

  let elapsed = VISUAL_DAY_SECONDS * .04;
  const top = new THREE.Color();
  const upper = new THREE.Color();
  const horizon = new THREE.Color();
  const sunColor = new THREE.Color();
  const hemiSky = new THREE.Color();
  const hemiGround = new THREE.Color();
  const fogColor = new THREE.Color();
  const windowFill = new THREE.Color();

  const update = (delta: number): CityLightingSample => {
    elapsed = (elapsed + delta) % VISUAL_DAY_SECONDS;
    const phase = elapsed / VISUAL_DAY_SECONDS;
    const solar = Math.sin(phase * Math.PI * 2);
    const daylight = smooth(-.18, .2, solar);
    const night = 1 - daylight;
    const twilight = 1 - Math.min(1, Math.abs(solar) * 2.4);

    phaseColor(phase, 0x5a8fc5, 0x57a9e4, 0xc95f58, 0x061124, top);
    phaseColor(phase, 0xe5a86f, 0x9ed1ef, 0xf09a6b, 0x10233c, upper);
    phaseColor(phase, 0xffc88e, 0xe8f4ff, 0xff8a68, 0x273852, horizon);
    skyUniforms.topColor.value.copy(top);
    skyUniforms.upperColor.value.copy(upper);
    skyUniforms.horizonColor.value.copy(horizon);

    const orbit = phase * Math.PI * 2;
    sunDisc.position.set(Math.cos(orbit) * 220, 22 + Math.max(-.15, solar) * 170, -300);
    moon.position.set(-Math.cos(orbit) * 240, 28 + Math.max(-.08, -solar) * 150, -325);
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

    return {
      daylight,
      night,
      sunIntensity: .35 + daylight * 3.15 + twilight * .7,
      sunColor: sunColor.clone(),
      hemisphereSky: hemiSky.clone(),
      hemisphereGround: hemiGround.clone(),
      fogColor: fogColor.clone(),
      windowFill: windowFill.clone(),
      exposure: .88 + daylight * .28 + twilight * .08,
    };
  };

  return { update };
}
