import * as THREE from 'three';
import { CharacterAnimationSystem } from './character-animations';
import { addCeiling, addZoneFloor, makeLeftWall, makeWindowWall } from './office-architecture';
import {
  addFloorTiles, box, deliveryRobot, desk, emissiveMaterial, floatingDataCube, material, meetingArea,
  partsShelf, plant, productShowcase, researchBench, serverRack, staffPerson, waferInspectionStation, wallDisplay,
} from './office-models';

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
    desk(-5.65, -4.0, 0, 0x5aaeff),
    desk(-2.75, -4.0, 0, 0x62c9ff),
    desk(-5.65, -1.05, Math.PI, 0x6fd6b0),
    desk(-2.75, -1.05, Math.PI, 0xffbc6b),
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
  for (let x = -6.35; x <= 6.35; x += 1.55) office.add(box(.075, .11, .29, emissiveMaterial(0xffffff, 0x8ecfff, .34), x, 4.86, -4.96));

  const competitorScreen = wallDisplay(1.85, 3.55, -5.91, 3.25, 0xff626e, 'competitor-screen');
  const financeScreen = wallDisplay(5.65, 3.55, -5.91, 2.75, 0x70d8a4, 'finance-screen');
  office.add(competitorScreen, financeScreen);

  office.add(plant(-7.28, -5.16, 1.05), plant(7.3, 5.1, 1.2), plant(-7.2, 5.05, .85), plant(1.2, 5.1, .72));
  office.add(box(3.65, 1.22, .1, material(0xe2e8ea, .72), -5.75, 3.45, -5.91));
  const logoPlate = box(2.55, .67, .1, emissiveMaterial(0x14283a, 0x4ea8ff, .82), -5.75, 4.52, -5.86);
  logoPlate.name = 'office-logo';
  office.add(logoPlate);
  for (let x = -6.7; x <= -4.8; x += .38) office.add(box(.22, .035, .025, emissiveMaterial(0x1c3346, 0x5ec6ff, .35), x, 4.52, -5.79));

  const robot = deliveryRobot();
  office.add(robot);
  const dataCubes = [
    floatingDataCube(0x5ec6ff, -4.25, 2.5, 3.45),
    floatingDataCube(0x62e6ad, -5.65, 2.18, 3.9),
    floatingDataCube(0xffbd68, 4.12, 2.32, 3.05),
    floatingDataCube(0xc58cff, 5.35, 2.62, 3.82),
  ];
  dataCubes.forEach((cube) => office.add(cube));

  const staffColors = [0x5aa7ff, 0xff8d71, 0x79d69c, 0xc998ff, 0xffc56f, 0x62cbd3, 0xf178a7, 0x95c76f, 0x7398e8, 0xe89f73, 0x70d1b6, 0xb286e8];
  const staffPositions: [number, number, number][] = [
    [-5.65, -2.9, Math.PI], [-2.75, -2.9, Math.PI], [-5.65, -2.12, 0], [-2.75, -2.12, 0],
    [5.0, -2.9, Math.PI], [1.9, -2.9, Math.PI], [-5.05, 2.7, 0], [.2, 2.4, 0],
    [4.85, 2.45, 0], [6.0, -.15, Math.PI / 2], [-.85, 4.92, Math.PI / 2], [2.15, 4.92, -Math.PI / 2],
  ];
  const people = staffPositions.map(([x, z, rotation], index) => staffPerson(staffColors[index] ?? 0x6dafff, x, z, rotation, index));
  people.forEach((person) => office.add(person));
  const characterAnimations = new CharacterAnimationSystem(people);

  const glassPartition = new THREE.MeshPhysicalMaterial({ color: 0x91c8df, transparent: true, opacity: .12, transmission: .72, roughness: .12 });
  office.add(box(.045, 2.72, 4.2, glassPartition, 1.05, 1.55, 3.35));
  for (const z of [1.25, 3.35, 5.45]) office.add(box(.1, 2.85, .1, material(0x263743, .3, .68), 1.05, 1.55, z));
  office.add(box(.12, 2.85, .1, material(0x263743, .3, .68), 1.05, 1.55, 1.25));

  scene.add(office);

  return {
    office, ceilingLights, developmentDesks, research, showcase, meeting, racks, waferStation,
    robot, dataCubes, characterAnimations, competitorScreen,
  };
}
