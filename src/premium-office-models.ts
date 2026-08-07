import * as THREE from 'three';
import { box, cylinder, emissiveMaterial, material, roundedBox, shadowed, sphere } from './office-primitives';

const graphite = material(0x111920, .42, .58);
const charcoal = material(0x1b2730, .48, .45);
const steel = material(0x40525e, .28, .7);
const aluminum = material(0x8aa0ab, .22, .74);
const deskTop = material(0x263640, .48, .34);
const white = material(0xe7ecee, .56, .05);
const rubber = material(0x10161b, .68, .24);
const wood = material(0x6a4f39, .62, .08);
const glass = new THREE.MeshPhysicalMaterial({ color: 0x8ecfe7, roughness: .08, metalness: .04, transmission: .5, transparent: true, opacity: .2, depthWrite: false });

function shadows(root: THREE.Object3D, cast = true, receive = true): void {
  root.traverse((object) => { if (object instanceof THREE.Mesh) shadowed(object, cast, receive); });
}

function screenPanel(width: number, height: number, accent: number, name = 'screen'): THREE.Group {
  const group = new THREE.Group();
  group.add(roundedBox(width + .1, height + .1, .09, graphite));
  const screen = roundedBox(width, height, .04, emissiveMaterial(0x132535, accent, .75), 0, 0, .065);
  screen.name = name;
  group.add(screen);
  group.add(box(width * .68, .018, .012, material(0xd7f1fb, .25, .08), -.04, height * .27, .09));
  group.add(box(width * .44, .015, .012, material(0x74aabd, .4, .12), -width * .13, height * .08, .09));
  group.add(box(width * .56, .015, .012, material(0x587988, .5, .12), -width * .07, -height * .08, .09));
  group.add(box(width * .28, .015, .012, material(0x587988, .5, .12), -width * .21, -height * .24, .09));
  return group;
}

export function premiumArchitecture(office: THREE.Group): THREE.Mesh[] {
  const lights: THREE.Mesh[] = [];
  office.add(roundedBox(18.6, .34, 13.9, material(0x0c1419, .5, .48), 0, -.17, 0));
  office.add(box(18.1, .07, 13.4, material(0x17242c, .84, .1), 0, .035, 0));
  office.add(box(17.4, .022, 12.7, material(0x213540, .78, .08), 0, .083, 0));

  const seam = material(0x39515e, .78, .12);
  for (let x = -8; x <= 8; x += 2) office.add(box(.025, .012, 12.6, seam, x, .1, 0));
  for (let z = -5.6; z <= 5.6; z += 2) office.add(box(17.2, .012, .025, seam, 0, .1, z));

  const wall = material(0x121d24, .72, .26);
  office.add(box(18.6, 5.8, .24, wall, 0, 2.8, -6.85));
  office.add(box(.24, 5.8, 13.9, wall, -9.3, 2.8, 0));
  office.add(box(.24, 1.05, 13.9, wall, 9.3, .5, 0));

  const frame = material(0x2f414c, .3, .7);
  for (let x = -8.3; x <= 8.3; x += 2.08) {
    office.add(box(.08, 4.7, .09, frame, x, 2.85, 6.76));
    office.add(box(1.95, 4.6, .035, glass, x + 1.0, 2.85, 6.74));
  }
  office.add(box(18.4, .12, .16, frame, 0, 5.18, 6.72));
  office.add(box(18.4, .11, .16, frame, 0, .52, 6.72));

  const ceiling = material(0x0d171d, .48, .56);
  for (const x of [-6.2, -2.05, 2.05, 6.2]) {
    office.add(box(2.75, .12, .2, ceiling, x, 5.12, 0));
    for (const z of [-4.5, -1.5, 1.5, 4.5]) {
      const lamp = roundedBox(2.4, .05, .22, emissiveMaterial(0x202c31, 0xd8f4ff, .76), x, 5.0, z);
      lamp.name = 'ceiling-light';
      lights.push(lamp);
      office.add(lamp);
    }
  }

  const logo = roundedBox(3.2, .72, .09, emissiveMaterial(0x102332, 0x5ec8ff, .85), -6.3, 4.6, -6.68);
  logo.name = 'office-logo';
  office.add(logo);
  office.add(box(2.3, .025, .02, material(0xd8f3ff, .2, .12), -6.3, 4.63, -6.62));
  return lights;
}

