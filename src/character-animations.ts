import * as THREE from 'three';
import type { StaffRole } from './types';

export type CharacterAnimation =
  | 'typing' | 'soldering' | 'inspecting' | 'walking' | 'presenting'
  | 'resting' | 'talking' | 'carrying' | 'celebrating' | 'frustrated';

export interface StaffVisualState {
  id: string;
  name: string;
  role: StaffRole;
  morale: number;
  fatigue: number;
}

export interface CharacterAnimationContext {
  staffCount: number;
  staff: StaffVisualState[];
  projectActive: boolean;
  researchActive: boolean;
  productActive: boolean;
  timeSpeed: number;
}

interface Pose {
  rootX: number;
  rootY: number;
  rootZ: number;
  rootRotation: number;
  hips: [number, number, number];
  torso: [number, number, number];
  chest: [number, number, number];
  head: [number, number, number];
  leftArm: [number, number, number];
  rightArm: [number, number, number];
  leftElbow: [number, number, number];
  rightElbow: [number, number, number];
  leftLeg: [number, number, number];
  rightLeg: [number, number, number];
  leftKnee: [number, number, number];
  rightKnee: [number, number, number];
  leftFoot: [number, number, number];
  rightFoot: [number, number, number];
}

interface CharacterRig {
  root: THREE.Group;
  hips: THREE.Object3D;
  torso: THREE.Object3D;
  chest: THREE.Object3D;
  head: THREE.Object3D;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftElbow: THREE.Object3D;
  rightElbow: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  leftKnee: THREE.Object3D;
  rightKnee: THREE.Object3D;
  leftFoot: THREE.Object3D;
  rightFoot: THREE.Object3D;
  baseX: number;
  baseZ: number;
  baseRotation: number;
  phase: number;
  animation: CharacterAnimation;
}

const defaultModes: CharacterAnimation[] = [
  'typing', 'typing', 'soldering', 'inspecting', 'typing', 'talking',
  'soldering', 'resting', 'presenting', 'carrying', 'walking', 'talking',
];

const neutralPose = (rig: CharacterRig): Pose => ({
  rootX: rig.baseX,
  rootY: 0,
  rootZ: rig.baseZ,
  rootRotation: rig.baseRotation,
  hips: [0, 0, 0], torso: [0, 0, 0], chest: [0, 0, 0], head: [0, 0, 0],
  leftArm: [0, 0, 0], rightArm: [0, 0, 0], leftElbow: [0, 0, 0], rightElbow: [0, 0, 0],
  leftLeg: [0, 0, 0], rightLeg: [0, 0, 0], leftKnee: [0, 0, 0], rightKnee: [0, 0, 0],
  leftFoot: [0, 0, 0], rightFoot: [0, 0, 0],
});

const damp = (current: number, target: number, alpha: number): number => current + (target - current) * alpha;

function dampEuler(object: THREE.Object3D, target: [number, number, number], alpha: number): void {
  object.rotation.x = damp(object.rotation.x, target[0], alpha);
  object.rotation.y = damp(object.rotation.y, target[1], alpha);
  object.rotation.z = damp(object.rotation.z, target[2], alpha);
}

export class CharacterAnimationSystem {
  private rigs: CharacterRig[];
  private lastTime = 0;

  constructor(characters: THREE.Group[]) {
    this.rigs = characters.map((root, index) => ({
      root,
      hips: root.getObjectByName('hips') ?? root,
      torso: root.getObjectByName('torso') ?? root,
      chest: root.getObjectByName('chest') ?? root,
      head: root.getObjectByName('head') ?? root,
      leftArm: root.getObjectByName('left-arm') ?? root,
      rightArm: root.getObjectByName('right-arm') ?? root,
      leftElbow: root.getObjectByName('left-elbow') ?? root,
      rightElbow: root.getObjectByName('right-elbow') ?? root,
      leftLeg: root.getObjectByName('left-leg') ?? root,
      rightLeg: root.getObjectByName('right-leg') ?? root,
      leftKnee: root.getObjectByName('left-knee') ?? root,
      rightKnee: root.getObjectByName('right-knee') ?? root,
      leftFoot: root.getObjectByName('left-foot') ?? root,
      rightFoot: root.getObjectByName('right-foot') ?? root,
      baseX: Number(root.userData.baseX ?? root.position.x),
      baseZ: Number(root.userData.baseZ ?? root.position.z),
      baseRotation: root.rotation.y,
      phase: Number(root.userData.phase ?? index * .79),
      animation: defaultModes[index % defaultModes.length] ?? 'typing',
    }));
  }

