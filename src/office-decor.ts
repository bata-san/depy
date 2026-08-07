import * as THREE from 'three';
import { material } from './office-primitives';

const signTextures = new Map<string, THREE.CanvasTexture>();

function signTexture(label: string, accent: number): THREE.CanvasTexture {
  const key = `${label}-${accent}`;
  const cached = signTextures.get(key);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is unavailable');
  ctx.fillStyle = '#101a24';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = `#${accent.toString(16).padStart(6, '0')}`;
  ctx.fillRect(0, 0, 10, canvas.height);
  ctx.fillStyle = '#dce8ee';
  ctx.font = '700 32px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 28, 33);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  signTextures.set(key, texture);
  return texture;
}

export function addStaffContactShadows(office: THREE.Group, staffPositions: Array<[number, number, number]>): void {
  const geometry = new THREE.CircleGeometry(.42, 18);
  const mat = new THREE.MeshBasicMaterial({ color: 0x05080b, transparent: true, opacity: .2, depthWrite: false });
  const shadows = new THREE.InstancedMesh(geometry, mat, staffPositions.length);
  const dummy = new THREE.Object3D();
  staffPositions.forEach(([x, z], index) => {
    dummy.position.set(x, .012, z);
    dummy.rotation.set(-Math.PI / 2, 0, 0);
    dummy.scale.set(1, .62, 1);
    dummy.updateMatrix();
    shadows.setMatrixAt(index, dummy.matrix);
  });
  shadows.instanceMatrix.needsUpdate = true;
  shadows.renderOrder = 1;
  office.add(shadows);
}

export function addEquipmentCases(office: THREE.Group): void {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const caseMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .62, metalness: .22 });
  const cases = new THREE.InstancedMesh(geometry, caseMaterial, 14);
  const positions: Array<[number, number, number, number]> = [
    [6.0, .23, 5.2, 0x455d69], [6.7, .23, 5.2, 0x53606a], [7.35, .23, 5.2, 0x425a50],
    [-7.3, .22, .9, 0x526470], [-7.3, .22, 1.55, 0x3f554c], [-7.3, .22, 2.18, 0x5c5549],
    [6.9, .22, -4.95, 0x495d6b], [6.25, .22, -4.95, 0x5a665c],
    [-1.5, .16, -5.4, 0x354957], [-.95, .16, -5.4, 0x455c69],
    [2.9, .16, -5.4, 0x4d5a63], [3.45, .16, -5.4, 0x3e5048],
    [-6.85, .16, 5.35, 0x584d45], [5.6, .16, 5.35, 0x425866],
  ];
  const dummy = new THREE.Object3D();
  positions.forEach(([x, y, z, color], index) => {
    dummy.position.set(x, y, z);
    dummy.scale.set(.5, .32, .42);
    dummy.updateMatrix();
    cases.setMatrixAt(index, dummy.matrix);
    cases.setColorAt(index, new THREE.Color(color));
  });
  cases.instanceMatrix.needsUpdate = true;
  if (cases.instanceColor) cases.instanceColor.needsUpdate = true;
  office.add(cases);
}

export function addZoneSigns(office: THREE.Group): void {
  const definitions: Array<[string, number, number, number]> = [
    ['DEV LAB', 0x5caeff, -4.2, -5.82],
    ['OPS', 0x62e7ad, 1.9, -5.82],
    ['SYSTEMS', 0x7dc8ff, 5.3, -5.82],
    ['RESEARCH', 0x8ad8c4, -5.1, 5.72],
    ['SHOWCASE', 0xffbd78, 4.75, 5.72],
  ];
  definitions.forEach(([label, accent, x, z]) => {
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(label.length > 5 ? 1.7 : 1.25, .42),
      new THREE.MeshBasicMaterial({ map: signTexture(label, accent), toneMapped: false }),
    );
    sign.position.set(x, 4.72, z);
    if (z > 0) sign.rotation.y = Math.PI;
    office.add(sign);
  });
}

export function addDeskAccentBars(office: THREE.Group): void {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const mat = material(0x66808f, .38, .56);
  const accents = new THREE.InstancedMesh(geometry, mat, 12);
  const positions: Array<[number, number, number]> = [
    [-5.65, 1.2, -3.48], [-2.75, 1.2, -3.48], [-5.65, 1.2, -1.57], [-2.75, 1.2, -1.57],
    [5.0, 1.2, -3.48], [1.9, 1.2, -3.48],
    [-4.8, 1.14, 3.6], [-5.3, 1.14, 3.6],
    [4.25, 1.02, 3.45], [5.45, 1.02, 3.45],
    [-.45, .86, 3.6], [.85, .86, 3.6],
  ];
  const dummy = new THREE.Object3D();
  positions.forEach(([x, y, z], index) => {
    dummy.position.set(x, y, z);
    dummy.scale.set(.34, .025, .06);
    dummy.updateMatrix();
    accents.setMatrixAt(index, dummy.matrix);
  });
  accents.instanceMatrix.needsUpdate = true;
  office.add(accents);
}
