import * as THREE from 'three';
import { box, cylinder, emissiveMaterial, joint, material, roundedBox, shadowed, sphere } from './office-primitives';

const skinPalette = [0xf1c5a2, 0xdfad88, 0xc88e6c, 0xa96f57, 0x805341];
const hairPalette = [0x12161d, 0x2d201b, 0x5d3b28, 0x775337, 0x353044, 0x8c6a3d];
const trouserPalette = [0x18242f, 0x202d3a, 0x242837, 0x26362f];

function tone(color: number, amount: number): number {
  return new THREE.Color(color).multiplyScalar(amount).getHex();
}

function addEyes(head: THREE.Group, variant: number): void {
  const eye = material(0x111820, .52, .08);
  const white = material(0xf2f5f6, .58, .02);
  const brow = material(0x30221f, .66, .08);
  for (const x of [-.115, .115]) {
    head.add(roundedBox(.105, .072, .024, white, x, .03, .276));
    head.add(sphere(.035, eye, x + (variant % 3 - 1) * .008, .025, .296));
  }
  const lb = box(.12, .026, .018, brow, -.115, .13, .286);
  const rb = box(.12, .026, .018, brow, .115, .13, .286);
  lb.rotation.z = variant % 4 === 0 ? .08 : -.025;
  rb.rotation.z = variant % 4 === 0 ? -.08 : .025;
  head.add(lb, rb);
}

function addHair(head: THREE.Group, variant: number): void {
  const mat = material(hairPalette[variant % hairPalette.length] ?? 0x161a20, .7, .06);
  const style = variant % 10;
  head.add(roundedBox(.56, .14, .52, mat, 0, .28, -.015));
  if (style === 0 || style === 7) head.add(box(.54, .18, .1, mat, 0, .16, -.245));
  if (style === 1 || style === 8) head.add(roundedBox(.16, .34, .16, mat, -.22, .02, -.17), roundedBox(.16, .34, .16, mat, .22, .02, -.17));
  if (style === 2) head.add(roundedBox(.16, .34, .15, mat, .22, .03, -.18));
  if (style === 3) head.add(roundedBox(.58, .22, .54, mat, 0, .22, -.01), roundedBox(.15, .34, .16, mat, -.23, .01, -.17), roundedBox(.15, .34, .16, mat, .23, .01, -.17));
  if (style === 4) {
    for (let index = -2; index <= 2; index += 1) { const spike = roundedBox(.12, .2, .14, mat, index * .11, .31 + Math.abs(index) * .01, -.04); spike.rotation.z = index * -.07; head.add(spike); }
  }
  if (style === 5) { const pony = roundedBox(.18, .42, .18, mat, .24, -.02, -.25); pony.rotation.z = -.18; head.add(pony); }
  if (style === 6) head.add(box(.1, .28, .11, mat, -.23, .05, -.2), box(.1, .28, .11, mat, .23, .05, -.2));
  if (style === 9) head.add(roundedBox(.5, .11, .48, mat, 0, .34, 0));
}

function addFaceDetails(head: THREE.Group, skin: THREE.Material, variant: number): void {
  addEyes(head, variant);
  head.add(roundedBox(.04, .075, .035, skin, 0, -.03, .292));
  const mouth = box(.095, .026, .016, material(variant % 3 === 0 ? 0x9a5153 : 0x71464b, .68, .04), 0, -.14, .292);
  mouth.name = 'mouth';
  mouth.rotation.z = variant % 5 === 0 ? -.04 : variant % 5 === 1 ? .04 : 0;
  head.add(mouth);
  if (variant % 4 === 1 || variant % 9 === 0) {
    const glasses = material(0x273945, .24, .66);
    head.add(roundedBox(.2, .075, .024, glasses, -.12, .03, .3), roundedBox(.2, .075, .024, glasses, .12, .03, .3), box(.06, .025, .022, glasses, 0, .03, .302));
  }
  if (variant % 8 === 3) {
    const headset = material(0x263743, .28, .7);
    head.add(box(.035, .34, .035, headset, -.29, .05, 0), box(.035, .34, .035, headset, .29, .05, 0));
    head.add(box(.18, .035, .035, headset, .2, -.12, .24));
  }
}

function addAccessory(root: THREE.Group, chest: THREE.Group, rightHand: THREE.Group, color: number, variant: number): void {
  const metal = material(0x586e7b, .3, .7);
  const accent = material(new THREE.Color(color).lerp(new THREE.Color(0xffffff), .32).getHex(), .42, .22);
  const badge = roundedBox(.13, .18, .025, emissiveMaterial(0x172731, color, .38), .16, .08, .235);
  badge.name = 'badge'; chest.add(badge);
  chest.add(box(.025, .28, .02, metal, .16, .28, .225));
  if (variant % 5 === 0) rightHand.add(roundedBox(.13, .18, .035, accent, 0, -.08, .04));
  if (variant % 5 === 1) rightHand.add(roundedBox(.15, .08, .18, material(0x203542, .4, .46), 0, -.08, .04));
  if (variant % 5 === 2) chest.add(box(.055, .3, .04, metal, -.31, .04, -.19));
  if (variant % 5 === 3) root.add(cylinder(.11, .2, material(0xe5e8e8, .72, .04), .42, .74, .18, 16));
  if (variant % 5 === 4) chest.add(roundedBox(.22, .09, .035, material(0x334b59, .4, .42), -.1, -.04, -.225));
}