export function premiumZoneFloor(office: THREE.Group, width: number, depth: number, accent: number, x: number, z: number): void {
  office.add(roundedBox(width, .025, depth, material(0x1c2d36, .78, .08), x, .11, z));
  office.add(box(width * .8, .012, .055, emissiveMaterial(0x17242d, accent, .2), x, .13, z - depth / 2 + .12));
}

export function premiumDesk(x: number, z: number, rotation = 0, accent = 0x5bbcff): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  group.name = 'premium-desk';

  group.add(shadowed(roundedBox(2.15, .12, .9, deskTop, 0, .92, 0)));
  group.add(roundedBox(1.96, .045, .78, material(0x30454f, .38, .38), 0, .99, 0));
  for (const lx of [-.88, .88]) {
    group.add(box(.09, .78, .09, steel, lx, .49, -.3));
    group.add(box(.09, .78, .09, steel, lx, .49, .3));
    group.add(box(.36, .06, .7, graphite, lx, .11, 0));
  }

  const monitor = screenPanel(.88, .5, accent);
  monitor.position.set(-.32, 1.46, -.2);
  monitor.rotation.x = -.04;
  group.add(monitor);
  group.add(box(.07, .42, .08, steel, -.32, 1.15, -.19));
  group.add(roundedBox(.46, .035, .25, graphite, -.32, .99, -.12));

  const secondary = screenPanel(.54, .34, new THREE.Color(accent).offsetHSL(.08, -.06, .03).getHex(), 'secondary-screen');
  secondary.position.set(.5, 1.37, -.16);
  secondary.rotation.y = -.18;
  group.add(secondary);

  group.add(roundedBox(.78, .035, .3, material(0x11171c, .72, .12), -.15, 1.02, .22));
  for (let key = 0; key < 8; key += 1) group.add(box(.07, .018, .055, material(0x617884, .6, .1), -.43 + key * .085, 1.045, .2));
  group.add(roundedBox(.13, .05, .19, material(0x182027, .54, .28), .45, 1.05, .24));

  const tower = roundedBox(.42, .84, .62, graphite, .78, .5, -.1);
  group.add(tower);
  group.add(box(.32, .62, .018, glass, .78, .53, -.42));
  const fan = new THREE.Group();
  fan.name = 'pc-fan';
  fan.position.set(.78, .56, -.44);
  const hub = cylinder(.055, .04, aluminum, 0, 0, 0, 12); hub.rotation.x = Math.PI / 2; fan.add(hub);
  for (let blade = 0; blade < 5; blade += 1) {
    const mesh = roundedBox(.18, .035, .065, emissiveMaterial(0x1a2630, accent, .28), .1, 0, 0);
    mesh.rotation.z = blade / 5 * Math.PI * 2;
    fan.add(mesh);
  }
  group.add(fan);
  group.add(box(.34, .035, .035, emissiveMaterial(0x17242c, accent, .45), .78, .19, -.415));

  group.add(cylinder(.12, .26, material(0xe7ecec, .68, .03), .63, 1.12, .2, 16));
  group.add(box(.08, .22, .02, material(0xd1e5ea, .42), .71, 1.14, .31));
  shadows(group);
  return group;
}

export function premiumResearchBench(x: number, z: number): THREE.Group {
  const group = new THREE.Group(); group.position.set(x, 0, z); group.name = 'research-bench';
  group.add(roundedBox(2.65, .13, 1.05, deskTop, 0, .92, 0));
  group.add(box(2.45, .07, .86, material(0x344953, .32, .48), 0, 1.0, 0));
  for (const lx of [-1.0, 1.0]) group.add(box(.12, .82, .72, graphite, lx, .5, 0));

  const chamber = new THREE.Group(); chamber.name = 'research-chamber'; chamber.position.set(-.62, 1.35, 0);
  chamber.add(cylinder(.42, .64, steel, 0, 0, 0, 20));
  const core = cylinder(.25, .5, emissiveMaterial(0x102632, 0x65e1ff, 1.2), 0, .02, 0, 18); chamber.add(core);
  chamber.add(cylinder(.46, .08, aluminum, 0, .36, 0, 20), cylinder(.46, .08, aluminum, 0, -.36, 0, 20));
  group.add(chamber);

  const screen = screenPanel(.92, .56, 0x65e1ff, 'research-screen'); screen.position.set(.7, 1.52, -.2); group.add(screen);
  group.add(roundedBox(.72, .06, .46, material(0x16242c, .55, .34), .74, 1.04, .2));
  group.add(sphere(.08, emissiveMaterial(0x122c31, 0x61e6ba, .8), .25, 1.13, .2));
  shadows(group); return group;
}

