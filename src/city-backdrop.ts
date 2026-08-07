import * as THREE from 'three';
import { box, emissiveMaterial, material, sphere } from './office-primitives';
import { cityWindowTexture } from './voxel-textures';

export interface CityBackdropController {
  update: (delta: number) => void;
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0xffffffff;
  };
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

export function cityBackdrop(scene: THREE.Scene): CityBackdropController {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(90, 18, 12),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x091426) },
        horizonColor: { value: new THREE.Color(0x39546c) },
        bottomColor: { value: new THREE.Color(0xc47c62) },
      },
      vertexShader: 'varying vec3 vWorld; void main(){ vec4 world=modelMatrix*vec4(position,1.0); vWorld=world.xyz; gl_Position=projectionMatrix*viewMatrix*world; }',
      fragmentShader: 'varying vec3 vWorld; uniform vec3 topColor; uniform vec3 horizonColor; uniform vec3 bottomColor; void main(){ float h=normalize(vWorld).y; vec3 c=mix(horizonColor,topColor,smoothstep(.02,.72,h)); c=mix(bottomColor,c,smoothstep(-.16,.12,h)); gl_FragColor=vec4(c,1.0); }',
    }),
  );
  scene.add(sky);

  const city = new THREE.Group();
  city.add(box(50, .5, 28, material(0x101820, .96), 0, -.72, -19));
  city.add(box(46, .08, 3.3, material(0x161f27, .94), 0, -.42, -10.25));

  const random = seededRandom(8713);
  const facadePalette = [0x182735, 0x1d2d3b, 0x223340, 0x172532, 0x283844];
  const lightPalette = [0xffd18a, 0x8fd6ff, 0xffad7c, 0xb7d9ff];
  const specs: BuildingSpec[] = [];
  for (let layer = 0; layer < 4; layer += 1) {
    const count = layer === 0 ? 14 : 18;
    for (let index = 0; index < count; index += 1) {
      const width = 1.1 + random() * (1.2 + layer * .42);
      const height = 3.1 + random() * (5.5 + layer * 2.2);
      const depth = 1.4 + random() * 1.8;
      const scale = 1 - layer * .055;
      specs.push({
        x: -20 + index * (40 / Math.max(1, count - 1)) + (random() - .5) * .9,
        y: height * scale / 2 - .45,
        z: -13 - layer * 4.3 - random() * 2.4,
        width: width * scale,
        height: height * scale,
        depth: depth * scale,
        color: new THREE.Color(facadePalette[Math.floor(random() * facadePalette.length)] ?? facadePalette[0]!),
        lightColor: new THREE.Color(lightPalette[Math.floor(random() * lightPalette.length)] ?? lightPalette[0]!),
      });
    }
  }

  const buildingGeometry = new THREE.BoxGeometry(1, 1, 1);
  const buildingMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .9, metalness: .06 });
  const buildings = new THREE.InstancedMesh(buildingGeometry, buildingMaterial, specs.length);
  buildings.frustumCulled = true;
  const dummy = new THREE.Object3D();
  specs.forEach((spec, index) => {
    dummy.position.set(spec.x, spec.y, spec.z);
    dummy.scale.set(spec.width, spec.height, spec.depth);
    dummy.updateMatrix();
    buildings.setMatrixAt(index, dummy.matrix);
    buildings.setColorAt(index, spec.color);
  });
  buildings.instanceMatrix.needsUpdate = true;
  if (buildings.instanceColor) buildings.instanceColor.needsUpdate = true;
  city.add(buildings);

  const windowMaterial = new THREE.MeshBasicMaterial({
    map: cityWindowTexture(),
    color: 0xffffff,
    toneMapped: false,
  });
  const windows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), windowMaterial, specs.length);
  specs.forEach((spec, index) => {
    dummy.position.set(spec.x, spec.y, spec.z + spec.depth / 2 + .015);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(spec.width * .82, spec.height * .84, 1);
    dummy.updateMatrix();
    windows.setMatrixAt(index, dummy.matrix);
    windows.setColorAt(index, spec.lightColor);
  });
  windows.instanceMatrix.needsUpdate = true;
  if (windows.instanceColor) windows.instanceColor.needsUpdate = true;
  city.add(windows);

  const stripeGeometry = new THREE.BoxGeometry(1, 1, 1);
  const stripes = new THREE.InstancedMesh(stripeGeometry, emissiveMaterial(0x2b2e2a, 0xffd57a, .22), 18);
  for (let index = 0; index < 18; index += 1) {
    dummy.position.set(-20 + index * 2.35, -.37, -9.95);
    dummy.scale.set(1.05, .025, .07);
    dummy.updateMatrix();
    stripes.setMatrixAt(index, dummy.matrix);
  }
  stripes.instanceMatrix.needsUpdate = true;
  city.add(stripes);

  const carCount = 12;
  const carMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .45, metalness: .25 });
  const cars = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), carMaterial, carCount);
  const carState = Array.from({ length: carCount }, (_, index) => ({
    x: -18 + index * 3.05,
    z: -9.65 - (index % 2) * .92,
    lane: index % 2,
    speed: .44 + (index % 4) * .07,
    color: new THREE.Color(index % 3 === 0 ? 0x9d5961 : index % 3 === 1 ? 0x477a9a : 0x6f8071),
  }));
  carState.forEach((car, index) => cars.setColorAt(index, car.color));
  if (cars.instanceColor) cars.instanceColor.needsUpdate = true;
  city.add(cars);

  const moon = sphere(2.05, emissiveMaterial(0xf3e7cb, 0xffe5ba, .62), 15.5, 16.5, -42);
  city.add(moon);
  scene.add(city);

  const updateCars = (delta: number): void => {
    carState.forEach((car, index) => {
      car.x += delta * car.speed * (car.lane === 0 ? 1 : -1);
      if (car.x > 21) car.x = -21;
      if (car.x < -21) car.x = 21;
      dummy.position.set(car.x, -.28, car.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(.5, .14, .24);
      dummy.updateMatrix();
      cars.setMatrixAt(index, dummy.matrix);
    });
    cars.instanceMatrix.needsUpdate = true;
  };
  updateCars(0);

  return { update: updateCars };
}
