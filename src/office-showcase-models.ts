import * as THREE from 'three';
import { box, decal, emissiveMaterial, material, trimBox } from './office-primitives';
import { cpuPackage, gpuCard } from './office-hardware';

export function wallDisplay(x: number, y: number, z: number, width: number, color: number, name: string): THREE.Group {
  const group = new THREE.Group();
  const frame = trimBox(width, 1.55, .12, material(0x14212d, .28, .72), material(0x4a5d69, .26, .72));
  group.add(frame);
  const screen = box(width - .22, 1.31, .035, emissiveMaterial(0x0d1d2b, color, 1.35), 0, 0, .078);
  screen.name = name;
  group.add(screen);
  for (let row = 0; row < 4; row += 1) {
    const barWidth = width * (.24 + row * .12);
    group.add(decal(barWidth, .07, row % 2 ? 0x6fe6b1 : color, -width * .18 + barWidth * .15, .38 - row * .24, .101));
  }
  group.position.set(x, y, z);
  return group;
}

export function meetingArea(x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  const wood = material(0x6f513d, .58, .12);
  const edge = material(0x35271f, .42, .42);
  const table = trimBox(3.3, .18, 1.5, wood, edge);
  table.position.y = .88;
  group.add(table);
  group.add(box(.18, .82, .18, material(0x202c35, .34, .62), -1.25, .43), box(.18, .82, .18, material(0x202c35, .34, .62), 1.25, .43));
  for (const side of [-1, 1]) {
    for (const seatX of [-1.05, 0, 1.05]) {
      const chair = new THREE.Group();
      chair.add(box(.52, .13, .5, material(0x2c3b49, .64), 0, .58));
      chair.add(box(.52, .62, .13, material(0x263541, .64), 0, .9, side * .2));
      chair.add(box(.08, .5, .08, material(0x121a21, .32, .7), 0, .3));
      chair.position.set(seatX, 0, side * 1.12);
      if (side < 0) chair.rotation.y = Math.PI;
      group.add(chair);
    }
  }
  group.add(box(.75, .045, .42, emissiveMaterial(0x132838, 0x6dc8ff, .48), 0, .99, 0));
  group.position.set(x, 0, z);
  return group;
}

export function productShowcase(x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  const base = trimBox(3.15, .42, 1.8, material(0x182631, .3, .7), material(0x435967, .26, .72));
  base.position.y = .24;
  group.add(base);
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x9bd7ef, transparent: true, opacity: .14, transmission: .84, roughness: .08, metalness: .04 });
  group.add(
    box(3.0, .055, 1.62, glass, 0, 1.72),
    box(3.0, 1.25, .045, glass, 0, 1.1, -.79),
    box(.045, 1.25, 1.62, glass, -1.49, 1.1, 0),
    box(.045, 1.25, 1.62, glass, 1.49, 1.1, 0),
  );
  const cpuPedestal = trimBox(.92, .22, .92, material(0x273945, .32, .62), material(0x4e6370, .3, .7));
  cpuPedestal.position.set(-.78, .56, 0);
  const gpuPedestal = trimBox(1.55, .22, .82, material(0x273945, .32, .62), material(0x4e6370, .3, .7));
  gpuPedestal.position.set(.65, .56, 0);
  group.add(cpuPedestal, gpuPedestal);
  const chip = cpuPackage();
  chip.position.set(-.78, .73, 0);
  chip.rotation.x = -.08;
  const gpu = gpuCard();
  gpu.position.set(.65, .98, 0);
  gpu.rotation.x = -.18;
  gpu.scale.setScalar(.88);
  group.add(chip, gpu);
  group.add(
    box(.72, .16, .035, emissiveMaterial(0x13283a, 0x62e7ad, .8), -.78, .48, .91),
    box(1.22, .16, .035, emissiveMaterial(0x13283a, 0x65bfff, .8), .65, .48, .91),
  );
  for (const px of [-1.25, 1.25]) group.add(box(.08, 1.35, .08, emissiveMaterial(0x1e3242, 0x72cfff, .38), px, 1.05, -.65));
  group.position.set(x, 0, z);
  return group;
}
