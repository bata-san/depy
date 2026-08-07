import * as THREE from 'three';
import { box, material, shadowed } from './office-primitives';
import { floorTexture } from './voxel-textures';

export function addFloorTiles(group: THREE.Group): void {
  const base = shadowed(box(16.7, .18, 12.7, material(0x18232d, .92), 0, -.12, 0), false, true);
  group.add(base);

  const topMaterial = new THREE.MeshStandardMaterial({
    map: floorTexture(),
    roughness: .82,
    metalness: .08,
    color: 0xffffff,
  });
  const top = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), topMaterial);
  top.rotation.x = -Math.PI / 2;
  top.position.y = .001;
  top.receiveShadow = true;
  group.add(top);

  const channel = material(0x111c25, .46, .56);
  for (const x of [-5.85, -2.75, .35, 3.45, 6.55]) group.add(box(.04, .025, 12.02, channel, x, .021, 0));
  for (const z of [-3.9, -.8, 2.3, 5.4]) group.add(box(16.02, .025, .04, channel, 0, .021, z));
}
