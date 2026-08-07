import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const regularMaterials = new Map<string, THREE.MeshStandardMaterial>();
const emissiveMaterials = new Map<string, THREE.MeshStandardMaterial>();
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitRounded = new RoundedBoxGeometry(1, 1, 1, 2, .055);
const unitSphere = new THREE.SphereGeometry(1, 14, 10);
const cylinderGeometries = new Map<number, THREE.CylinderGeometry>();

export const material = (color: number, roughness = .7, metalness = .08): THREE.MeshStandardMaterial => {
  const key = `${color}-${roughness}-${metalness}`;
  const cached = regularMaterials.get(key);
  if (cached) return cached;
  const next = new THREE.MeshStandardMaterial({ color, roughness, metalness });
  regularMaterials.set(key, next);
  return next;
};

export const emissiveMaterial = (color: number, emissive: number, intensity = 1): THREE.MeshStandardMaterial => {
  const key = `${color}-${emissive}-${intensity}`;
  const cached = emissiveMaterials.get(key);
  if (cached) return cached;
  const next = new THREE.MeshStandardMaterial({ color, roughness: .34, metalness: .24, emissive, emissiveIntensity: intensity });
  emissiveMaterials.set(key, next);
  return next;
};

function scaledMesh(geometry: THREE.BufferGeometry, mat: THREE.Material, width: number, height: number, depth: number, x: number, y: number, z: number): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.scale.set(width, height, depth);
  mesh.position.set(x, y, z);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

export function box(width: number, height: number, depth: number, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  return scaledMesh(unitBox, mat, width, height, depth, x, y, z);
}

export function roundedBox(width: number, height: number, depth: number, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  return scaledMesh(unitRounded, mat, width, height, depth, x, y, z);
}

export function shadowed<T extends THREE.Mesh>(mesh: T, cast = true, receive = true): T {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

export function cylinder(radius: number, height: number, mat: THREE.Material, x = 0, y = 0, z = 0, segments = 16): THREE.Mesh {
  let geometry = cylinderGeometries.get(segments);
  if (!geometry) {
    geometry = new THREE.CylinderGeometry(1, 1, 1, segments);
    cylinderGeometries.set(segments, geometry);
  }
  return scaledMesh(geometry, mat, radius, height, radius, x, y, z);
}

export function sphere(radius: number, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  return scaledMesh(unitSphere, mat, radius, radius, radius, x, y, z);
}

export function trimBox(width: number, height: number, depth: number, body: THREE.Material, trim: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const main = shadowed(roundedBox(width, height, depth, body));
  group.add(main);
  if (width > .2 && height > .08 && depth > .08) {
    const accent = box(width * .58, Math.min(.035, height * .18), .012, trim, 0, height * .34, depth / 2 + .008);
    group.add(accent);
  }
  return group;
}

export function decal(width: number, height: number, color: number, x: number, y: number, z: number): THREE.Mesh {
  return box(width, height, .012, emissiveMaterial(0x162332, color, .5), x, y, z);
}

export function joint(name: string, x: number, y: number, z: number): THREE.Group {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, y, z);
  return group;
}
