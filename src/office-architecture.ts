import * as THREE from 'three';
import { box, emissiveMaterial, material, shadowed } from './office-models';

export function makeWindowWall(office: THREE.Group): void {
  const wall = material(0x263746, .7, .2);
  const wallDark = material(0x101a24, .4, .6);
  const mullion = material(0x2a3d49, .28, .72);
  const glass = new THREE.MeshStandardMaterial({
    color: 0x79abc2,
    transparent: true,
    opacity: .14,
    roughness: .16,
    metalness: .18,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  office.add(
    shadowed(box(16.5, 1.08, .32, wall, 0, .54, -6.16), true, true),
    box(16.5, .62, .32, wallDark, 0, 5.06, -6.16),
    box(16.5, .12, .38, material(0x0e171f, .32, .7), 0, 1.12, -6.12),
  );

  const panelCenters = [-6.78, -4.52, -2.26, 0, 2.26, 4.52, 6.78];
  panelCenters.forEach((center) => office.add(box(2.12, 3.72, .025, glass, center, 3.0, -6.04)));
  for (const x of [-7.91, -5.65, -3.39, -1.13, 1.13, 3.39, 5.65, 7.91]) office.add(box(.1, 4.05, .16, mullion, x, 3.03, -6.0));
  office.add(box(16.1, .08, .16, mullion, 0, 2.03, -6), box(16.1, .08, .16, mullion, 0, 4.05, -6));

  for (const x of [-6.7, -2.25, 2.25, 6.7]) {
    office.add(box(1.8, .035, .08, material(0xd4e0e5, .55, .22), x, 4.78, -5.95));
    office.add(box(.035, 3.1, .035, material(0x8b9da8, .4, .42), x + .82, 3.1, -5.92));
  }
}

export function makeLeftWall(office: THREE.Group): void {
  const wall = material(0x263746, .74, .16);
  const inset = material(0x172632, .54, .38);
  office.add(shadowed(box(.34, 5.65, 12.5, wall, -8.16, 2.68, 0), true, true));
  for (const z of [-4.65, -2.25, .15, 2.55, 4.95]) {
    office.add(box(.035, 1.7, 1.8, inset, -7.98, 2.85, z));
    office.add(box(.05, 1.88, .07, material(0x4a606c, .32, .66), -7.95, 2.85, z - .94));
    office.add(box(.05, 1.88, .07, material(0x4a606c, .32, .66), -7.95, 2.85, z + .94));
  }
  for (const z of [-5.5, -3.1, -.7, 1.7, 4.1]) office.add(box(.025, .34, 1.15, emissiveMaterial(0x1c3040, 0x4b91bd, .18), -7.97, 4.55, z));
}

export function addZoneFloor(office: THREE.Group, width: number, depth: number, color: number, x: number, z: number): void {
  office.add(box(width, .045, depth, material(color, .86, .08), x, .045, z));
  const border = material(0x111b24, .4, .58);
  office.add(
    box(width + .12, .018, .055, border, x, .075, z - depth / 2),
    box(width + .12, .018, .055, border, x, .075, z + depth / 2),
    box(.055, .018, depth, border, x - width / 2, .075, z),
    box(.055, .018, depth, border, x + width / 2, .075, z),
  );
}

export function addCeiling(office: THREE.Group): THREE.Mesh[] {
  const beams = material(0x121e28, .32, .7);
  office.add(box(16.4, .14, .18, beams, 0, 5.48, -5.82));
  for (const x of [-7.6, -4.55, -1.5, 1.55, 4.6, 7.65]) office.add(box(.14, .14, 11.75, beams, x, 5.48, -.05));
  for (const z of [-4.85, -1.75, 1.35, 4.45]) office.add(box(16.1, .12, .14, beams, 0, 5.46, z));

  const lights: THREE.Mesh[] = [];
  const fixtures: Array<[number, number, number]> = [
    [-5.9, -3.25, 0x8fd1ff], [-2.9, -3.25, 0x8fd1ff], [2.0, -3.25, 0xffbd86], [5.1, -3.25, 0x8fd1ff],
    [-5.4, 2.75, 0x76e8d0], [-1.8, 2.75, 0xffcc8b], [2.1, 2.75, 0xffcc8b], [5.5, 2.75, 0x8fd1ff],
  ];
  fixtures.forEach(([x, z, color]) => {
    const fixture = box(2.25, .065, .3, emissiveMaterial(0xf4f7f8, color, .72), x, 5.34, z);
    fixture.name = 'ceiling-light';
    lights.push(fixture);
    office.add(fixture, box(2.42, .045, .42, beams, x, 5.42, z));
  });
  return lights;
}

export function setGroupEmissive(object: THREE.Object3D, intensity: number): void {
  object.traverse((child: THREE.Object3D) => {
    if (!(child instanceof THREE.Mesh) || !(child.material instanceof THREE.MeshStandardMaterial)) return;
    if (child.material.emissive.getHex() !== 0) child.material.emissiveIntensity = intensity;
  });
}
