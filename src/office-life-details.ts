import * as THREE from 'three';
import { box, cylinder, emissiveMaterial, material, roundedBox, sphere } from './office-primitives';

export interface OfficeLifeDetailState {
  officeLevel: number;
  presentStaff: number;
  totalStaff: number;
  night: number;
  projectProgress: number;
  productGlow: number;
  researchActive: boolean;
  cashHealth: number;
}

export interface OfficeLifeDetails {
  update: (time: number, state: OfficeLifeDetailState) => void;
}

function paperStack(x: number, z: number, height = .08): THREE.Group {
  const group = new THREE.Group();
  const paper = material(0xf2efe6, .92, 0);
  const ink = material(0x5d7483, .88, 0);
  for (let i = 0; i < 4; i += 1) group.add(box(.34, .018, .25, i === 2 ? ink : paper, x + i * .006, .82 + i * .018 + height, z - i * .004));
  return group;
}

function coffeeCorner(): THREE.Group {
  const group = new THREE.Group();
  const steel = material(0x2b3942, .34, .62);
  const dark = material(0x11191f, .6, .35);
  const warm = emissiveMaterial(0x34271d, 0xffa85d, .5);
  group.add(roundedBox(1.35, .9, .62, material(0x24323a, .75, .12), 6.35, .48, 4.72));
  group.add(roundedBox(.48, .68, .42, steel, 6.1, 1.16, 4.71));
  group.add(box(.3, .16, .07, warm, 6.1, 1.26, 4.48));
  group.add(cylinder(.09, .22, dark, 6.1, .89, 4.5, 10));
  group.add(cylinder(.12, .2, material(0xe7e4dd, .78, .02), 6.65, .98, 4.65, 12));
  group.add(box(.6, .06, .35, material(0xb98b5b, .7, .04), 6.72, .95, 4.69));
  return group;
}

function wallFrames(): THREE.Group {
  const group = new THREE.Group();
  const frame = material(0x202b32, .48, .35);
  const colors = [0x5bb4ff, 0xffad65, 0x6fe0ad, 0xc391ff];
  [-3.4, -2.25, -1.1, .05].forEach((x, index) => {
    group.add(box(.85, .58, .07, frame, x, 3.9, -5.82));
    group.add(box(.7, .43, .018, emissiveMaterial(0x162332, colors[index] ?? 0xffffff, .28), x, 3.9, -5.775));
  });
  return group;
}

function floorWayfinding(): THREE.Group {
  const group = new THREE.Group();
  const path = material(0x315465, .88, .02);
  const accent = material(0x457b8b, .85, .02);
  for (let z = -4.1; z <= 3.8; z += .72) group.add(box(.12, .015, .4, path, .95, .04, z));
  for (let x = -6.1; x <= 5.9; x += .8) group.add(box(.38, .015, .1, accent, x, .04, .72));
  return group;
}

function trophyShelf(): { group: THREE.Group; trophyGlow: THREE.Mesh[] } {
  const group = new THREE.Group();
  const shelf = material(0x1d2b34, .5, .48);
  const gold = material(0xd7a64f, .3, .5);
  const glow = emissiveMaterial(0x2a2417, 0xffc45e, .65);
  const trophyGlow: THREE.Mesh[] = [];
  group.add(box(2.35, .1, .42, shelf, 3.15, 2.05, -5.45), box(2.35, .1, .42, shelf, 3.15, 3.02, -5.45));
  [2.55, 3.15, 3.75].forEach((x, index) => {
    group.add(cylinder(.13, .18, gold, x, 2.25, -5.42, 10));
    group.add(box(.28, .26, .2, gold, x, 2.47, -5.42));
    const light = sphere(.055, glow, x, 2.75, -5.38);
    light.name = `trophy-glow-${index}`;
    trophyGlow.push(light);
    group.add(light);
  });
  return { group, trophyGlow };
}

function projectWarRoom(): THREE.Group {
  const group = new THREE.Group();
  const board = material(0xd9e3e6, .78, .02);
  const trim = material(0x334853, .42, .5);
  group.add(box(2.55, 1.45, .08, trim, -1.0, 2.75, 5.46));
  group.add(box(2.35, 1.25, .035, board, -1.0, 2.75, 5.4));
  const noteColors = [0x70c8ff, 0xffc46a, 0x75d8a5, 0xea8fa9];
  for (let i = 0; i < 12; i += 1) {
    const x = -1.92 + (i % 4) * .57;
    const y = 2.32 + Math.floor(i / 4) * .4;
    group.add(box(.34, .22, .012, material(noteColors[i % noteColors.length] ?? 0xffffff, .86, 0), x, y, 5.36));
  }
  return group;
}