export function premiumWaferStation(x: number, z: number): THREE.Group {
  const group = new THREE.Group(); group.position.set(x, 0, z); group.name = 'wafer-station';
  group.add(roundedBox(1.65, 1.05, 1.25, material(0xe1e6e8, .38, .34), 0, .58, 0));
  group.add(roundedBox(1.45, .14, 1.05, steel, 0, 1.13, 0));
  const platter = cylinder(.48, .08, material(0x7e91a3, .2, .72), -.25, 1.26, .06, 32); platter.name = 'wafer-platter'; group.add(platter);
  group.add(cylinder(.35, .025, emissiveMaterial(0x27303b, 0x9c7dff, .55), -.25, 1.31, .06, 32));
  const screen = screenPanel(.62, .4, 0x9c7dff, 'wafer-screen'); screen.position.set(.48, 1.5, -.32); screen.rotation.y = -.2; group.add(screen);
  group.add(box(.28, .12, .04, emissiveMaterial(0x1b2a31, 0x5ed9a6, .7), .52, .82, -.64));
  shadows(group); return group;
}

export function premiumServerRack(x: number, z: number): THREE.Group {
  const group = new THREE.Group(); group.position.set(x, 0, z); group.name = 'server-rack';
  group.add(roundedBox(1.05, 2.55, .88, graphite, 0, 1.3, 0));
  group.add(box(.86, 2.28, .025, glass, 0, 1.3, .46));
  for (let row = 0; row < 9; row += 1) {
    group.add(roundedBox(.75, .14, .66, material(row % 2 ? 0x26343e : 0x1d2b34, .42, .46), 0, .3 + row * .23, 0));
    const light = box(.055, .035, .02, emissiveMaterial(0x17242d, row % 3 ? 0x5be2a8 : 0x5dbdff, .5), .29, .3 + row * .23, .455);
    light.name = 'server-light'; group.add(light);
    group.add(box(.22, .025, .015, material(0x657a86, .32, .45), -.12, .3 + row * .23, .457));
  }
  shadows(group); return group;
}

export function premiumProductShowcase(x: number, z: number): THREE.Group {
  const group = new THREE.Group(); group.position.set(x, 0, z); group.name = 'showcase';
  group.add(roundedBox(2.9, .28, 1.85, graphite, 0, .14, 0));
  group.add(roundedBox(2.58, .08, 1.55, emissiveMaterial(0x182a31, 0x4ecbff, .22), 0, .33, 0));
  group.add(box(2.45, 1.5, .035, glass, 0, 1.12, -.78));

  const chip = new THREE.Group(); chip.name = 'product-chip'; chip.position.set(-.64, .75, .05);
  chip.add(roundedBox(.78, .09, .78, material(0x152129, .28, .64)));
  chip.add(roundedBox(.54, .055, .54, emissiveMaterial(0x272224, 0xffa45d, .72), 0, .07, 0));
  for (let pin = -3; pin <= 3; pin += 1) { chip.add(box(.04, .025, .1, aluminum, pin * .1, .02, -.45), box(.04, .025, .1, aluminum, pin * .1, .02, .45)); }
  group.add(chip);

  const gpu = new THREE.Group(); gpu.name = 'product-gpu'; gpu.position.set(.65, .96, .03);
  gpu.add(roundedBox(1.1, .55, .12, material(0x19242a, .35, .52)));
  gpu.add(box(.96, .06, .14, material(0x31444c, .38, .5), 0, -.32, 0));
  for (const fx of [-.3, .3]) {
    const fan = new THREE.Group(); fan.name = 'gpu-fan'; fan.position.set(fx, 0, .08);
    fan.add(cylinder(.2, .04, graphite, 0, 0, 0, 18));
    for (let blade = 0; blade < 7; blade += 1) { const b = roundedBox(.2, .035, .06, material(0x4a6069, .36, .54), .1, 0, 0); b.rotation.z = blade / 7 * Math.PI * 2; fan.add(b); }
    gpu.add(fan);
  }
  group.add(gpu);
  group.add(screenPanel(.72, .42, 0xffa45d));
  const label = group.children[group.children.length - 1]!; label.position.set(0, 1.7, -.7); label.rotation.x = -.05;
  shadows(group); return group;
}

