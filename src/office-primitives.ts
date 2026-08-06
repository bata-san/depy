import * as THREE from 'three';

const regularMaterials = new Map<string, THREE.MeshStandardMaterial>();

export const material = (color: number, roughness = .7, metalness = .08): THREE.MeshStandardMaterial => {
  const key = `${color}-${roughness}-${metalness}`;
  const cached = regularMaterials.get(key);
  if (cached) return cached;
  const next = new THREE.MeshStandardMaterial({ color, roughness, metalness });
  regularMaterials.set(key, next);
  return next;
};

export const emissiveMaterial = (color: number, emissive: number, intensity = 1): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({ color, roughness: .34, metalness: .24, emissive, emissiveIntensity: intensity });

export function box(width: number, height: number, depth: number, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function cylinder(radius: number, height: number, mat: THREE.Material, x = 0, y = 0, z = 0, segments = 20): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function sphere(radius: number, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 14), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function trimBox(width: number, height: number, depth: number, body: THREE.Material, trim: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  group.add(box(width, height, depth, body));
  const edge = .035;
  group.add(
    box(width + edge, edge, depth + edge, trim, 0, height / 2 + edge / 2),
    box(width + edge, edge, depth + edge, trim, 0, -height / 2 - edge / 2),
    box(edge, height, depth + edge, trim, width / 2 + edge / 2),
    box(edge, height, depth + edge, trim, -width / 2 - edge / 2),
  );
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

