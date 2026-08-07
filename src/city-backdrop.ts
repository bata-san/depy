import * as THREE from 'three';
import { box, emissiveMaterial, material, sphere } from './office-primitives';
import { cityWindowTexture } from './voxel-textures';

export interface CityBackdropController {
  update: (delta: number) => void;
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

function addSky(scene: THREE.Scene): void {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(150, 20, 12),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x071225) },
        upperColor: { value: new THREE.Color(0x162d49) },
        horizonColor: { value: new THREE.Color(0x5c6672) },
        sunsetColor: { value: new THREE.Color(0xd48667) },
      },
      vertexShader: 'varying vec3 vWorld; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vWorld=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
      fragmentShader: 'varying vec3 vWorld; uniform vec3 topColor; uniform vec3 upperColor; uniform vec3 horizonColor; uniform vec3 sunsetColor; void main(){ float h=normalize(vWorld).y; vec3 c=mix(horizonColor,upperColor,smoothstep(.02,.5,h)); c=mix(c,topColor,smoothstep(.45,.9,h)); c=mix(sunsetColor,c,smoothstep(-.15,.08,h)); gl_FragColor=vec4(c,1.0); }',
    }),
  );
  scene.add(sky);

  const moon = sphere(3.6, new THREE.MeshBasicMaterial({ color: 0xffe9c9, toneMapped: false }), 34, 30, -105);
  moon.castShadow = false;
  scene.add(moon);
}

