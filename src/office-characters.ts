import * as THREE from 'three';
import { box, emissiveMaterial, joint, material, roundedBox, shadowed } from './office-primitives';

const skinPalette = [0xf0c6a5, 0xd9aa84, 0xb98264, 0x9a6852, 0x724b3c];
const hairPalette = [0x171b22, 0x33251f, 0x67442e, 0x7d5738, 0x3e3042, 0x9a7642];
const pantsPalette = [0x1d2b39, 0x263645, 0x252a38, 0x29382f];

function shade(color: number, factor: number): number {
  return new THREE.Color(color).multiplyScalar(factor).getHex();
}

function limb(width: number, height: number, depth: number, mat: THREE.Material, y: number): THREE.Mesh {
  return roundedBox(width, height, depth, mat, 0, y, 0);
}

function addHair(head: THREE.Group, hair: THREE.Material, variant: number): void {
  const style = variant % 8;
  if (style === 0) head.add(roundedBox(.47, .13, .43, hair, 0, .23, -.01), box(.47, .17, .08, hair, 0, .11, -.205));
  else if (style === 1) head.add(roundedBox(.48, .16, .44, hair, 0, .22, 0), box(.11, .32, .14, hair, -.19, .02, -.13), box(.11, .32, .14, hair, .19, .02, -.13));
  else if (style === 2) head.add(roundedBox(.46, .12, .42, hair, 0, .24, -.01), box(.13, .27, .12, hair, .18, .06, -.17));
  else if (style === 3) head.add(roundedBox(.49, .19, .45, hair, 0, .21, 0), box(.13, .3, .13, hair, -.18, .03, -.14), box(.13, .3, .13, hair, .18, .03, -.14));
  else if (style === 4) head.add(roundedBox(.45, .09, .42, hair, 0, .26, -.01), box(.42, .12, .08, hair, 0, .15, -.205));
  else if (style === 5) {
    head.add(roundedBox(.48, .15, .43, hair, 0, .23, 0));
    const pony = roundedBox(.18, .32, .16, hair, .19, -.01, -.22);
    pony.rotation.z = -.16;
    head.add(pony);
  } else if (style === 6) {
    head.add(roundedBox(.48, .1, .43, hair, 0, .245, 0));
    head.add(box(.12, .18, .1, hair, -.18, .14, -.18), box(.12, .18, .1, hair, .18, .14, -.18));
  } else {
    head.add(roundedBox(.5, .2, .45, hair, 0, .2, 0));
    head.add(box(.08, .25, .09, hair, -.21, .02, -.16));
  }
}

function addFace(head: THREE.Group, skin: THREE.Material, variant: number): void {
  const eye = material(0x16202a, .6);
  const brow = material(0x2a2020, .72);
  const mouth = material(variant % 3 === 0 ? 0x8b4f50 : 0x70464a, .72);
  head.add(box(.052, .052, .018, eye, -.1, .02, .218), box(.052, .052, .018, eye, .1, .02, .218));
  const leftBrow = box(.1, .025, .014, brow, -.1, .105, .22);
  const rightBrow = box(.1, .025, .014, brow, .1, .105, .22);
  leftBrow.rotation.z = variant % 4 === 0 ? .08 : -.02;
  rightBrow.rotation.z = variant % 4 === 0 ? -.08 : .02;
  head.add(leftBrow, rightBrow);
  const mouthMesh = box(.082 + (variant % 2) * .018, .025, .016, mouth, 0, -.1, .219);
  mouthMesh.name = 'mouth';
  head.add(mouthMesh);
  head.add(box(.035, .06, .026, skin, 0, -.02, .226));
  head.add(box(.045, .12, .16, skin, -.227, -.005, 0), box(.045, .12, .16, skin, .227, -.005, 0));
  if (variant % 4 === 1 || variant % 9 === 7) {
    const glasses = material(0x263743, .3, .62);
    head.add(box(.18, .035, .025, glasses, -.1, .02, .226), box(.18, .035, .025, glasses, .1, .02, .226), box(.055, .025, .025, glasses, 0, .02, .226));
  }
  if (variant % 7 === 3) {
    const headset = material(0x263743, .32, .66);
    head.add(box(.035, .3, .035, headset, -.245, .04, 0), box(.035, .3, .035, headset, .245, .04, 0));
    head.add(box(.18, .035, .035, headset, .16, -.1, .21));
  }
}

function addPersonalDetails(chest: THREE.Group, leftHand: THREE.Group, rightHand: THREE.Group, color: number, variant: number): void {
  const metal = material(0x4d6575, .3, .72);
  const accent = material(new THREE.Color(color).lerp(new THREE.Color(0xffffff), .36).getHex(), .5, .22);
  chest.add(box(.035, .3, .025, metal, -.11, .1, .215), box(.035, .3, .025, metal, .11, .1, .215));
  if (variant % 5 === 0) leftHand.add(roundedBox(.11, .055, .13, accent, 0, -.08, .035));
  if (variant % 5 === 1) rightHand.add(box(.14, .09, .17, material(0x283d4d, .42, .4), .02, -.08, .03));
  if (variant % 5 === 2) chest.add(box(.04, .28, .04, metal, -.31, .1, -.2));
  if (variant % 5 === 3) chest.add(box(.23, .13, .04, material(0x263a4c, .42, .42), 0, .02, -.215));
  if (variant % 5 === 4) rightHand.add(roundedBox(.1, .1, .1, material(0xd7e5eb, .75), .02, -.08, .02));
}

