import * as THREE from 'three';
import { box, emissiveMaterial, material, sphere, trimBox } from './office-primitives';

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0xffffffff;
  };
}

function building(width: number, height: number, depth: number, color: number, windowColor: number, x: number, z: number, seed: number): THREE.Group {
  const random = seededRandom(seed);
  const group = new THREE.Group();
  const facade = material(color, .8, .12);
  const edge = material(new THREE.Color(color).multiplyScalar(.62).getHex(), .7, .24);
  const body = trimBox(width, height, depth, facade, edge);
  body.position.y = height / 2;
  group.add(body);
  const windowMatOn = emissiveMaterial(0x172435, windowColor, .55);
  const windowMatOff = material(0x1a2733, .72, .1);
  const columns = Math.max(2, Math.floor(width / .42));
  const rows = Math.max(3, Math.floor(height / .52));
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const lit = random() > .38;
      const window = box(width / columns * .45, .14, .025, lit ? windowMatOn : windowMatOff,
        -width / 2 + (column + .5) * width / columns,
        .38 + row * (height - .7) / Math.max(1, rows - 1),
        depth / 2 + .025);
      window.castShadow = false;
      group.add(window);
    }
  }
  group.add(box(width * .42, .12, depth * .45, material(0x26333c, .5, .5), 0, height + .08, 0));
  if (seed % 3 === 0) {
    group.add(box(.06, 1.2, .06, material(0x687985, .35, .7), 0, height + .72, 0));
    group.add(box(.14, .06, .14, emissiveMaterial(0x31171a, 0xff454f, 1.2), 0, height + 1.32, 0));
  }
  group.position.set(x, -.45, z);
  return group;
}

export function cityBackdrop(scene: THREE.Scene): void {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(90, 24, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        topColor: { value: new THREE.Color(0x0b182b) },
        horizonColor: { value: new THREE.Color(0x35506a) },
        bottomColor: { value: new THREE.Color(0xd38b68) },
      },
      vertexShader: 'varying vec3 vWorld; void main(){ vec4 world = modelMatrix * vec4(position,1.0); vWorld = world.xyz; gl_Position = projectionMatrix * viewMatrix * world; }',
      fragmentShader: 'varying vec3 vWorld; uniform vec3 topColor; uniform vec3 horizonColor; uniform vec3 bottomColor; void main(){ float h=normalize(vWorld).y; vec3 c=mix(horizonColor,topColor,smoothstep(0.0,.65,h)); c=mix(bottomColor,c,smoothstep(-.18,.12,h)); gl_FragColor=vec4(c,1.0); }',
    }),
  );
  scene.add(sky);

  const city = new THREE.Group();
  city.add(box(46, .5, 24, material(0x111923, .95), 0, -.72, -18));
  const road = material(0x171f27, .92);
  city.add(box(44, .08, 3.2, road, 0, -.42, -10.2));
  for (let x = -20; x <= 20; x += 2.4) city.add(box(1.1, .025, .08, emissiveMaterial(0x2b2e2a, 0xffd57a, .3), x, -.37, -9.95));

  const random = seededRandom(8713);
  const colors = [0x1a2836, 0x202f3d, 0x182633, 0x26333e, 0x1c2d3a];
  const windows = [0xffc978, 0x7bc8ff, 0xffa76c, 0xb4d8ff];
  for (let layer = 0; layer < 3; layer += 1) {
    const count = layer === 0 ? 12 : 16;
    for (let index = 0; index < count; index += 1) {
      const width = 1.1 + random() * (layer === 0 ? 1.4 : 2.2);
      const height = 3 + random() * (layer === 0 ? 6 : 10);
      const depth = 1.3 + random() * 1.3;
      const x = -19 + index * (38 / (count - 1)) + (random() - .5) * .8;
      const z = -13 - layer * 4.3 - random() * 2.2;
      const item = building(width, height, depth, colors[Math.floor(random() * colors.length)] ?? colors[0]!, windows[Math.floor(random() * windows.length)] ?? windows[0]!, x, z, 300 + layer * 50 + index);
      item.scale.setScalar(1 - layer * .08);
      city.add(item);
    }
  }

  for (let index = 0; index < 16; index += 1) {
    const car = box(.42, .13, .22, material(index % 2 ? 0x8a4b4f : 0x4b718c, .45, .35), -18 + index * 2.35, -.27, -9.7 - (index % 2) * .85);
    car.name = 'city-car';
    car.userData.lane = index % 2;
    car.userData.speed = .38 + (index % 5) * .045;
    car.add(box(.075, .04, .018, emissiveMaterial(0x2b241d, index % 2 ? 0xffe5a4 : 0xff5f62, .8), index % 2 ? .18 : -.18, .01, .12));
    city.add(car);
  }

  const moon = sphere(2.1, emissiveMaterial(0xf3e7cb, 0xffe5ba, .75), 16, 17, -42);
  moon.castShadow = false;
  city.add(moon);
  scene.add(city);
}
