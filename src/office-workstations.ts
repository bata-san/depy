import * as THREE from 'three';
import { box, cylinder, emissiveMaterial, material, trimBox } from './office-primitives';

export function monitor(width = 1.05, color = 0x2d9dff): THREE.Group {
  const group = new THREE.Group();
  const frame = material(0x121b25, .32, .62);
  const trim = material(0x3b5060, .32, .62);
  const screenMaterial = emissiveMaterial(0x0c1d2d, color, 1.55);
  const body = trimBox(width, .66, .095, frame, trim);
  body.position.y = .43;
  group.add(body);
  const screen = box(width - .13, .52, .025, screenMaterial, 0, .43, .061);
  screen.name = 'screen';
  group.add(screen);
  group.add(
    box(.13, .36, .12, frame, 0, .1, 0),
    box(.58, .055, .28, frame, 0, -.08, .01),
    box(width * .42, .025, .018, emissiveMaterial(0x13283a, color, .55), 0, .69, .066),
  );
  return group;
}

export function chair(color = 0x263342): THREE.Group {
  const group = new THREE.Group();
  const upholstery = material(color, .66);
  const seam = material(0x15212b, .5, .4);
  const metal = material(0x151e27, .28, .72);
  const seat = trimBox(.62, .16, .58, upholstery, seam);
  seat.position.y = .61;
  const back = trimBox(.62, .72, .16, upholstery, seam);
  back.position.set(0, 1.01, .25);
  group.add(seat, back);
  group.add(cylinder(.065, .55, metal, 0, .29));
  for (let index = 0; index < 5; index += 1) {
    const spoke = box(.7, .055, .07, metal, 0, .06);
    spoke.rotation.y = index / 5 * Math.PI * 2;
    group.add(spoke);
    const wheel = cylinder(.055, .06, material(0x0c1118, .62, .38), Math.cos(index / 5 * Math.PI * 2) * .34, .025, Math.sin(index / 5 * Math.PI * 2) * .34, 10);
    wheel.rotation.z = Math.PI / 2;
    group.add(wheel);
  }
  group.add(box(.08, .43, .08, metal, -.38, .7), box(.08, .43, .08, metal, .38, .7));
  return group;
}

function keyboard(color: number): THREE.Group {
  const group = new THREE.Group();
  const shell = material(0x19242e, .42, .5);
  group.add(box(.78, .045, .28, shell));
  const keyMat = material(0x3d4e5b, .7, .14);
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 10; column += 1) {
      group.add(box(.052, .018, .048, keyMat, -.31 + column * .069, .032, -.075 + row * .07));
    }
  }
  group.add(box(.22, .019, .045, emissiveMaterial(0x223244, color, .4), 0, .033, .09));
  return group;
}

function pcTower(color: number): THREE.Group {
  const group = new THREE.Group();
  const shell = material(0x111923, .3, .68);
  const edge = material(0x344755, .3, .7);
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x74a7c2, transparent: true, opacity: .16, transmission: .55, roughness: .22, metalness: .12 });
  const chassis = trimBox(.46, .91, .72, shell, edge);
  group.add(chassis);
  group.add(box(.39, .77, .018, glass, -.241, 0, 0));
  for (const y of [-.25, 0, .25]) {
    const fan = new THREE.Group();
    fan.name = 'pc-fan';
    fan.position.set(0, y, .382);
    const hub = cylinder(.13, .025, emissiveMaterial(0x172534, color, .55), 0, 0, 0, 16);
    hub.rotation.x = Math.PI / 2;
    fan.add(hub);
    for (let blade = 0; blade < 6; blade += 1) {
      const item = box(.035, .012, .105, material(0x2a3a47, .42, .5), 0, 0, .01);
      item.rotation.z = blade / 6 * Math.PI * 2;
      fan.add(item);
    }
    group.add(fan);
  }
  group.add(
    box(.07, .025, .018, emissiveMaterial(0x111923, 0x62e7ad, 1.1), -.11, .36, .374),
    box(.035, .025, .018, material(0x596d79, .4, .5), .03, .36, .374),
    box(.035, .025, .018, material(0x596d79, .4, .5), .09, .36, .374),
  );
  return group;
}

export function desk(x: number, z: number, rotation = 0, screenColor = 0x2d9dff): THREE.Group {
  const group = new THREE.Group();
  const wood = material(0x8c6648, .58, .08);
  const woodEdge = material(0x4c3528, .52, .18);
  const dark = material(0x202d38, .34, .64);
  const desktop = trimBox(2.48, .16, 1.2, wood, woodEdge);
  desktop.position.y = 1.08;
  group.add(desktop);
  group.add(box(2.15, .42, .08, dark, 0, .78, -.5));
  for (const [legX, legZ] of [[-1.04, -.43], [1.04, -.43], [-1.04, .43], [1.04, .43]] as [number, number][]) {
    group.add(box(.12, 1.02, .12, dark, legX, .54, legZ));
    group.add(box(.28, .055, .2, dark, legX, .055, legZ));
  }
  const primary = monitor(1.08, screenColor);
  primary.position.set(-.42, 1.22, -.24);
  primary.rotation.y = -.06;
  const secondary = monitor(.82, screenColor);
  secondary.position.set(.61, 1.23, -.21);
  secondary.rotation.y = .12;
  const keys = keyboard(screenColor);
  keys.position.set(-.04, 1.185, .3);
  const mouse = box(.14, .055, .22, material(0x1b2630, .4, .52), .71, 1.19, .3);
  const tower = pcTower(screenColor);
  tower.position.set(.88, .5, -.04);
  group.add(primary, secondary, keys, mouse, tower);
  const seat = chair();
  seat.position.set(0, 0, 1.02);
  group.add(seat);
  group.add(box(.035, .45, .035, material(0x0f151c, .5, .45), .78, .72, -.2));
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  return group;
}

