import * as THREE from 'three';

export const material = (color: number, roughness = .7, metalness = .08): THREE.MeshStandardMaterial => new THREE.MeshStandardMaterial({ color, roughness, metalness });
export const emissiveMaterial = (color: number, emissive: number, intensity = 1): THREE.MeshStandardMaterial => new THREE.MeshStandardMaterial({ color, roughness: .42, metalness: .18, emissive, emissiveIntensity: intensity });

export function box(width: number, height: number, depth: number, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function cylinder(radius: number, height: number, mat: THREE.Material, x = 0, y = 0, z = 0, segments = 20): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function sphere(radius: number, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 14), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

export function addFloorTiles(group: THREE.Group): void {
  const tileA = material(0x263341, .92);
  const tileB = material(0x2d3b49, .9);
  for (let x = -8; x < 8; x += 1) {
    for (let z = -6; z < 6; z += 1) {
      group.add(box(.96, .06, .96, (x + z) % 2 === 0 ? tileA : tileB, x + .5, -.02, z + .5));
    }
  }
}

export function monitor(width = 1.05, color = 0x2d9dff): THREE.Group {
  const group = new THREE.Group();
  const frame = material(0x17212c, .4, .48);
  const screenMaterial = emissiveMaterial(0x10243a, color, 1.45);
  group.add(box(width, .62, .08, frame, 0, .42, 0));
  const screen = box(width - .11, .51, .025, screenMaterial, 0, .42, -.054);
  screen.name = 'screen';
  group.add(screen, box(.1, .35, .1, frame, 0, .09, .02), box(.55, .05, .25, frame, 0, -.08, .02));
  return group;
}

export function chair(color = 0x263342): THREE.Group {
  const group = new THREE.Group();
  const upholstery = material(color, .7);
  const metal = material(0x17212a, .38, .58);
  group.add(box(.58, .14, .55, upholstery, 0, .58), box(.58, .7, .14, upholstery, 0, 1, .23));
  group.add(cylinder(.07, .58, metal, 0, .27), box(.8, .07, .07, metal, 0, .04), box(.07, .07, .8, metal, 0, .04));
  return group;
}

export function desk(x: number, z: number, rotation = 0, screenColor = 0x2d9dff): THREE.Group {
  const group = new THREE.Group();
  const wood = material(0x8f684a, .66, .05);
  const dark = material(0x26323d, .48, .38);
  group.add(box(2.45, .15, 1.18, wood, 0, 1.08));
  group.add(box(2.18, .13, .18, dark, 0, .92, .42));
  for (const [legX, legZ] of [[-1.02, -.43], [1.02, -.43], [-1.02, .43], [1.02, .43]]) group.add(box(.13, 1.02, .13, dark, legX, .54, legZ));
  const primary = monitor(1.06, screenColor);
  primary.position.set(-.42, 1.22, -.22);
  primary.rotation.y = .07;
  const secondary = monitor(.78, screenColor);
  secondary.position.set(.58, 1.23, -.2);
  secondary.rotation.y = -.13;
  group.add(primary, secondary, box(.72, .045, .24, dark, 0, 1.17, .3), box(.28, .05, .42, dark, .72, 1.17, .26));
  const seat = chair();
  seat.position.set(0, 0, .98);
  seat.rotation.y = Math.PI;
  group.add(seat);
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  return group;
}

export function staffPerson(color: number, x: number, z: number, rotation = 0, variant = 0): THREE.Group {
  const group = new THREE.Group();
  const skinPalette = [0xecc09d, 0xd9a77f, 0xf2c9aa, 0xb98062];
  const hairPalette = [0x302720, 0x15191f, 0x6d472d, 0x40303a];
  const skin = material(skinPalette[variant % skinPalette.length] ?? 0xecc09d, .84);
  const shirt = material(color, .72);
  const accent = emissiveMaterial(0x213546, color, .18);
  const pants = material(variant % 3 === 0 ? 0x24384b : 0x23303d, .78);
  const hair = material(hairPalette[variant % hairPalette.length] ?? 0x302720, .84);
  const shoes = material(0x141b22, .72, .16);

  const torso = box(.52, .62, .3, shirt, 0, 1.15);
  torso.name = 'torso';
  const head = box(.4, .42, .38, skin, 0, 1.72);
  head.name = 'head';
  const hairTop = box(.42, .12, .4, hair, 0, 1.97, .01);
  const hairBack = box(.42, .24, .1, hair, 0, 1.82, .19);
  const leftArm = box(.16, .58, .18, shirt, -.36, 1.15, -.02);
  const rightArm = box(.16, .58, .18, shirt, .36, 1.15, -.02);
  leftArm.name = 'left-arm';
  rightArm.name = 'right-arm';
  const leftLeg = box(.2, .58, .23, pants, -.14, .56);
  const rightLeg = box(.2, .58, .23, pants, .14, .56);
  leftLeg.name = 'left-leg';
  rightLeg.name = 'right-leg';
  const leftShoe = box(.22, .12, .34, shoes, -.14, .22, -.06);
  const rightShoe = box(.22, .12, .34, shoes, .14, .22, -.06);
  const badge = box(.13, .18, .025, accent, .12, 1.22, -.165);
  const eye = material(0x17212a, .65);
  const leftEye = box(.045, .045, .02, eye, -.095, 1.77, -.205);
  const rightEye = box(.045, .045, .02, eye, .095, 1.77, -.205);
  group.add(torso, head, hairTop, hairBack, leftArm, rightArm, leftLeg, rightLeg, leftShoe, rightShoe, badge, leftEye, rightEye);

  if (variant % 4 === 1) {
    group.add(box(.44, .035, .035, material(0x25313c, .35, .55), 0, 1.79, -.225));
    group.add(box(.035, .05, .035, material(0x25313c, .35, .55), 0, 1.79, -.225));
  }
  if (variant % 5 === 2) group.add(box(.5, .12, .42, hair, 0, 1.93, .02));

  leftArm.rotation.x = -.35;
  rightArm.rotation.x = -.35;
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  group.userData.phase = variant * .73 + Math.random() * .4;
  group.userData.baseX = x;
  group.userData.baseZ = z;
  return group;
}

export function plant(x: number, z: number, scale = 1): THREE.Group {
  const group = new THREE.Group();
  group.add(cylinder(.31 * scale, .55 * scale, material(0x73503d, .82), 0, .28 * scale));
  const leafMaterial = material(0x3e8f61, .74);
  for (let index = 0; index < 7; index += 1) {
    const leaf = box(.16 * scale, .7 * scale, .34 * scale, leafMaterial, 0, .82 * scale);
    leaf.rotation.z = (index - 3) * .18;
    leaf.rotation.y = index * .9;
    group.add(leaf);
  }
  group.position.set(x, 0, z);
  return group;
}

export function serverRack(x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  const shell = material(0x18232e, .38, .58);
  group.add(box(1.05, 2.75, .9, shell, 0, 1.37));
  for (let index = 0; index < 9; index += 1) {
    const module = box(.82, .18, .035, material(0x0e151d, .4, .62), 0, .32 + index * .27, -.47);
    const light = box(.045, .045, .025, emissiveMaterial(0x38d68b, 0x38ff9e, 2), .31, .32 + index * .27, -.5);
    group.add(module, light);
  }
  group.position.set(x, 0, z);
  return group;
}

export function cpuPackage(): THREE.Group {
  const group = new THREE.Group();
  const substrate = material(0x1f6b58, .55, .18);
  const spreader = material(0xb9c3c8, .25, .86);
  const darkMetal = material(0x2a343a, .3, .72);
  group.add(box(1.02, .1, 1.02, substrate, 0, .07));
  group.add(box(.73, .12, .73, spreader, 0, .17));
  group.add(box(.49, .035, .49, darkMetal, 0, .245));
  const contact = material(0xd6a94b, .28, .8);
  for (let row = -4; row <= 4; row += 1) for (let column = -4; column <= 4; column += 1) {
    if (Math.abs(row) < 2 && Math.abs(column) < 2) continue;
    group.add(box(.035, .022, .035, contact, row * .1, .002, column * .1));
  }
  const corner = emissiveMaterial(0x184737, 0x40f5ad, .55);
  group.add(box(.09, .035, .09, corner, -.42, .135, -.42));
  group.name = 'product-chip';
  return group;
}

export function gpuFan(x: number): THREE.Group {
  const fan = new THREE.Group();
  fan.name = 'gpu-fan';
  const hub = cylinder(.09, .08, material(0x111820, .35, .68));
  hub.rotation.x = Math.PI / 2;
  fan.add(hub);
  for (let blade = 0; blade < 9; blade += 1) {
    const item = box(.055, .025, .23, material(0x1a222a, .4, .55), 0, 0, -.1);
    item.rotation.z = blade / 9 * Math.PI * 2;
    fan.add(item);
  }
  const ring = cylinder(.27, .045, material(0x202b35, .36, .68));
  ring.rotation.x = Math.PI / 2;
  fan.add(ring);
  fan.position.x = x;
  return fan;
}

export function gpuCard(): THREE.Group {
  const group = new THREE.Group();
  const pcb = material(0x184f43, .52, .24);
  const shroud = material(0x263747, .3, .64);
  const copper = material(0xb87333, .24, .82);
  group.add(box(1.62, .62, .08, pcb));
  group.add(box(1.48, .56, .11, shroud, 0, 0, -.09));
  group.add(box(1.46, .07, .11, copper, 0, -.28, .05));
  const fanLeft = gpuFan(-.42);
  const fanRight = gpuFan(.42);
  fanLeft.position.z = -.17;
  fanRight.position.z = -.17;
  group.add(fanLeft, fanRight);
  for (let index = -5; index <= 5; index += 1) group.add(box(.045, .12, .025, material(0xd8ab55, .26, .82), index * .09, -.37, .02));
  for (let index = 0; index < 3; index += 1) {
    const pipe = cylinder(.026, 1.25, copper, -.58 + index * .12, 0, .1, 12);
    pipe.rotation.z = Math.PI / 2;
    group.add(pipe);
  }
  group.name = 'product-gpu';
  return group;
}

export function partsShelf(x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  const frame = material(0x26343f, .42, .62);
  const crate = material(0x65717b, .72, .12);
  group.add(box(2.2, .12, .72, frame, 0, .1), box(.12, 2.45, .12, frame, -1.02, 1.25), box(.12, 2.45, .12, frame, 1.02, 1.25));
  for (let level = 0; level < 4; level += 1) {
    group.add(box(2.1, .08, .72, frame, 0, .5 + level * .58));
    for (let slot = -1; slot <= 1; slot += 1) {
      const bin = box(.55, .34, .55, crate, slot * .66, .68 + level * .58);
      group.add(bin);
      group.add(box(.28, .08, .02, emissiveMaterial(0x1b2d39, level % 2 ? 0x67caff : 0x63e7ad, .4), slot * .66, .7 + level * .58, -.29));
    }
  }
  group.position.set(x, 0, z);
  return group;
}

export function waferInspectionStation(x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  const shell = material(0xd6dde1, .38, .34);
  const dark = material(0x22313d, .38, .62);
  group.add(box(1.9, 1.45, 1.2, shell, 0, .73));
  group.add(box(1.45, .58, .82, dark, 0, 1.35));
  const window = box(1.12, .37, .025, emissiveMaterial(0x143449, 0x5fd8ff, 1.1), 0, 1.42, -.43);
  window.name = 'wafer-screen';
  group.add(window);
  const platter = cylinder(.42, .07, material(0xaebbc3, .22, .78), 0, .94, -.18, 32);
  platter.name = 'wafer-platter';
  group.add(platter);
  for (let index = 0; index < 3; index += 1) group.add(box(.22, .08, .04, emissiveMaterial(0x172b35, index === 2 ? 0xffb969 : 0x63e7ad, .8), -.48 + index * .48, .5, -.62));
  group.position.set(x, 0, z);
  return group;
}

export function deliveryRobot(): THREE.Group {
  const group = new THREE.Group();
  const body = material(0x39566b, .38, .55);
  const trim = material(0x17242f, .32, .68);
  group.add(box(.72, .28, .58, body, 0, .27), box(.54, .16, .42, trim, 0, .48));
  const beacon = box(.13, .09, .13, emissiveMaterial(0x2f9f72, 0x45ffad, 1.2), 0, .61);
  beacon.name = 'robot-beacon';
  group.add(beacon);
  for (const x of [-.25, .25]) for (const z of [-.22, .22]) {
    const wheel = cylinder(.09, .08, material(0x10171d, .42, .62), x, .12, z, 12);
    wheel.rotation.z = Math.PI / 2;
    group.add(wheel);
  }
  group.add(box(.28, .06, .04, emissiveMaterial(0x163046, 0x64c9ff, .75), 0, .34, -.31));
  group.name = 'delivery-robot';
  return group;
}

export function floatingDataCube(color: number, x: number, y: number, z: number): THREE.Mesh {
  const cube = box(.18, .18, .18, emissiveMaterial(0x1a3142, color, .45), x, y, z);
  cube.userData.baseY = y;
  return cube;
}

export function productShowcase(x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  const base = material(0x1c2a38, .34, .62);
  const trim = material(0x647987, .28, .74);
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xbce8ff, transparent: true, opacity: .16, transmission: .78, roughness: .1, metalness: .02 });
  group.add(box(3.25, .36, 1.9, base, 0, .18), box(3.12, .045, 1.78, trim, 0, .39));
  const chip = cpuPackage();
  chip.position.set(-.68, .66, 0);
  chip.rotation.x = -.18;
  chip.rotation.z = .08;
  const gpu = gpuCard();
  gpu.position.set(.62, .92, 0);
  gpu.rotation.y = -.14;
  group.add(chip, gpu, box(3.05, 1.68, 1.68, glass, 0, 1.15));
  const light = new THREE.PointLight(0x42d8b3, 18, 5, 2);
  light.position.set(0, 2.2, 0);
  light.name = 'showcase-light';
  group.add(light);
  group.position.set(x, 0, z);
  return group;
}