  update(time: number, context: CharacterAnimationContext): void {
    const delta = this.lastTime === 0 ? 1 / 60 : Math.min(.05, Math.max(0, time - this.lastTime));
    this.lastTime = time;
    const alpha = 1 - Math.exp(-delta * 11);

    this.rigs.forEach((rig, index) => {
      rig.root.visible = index < context.staffCount;
      if (!rig.root.visible) return;
      const mode = this.modeFor(index, context, time + rig.phase);
      rig.animation = mode;
      rig.root.userData.animation = mode;
      rig.root.userData.staffId = context.staff[index]?.id ?? '';
      const t = time + rig.phase;
      const pose = this.poseFor(rig, mode, t);
      this.applyPose(rig, pose, alpha);
    });
  }

  private modeFor(index: number, context: CharacterAnimationContext, t: number): CharacterAnimation {
    const member = context.staff[index];
    if (context.timeSpeed === 0) return index % 3 === 0 ? 'resting' : 'talking';
    if (!member) return defaultModes[index % defaultModes.length] ?? 'typing';
    if (member.fatigue >= 92) return Math.floor(t / 8) % 2 ? 'resting' : 'frustrated';
    if (member.morale <= 24) return Math.floor(t / 10) % 3 === 0 ? 'resting' : 'frustrated';
    if (member.morale >= 88 && context.productActive && Math.floor(t / 13 + index) % 8 === 0) return 'celebrating';

    if (member.role === 'marketing') return context.productActive ? (Math.floor(t / 9) % 2 ? 'presenting' : 'talking') : 'talking';
    if (member.role === 'operations') return Math.floor(t / 10 + index) % 3 === 0 ? 'walking' : 'carrying';
    if (member.role === 'validation') return context.projectActive || context.researchActive ? 'inspecting' : 'talking';
    if (member.role === 'thermal') return context.projectActive ? (Math.floor(t / 12) % 2 ? 'soldering' : 'inspecting') : 'resting';
    if (member.role === 'circuit') return context.projectActive ? (Math.floor(t / 11) % 3 === 0 ? 'soldering' : 'typing') : 'talking';
    if (member.role === 'software') return context.projectActive || context.researchActive ? 'typing' : 'talking';
    if (member.role === 'architect') return context.projectActive ? (Math.floor(t / 14) % 4 === 0 ? 'presenting' : 'typing') : 'talking';
    return defaultModes[index % defaultModes.length] ?? 'typing';
  }

