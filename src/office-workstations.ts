import * as THREE from 'three';
import { box, cylinder, emissiveMaterial, material, shadowed, trimBox } from './office-primitives';
import { fanTexture, keyboardTexture } from './voxel-textures';

export function monitor(width = 1.05, color = 0x2d9dff): THREE.Group {
  const group = new THREE.Group();
  const frame = material(0x101923, .3, .58);
  const trim = material(0x465a68, .3, .6);
  const screenMaterial = emissiveMaterial(0x0b1a29, color, 1.3);
  const body = trimBox(width, .66, .095, frame, trim);
  body.position.y = .43;
  group.add(body);
  const screen = box(width - .11, .53, .018, screenMaterial, 0, .43, .058);
  screen.name = 'screen';
  group.add(screen);
  group.add(
    box(.12, .34, .1, frame, 0, .1, 0),
    shadowed(box(.58, .05, .26, frame, 0, -.075, .01), true, false),
    box(width * .38, .018, .012, emissiveMaterial(0x11283a, color, .45), 0, .68, .066),
  );
  return group;
}

export function chair(color = 0x263342): THREE.Group {
  const group = new THREE.Group();
  const upholstery = material(color, .64);
  const seam = material(0x15212b, .5, .38);
  const metal = material(0x141d25, .28, .7);
  const seat = trimBox(.62, .16, .58, upholstery, seam);
  seat.position.y = .61;
  const back = trimBox(.62, .72, .16, upholstery, seam);
  back.position.set(0, 1.01, .25);
  group.add(seat, back, cylinder(.065, .55, metal, 0, .29));
  const base = cylinder(.34, .045, metal, 0, .055, 0, 16);
  group.add(base);
  group.add(box(.08, .43, .08, metal, -.38, .7), box(.08, .43, .08, metal, .38, .7));
  return group;
}

function keyboard(color: number): THREE.Group {
  const group = new THREE.Group();
  const shell = trimBox(.8, .055, .3, material(0x17222b, .42, .48), material(0x40515d, .52, .34));
  group.add(shell);
  const keys = new THREE.Mesh(
    new THREE.PlaneGeometry(.72, .235),
    new THREE.MeshBasicMaterial({ map: keyboardTexture(color), transparent: false, toneMapped: false }),
  );
  keys.rotation.x = -Math.PI / 2;
  keys.position.y = .032;
  group.add(keys);
  return group;
}

function texturedFan(color: number, y: number): THREE.Group {
  const fan = new THREE.Group();
  fan.name = 'pc-fan';
  fan.position.set(0, y, .382);
  const disc = new THREE.Mesh(
    new THREE.PlaneGeometry(.27, .27),
    new THREE.MeshBasicMaterial({ map: fanTexture(color), transparent: true, depthWrite: false, toneMapped: false }),
  );
  fan.add(disc);
  return fan;
}

function pcTower(color: number): THREE.Group {
  const group = new THREE.Group();
  const shell = material(0x101821, .28, .68);
  const edge = material(0x405360, .3, .68);
  const glass = new THREE.MeshStandardMaterial({ color: 0x6f9db8, transparent: true, opacity: .17, roughness: .2, metalness: .2 });
  const chassis = trimBox(.48, .94, .74, shell, edge);
  group.add(chassis);
  group.add(box(.4, .79, .012, glass, -.246, 0, 0));
  for (const y of [-.26, 0, .26]) group.add(texturedFan(color, y));
  group.add(
    box(.24, .04, .03, emissiveMaterial(0x132332, color, .52), 0, -.31, -.34),
    box(.08, .025, .018, emissiveMaterial(0x111923, 0x62e7ad, .9), -.11, .37, .374),
    box(.04, .025, .018, material(0x596d79, .4, .5), .04, .37, .374),
  );
  return group;
}

export function desk(x: number, z: number, rotation = 0, screenColor = 0x2d9dff): THREE.Group {
  const group = new THREE.Group();
  const wood = material(0x8f694b, .56, .08);
  const woodEdge = material(0x51392b, .5, .18);
  const dark = material(0x202d38, .34, .64);
  const desktop = trimBox(2.5, .16, 1.2, wood, woodEdge);
  desktop.position.y = 1.08;
  group.add(desktop);
  group.add(box(2.12, .34, .07, dark, 0, .82, -.51));
  for (const legX of [-1.04, 1.04]) {
    group.add(shadowed(box(.12, 1.0, .12, dark, legX, .54, -.43), true, false));
    group.add(shadowed(box(.12, 1.0, .12, dark, legX, .54, .43), true, false));
  }

  const primary = monitor(1.1, screenColor);
  primary.position.set(-.43, 1.22, -.24);
  primary.rotation.y = -.06;
  const secondary = monitor(.84, screenColor);
  secondary.position.set(.62, 1.23, -.21);
  secondary.rotation.y = .12;
  const keys = keyboard(screenColor);
  keys.position.set(-.05, 1.19, .3);
  const mouse = trimBox(.14, .055, .22, material(0x1a252f, .4, .52), material(0x4e6370, .4, .45));
  mouse.position.set(.71, 1.19, .3);
  const tower = pcTower(screenColor);
  tower.position.set(.9, .52, -.04);
  group.add(primary, secondary, keys, mouse, tower);

  const seat = chair();
  seat.position.set(0, 0, 1.02);
  group.add(seat);
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  return group;
}
