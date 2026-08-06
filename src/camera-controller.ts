import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const CAMERA_KEY = 'pc-frontier-lab-camera-v1';

interface CameraSnapshot {
  position: [number, number, number];
  target: [number, number, number];
}

const defaultSnapshot: CameraSnapshot = {
  position: [16, 14.2, 18.8],
  target: [0, 1.25, 0],
};

function loadSnapshot(): CameraSnapshot {
  try {
    const parsed = JSON.parse(localStorage.getItem(CAMERA_KEY) ?? 'null') as CameraSnapshot | null;
    if (!parsed || parsed.position.length !== 3 || parsed.target.length !== 3) return defaultSnapshot;
    return parsed;
  } catch {
    return defaultSnapshot;
  }
}

export class CameraController {
  private saveTimer = 0;
  private interacting = false;

  constructor(private camera: THREE.PerspectiveCamera, private controls: OrbitControls) {
    const snapshot = loadSnapshot();
    camera.position.fromArray(snapshot.position);
    controls.target.fromArray(snapshot.target);
    controls.enableDamping = true;
    controls.enablePan = true;
    controls.enableRotate = true;
    controls.minDistance = 10;
    controls.maxDistance = 35;
    controls.maxPolarAngle = Math.PI * .49;
    const events = controls as unknown as { addEventListener: (type: string, listener: () => void) => void };
    events.addEventListener('start', () => { this.interacting = true; });
    events.addEventListener('change', () => this.scheduleSave());
    events.addEventListener('end', () => { this.interacting = false; this.persist(); });
  }

  update(delta: number): void {
    // Only OrbitControls owns the camera after initialization. UI renders never write position/target.
    this.controls.update(delta);
  }

  reset(): void {
    this.camera.position.fromArray(defaultSnapshot.position);
    this.controls.target.fromArray(defaultSnapshot.target);
    this.controls.update();
    this.persist();
  }

  dispose(): void {
    window.clearTimeout(this.saveTimer);
    this.persist();
    this.controls.dispose();
  }

  private scheduleSave(): void {
    window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => { if (!this.interacting) this.persist(); }, 320);
  }

  private persist(): void {
    const snapshot: CameraSnapshot = {
      position: this.camera.position.toArray() as [number, number, number],
      target: this.controls.target.toArray() as [number, number, number],
    };
    try { localStorage.setItem(CAMERA_KEY, JSON.stringify(snapshot)); } catch { /* ignore storage failures */ }
  }
}