function crateCluster(): THREE.Group {
  const group = new THREE.Group();
  const cardboard = material(0x8b6847, .92, .01);
  const tape = material(0xcaa16a, .8, .01);
  const crates: Array<[number, number, number]> = [[7.0, 4.65, .55], [6.45, 4.95, .4], [7.15, 4.15, .34]];
  crates.forEach(([x, z, s], index) => {
    group.add(roundedBox(s, s * .72, s, cardboard, x, s * .36, z));
    group.add(box(.06, s * .73, s * 1.01, tape, x + (index % 2 ? .08 : -.06), s * .36, z));
  });
  return group;
}

export function buildOfficeLifeDetails(office: THREE.Group): OfficeLifeDetails {
  const everyday = new THREE.Group();
  everyday.name = 'office-life-everyday';
  everyday.add(coffeeCorner(), wallFrames(), floorWayfinding(), projectWarRoom(), crateCluster());
  everyday.add(paperStack(-5.15, -3.7), paperStack(-2.25, -1.3, .03), paperStack(2.3, -3.75, .01));

  const bins = new THREE.Group();
  const bin = material(0x24343d, .72, .16);
  const recycle = material(0x315e68, .75, .08);
  bins.add(roundedBox(.4, .58, .4, bin, -7.0, .3, -4.55), roundedBox(.4, .58, .4, recycle, -6.5, .3, -4.55));
  everyday.add(bins);

  const trophies = trophyShelf();
  everyday.add(trophies.group);
  office.add(everyday);

  const prestige = new THREE.Group();
  prestige.name = 'office-life-prestige';
  const sculpture = material(0x697f8d, .28, .62);
  prestige.add(cylinder(.55, .16, material(0x202c33, .45, .4), 0, .12, 4.65, 16));
  prestige.add(sphere(.38, sculpture, 0, .62, 4.65));
  prestige.add(box(.08, .82, .08, material(0xa7bac4, .25, .58), 0, .55, 4.65));
  office.add(prestige);

  const statusLamps = [
    emissiveMaterial(0x15252d, 0x5dc8ff, .45),
    emissiveMaterial(0x17271f, 0x61dfa0, .45),
    emissiveMaterial(0x2b2117, 0xffbd63, .45),
  ];
  const statusMeshes: THREE.Mesh[] = statusLamps.map((mat, index) => box(.36, .08, .08, mat, -6.1 + index * .46, 4.55, -5.72));
  statusMeshes.forEach((mesh) => everyday.add(mesh));

  const nightLights: THREE.Mesh[] = [];
  [-5.9, -2.9, .1, 3.1, 6.1].forEach((x) => {
    const lamp = box(.58, .035, .18, emissiveMaterial(0x1c2630, 0x82c9ff, .3), x, 4.72, 4.88);
    nightLights.push(lamp);
    everyday.add(lamp);
  });

  return {
    update(time, state) {
      prestige.visible = state.officeLevel >= 4;
      trophies.group.visible = state.officeLevel >= 2 || state.productGlow > .45;
      const occupied = state.totalStaff ? state.presentStaff / state.totalStaff : 0;
      nightLights.forEach((mesh, index) => {
        if (mesh.material instanceof THREE.MeshStandardMaterial) mesh.material.emissiveIntensity = .18 + state.night * (.62 + occupied * .55) + Math.sin(time * 1.2 + index) * .03;
      });
      statusMeshes.forEach((mesh, index) => {
        if (!(mesh.material instanceof THREE.MeshStandardMaterial)) return;
        const target = index === 0 ? state.projectProgress / 100 : index === 1 ? state.cashHealth : state.researchActive ? 1 : .25;
        mesh.material.emissiveIntensity = .25 + target * 1.1;
      });
      trophies.trophyGlow.forEach((mesh, index) => {
        if (mesh.material instanceof THREE.MeshStandardMaterial) mesh.material.emissiveIntensity = .22 + state.productGlow * 1.3 + Math.sin(time * 2.3 + index) * .08;
      });
    },
  };
}