  private poseFor(rig: CharacterRig, mode: CharacterAnimation, t: number): Pose {
    const pose = neutralPose(rig);
    const breathe = Math.sin(t * 1.25) * .012;
    pose.chest[0] = breathe * .22;
    pose.head[2] = Math.sin(t * .34) * .018;

    switch (mode) {
      case 'typing': {
        const keyL = Math.sin(t * 9.5) * .055;
        const keyR = Math.sin(t * 9.5 + 1.7) * .055;
        pose.rootY = -.19;
        pose.hips[0] = -.06;
        pose.torso[0] = -.09;
        pose.chest[0] = -.08 + breathe;
        pose.head[0] = .08;
        pose.head[1] = Math.sin(t * .55) * .055;
        pose.leftArm = [-.86 + keyL, 0, -.2];
        pose.rightArm = [-.86 + keyR, 0, .2];
        pose.leftElbow = [-.72 + keyR, 0, -.08];
        pose.rightElbow = [-.72 + keyL, 0, .08];
        pose.leftLeg = [-1.13, 0, -.04];
        pose.rightLeg = [-1.13, 0, .04];
        pose.leftKnee[0] = 1.32;
        pose.rightKnee[0] = 1.32;
        pose.leftFoot[0] = -.18;
        pose.rightFoot[0] = -.18;
        break;
      }
      case 'soldering': {
        pose.rootY = -.12;
        pose.torso[0] = -.18;
        pose.chest[0] = -.12;
        pose.head = [.18, Math.sin(t * .7) * .06, 0];
        pose.leftArm = [-.96, 0, -.26];
        pose.rightArm = [-1.04 + Math.sin(t * 5.8) * .07, 0, .3];
        pose.leftElbow[0] = -.72;
        pose.rightElbow[0] = -.82;
        pose.leftLeg[0] = -.72;
        pose.rightLeg[0] = -.72;
        pose.leftKnee[0] = .9;
        pose.rightKnee[0] = .9;
        break;
      }
      case 'inspecting': {
        pose.head = [.08 + Math.sin(t * 1.4) * .05, Math.sin(t * .75) * .28, 0];
        pose.torso[1] = Math.sin(t * .35) * .04;
        pose.leftArm = [-.25, 0, -.22];
        pose.leftElbow = [-.7, 0, -.2];
        pose.rightArm = [-.34, 0, .38];
        pose.rightElbow = [-.8, 0, .18];
        break;
      }
      case 'walking': {
        const stride = Math.sin(t * 4.8);
        const cycle = t * .42;
        pose.rootX += Math.sin(cycle) * .72;
        pose.rootZ += Math.cos(cycle * .81) * .38;
        pose.rootY = Math.abs(stride) * .035;
        pose.rootRotation += Math.sin(cycle) * .2;
        pose.leftArm[0] = stride * .52;
        pose.rightArm[0] = -stride * .52;
        pose.leftLeg[0] = -stride * .6;
        pose.rightLeg[0] = stride * .6;
        pose.leftKnee[0] = Math.max(0, stride) * .52;
        pose.rightKnee[0] = Math.max(0, -stride) * .52;
        pose.torso[2] = -stride * .025;
        break;
      }
      case 'carrying': {
        const stride = Math.sin(t * 4.2);
        pose.rootX += Math.sin(t * .34) * .48;
        pose.rootZ += Math.cos(t * .29) * .28;
        pose.rootY = Math.abs(stride) * .025;
        pose.leftArm = [-.58, 0, -.18];
        pose.rightArm = [-.58, 0, .18];
        pose.leftElbow = [-.84, 0, -.04];
        pose.rightElbow = [-.84, 0, .04];
        pose.leftLeg[0] = -stride * .46;
        pose.rightLeg[0] = stride * .46;
        pose.head[1] = Math.sin(t * .7) * .08;
        break;
      }
      case 'presenting': {
        pose.rootRotation += Math.sin(t * .32) * .08;
        pose.chest[1] = Math.sin(t * .45) * .04;
        pose.head[1] = Math.sin(t * .55) * .12;
        pose.rightArm = [-.24, 0, .86 + Math.sin(t * .85) * .08];
        pose.rightElbow = [-.26, 0, .3];
        pose.leftArm = [-.08, 0, -.16];
        pose.leftElbow[0] = -.32;
        break;
      }
      case 'talking': {
        pose.rootRotation += Math.sin(t * .38) * .08;
        pose.head[1] = Math.sin(t * .72) * .13;
        pose.head[0] = Math.sin(t * 1.2) * .035;
        pose.leftArm = [-.18, 0, -.28 - Math.sin(t * .9) * .08];
        pose.leftElbow[0] = -.38;
        pose.rightArm = [-.16, 0, .3 + Math.sin(t * 1.05) * .12];
        pose.rightElbow[0] = -.44;
        break;
      }
      case 'celebrating': {
        const bounce = Math.abs(Math.sin(t * 3.6));
        pose.rootY = bounce * .08;
        pose.leftArm = [-.35, 0, -1.18];
        pose.rightArm = [-.35, 0, 1.18];
        pose.leftElbow[0] = -.28;
        pose.rightElbow[0] = -.28;
        pose.head[0] = -.08;
        pose.chest[0] = -.05;
        break;
      }
      case 'frustrated': {
        pose.rootY = -.16;
        pose.torso[0] = .12;
        pose.chest[0] = .1;
        pose.head = [.32, Math.sin(t * .45) * .05, .08];
        pose.leftArm = [-.18, 0, -.24];
        pose.rightArm = [-.18, 0, .24];
        pose.leftElbow[0] = -1.25;
        pose.rightElbow[0] = -1.25;
        pose.leftLeg[0] = -.92;
        pose.rightLeg[0] = -.92;
        pose.leftKnee[0] = 1.15;
        pose.rightKnee[0] = 1.15;
        break;
      }
      case 'resting': {
        pose.rootY = Math.sin(t * 1.1) * .008;
        pose.head[2] = Math.sin(t * .4) * .07;
        pose.leftArm[0] = -.14;
        pose.rightArm[0] = -.14;
        pose.leftElbow[0] = -.18;
        pose.rightElbow[0] = -.18;
        break;
      }
    }
    return pose;
  }

  private applyPose(rig: CharacterRig, pose: Pose, alpha: number): void {
    rig.root.position.x = damp(rig.root.position.x, pose.rootX, alpha);
    rig.root.position.y = damp(rig.root.position.y, pose.rootY, alpha);
    rig.root.position.z = damp(rig.root.position.z, pose.rootZ, alpha);
    rig.root.rotation.y = damp(rig.root.rotation.y, pose.rootRotation, alpha);
    dampEuler(rig.hips, pose.hips, alpha);
    dampEuler(rig.torso, pose.torso, alpha);
    dampEuler(rig.chest, pose.chest, alpha);
    dampEuler(rig.head, pose.head, alpha);
    dampEuler(rig.leftArm, pose.leftArm, alpha);
    dampEuler(rig.rightArm, pose.rightArm, alpha);
    dampEuler(rig.leftElbow, pose.leftElbow, alpha);
    dampEuler(rig.rightElbow, pose.rightElbow, alpha);
    dampEuler(rig.leftLeg, pose.leftLeg, alpha);
    dampEuler(rig.rightLeg, pose.rightLeg, alpha);
    dampEuler(rig.leftKnee, pose.leftKnee, alpha);
    dampEuler(rig.rightKnee, pose.rightKnee, alpha);
    dampEuler(rig.leftFoot, pose.leftFoot, alpha);
    dampEuler(rig.rightFoot, pose.rightFoot, alpha);
  }
}