export function staffPerson(color: number, x: number, z: number, rotation = 0, variant = 0): THREE.Group {
  const root = new THREE.Group();
  root.name = 'employee';

  const skin = material(skinPalette[variant % skinPalette.length] ?? 0xf0c6a5, .82);
  const hair = material(hairPalette[variant % hairPalette.length] ?? 0x171b22, .78);
  const shirt = material(color, .62);
  const shirtDark = material(shade(color, .56), .64);
  const shirtLight = material(new THREE.Color(color).lerp(new THREE.Color(0xffffff), .22).getHex(), .68);
  const pants = material(pantsPalette[variant % pantsPalette.length] ?? 0x1d2b39, .78);
  const shoes = material(0x101820, .52, .3);
  const sole = material(0x26313a, .6, .24);
  const badgeGlow = emissiveMaterial(0x172c3d, color, .35);
  const bodyScale = 1 + ((variant % 5) - 2) * .018;

  const hips = joint('hips', 0, .92, 0);
  hips.scale.x = bodyScale;
  hips.add(roundedBox(.49, .24, .32, pants, 0, 0, 0));
  root.add(hips);

  const torso = joint('torso', 0, .1, 0);
  hips.add(torso);
  torso.add(roundedBox(.53, .3, .34, shirtDark, 0, .14, 0));

  const chest = joint('chest', 0, .28, 0);
  torso.add(chest);
  chest.add(roundedBox(.64, .32, .38, shirt, 0, .15, 0));
  chest.add(box(.38, .04, .012, shirtLight, 0, .23, .196));
  chest.add(box(.16, .19, .018, material(0xe7edf0, .72), -.13, .09, .204));
  chest.add(box(.11, .14, .02, badgeGlow, .14, .07, .208));

  const neck = joint('neck', 0, .31, 0);
  chest.add(neck);
  neck.add(roundedBox(.16, .12, .16, skin, 0, .05, 0));

  const head = joint('head', 0, .1, 0);
  neck.add(head);
  head.add(roundedBox(.44, .4, .42, skin, 0, .03, 0));
  addHair(head, hair, variant);
  addFace(head, skin, variant);

  const leftArm = joint('left-arm', -.37, .24, 0);
  const rightArm = joint('right-arm', .37, .24, 0);
  chest.add(leftArm, rightArm);
  leftArm.add(limb(.19, .36, .22, shirt, -.17));
  rightArm.add(limb(.19, .36, .22, shirt, -.17));

  const leftElbow = joint('left-elbow', 0, -.35, 0);
  const rightElbow = joint('right-elbow', 0, -.35, 0);
  leftArm.add(leftElbow);
  rightArm.add(rightElbow);
  leftElbow.add(limb(.17, .32, .19, skin, -.14));
  rightElbow.add(limb(.17, .32, .19, skin, -.14));

  const leftHand = joint('left-hand', 0, -.32, .015);
  const rightHand = joint('right-hand', 0, -.32, .015);
  leftElbow.add(leftHand);
  rightElbow.add(rightHand);
  leftHand.add(roundedBox(.18, .15, .2, skin, 0, -.035, 0));
  rightHand.add(roundedBox(.18, .15, .2, skin, 0, -.035, 0));
  addPersonalDetails(chest, leftHand, rightHand, color, variant);

  const leftLeg = joint('left-leg', -.16, -.05, 0);
  const rightLeg = joint('right-leg', .16, -.05, 0);
  hips.add(leftLeg, rightLeg);
  leftLeg.add(limb(.23, .38, .28, pants, -.19));
  rightLeg.add(limb(.23, .38, .28, pants, -.19));

  const leftKnee = joint('left-knee', 0, -.39, 0);
  const rightKnee = joint('right-knee', 0, -.39, 0);
  leftLeg.add(leftKnee);
  rightLeg.add(rightKnee);
  leftKnee.add(limb(.21, .36, .25, pants, -.18));
  rightKnee.add(limb(.21, .36, .25, pants, -.18));

  const leftFoot = joint('left-foot', 0, -.35, .05);
  const rightFoot = joint('right-foot', 0, -.35, .05);
  leftKnee.add(leftFoot);
  rightKnee.add(rightFoot);
  leftFoot.add(roundedBox(.25, .14, .42, shoes, 0, -.02, .08), box(.25, .035, .43, sole, 0, -.09, .09));
  rightFoot.add(roundedBox(.25, .14, .42, shoes, 0, -.02, .08), box(.25, .035, .43, sole, 0, -.09, .09));

  root.traverse((child) => { if (child instanceof THREE.Mesh) shadowed(child, false, false); });
  root.position.set(x, 0, z);
  root.rotation.y = rotation;
  root.userData.phase = variant * .79 + .17;
  root.userData.baseX = x;
  root.userData.baseZ = z;
  root.userData.variant = variant;
  root.userData.height = 1.94;
  root.userData.personality = ['quiet', 'curious', 'precise', 'social', 'restless', 'calm'][variant % 6];
  return root;
}
