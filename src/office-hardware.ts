import * as THREE from 'three';
import { box, cylinder, decal, material, shadowed, trimBox } from './office-primitives';
import { fanTexture } from './voxel-textures';

export function cpuPackage(): THREE.Group {
  const group = new THREE.Group();
  const substrate = material(0x155a4c, .46, .28);
  const substrateEdge = material(0x0b3029, .4, .42);
  const spreader = material(0xc8d1d5, .18, .9);
  const darkMetal = material(0x2e383e, .24, .8);
  const board = trimBox(1.1, .11, 1.1, substrate, substrateEdge);
  board.position.y = .065;
  group.add(board);
  const lid = trimBox(.78, .15, .78, spreader, darkMetal);
  lid.position.y = .2;
  group.add(lid);
  group.add(box(.49, .028, .49, darkMetal, 0, .287));

  const positions: Array<[number, number]> = [];
  for (let row = -5; row <= 5; row += 1) {
    for (let column = -5; column <= 5; column += 1) {
      if (Math.abs(row) < 2 && Math.abs(column) < 2) continue;
      positions.push([row * .09, column * .09]);
    }
  }
  const contactMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(.031, .02, .031),
    material(0xd8ad55, .2, .86),
    positions.length,
  );
  const dummy = new THREE.Object3D();
  positions.forEach(([x, z], index) => {
    dummy.position.set(x, .002, z);
    dummy.updateMatrix();
    contactMesh.setMatrixAt(index, dummy.matrix);
  });
  contactMesh.instanceMatrix.needsUpdate = true;
  group.add(contactMesh);
  group.add(decal(.12, .12, 0x47f0ae, -.43, .16, .555));
  group.name = 'product-chip';
  return group;
}

export function gpuFan(x: number): THREE.Group {
  const fan = new THREE.Group();
  fan.name = 'gpu-fan';
  const disc = new THREE.Mesh(
    new THREE.PlaneGeometry(.56, .56),
    new THREE.MeshBasicMaterial({ map: fanTexture(0x5d7484), transparent: true, depthWrite: false, toneMapped: false }),
  );
  fan.add(disc);
  const hub = cylinder(.085, .055, material(0x101820, .24, .74));
  hub.rotation.x = Math.PI / 2;
  fan.add(hub);
  fan.position.x = x;
  return fan;
}

export function gpuCard(): THREE.Group {
  const group = new THREE.Group();
  const pcb = material(0x12483e, .44, .32);
  const shroud = material(0x263746, .22, .74);
  const trim = material(0x627782, .22, .76);
  const copper = material(0xb87333, .18, .88);
  const board = trimBox(1.78, .7, .1, pcb, material(0x0b2924, .4, .45));
  group.add(board);
  const cooler = trimBox(1.62, .62, .14, shroud, trim);
  cooler.position.z = .105;
  group.add(cooler);

  const fanLeft = gpuFan(-.43);
  const fanRight = gpuFan(.43);
  fanLeft.position.z = .19;
  fanRight.position.z = .19;
  group.add(fanLeft, fanRight);
  group.add(shadowed(box(1.58, .07, .12, copper, 0, -.32, -.02), true, false));

  const contacts = new THREE.InstancedMesh(new THREE.BoxGeometry(.042, .12, .025), material(0xd8ab55, .18, .88), 13);
  const dummy = new THREE.Object3D();
  for (let index = 0; index < 13; index += 1) {
    dummy.position.set((index - 6) * .087, -.41, -.01);
    dummy.updateMatrix();
    contacts.setMatrixAt(index, dummy.matrix);
  }
  contacts.instanceMatrix.needsUpdate = true;
  group.add(contacts);

  for (let index = 0; index < 3; index += 1) {
    const pipe = cylinder(.025, 1.38, copper, -.58 + index * .12, 0, -.09, 10);
    pipe.rotation.z = Math.PI / 2;
    group.add(pipe);
  }
  group.add(
    box(.29, .13, .035, material(0x303b44, .28, .74), -.69, .21, -.08),
    box(.29, .13, .035, material(0x303b44, .28, .74), -.69, .03, -.08),
    box(.42, .035, .035, material(0x71818a, .22, .74), .5, .29, -.08),
  );
  group.name = 'product-gpu';
  return group;
}