export function premiumStaffPerson(color: number, x: number, z: number, rotation = 0, variant = 0): THREE.Group {
  const root = new THREE.Group();
  root.name = 'employee';
  const skin = material(skinPalette[variant % skinPalette.length] ?? 0xf1c5a2, .8, .03);
  const shirt = material(color, .5, .18);
  const shirtDark = material(tone(color, .58), .56, .22);
  const shirtLight = material(new THREE.Color(color).lerp(new THREE.Color(0xffffff), .2).getHex(), .48, .12);
  const trousers = material(trouserPalette[variant % trouserPalette.length] ?? 0x18242f, .68, .12);
  const shoes = material(0x111920, .42, .38);
  const sole = material(0x36424a, .54, .22);

  const hips = joint('hips', 0, .9, 0); root.add(hips);
  hips.add(roundedBox(.52, .25, .34, trousers, 0, 0, 0));

  const torso = joint('torso', 0, .11, 0); hips.add(torso);
  torso.add(roundedBox(.55, .3, .36, shirtDark, 0, .13, 0));

  const chest = joint('chest', 0, .28, 0); torso.add(chest);
  chest.add(roundedBox(.67, .36, .4, shirt, 0, .16, 0));
  chest.add(box(.43, .045, .016, shirtLight, 0, .26, .205));
  chest.add(box(.18, .13, .018, material(0xe9eef0, .62, .02), -.14, .1, .214));

  const neck = joint('neck', 0, .34, 0); chest.add(neck);
  neck.add(roundedBox(.18, .13, .18, skin, 0, .04, 0));
  const head = joint('head', 0, .1, 0); neck.add(head);
  head.add(roundedBox(.53, .46, .5, skin, 0, .04, 0));
  addHair(head, variant);
  addFaceDetails(head, skin, variant);

  const shoulderY = .25;
  const leftArm = joint('left-arm', -.4, shoulderY, 0); const rightArm = joint('right-arm', .4, shoulderY, 0); chest.add(leftArm, rightArm);
  leftArm.add(roundedBox(.2, .38, .24, shirt, 0, -.18, 0)); rightArm.add(roundedBox(.2, .38, .24, shirt, 0, -.18, 0));
  const leftElbow = joint('left-elbow', 0, -.37, 0); const rightElbow = joint('right-elbow', 0, -.37, 0); leftArm.add(leftElbow); rightArm.add(rightElbow);
  leftElbow.add(roundedBox(.18, .34, .21, skin, 0, -.16, 0)); rightElbow.add(roundedBox(.18, .34, .21, skin, 0, -.16, 0));
  const leftHand = joint('left-hand', 0, -.33, .015); const rightHand = joint('right-hand', 0, -.33, .015); leftElbow.add(leftHand); rightElbow.add(rightHand);
  leftHand.add(roundedBox(.19, .16, .21, skin, 0, -.04, 0)); rightHand.add(roundedBox(.19, .16, .21, skin, 0, -.04, 0));

  const leftLeg = joint('left-leg', -.17, -.06, 0); const rightLeg = joint('right-leg', .17, -.06, 0); hips.add(leftLeg, rightLeg);
  leftLeg.add(roundedBox(.24, .4, .29, trousers, 0, -.2, 0)); rightLeg.add(roundedBox(.24, .4, .29, trousers, 0, -.2, 0));
  const leftKnee = joint('left-knee', 0, -.4, 0); const rightKnee = joint('right-knee', 0, -.4, 0); leftLeg.add(leftKnee); rightLeg.add(rightKnee);
  leftKnee.add(roundedBox(.22, .38, .27, trousers, 0, -.18, 0)); rightKnee.add(roundedBox(.22, .38, .27, trousers, 0, -.18, 0));
  const leftFoot = joint('left-foot', 0, -.37, .06); const rightFoot = joint('right-foot', 0, -.37, .06); leftKnee.add(leftFoot); rightKnee.add(rightFoot);
  leftFoot.add(roundedBox(.27, .15, .44, shoes, 0, -.02, .09), box(.27, .035, .45, sole, 0, -.095, .1));
  rightFoot.add(roundedBox(.27, .15, .44, shoes, 0, -.02, .09), box(.27, .035, .45, sole, 0, -.095, .1));

  addAccessory(root, chest, rightHand, color, variant);
  root.traverse((child) => { if (child instanceof THREE.Mesh) shadowed(child, false, false); });
  root.position.set(x, 0, z);
  root.rotation.y = rotation;
  root.scale.setScalar(.94 + (variant % 5) * .012);
  root.userData.phase = variant * .71 + .19;
  root.userData.baseX = x;
  root.userData.baseZ = z;
  root.userData.variant = variant;
  root.userData.height = 2.02;
  root.userData.personality = ['quiet', 'curious', 'precise', 'social', 'restless', 'calm'][variant % 6];
  return root;
}
