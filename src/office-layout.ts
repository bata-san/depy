import * as THREE from 'three';
import { CharacterAnimationSystem } from './character-animations';
import { premiumStaffPerson } from './premium-office-characters';
import {
  premiumArchitecture, premiumDataCube, premiumDeliveryRobot, premiumDesk, premiumMeetingArea,
  premiumPartsWall, premiumPlant, premiumProductShowcase, premiumResearchBench, premiumServerRack,
  premiumWallDisplay, premiumWaferStation, premiumZoneFloor,
} from './premium-office-models';
import { box, emissiveMaterial, material, roundedBox } from './office-primitives';

function expansionShell(group: THREE.Group, x: number, z: number, width: number, depth: number, accent: number): void {
  group.add(roundedBox(width, .3, depth, material(0x0e171d, .48, .5), x, -.15, z));
  group.add(box(width - .28, .07, depth - .28, material(0x1a2a33, .8, .1), x, .035, z));
  group.add(roundedBox(width * .74, .025, depth * .72, material(0x243b46, .72, .08), x, .085, z));
  group.add(box(width * .62, .014, .06, emissiveMaterial(0x17242c, accent, .25), x, .11, z - depth / 2 + .18));
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x8dcce2, roughness: .08, metalness: .05, transmission: .5, transparent: true, opacity: .18, depthWrite: false });
  group.add(box(width, 3.25, .04, glass, x, 1.65, z - depth / 2));
  const frame = material(0x31454f, .28, .68);
  for (let px = x - width / 2; px <= x + width / 2; px += 2) group.add(box(.07, 3.35, .08, frame, px, 1.67, z - depth / 2));
}

function ceilingBridge(group: THREE.Group, x: number, z: number, width: number, accent: number): void {
  group.add(box(width, .11, .15, material(0x121d24, .38, .64), x, 4.85, z));
  for (let offset = -width / 2 + .7; offset < width / 2; offset += 1.45) group.add(roundedBox(.95, .04, .18, emissiveMaterial(0x202d32, accent, .58), x + offset, 4.76, z));
}

function addExpansionDesks(group: THREE.Group, positions: Array<[number, number, number]>, accent: number): THREE.Group[] {
  return positions.map(([x, z, rotation], index) => {
    const desk = premiumDesk(x, z, rotation, index % 2 ? accent : 0x68c7ff);
    group.add(desk);
    return desk;
  });
}

