import * as THREE from 'three';

export type CharacterAnimation = 'typing' | 'soldering' | 'inspecting' | 'walking' | 'presenting' | 'resting';

export interface CharacterAnimationContext {
  staffCount: number;
  projectActive: boolean;
  researchActive: boolean;
  productActive: boolean;
  timeSpeed: number;
}

interface CharacterRig {
  root: THREE.Group;
  torso: THREE.Object3D;
  head: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  baseX: number;
  baseZ: number;
  baseRotation: number;
  phase: number;
  animation: CharacterAnimation;
}

const modes: CharacterAnimation[] = ['typing', 'typing', 'soldering', 'inspecting', 'walking', 'presenting', 'resting'];

export class CharacterAnimationSystem {
  private rigs: CharacterRig[];

  constructor(characters: THREE.Group[]) {
    this.rigs = characters.map((root, index) => ({
      root,
      torso: root.getObjectByName('torso') ?? root,
      head: root.getObjectByName('head') ?? root,
      leftArm: root.getObjectByName('left-arm') ?? root,
      rightArm: root.getObjectByName('right-arm') ?? root,
      leftLeg: root.getObjectByName('left-leg') ?? root,
      rightLeg: root.getObjectByName('right-leg') ?? root,
      baseX: Number(root.userData.baseX ?? root.position.x),
      baseZ: Number(root.userData.baseZ ?? root.position.z),
      baseRotation: root.rotation.y,
      phase: Number(root.userData.phase ?? index * .7),
      animation: modes[index % modes.length] ?? 'typing',
    }));
  }

  update(time: number, context: CharacterAnimationContext): void {
    this.rigs.forEach((rig, index) => {
      rig.root.visible = index < context.staffCount;
      if (!rig.root.visible) return;
      this.resetRig(rig);
      rig.animation = this.modeFor(index, context);
      const pace = context.timeSpeed === 0 ? .35 : Math.min(1.45, .72 + context.timeSpeed * .09);
      const t = time * pace + rig.phase;
      switch (rig.animation) {
        case 'typing': this.typing(rig, t); break;
        case 'soldering': this.soldering(rig, t); break;
        case 'inspecting': this.inspecting(rig, t); break;
        case 'walking': this.walking(rig, t); break;
        case 'presenting': this.presenting(rig, t); break;
        case 'resting': this.resting(rig, t); break;
      }
    });
  }

  private modeFor(index: number, context: CharacterAnimationContext): CharacterAnimation {
    if (index === 6) return context.researchActive ? 'soldering' : 'inspecting';
    if (index === 8) return context.productActive ? 'presenting' : 'inspecting';
    if (index === 9 || index === 10) return context.timeSpeed > 0 ? 'walking' : 'resting';
    if (index === 5) return context.productActive ? 'presenting' : 'typing';
    if (index < 4) {
      if (!context.projectActive) return index % 2 ? 'inspecting' : 'resting';
      return index % 3 === 0 ? 'soldering' : 'typing';
    }
    return modes[index % modes.length] ?? 'typing';
  }

  private resetRig(rig: CharacterRig): void {
    rig.root.position.set(rig.baseX, 0, rig.baseZ);
    rig.root.rotation.set(0, rig.baseRotation, 0);
    rig.torso.rotation.set(0, 0, 0);
    rig.torso.scale.set(1, 1, 1);
    rig.head.rotation.set(0, 0, 0);
    rig.leftArm.rotation.set(0, 0, 0);
    rig.rightArm.rotation.set(0, 0, 0);
    rig.leftLeg.rotation.set(0, 0, 0);
    rig.rightLeg.rotation.set(0, 0, 0);
  }

  private typing(rig: CharacterRig, t: number): void {
    rig.root.position.y = Math.sin(t * 2.2) * .012;
    rig.torso.rotation.x = -.08;
    rig.leftArm.rotation.x = -.72 + Math.sin(t * 8) * .09;
    rig.rightArm.rotation.x = -.72 + Math.sin(t * 8 + 1.2) * .09;
    rig.leftArm.rotation.z = -.16;
    rig.rightArm.rotation.z = .16;
    rig.head.rotation.y = Math.sin(t * .55) * .08;
  }

  private soldering(rig: CharacterRig, t: number): void {
    rig.torso.rotation.x = -.16;
    rig.head.rotation.x = .15 + Math.sin(t * .8) * .04;
    rig.leftArm.rotation.x = -.92;
    rig.rightArm.rotation.x = -.98 + Math.sin(t * 5.4) * .08;
    rig.leftArm.rotation.z = -.24;
    rig.rightArm.rotation.z = .28;
  }

  private inspecting(rig: CharacterRig, t: number): void {
    rig.head.rotation.y = Math.sin(t * .9) * .32;
    rig.head.rotation.x = .08 + Math.sin(t * 1.6) * .07;
    rig.rightArm.rotation.x = -.38;
    rig.rightArm.rotation.z = .48 + Math.sin(t * 1.2) * .08;
    rig.root.position.y = Math.sin(t * 1.4) * .01;
  }

  private walking(rig: CharacterRig, t: number): void {
    const cycle = t * .65;
    rig.root.position.x = rig.baseX + Math.sin(cycle) * .56;
    rig.root.position.z = rig.baseZ + Math.cos(cycle * .83) * .34;
    rig.root.rotation.y = rig.baseRotation + Math.sin(cycle) * .18;
    const swing = Math.sin(t * 5.5) * .55;
    rig.leftArm.rotation.x = swing;
    rig.rightArm.rotation.x = -swing;
    rig.leftLeg.rotation.x = -swing * .75;
    rig.rightLeg.rotation.x = swing * .75;
    rig.root.position.y = Math.abs(Math.sin(t * 5.5)) * .035;
  }

  private presenting(rig: CharacterRig, t: number): void {
    rig.root.rotation.y = rig.baseRotation + Math.sin(t * .45) * .12;
    rig.rightArm.rotation.z = .86 + Math.sin(t * .9) * .12;
    rig.rightArm.rotation.x = -.18;
    rig.leftArm.rotation.z = -.2;
    rig.head.rotation.y = Math.sin(t * .65) * .12;
  }

  private resting(rig: CharacterRig, t: number): void {
    rig.root.position.y = Math.sin(t * 1.2) * .01;
    rig.torso.scale.y = 1 + Math.sin(t * 1.2) * .008;
    rig.leftArm.rotation.x = -.18;
    rig.rightArm.rotation.x = -.18;
    rig.head.rotation.z = Math.sin(t * .42) * .09;
  }
}
