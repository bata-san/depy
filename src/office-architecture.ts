import * as THREE from 'three';
import { box, emissiveMaterial, material } from './office-models';

export function makeWindowWall(office: THREE.Group): void {
  const wall = material(0x263746, .72, .18);
  const wallDark = material(0x111c27, .42, .58);
  const mullion = material(0x253744, .28, .72);
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xa6d7ee,
    transparent: true,
    opacity: .11,
    transmission: .82,
    roughness: .12,
    metalness: .04,
  });

  office.add(
    box(16.5, 1.08, .32, wall, 0, .54, -6.16),
    box(16.5, .62, .32, wallDark, 0, 5.06, -6.16),
    box(16.5, .12, .38, material(0x0f1821, .34, .68), 0, 1.12, -6.12),
  );

  const panelCenters = [-6.78, -4.52, -2.26, 0, 2.26, 4.52, 6.78];
  panelCenters.forEach((center) => office.add(box(2.12, 3.72, .045, glass, center, 3.0, -6.04)));
  for (const x of [-7.91, -5.65, -3.39, -1.13, 1.13, 3.39, 5.65, 7.91]) {
    office.add(box(.12, 4.05, .18, mullion, x, 3.03, -6.0));
  }
  office.add(box(16.1, .1, .18, mullion, 0, 2.03, -6), box(16.1, .1, .18, mullion, 0, 4.05, -6));

  for (const x of [-6.7, -2.25, 2.25, 6.7]) {
    const blind = box(1.8, .035, .08, material(0xd4e0e5, .55, .22), x, 4.78, -5.95);
    office.add(blind);
  }
}

export function makeLeftWall(office: THREE.Group): void {
  const wall = material(0x263746, .76, .14);
  const inset = material(0x1a2834, .56, .36);
  office.add(box(.34, 5.65, 12.5, wall, -8.16, 2.68, 0));
  for (const z of [-4.65, -2.25, .15, 2.55, 4.95]) {
    office.add(box(.035, 1.7, 1.8, inset, -7.98, 2.85, z));
    office.add(box(.055, 1.88, .08, material(0x435864, .34, .64), -7.95, 2.85, z - .94));
    office.add(box(.055, 1.88, .08, material(0x435864, .34, .64), -7.95, 2.85, z + .94));
  }
}

export function addZoneFloor(office: THREE.Group, width: number, depth: number, color: number, x: number, z: number): void {
  office.add(box(width, .055, depth, material(color, .88, .08), x, .065, z));
  const border = material(0x111b24, .4, .58);
  office.add(
    box(width + .12, .025, .07, border, x, .1, z - depth / 2),
    box(width + .12, .025, .07, border, x, .1, z + depth / 2),
    box(.07, .025, depth, border, x - width / 2, .1, z),
    box(.07, .025, depth, border, x + width / 2, .1, z),
  );
}

export function addCeiling(office: THREE.Group): THREE.Mesh[] {
  const beams = material(0x14212c, .34, .66);
  office.add(box(16.4, .16, .2, beams, 0, 5.48, -5.82));
  for (const x of [-7.6, -4.55, -1.5, 1.55, 4.6, 7.65]) office.add(box(.16, .16, 11.75, beams, x, 5.48, -.05));
  for (const z of [-4.85, -1.75, 1.35, 4.45]) office.add(box(16.1, .14, .16, beams, 0, 5.46, z));

  const lights: THREE.Mesh[] = [];
  const fixtures: Array<[number, number, number]> = [
    [-5.9, -3.25, 0x8fd1ff], [-2.9, -3.25, 0x8fd1ff], [2.0, -3.25, 0xffbd86], [5.1, -3.25, 0x8fd1ff],
    [-5.4, 2.75, 0x76e8d0], [-1.8, 2.75, 0xffcc8b], [2.1, 2.75, 0xffcc8b], [5.5, 2.75, 0x8fd1ff],
  ];
  fixtures.forEach(([x, z, color]) => {
    const fixture = box(2.25, .08, .34, emissiveMaterial(0xf4f7f8, color, .9), x, 5.34, z);
    fixture.name = 'ceiling-light';
    lights.push(fixture);
    office.add(fixture, box(2.42, .06, .46, beams, x, 5.42, z));
  });
  return lights;
}

export function setGroupEmissive(object: THREE.Object3D, intensity: number): void {
  object.traverse((child: THREE.Object3D) => {
    if (!(child instanceof THREE.Mesh) || !(child.material instanceof THREE.MeshStandardMaterial)) return;
    if (child.material.emissive.getHex() !== 0) child.material.emissiveIntensity = intensity;
  });
}
