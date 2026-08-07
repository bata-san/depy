import * as THREE from 'three';
import { CharacterAnimationSystem } from './character-animations';
import { addCeiling, addZoneFloor, makeLeftWall, makeWindowWall } from './office-architecture';
import { addDeskAccentBars, addEquipmentCases, addStaffContactShadows, addZoneSigns } from './office-decor';
import {
  addFloorTiles, box, deliveryRobot, desk, emissiveMaterial, floatingDataCube, material, meetingArea,
  partsShelf, plant, productShowcase, researchBench, serverRack, staffPerson, waferInspectionStation, wallDisplay,
} from './office-models';

function expansionFloor(group: THREE.Group, x: number, z: number, width: number, depth: number, accent: number): void {
  group.add(box(width, .18, depth, material(0x17232d, .82, .08), x, -.1, z));
  group.add(box(width - .22, .025, depth - .22, material(0x243846, .92, .02), x, .005, z));
  group.add(box(width * .55, .032, depth * .52, material(accent, .8, .03), x, .025, z));
  const glass = new THREE.MeshStandardMaterial({ color: 0x8bc9e5, transparent: true, opacity: .1, roughness: .18, metalness: .2, depthWrite: false });
  group.add(box(width, 2.65, .035, glass, x, 1.32, z - depth / 2));
  group.add(box(width, .07, .07, material(0x334b59, .35, .62), x, 2.62, z - depth / 2));
}

function addExpansionDeskCluster(group: THREE.Group, positions: Array<[number, number, number]>, accent: number): void {
  positions.forEach(([x, z, rotation], index) => group.add(desk(x, z, rotation, index % 2 ? accent : 0x71cfff)));
}