export function cityBackdrop(scene: THREE.Scene): CityBackdropController {
  addSky(scene);
  const city = new THREE.Group();
  scene.add(city);

  city.add(box(140, .6, 90, material(0x0e1720, .98), 0, -.78, -42));
  city.add(box(130, .08, 4.2, material(0x151f28, .95), 0, -.43, -11.8));
  city.add(box(130, .05, .12, emissiveMaterial(0x2b2d2a, 0xffc66f, .18), 0, -.37, -11.72));

  const random = seededRandom(8713);
  const facadePalette = [0x152432, 0x1a2b39, 0x20313e, 0x172733, 0x293a46, 0x213342];
  const lightPalette = [0xffd18a, 0x90d7ff, 0xffad7c, 0xb6ddff, 0xa9f2d5];
  const specs: BuildingSpec[] = [];

  const layers = [
    { z: -17, count: 20, width: [2.0, 4.8], height: [7, 17], depth: [2.2, 4.2] },
    { z: -25, count: 23, width: [2.2, 5.5], height: [8, 21], depth: [2.4, 4.8] },
    { z: -34, count: 25, width: [2.5, 6.2], height: [9, 24], depth: [2.8, 5.4] },
    { z: -45, count: 27, width: [2.8, 7.0], height: [10, 27], depth: [3.0, 5.8] },
    { z: -58, count: 29, width: [3.0, 7.8], height: [11, 30], depth: [3.2, 6.2] },
    { z: -73, count: 31, width: [3.4, 8.8], height: [12, 34], depth: [3.5, 6.8] },
  ] as const;

  layers.forEach((layer, layerIndex) => {
    for (let index = 0; index < layer.count; index += 1) {
      const spread = 118;
      const width = layer.width[0] + random() * (layer.width[1] - layer.width[0]);
      const height = layer.height[0] + random() * (layer.height[1] - layer.height[0]);
      const depth = layer.depth[0] + random() * (layer.depth[1] - layer.depth[0]);
      const x = -spread / 2 + index * (spread / Math.max(1, layer.count - 1)) + (random() - .5) * 2.6;
      const z = layer.z - random() * (4 + layerIndex * .8);
      specs.push({
        x,
        y: height / 2 - .45,
        z,
        width,
        height,
        depth,
        color: new THREE.Color(facadePalette[Math.floor(random() * facadePalette.length)] ?? facadePalette[0]!),
        lightColor: new THREE.Color(lightPalette[Math.floor(random() * lightPalette.length)] ?? lightPalette[0]!),
      });
    }
  });

  const landmarks: Array<[number, number, number, number, number]> = [
    [-27, -27, 6.8, 29, 5.4],
    [19, -31, 7.6, 34, 6.1],
    [39, -47, 9.4, 41, 7.4],
    [-44, -53, 8.8, 37, 6.8],
    [4, -67, 10.4, 48, 8.0],
  ];
  landmarks.forEach(([x, z, width, height, depth], index) => specs.push({
    x, y: height / 2 - .45, z, width, height, depth,
    color: new THREE.Color(index % 2 ? 0x203645 : 0x263b48),
    lightColor: new THREE.Color(index % 2 ? 0x7cd8ff : 0xffc67d),
  }));

  const dummy = new THREE.Object3D();
  const buildings = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .91, metalness: .05 }),
    specs.length,
  );
  buildings.frustumCulled = true;
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

  const windowMaterial = new THREE.MeshBasicMaterial({ map: cityWindowTexture(), color: 0xffffff, toneMapped: false });
  const windows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), windowMaterial, specs.length);
  specs.forEach((spec, index) => {
    dummy.position.set(spec.x, spec.y, spec.z + spec.depth / 2 + .018);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(spec.width * .84, spec.height * .88, 1);
    dummy.updateMatrix();
    windows.setMatrixAt(index, dummy.matrix);
    windows.setColorAt(index, spec.lightColor);
  });
  windows.instanceMatrix.needsUpdate = true;
  if (windows.instanceColor) windows.instanceColor.needsUpdate = true;
  city.add(windows);

  const roofLights = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: 0xff5d62, toneMapped: false }),
    Math.ceil(specs.length / 6),
  );
  let roofIndex = 0;
  specs.forEach((spec, index) => {
    if (index % 6 !== 0) return;
    dummy.position.set(spec.x, spec.height - .2, spec.z);
    dummy.scale.set(.18, .12, .18);
    dummy.updateMatrix();
    roofLights.setMatrixAt(roofIndex, dummy.matrix);
    roofIndex += 1;
  });
  roofLights.count = roofIndex;
  roofLights.instanceMatrix.needsUpdate = true;
  city.add(roofLights);

  const roadStripe = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: 0xffd17b, toneMapped: false }),
    42,
  );
  for (let index = 0; index < 42; index += 1) {
    dummy.position.set(-61 + index * 3, -.37, -11.4);
    dummy.scale.set(1.25, .02, .07);
    dummy.updateMatrix();
    roadStripe.setMatrixAt(index, dummy.matrix);
  }
  roadStripe.instanceMatrix.needsUpdate = true;
  city.add(roadStripe);

  const carCount = 18;
  const carMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .45, metalness: .25 });
  const cars = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), carMaterial, carCount);
  const carX = new Float32Array(carCount);
  const carLane = new Int8Array(carCount);
  const carSpeed = new Float32Array(carCount);
  const carColor = [0x8c4d52, 0x4d758f, 0xb08b55, 0x5f7c61, 0x6d628d];
  for (let index = 0; index < carCount; index += 1) {
    carX[index] = -55 + index * 6.2;
    carLane[index] = index % 2;
    carSpeed[index] = 1.8 + (index % 5) * .24;
    cars.setColorAt(index, new THREE.Color(carColor[index % carColor.length] ?? 0x6b7480));
  }
  if (cars.instanceColor) cars.instanceColor.needsUpdate = true;
  city.add(cars);

  const horizonGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 26),
    new THREE.MeshBasicMaterial({ color: 0x395d78, transparent: true, opacity: .08, depthWrite: false, toneMapped: false }),
  );
  horizonGlow.position.set(0, 8, -88);
  city.add(horizonGlow);

  const updateCars = (delta: number): void => {
    for (let index = 0; index < carCount; index += 1) {
      const direction = carLane[index] === 0 ? 1 : -1;
      carX[index] += carSpeed[index] * delta * direction;
      if (carX[index] > 64) carX[index] = -64;
      if (carX[index] < -64) carX[index] = 64;
      dummy.position.set(carX[index], -.28, -11.05 - carLane[index] * 1.28);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1.0, .26, .46);
      dummy.updateMatrix();
      cars.setMatrixAt(index, dummy.matrix);
    }
    cars.instanceMatrix.needsUpdate = true;
  };
  updateCars(0);

  return { update: updateCars };
}
