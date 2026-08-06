import * as THREE from 'three';

export interface AmbientAnimationContext {
  speed: number;
  projectProgress: number;
  productGlow: number;
  researchActive: boolean;
  cashHealth: number;
}

export interface AmbientAnimationNodes {
  deliveryRobot: THREE.Group;
  robotBeacon: THREE.Mesh;
  dataCubes: THREE.Mesh[];
  ceilingLights: THREE.Mesh[];
}

/** Small environmental motions that make the voxel office feel occupied without moving the camera. */
export class AmbientAnimationSystem {
  private robotDistance = 0;

  constructor(private nodes: AmbientAnimationNodes) {}

  update(time: number, delta: number, context: AmbientAnimationContext): void {
    const motion = context.speed === 0 ? .12 : Math.min(1.8, .45 + context.speed * .14);
    this.robotDistance = (this.robotDistance + delta * motion) % 18;
    const phase = this.robotDistance;
    const robot = this.nodes.deliveryRobot;

    // Rectangular supply route between the parts shelf, server racks, and development desks.
    if (phase < 5) {
      robot.position.set(6.2 - phase * 1.35, 0, .2);
      robot.rotation.y = -Math.PI / 2;
    } else if (phase < 9) {
      robot.position.set(-.55, 0, .2 + (phase - 5) * .9);
      robot.rotation.y = 0;
    } else if (phase < 14) {
      robot.position.set(-.55 + (phase - 9) * 1.35, 0, 3.8);
      robot.rotation.y = Math.PI / 2;
    } else {
      robot.position.set(6.2, 0, 3.8 - (phase - 14) * .9);
      robot.rotation.y = Math.PI;
    }
    robot.position.y = Math.abs(Math.sin(time * 7 * motion)) * .025;

    if (this.nodes.robotBeacon.material instanceof THREE.MeshStandardMaterial) {
      this.nodes.robotBeacon.material.emissiveIntensity = .6 + Math.max(0, Math.sin(time * 4.2)) * 1.9;
      this.nodes.robotBeacon.material.color.setHex(context.cashHealth < .18 ? 0xff6f78 : 0x53dca0);
      this.nodes.robotBeacon.material.emissive.setHex(context.cashHealth < .18 ? 0xff2638 : 0x21ff94);
    }

    this.nodes.dataCubes.forEach((cube, index) => {
      const activity = index % 2 === 0 ? context.projectProgress / 100 : context.productGlow;
      cube.rotation.x += delta * (.22 + activity * .7);
      cube.rotation.y -= delta * (.35 + activity * .95);
      cube.position.y = Number(cube.userData.baseY ?? cube.position.y) + Math.sin(time * (1.1 + index * .08) + index) * (.035 + activity * .035);
      if (cube.material instanceof THREE.MeshStandardMaterial) cube.material.emissiveIntensity = .2 + activity * 1.45 + (context.researchActive ? .18 : 0);
    });

    this.nodes.ceilingLights.forEach((light, index) => {
      if (!(light.material instanceof THREE.MeshStandardMaterial)) return;
      const pulse = context.researchActive ? Math.sin(time * 2.2 + index) * .08 : 0;
      light.material.emissiveIntensity = .78 + pulse + context.cashHealth * .18;
    });
  }
}