export function buildOfficeLayout(scene: THREE.Scene) {
  const office = new THREE.Group();
  office.name = 'premium-office-root';
  const ceilingLights = premiumArchitecture(office);

  premiumZoneFloor(office, 7.2, 5.5, 0x62c9ff, -4.2, -2.45);
  premiumZoneFloor(office, 4.9, 3.15, 0xffb064, 4.9, 3.8);
  premiumZoneFloor(office, 5.0, 3.1, 0x72e1b1, -5.2, 3.8);
  premiumZoneFloor(office, 4.5, 3.0, 0xc68cff, .3, 3.85);
  premiumZoneFloor(office, 3.9, 5.55, 0x67d5ff, 6.65, -.2);

  const developmentDesks = [
    premiumDesk(-6.1, -4.25, 0, 0x62c9ff), premiumDesk(-3.35, -4.25, 0, 0x75d9ff),
    premiumDesk(-6.1, -1.15, Math.PI, 0x75e0b4), premiumDesk(-3.35, -1.15, Math.PI, 0xffb76d),
    premiumDesk(-.65, -4.25, 0, 0xc58cff), premiumDesk(-.65, -1.15, Math.PI, 0x67d5ff),
  ];
  developmentDesks.forEach((desk) => office.add(desk));

  const operationsDesk = premiumDesk(5.15, -4.2, 0, 0x6ee0ff);
  const competitorDesk = premiumDesk(2.4, -4.2, 0, 0xff7f8e);
  office.add(operationsDesk, competitorDesk);

  const research = premiumResearchBench(-5.15, 3.95);
  const waferStation = premiumWaferStation(-7.15, 2.4);
  const showcase = premiumProductShowcase(5.0, 3.8);
  const meeting = premiumMeetingArea(.2, 3.9);
  office.add(research, waferStation, showcase, meeting);

  const racks = [
    premiumServerRack(7.0, -1.7), premiumServerRack(5.7, -1.7), premiumServerRack(7.0, .9), premiumServerRack(5.7, .9),
  ];
  racks.forEach((rack) => office.add(rack));
  office.add(premiumPartsWall(7.3, 3.65));

  const competitorScreen = premiumWallDisplay(2.35, 3.75, -6.67, 3.7, 0xff7180, 'competitor-screen');
  const financeScreen = premiumWallDisplay(6.25, 3.75, -6.67, 2.9, 0x6de0ad, 'finance-screen');
  office.add(competitorScreen, financeScreen);

  office.add(premiumPlant(-8.15, -5.55, 1.05), premiumPlant(8.1, 5.55, 1.2), premiumPlant(-8.1, 5.55, .9), premiumPlant(1.6, 5.55, .76));

  const glass = new THREE.MeshPhysicalMaterial({ color: 0x7ebbd0, roughness: .08, metalness: .04, transmission: .52, transparent: true, opacity: .16, depthWrite: false });
  office.add(box(.04, 3.1, 4.65, glass, 1.15, 1.65, 3.55));
  for (const z of [1.3, 3.55, 5.8]) office.add(box(.07, 3.2, .07, material(0x2c414c, .3, .7), 1.15, 1.65, z));

  const lounge = new THREE.Group(); lounge.name = 'lounge';
  lounge.add(roundedBox(1.6, .48, .62, material(0x334750, .62, .16), -7.15, .34, .8));
  lounge.add(roundedBox(1.6, .58, .16, material(0x293b44, .64, .16), -7.15, .67, .53));
  lounge.add(roundedBox(.72, .42, .72, material(0x253740, .58, .24), -5.9, .28, .8));
  lounge.add(box(.46, .035, .46, material(0x76553c, .6, .08), -5.9, .51, .8));
  lounge.add(roundedBox(.78, 1.16, .62, material(0x22343d, .52, .32), -8.05, .62, 1.35));
  lounge.add(box(.44, .13, .03, emissiveMaterial(0x17242c, 0xffb15f, .55), -8.05, .9, 1.02));
  office.add(lounge);

  const robot = premiumDeliveryRobot();
  office.add(robot);
  const dataCubes = [
    premiumDataCube(0x5ec6ff, -4.4, 2.55, 3.35), premiumDataCube(0x62e6ad, -5.75, 2.25, 3.95),
    premiumDataCube(0xffbd68, 4.25, 2.35, 3.05), premiumDataCube(0xc58cff, 5.45, 2.65, 3.9),
    premiumDataCube(0x6de0ad, .2, 2.45, 3.2),
  ];
  dataCubes.forEach((cube) => office.add(cube));

  const expansionGroups = [new THREE.Group(), new THREE.Group(), new THREE.Group(), new THREE.Group()];
  expansionGroups.forEach((group, index) => { group.name = `office-expansion-${index + 2}`; group.visible = false; office.add(group); });

  const east = expansionGroups[0]!;
  expansionShell(east, 13.0, 0, 8.0, 13.5, 0x5ed9ff);
  ceilingBridge(east, 13.0, 0, 6.5, 0x5ed9ff);
  addExpansionDesks(east, [[10.8,-4.1,0],[14.0,-4.1,0],[10.8,-.85,Math.PI],[14.0,-.85,Math.PI],[10.8,3.05,0],[14.0,3.05,0]], 0x68dfba);
  east.add(premiumServerRack(16.0, -1.2), premiumServerRack(16.0, 1.55), premiumPlant(9.4, 5.6, 1));
  east.add(premiumWallDisplay(13.0, 3.7, -6.62, 4.2, 0x62d9ff, 'east-ops-screen'));

  const west = expansionGroups[1]!;
  expansionShell(west, -13.0, 0, 8.0, 13.5, 0xc392ff);
  ceilingBridge(west, -13.0, 0, 6.5, 0xc392ff);
  addExpansionDesks(west, [[-10.8,-4.1,0],[-14.0,-4.1,0],[-10.8,-.85,Math.PI],[-14.0,-.85,Math.PI]], 0xc392ff);
  west.add(premiumResearchBench(-12.0, 3.35), premiumWaferStation(-15.5, 2.7), premiumPlant(-9.5, 5.6, 1));
  west.add(premiumWallDisplay(-13.1, 3.7, -6.62, 4.2, 0xc392ff, 'west-research-screen'));

  const north = expansionGroups[2]!;
  expansionShell(north, 0, 13.0, 20.0, 9.0, 0xffbf6b);
  ceilingBridge(north, 0, 12.0, 15.5, 0xffbf6b);
  addExpansionDesks(north, [[-7,10.5,0],[-3.6,10.5,0],[3.6,10.5,0],[7,10.5,0],[-7,13.8,Math.PI],[-3.6,13.8,Math.PI],[3.6,13.8,Math.PI],[7,13.8,Math.PI]], 0xffc46d);
  north.add(premiumMeetingArea(0, 16.0), premiumPlant(-8.8, 16.7, 1.05), premiumPlant(8.8, 16.7, 1.05));
  north.add(premiumWallDisplay(0, 3.75, 8.6, 5.4, 0xffbd68, 'studio-progress-screen'));

  const executive = expansionGroups[3]!;
  expansionShell(executive, 0, 22.0, 15.0, 6.5, 0x66dba8);
  ceilingBridge(executive, 0, 21.0, 11.5, 0x66dba8);
  executive.add(premiumProductShowcase(4.3, 22.2), premiumMeetingArea(-2.4, 22.0), premiumPlant(-6.6, 24.4, 1.1), premiumPlant(6.6, 24.4, 1.1));
  const trophyWall = premiumWallDisplay(0, 3.8, 18.82, 5.6, 0x66dba8, 'executive-wall'); trophyWall.rotation.y = Math.PI; executive.add(trophyWall);

  const staffColors = [0x5aa7ff,0xff8d71,0x79d69c,0xc998ff,0xffc56f,0x62cbd3,0xf178a7,0x95c76f,0x7398e8,0xe89f73,0x70d1b6,0xb286e8,0x5ab8e8,0xe8c45a,0x8ac976,0xe57d9f,0x8b96e7,0x5fd0c4,0xd58ce6,0xe59a66,0x6eb6ef,0x81cd89,0xecbd67,0xc688e7,0x68cbc0,0xeb8a85,0x79a4e8,0xa6cb68,0xda8fc5,0x71c8e0];
  const basePositions: Array<[number, number, number]> = [
    [-6.1,-3.05,Math.PI],[-3.35,-3.05,Math.PI],[-6.1,-2.3,0],[-3.35,-2.3,0],[-.65,-3.05,Math.PI],[-.65,-2.3,0],
    [5.15,-3.05,Math.PI],[2.4,-3.05,Math.PI],[-5.15,2.75,0],[.2,2.5,0],[5,2.55,0],[6.3,-.2,Math.PI/2],
  ];
  const eastPositions: Array<[number, number, number]> = [[10.8,-3.0,Math.PI],[14,-3.0,Math.PI],[10.8,.25,0],[14,.25,0],[10.8,4.15,Math.PI],[14,4.15,Math.PI]];
  const westPositions: Array<[number, number, number]> = [[-10.8,-3,Math.PI],[-14,-3,Math.PI],[-10.8,.25,0],[-14,.25,0],[-12,2.2,0],[-15.2,2.25,0]];
  const northPositions: Array<[number, number, number]> = [[-7,11.6,Math.PI],[-3.6,11.6,Math.PI],[3.6,11.6,Math.PI],[7,11.6,Math.PI],[-7,12.7,0],[-3.6,12.7,0],[3.6,12.7,0],[7,12.7,0]];
  const executivePositions: Array<[number, number, number]> = [[-2.4,20.7,0],[.4,20.7,0],[4.3,20.7,0],[0,23.3,Math.PI]];
  const allPositions = [...basePositions, ...eastPositions, ...westPositions, ...northPositions, ...executivePositions].slice(0, 30);
  const people = allPositions.map(([x, z, rotation], index) => premiumStaffPerson(staffColors[index % staffColors.length] ?? 0x6dafff, x, z, rotation, index));
  people.forEach((person, index) => {
    if (index < basePositions.length) office.add(person);
    else if (index < basePositions.length + eastPositions.length) east.add(person);
    else if (index < basePositions.length + eastPositions.length + westPositions.length) west.add(person);
    else if (index < basePositions.length + eastPositions.length + westPositions.length + northPositions.length) north.add(person);
    else executive.add(person);
  });
  const characterAnimations = new CharacterAnimationSystem(people);

  scene.add(office);
  return {
    office, ceilingLights, developmentDesks, research, showcase, meeting, racks, waferStation,
    robot, dataCubes, characterAnimations, competitorScreen, people, expansionGroups,
  };
}
