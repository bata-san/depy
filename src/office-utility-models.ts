import * as THREE from 'three';
import { box, cylinder, decal, emissiveMaterial, material, trimBox } from './office-primitives';

export function plant(x: number, z: number, scale = 1): THREE.Group {
  const group = new THREE.Group();
  const pot = trimBox(.62 * scale, .54 * scale, .62 * scale, material(0x76513d, .78), material(0x3d2c25, .66));
  pot.position.y = .28 * scale;
  group.add(pot);
  const leafA = material(0x429267, .68);
  const leafB = material(0x67b67c, .66);
  for (let index = 0; index < 9; index += 1) {
    const leaf = box(.15 * scale, (.55 + index % 3 * .12) * scale, .28 * scale, index % 2 ? leafA : leafB, 0, .74 * scale);
    leaf.rotation.z = (index % 3 - 1) * .24;
    leaf.rotation.y = index / 9 * Math.PI * 2;
    leaf.position.x = Math.cos(index / 9 * Math.PI * 2) * .12 * scale;
    leaf.position.z = Math.sin(index / 9 * Math.PI * 2) * .12 * scale;
    group.add(leaf);
  }
  group.position.set(x, 0, z);
  return group;
}

export function serverRack(x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  const shell = material(0x111a23, .28, .72);
  const trim = material(0x40505c, .3, .68);
  const rack = trimBox(1.08, 2.78, .94, shell, trim);
  rack.position.y = 1.39;
  group.add(rack);
  for (let index = 0; index < 10; index += 1) {
    group.add(box(.82, .17, .035, material(index % 2 ? 0x1e2a34 : 0x17212b, .36, .62), 0, .3 + index * .245, .492));
    const light = box(.045, .045, .025, emissiveMaterial(0x193329, index % 4 === 0 ? 0x65c9ff : 0x45ff9e, 1.15), .31, .3 + index * .245, .515);
    light.name = 'server-light';
    group.add(light);
    group.add(box(.22, .025, .02, material(0x61727c, .45, .5), -.22, .3 + index * .245, .515));
  }
  group.add(box(.72, .08, .04, emissiveMaterial(0x163146, 0x52b9ff, .55), 0, 2.58, .515));
  group.position.set(x, 0, z);
  return group;
}

export function partsShelf(x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  const frame = material(0x26343f, .32, .68);
  const crateColors = [0x5b6b77, 0x526d66, 0x6c6254];
  group.add(box(2.25, .12, .76, frame, 0, .1), box(.12, 2.5, .12, frame, -1.05, 1.27), box(.12, 2.5, .12, frame, 1.05, 1.27));
  for (let level = 0; level < 4; level += 1) {
    group.add(box(2.15, .08, .76, frame, 0, .5 + level * .6));
    for (let slot = -1; slot <= 1; slot += 1) {
      const crate = trimBox(.58, .36, .58, material(crateColors[(level + slot + 3) % crateColors.length] ?? 0x5b6b77, .68), material(0x374550, .55, .3));
      crate.position.set(slot * .67, .69 + level * .6, 0);
      group.add(crate);
      group.add(decal(.28, .075, level % 2 ? 0x67caff : 0x63e7ad, slot * .67, .71 + level * .6, .301));
    }
  }
  group.position.set(x, 0, z);
  return group;
}

export function deliveryRobot(): THREE.Group {
  const group = new THREE.Group();
  const body = material(0x38586e, .28, .66);
  const trim = material(0x111d27, .26, .76);
  const base = trimBox(.8, .3, .64, body, trim);
  base.position.y = .28;
  const cargo = trimBox(.58, .2, .46, material(0x526d7d, .45, .45), trim);
  cargo.position.y = .5;
  group.add(base, cargo);
  const beacon = box(.14, .095, .14, emissiveMaterial(0x2f9f72, 0x45ffad, 1.35), 0, .66);
  beacon.name = 'robot-beacon';
  group.add(beacon);
  for (const x of [-.28, .28]) for (const z of [-.24, .24]) {
    const wheel = cylinder(.095, .09, material(0x0d141b, .4, .7), x, .12, z, 12);
    wheel.rotation.z = Math.PI / 2;
    group.add(wheel);
  }
  group.add(decal(.3, .065, 0x64c9ff, 0, .34, .333));
  group.name = 'delivery-robot';
  return group;
}

export function floatingDataCube(color: number, x: number, y: number, z: number): THREE.Mesh {
  const cube = box(.2, .2, .2, emissiveMaterial(0x172c3b, color, .62), x, y, z);
  cube.userData.baseY = y;
  return cube;
}