export function researchBench(x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  const steel = material(0x283643, .4, .52);
  const bench = box(3.2, .14, 1.18, material(0x71808c, .58, .24), 0, 1.02);
  group.add(bench, box(.12, 1, .12, steel, -1.35, .5, -.42), box(.12, 1, .12, steel, 1.35, .5, -.42), box(.12, 1, .12, steel, -1.35, .5, .42), box(.12, 1, .12, steel, 1.35, .5, .42));
  const scope = box(.9, .52, .62, material(0x1d2a36, .38, .52), -.72, 1.36, -.05);
  const scopeScreen = box(.54, .3, .025, emissiveMaterial(0x11283a, 0x5ec6ff, 1.7), -.72, 1.41, -.38);
  scopeScreen.name = 'research-screen';
  const chamber = cylinder(.42, .76, new THREE.MeshPhysicalMaterial({ color: 0x8bd4ff, transparent: true, opacity: .2, transmission: .62, roughness: .18 }), .65, 1.43, .02, 24);
  chamber.name = 'research-chamber';
  group.add(scope, scopeScreen, chamber, box(.72, .08, .5, material(0x173d31, .42, .45), .65, 1.08));
  group.position.set(x, 0, z);
  return group;
}

export function meetingArea(x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  const wood = material(0x7f5b42, .64);
  const metal = material(0x26333f, .42, .5);
  group.add(box(4.1, .18, 2.05, wood, 0, 1.02));
  group.add(box(.38, .92, .38, metal, -1.45, .5), box(.38, .92, .38, metal, 1.45, .5));
  for (const [chairX, chairZ, rotation] of [[-1.1, -1.45, 0], [0, -1.45, 0], [1.1, -1.45, 0], [-1.1, 1.45, Math.PI], [0, 1.45, Math.PI], [1.1, 1.45, Math.PI]] as [number, number, number][]) {
    const item = chair(0x30465b);
    item.position.set(chairX, 0, chairZ);
    item.rotation.y = rotation;
    group.add(item);
  }
  const tableScreen = box(1.3, .05, .76, emissiveMaterial(0x10263b, 0x4ca8ff, 1), 0, 1.13);
  group.add(tableScreen);
  group.position.set(x, 0, z);
  return group;
}