export function premiumMeetingArea(x: number, z: number): THREE.Group {
  const group = new THREE.Group(); group.position.set(x, 0, z); group.name = 'meeting-area';
  group.add(roundedBox(2.5, .13, 1.35, wood, 0, .83, 0));
  group.add(box(.13, .72, 1.05, graphite, 0, .43, 0));
  for (const [cx, cz, rot] of [[-1.18,0,Math.PI/2],[1.18,0,-Math.PI/2],[0,-.86,0],[0,.86,Math.PI]] as Array<[number,number,number]>) {
    const chair = new THREE.Group(); chair.position.set(cx, 0, cz); chair.rotation.y = rot;
    chair.add(roundedBox(.48, .12, .48, material(0x273944, .55, .28), 0, .54, 0));
    chair.add(roundedBox(.48, .68, .12, material(0x24343d, .56, .28), 0, .85, -.22));
    chair.add(cylinder(.05, .45, steel, 0, .27, 0, 12)); group.add(chair);
  }
  const holo = screenPanel(1.5, .75, 0x6fd6b0); holo.position.set(0, 1.7, -.55); holo.rotation.x = -.06; group.add(holo);
  shadows(group); return group;
}

export function premiumWallDisplay(x: number, y: number, z: number, width: number, accent: number, name: string): THREE.Group {
  const group = screenPanel(width, 1.48, accent, name); group.position.set(x, y, z); return group;
}

export function premiumPlant(x: number, z: number, scale = 1): THREE.Group {
  const group = new THREE.Group(); group.position.set(x, 0, z); group.scale.setScalar(scale);
  group.add(roundedBox(.46, .48, .46, material(0x27343a, .72, .1), 0, .24, 0));
  const stem = material(0x365440, .8, .04); const leaf = material(0x4d7960, .72, .03);
  for (let index = 0; index < 7; index += 1) { const angle = index / 7 * Math.PI * 2; group.add(box(.08, .72, .08, stem, 0, .65, 0)); const l = roundedBox(.18, .6, .08, leaf, Math.cos(angle) * .18, .92 + index % 2 * .08, Math.sin(angle) * .18); l.rotation.z = Math.cos(angle) * .45; l.rotation.x = Math.sin(angle) * .4; group.add(l); }
  return group;
}

export function premiumPartsWall(x: number, z: number): THREE.Group {
  const group = new THREE.Group(); group.position.set(x, 0, z); group.add(roundedBox(1.55, 2.25, .42, charcoal, 0, 1.14, 0));
  for (let row = 0; row < 5; row += 1) { group.add(box(1.3, .06, .36, steel, 0, .32 + row * .4, 0)); for (let col = -2; col <= 2; col += 1) group.add(roundedBox(.18, .16, .2, material(0x536772 + (row % 2) * 0x10101, .56, .22), col * .24, .43 + row * .4, .08)); }
  shadows(group); return group;
}

export function premiumDeliveryRobot(): THREE.Group {
  const group = new THREE.Group(); group.name = 'delivery-robot';
  group.add(roundedBox(.82, .34, .68, graphite, 0, .24, 0)); group.add(roundedBox(.62, .18, .5, material(0x324650, .38, .48), 0, .48, 0));
  for (const x of [-.31, .31]) for (const z of [-.24, .24]) { const wheel = cylinder(.11, .08, rubber, x, .11, z, 14); wheel.rotation.z = Math.PI / 2; group.add(wheel); }
  const beacon = sphere(.08, emissiveMaterial(0x1b252b, 0x63d6ff, .9), 0, .66, 0); beacon.name = 'robot-beacon'; group.add(beacon);
  group.add(box(.38, .045, .025, emissiveMaterial(0x18242c, 0x62d9a5, .55), 0, .46, -.35));
  group.position.set(2.2, 0, .4); shadows(group); return group;
}

export function premiumDataCube(accent: number, x: number, y: number, z: number): THREE.Group {
  const group = new THREE.Group(); group.position.set(x, y, z); group.name = 'data-cube';
  group.add(roundedBox(.42, .42, .42, emissiveMaterial(0x14242d, accent, .45)));
  group.add(box(.54, .025, .025, material(accent, .3, .46), 0, 0, 0)); group.add(box(.025, .54, .025, material(accent, .3, .46), 0, 0, 0)); group.add(box(.025, .025, .54, material(accent, .3, .46), 0, 0, 0));
  return group;
}
