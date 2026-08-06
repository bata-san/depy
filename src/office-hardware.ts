import * as THREE from 'three';
import { box, cylinder, decal, emissiveMaterial, material, trimBox } from './office-primitives';

export function cpuPackage(): THREE.Group {
  const group = new THREE.Group();
  const substrate = material(0x155a4c, .48, .24);
  const substrateEdge = material(0x0b3029, .42, .4);
  const spreader = material(0xc1cbd0, .2, .88);
  const darkMetal = material(0x2e383e, .26, .76);
  const board = trimBox(1.08, .105, 1.08, substrate, substrateEdge);
  board.position.y = .065;
  group.add(board);
  const lid = trimBox(.76, .14, .76, spreader, darkMetal);
  lid.position.y = .19;
  group.add(lid);
  group.add(box(.48, .032, .48, darkMetal, 0, .278));
  const contact = material(0xd6a94b, .22, .84);
  for (let row = -5; row <= 5; row += 1) for (let column = -5; column <= 5; column += 1) {
    if (Math.abs(row) < 2 && Math.abs(column) < 2) continue;
    group.add(box(.031, .02, .031, contact, row * .09, .002, column * .09));
  }
  group.add(decal(.11, .11, 0x47f0ae, -.43, .15, .545));
  group.name = 'product-chip';
  return group;
}

export function gpuFan(x: number): THREE.Group {
  const fan = new THREE.Group();
  fan.name = 'gpu-fan';
  const hub = cylinder(.095, .07, material(0x101820, .26, .72));
  hub.rotation.x = Math.PI / 2;
  fan.add(hub);
  for (let blade = 0; blade < 10; blade += 1) {
    const item = box(.052, .022, .24, material(0x202a33, .36, .6), 0, 0, -.105);
    item.rotation.z = blade / 10 * Math.PI * 2;
    fan.add(item);
  }
  const ring = cylinder(.285, .04, material(0x34434f, .3, .68));
  ring.rotation.x = Math.PI / 2;
  fan.add(ring);
  fan.position.x = x;
  return fan;
}

export function gpuCard(): THREE.Group {
  const group = new THREE.Group();
  const pcb = material(0x12483e, .46, .3);
  const shroud = material(0x263746, .24, .72);
  const trim = material(0x586b77, .24, .72);
  const copper = material(0xb87333, .2, .86);
  const board = trimBox(1.74, .68, .09, pcb, material(0x0b2924, .4, .45));
  group.add(board);
  const cooler = trimBox(1.58, .6, .13, shroud, trim);
  cooler.position.z = .1;
  group.add(cooler);
  const fanLeft = gpuFan(-.43);
  const fanRight = gpuFan(.43);
  fanLeft.position.z = .19;
  fanRight.position.z = .19;
  group.add(fanLeft, fanRight);
  group.add(box(1.56, .07, .12, copper, 0, -.31, -.02));
  for (let index = -6; index <= 6; index += 1) group.add(box(.042, .12, .025, material(0xd8ab55, .2, .86), index * .087, -.4, -.01));
  for (let index = 0; index < 3; index += 1) {
    const pipe = cylinder(.025, 1.36, copper, -.58 + index * .12, 0, -.09, 12);
    pipe.rotation.z = Math.PI / 2;
    group.add(pipe);
  }
  group.add(box(.28, .13, .035, material(0x303b44, .28, .74), -.68, .21, -.08), box(.28, .13, .035, material(0x303b44, .28, .74), -.68, .03, -.08));
  group.name = 'product-gpu';
  return group;
}