export function wallDisplay(x: number, y: number, z: number, width: number, color: number, name: string): THREE.Group {
  const group = new THREE.Group();
  const frame = material(0x17212c, .36, .54);
  group.add(box(width + .16, 1.5, .12, frame, 0, 0));
  const screen = box(width, 1.34, .035, emissiveMaterial(0x102236, color, 1.25), 0, 0, -.08);
  screen.name = name;
  group.add(screen);
  for (let index = 0; index < 5; index += 1) {
    const bar = box(.18 + index * .12, .05, .02, material(0xffffff, .5), -width / 2 + .38 + index * .52, -.42 + index * .16, -.105);
    group.add(bar);
  }
  group.position.set(x, y, z);
  return group;
}

export function cityBackdrop(scene: THREE.Scene): void {
  const city = new THREE.Group();
  const buildingMaterial = material(0x111a25, .9);
  const windowMaterial = emissiveMaterial(0x18283b, 0xf1bc67, .35);
  for (let index = 0; index < 18; index += 1) {
    const width = .8 + Math.random() * 1.5;
    const height = 2.5 + Math.random() * 7;
    const building = box(width, height, 1.2, buildingMaterial, -8 + index * .95, height / 2 - .4, -9.5 - Math.random() * 3);
    city.add(building);
    for (let floor = .5; floor < height - .4; floor += .55) {
      if (Math.random() < .58) city.add(box(width * .55, .08, .03, windowMaterial, building.position.x, floor, building.position.z - .62));
    }
  }
  scene.add(city);
}
