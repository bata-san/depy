import * as THREE from 'three';
import { box, material } from './office-primitives';

export function addFloorTiles(group: THREE.Group): void {
  const base = material(0x1d2834, .92);
  const tileA = material(0x2a3948, .86);
  const tileB = material(0x304152, .84);
  group.add(box(16.7, .18, 12.7, base, 0, -.12, 0));
  for (let x = -8; x < 8; x += 1) {
    for (let z = -6; z < 6; z += 1) {
      const tile = box(.94, .055, .94, (x + z) % 2 === 0 ? tileA : tileB, x + .5, .015, z + .5);
      tile.receiveShadow = true;
      group.add(tile);
    }
  }
  const channel = material(0x14202a, .48, .54);
  for (const x of [-5.85, -2.75, .35, 3.45, 6.55]) group.add(box(.055, .065, 12.1, channel, x, .055, 0));
  for (const z of [-3.9, -.8, 2.3, 5.4]) group.add(box(16.1, .065, .055, channel, 0, .055, z));
}

