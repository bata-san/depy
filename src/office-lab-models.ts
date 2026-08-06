import * as THREE from 'three';
import { box, cylinder, decal, emissiveMaterial, material, trimBox } from './office-primitives';

export function waferInspectionStation(x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  const shell = material(0xd4dde2, .3, .42);
  const shellEdge = material(0x748490, .28, .62);
  const dark = material(0x1c2b36, .3, .68);
  const body = trimBox(2.05, 1.5, 1.28, shell, shellEdge);
  body.position.y = .76;
  group.add(body);
  const head = trimBox(1.55, .66, .9, dark, material(0x425562, .3, .66));
  head.position.set(0, 1.48, 0);
  group.add(head);
  const window = box(1.18, .39, .025, emissiveMaterial(0x112d42, 0x62d9ff, 1.2), 0, 1.52, .463);
  window.name = 'wafer-screen';
  group.add(window);
  const platter = cylinder(.45, .07, material(0xaebbc3, .18, .82), 0, .96, .18, 32);
  platter.name = 'wafer-platter';
  group.add(platter);
  for (let ring = .1; ring <= .4; ring += .075) {
    const waferRing = new THREE.Mesh(new THREE.TorusGeometry(ring, .006, 6, 32), emissiveMaterial(0x193247, 0x62cfff, .4));
    waferRing.position.set(0, 1.005, .18);
    waferRing.rotation.x = Math.PI / 2;
    group.add(waferRing);
  }
  for (let index = 0; index < 4; index += 1) group.add(decal(.2, .075, index === 3 ? 0xffb969 : 0x63e7ad, -.52 + index * .35, .52, .652));
  group.position.set(x, 0, z);
  return group;
}

export function researchBench(x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  const steel = material(0x253541, .3, .66);
  const benchTop = trimBox(3.35, .16, 1.26, material(0x778892, .48, .34), steel);
  benchTop.position.y = 1.04;
  group.add(benchTop);
  for (const legX of [-1.42, 1.42]) for (const legZ of [-.46, .46]) group.add(box(.12, 1.02, .12, steel, legX, .52, legZ));
  const scope = trimBox(.95, .56, .66, material(0x182632, .3, .66), material(0x40535f, .3, .66));
  scope.position.set(-.75, 1.4, -.04);
  const scopeScreen = box(.57, .32, .025, emissiveMaterial(0x10283b, 0x5ec6ff, 1.75), -.75, 1.44, .305);
  scopeScreen.name = 'research-screen';
  const chamberGlass = new THREE.MeshPhysicalMaterial({ color: 0x8bd4ff, transparent: true, opacity: .18, transmission: .72, roughness: .12 });
  const chamber = cylinder(.43, .78, chamberGlass, .7, 1.46, .02, 24);
  chamber.name = 'research-chamber';
  const coil = new THREE.Mesh(new THREE.TorusGeometry(.25, .035, 8, 24), emissiveMaterial(0x19364b, 0x6adfff, .65));
  coil.position.set(.7, 1.46, .02);
  coil.rotation.x = Math.PI / 2;
  group.add(scope, scopeScreen, chamber, coil, box(.76, .09, .54, material(0x173d31, .36, .52), .7, 1.09));
  for (let index = 0; index < 4; index += 1) group.add(decal(.13, .06, index % 2 ? 0xffbd68 : 0x62e7ad, -1.3 + index * .25, 1.12, .64));
  group.position.set(x, 0, z);
  return group;
}