export function buildOfficeLayout(scene: THREE.Scene) {
  const office = new THREE.Group();
  addFloorTiles(office);
  makeWindowWall(office);
  makeLeftWall(office);
  const ceilingLights = addCeiling(office);

  addZoneFloor(office, 6.15, 5.35, 0x203c51, -4.15, -2.35);
  addZoneFloor(office, 5.0, 3.0, 0x342d43, 3.85, 3.75);
  addZoneFloor(office, 4.65, 3.0, 0x2e3c35, -5.0, 3.75);
  addZoneFloor(office, 4.5, 2.65, 0x3d3229, .2, 3.75);
  addZoneFloor(office, 3.7, 5.3, 0x1c3139, 6.0, .15);

  const developmentDesks = [
    desk(-5.65, -4.0, 0, 0x5aaeff), desk(-2.75, -4.0, 0, 0x62c9ff),
    desk(-5.65, -1.05, Math.PI, 0x6fd6b0), desk(-2.75, -1.05, Math.PI, 0xffbc6b),
  ];
  developmentDesks.forEach((item) => office.add(item));

  const operationsDesk = desk(5.0, -4.0, 0, 0x79d8ff);
  const competitorDesk = desk(1.9, -4.0, 0, 0xff7c88);
  office.add(operationsDesk, competitorDesk);

  const research = researchBench(-5.05, 3.95);
  const showcase = productShowcase(4.85, 3.8);
  const meeting = meetingArea(.2, 3.8);
  office.add(research, showcase, meeting);

  const racks = [serverRack(6.85, -1.55), serverRack(5.55, -1.55), serverRack(6.85, .95), serverRack(5.55, .95)];
  racks.forEach((item) => office.add(item));
  const waferStation = waferInspectionStation(-7.0, 2.45);
  office.add(waferStation, partsShelf(7.05, 3.65));

  const cableTray = material(0x16232d, .3, .72);
  office.add(box(13.9, .17, .4, cableTray, -.05, 4.94, -4.95), box(.4, .17, 8.5, cableTray, 7.38, 4.94, -.8));
  for (let x = -6.35; x <= 6.35; x += 1.55) office.add(box(.075, .11, .29, emissiveMaterial(0xffffff, 0x8ecfff, .3), x, 4.86, -4.96));

  const competitorScreen = wallDisplay(1.85, 3.55, -5.91, 3.25, 0xff626e, 'competitor-screen');
  const financeScreen = wallDisplay(5.65, 3.55, -5.91, 2.75, 0x70d8a4, 'finance-screen');
  office.add(competitorScreen, financeScreen);

  office.add(plant(-7.28, -5.16, 1.05), plant(7.3, 5.1, 1.2), plant(-7.2, 5.05, .85), plant(1.2, 5.1, .72));
  office.add(box(3.65, 1.22, .1, material(0xe2e8ea, .72), -5.75, 3.45, -5.91));
  const logoPlate = box(2.55, .67, .1, emissiveMaterial(0x14283a, 0x4ea8ff, .68), -5.75, 4.52, -5.86);
  logoPlate.name = 'office-logo';
  office.add(logoPlate);

  const robot = deliveryRobot();
  office.add(robot);
  const dataCubes = [
    floatingDataCube(0x5ec6ff, -4.25, 2.5, 3.45), floatingDataCube(0x62e6ad, -5.65, 2.18, 3.9),
    floatingDataCube(0xffbd68, 4.12, 2.32, 3.05), floatingDataCube(0xc58cff, 5.35, 2.62, 3.82),
  ];
  dataCubes.forEach((cube) => office.add(cube));

  const expansionGroups = [new THREE.Group(), new THREE.Group(), new THREE.Group(), new THREE.Group()];
  expansionGroups.forEach((group, index) => { group.name = `office-expansion-${index + 2}`; group.visible = false; office.add(group); });

  const east = expansionGroups[0]!;
  expansionFloor(east, 11.5, .25, 7.2, 11.6, 0x244c5c);
  addExpansionDeskCluster(east, [[9.6,-3.8,0],[12.5,-3.8,0],[9.6,-.7,Math.PI],[12.5,-.7,Math.PI],[9.6,3.0,0],[12.5,3.0,0]], 0x61d8bb);
  east.add(serverRack(14.15, -.4), serverRack(14.15, 2.2), plant(8.4, 5.1, .9));
  east.add(wallDisplay(11.55, 3.55, -5.48, 3.8, 0x62d9ff, 'east-ops-screen'));

  const west = expansionGroups[1]!;
  expansionFloor(west, -11.5, .25, 7.2, 11.6, 0x3d354d);
  addExpansionDeskCluster(west, [[-9.5,-3.8,0],[-12.4,-3.8,0],[-9.5,-.7,Math.PI],[-12.4,-.7,Math.PI]], 0xc494ff);
  west.add(researchBench(-11.0, 3.15), waferInspectionStation(-14.05, 2.75), plant(-8.45, 5.0, .9));

  const north = expansionGroups[2]!;
  expansionFloor(north, 0, 11.2, 18.5, 8.0, 0x3f3c2c);
  addExpansionDeskCluster(north, [[-6.2,9.3,0],[-3.2,9.3,0],[3.2,9.3,0],[6.2,9.3,0],[-6.2,12.4,Math.PI],[-3.2,12.4,Math.PI],[3.2,12.4,Math.PI],[6.2,12.4,Math.PI]], 0xffc96d);
  north.add(meetingArea(0, 13.4), plant(-8.4, 13.9, 1), plant(8.4, 13.9, 1));

  const executive = expansionGroups[3]!;
  expansionFloor(executive, 0, 18.4, 13.5, 5.4, 0x27423a);
  executive.add(productShowcase(4.0, 18.6), meetingArea(-2.0, 18.5), plant(-6.1, 20.4, 1.05), plant(6.1, 20.4, 1.05));

  const staffColors = [0x5aa7ff,0xff8d71,0x79d69c,0xc998ff,0xffc56f,0x62cbd3,0xf178a7,0x95c76f,0x7398e8,0xe89f73,0x70d1b6,0xb286e8,0x5ab8e8,0xe8c45a,0x8ac976,0xe57d9f,0x8b96e7,0x5fd0c4,0xd58ce6,0xe59a66,0x6eb6ef,0x81cd89,0xecbd67,0xc688e7,0x68cbc0,0xeb8a85,0x79a4e8,0xa6cb68,0xda8fc5,0x71c8e0];
  const basePositions: Array<[number, number, number]> = [
    [-5.65,-2.9,Math.PI],[-2.75,-2.9,Math.PI],[-5.65,-2.12,0],[-2.75,-2.12,0],[5,-2.9,Math.PI],[1.9,-2.9,Math.PI],[-5.05,2.7,0],[.2,2.4,0],[4.85,2.45,0],[6,-.15,Math.PI/2],
  ];
  const eastPositions: Array<[number, number, number]> = [[9.6,-2.8,Math.PI],[12.5,-2.8,Math.PI],[9.6,.2,0],[12.5,.2,0],[9.6,4,Math.PI],[12.5,4,Math.PI],[13.7,1.1,Math.PI/2],[8.7,1.6,-Math.PI/2]];
  const westPositions: Array<[number, number, number]> = [[-9.5,-2.8,Math.PI],[-12.4,-2.8,Math.PI],[-9.5,.2,0],[-12.4,.2,0],[-11,2.3,0],[-13.7,2.3,0],[-8.7,3.9,Math.PI/2]];
  const northPositions: Array<[number, number, number]> = [[-6.2,10.3,Math.PI],[-3.2,10.3,Math.PI],[3.2,10.3,Math.PI],[6.2,10.3,Math.PI],[-6.2,11.4,0],[-3.2,11.4,0],[3.2,11.4,0],[6.2,11.4,0]];
  const executivePositions: Array<[number, number, number]> = [[-2,17.2,0],[1,17.2,0],[4,17.2,0],[0,19.5,Math.PI]];
  const allPositions = [...basePositions, ...eastPositions, ...westPositions, ...northPositions, ...executivePositions].slice(0, 30);
  addStaffContactShadows(office, basePositions);
  const people = allPositions.map(([x, z, rotation], index) => staffPerson(staffColors[index % staffColors.length] ?? 0x6dafff, x, z, rotation, index));
  people.forEach((person, index) => {
    if (index < basePositions.length) office.add(person);
    else if (index < basePositions.length + eastPositions.length) east.add(person);
    else if (index < basePositions.length + eastPositions.length + westPositions.length) west.add(person);
    else if (index < basePositions.length + eastPositions.length + westPositions.length + northPositions.length) north.add(person);
    else executive.add(person);
  });
  const characterAnimations = new CharacterAnimationSystem(people);

  const glassPartition = new THREE.MeshStandardMaterial({ color: 0x7faec3, transparent: true, opacity: .13, roughness: .18, metalness: .18, depthWrite: false });
  office.add(box(.035, 2.72, 4.2, glassPartition, 1.05, 1.55, 3.35));
  for (const z of [1.25, 3.35, 5.45]) office.add(box(.08, 2.85, .08, material(0x263743, .3, .68), 1.05, 1.55, z));

  addEquipmentCases(office);
  addZoneSigns(office);
  addDeskAccentBars(office);
  scene.add(office);

  return {
    office, ceilingLights, developmentDesks, research, showcase, meeting, racks, waferStation,
    robot, dataCubes, characterAnimations, competitorScreen, people, expansionGroups,
  };
}
