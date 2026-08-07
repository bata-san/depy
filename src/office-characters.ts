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
  const style = variant % 6;
  if (style === 0) {
    head.add(roundedBox(.47, .13, .43, hair, 0, .24, -.01), box(.47, .18, .08, hair, 0, .12, -.205));
  } else if (style === 1) {
    head.add(roundedBox(.48, .16, .44, hair, 0, .23, 0), box(.11, .34, .14, hair, -.19, .03, -.13), box(.11, .34, .14, hair, .19, .03, -.13));
  } else if (style === 2) {
    head.add(roundedBox(.46, .12, .42, hair, 0, .25, -.01), box(.13, .28, .12, hair, .18, .07, -.17));
  } else if (style === 3) {
    head.add(roundedBox(.49, .2, .45, hair, 0, .22, 0), box(.13, .32, .13, hair, -.18, .04, -.14), box(.13, .32, .13, hair, .18, .04, -.14));
  } else if (style === 4) {
    head.add(roundedBox(.45, .09, .42, hair, 0, .27, -.01), box(.42, .12, .08, hair, 0, .16, -.205));
  } else {
    head.add(roundedBox(.48, .15, .43, hair, 0, .24, 0));
    const pony = roundedBox(.18, .34, .16, hair, .19, .0, -.22);
    pony.rotation.z = -.16;
    head.add(pony);
  }
}

function addFace(head: THREE.Group, skin: THREE.Material, variant: number): void {
  const eye = material(0x16202a, .6);
  const mouth = material(variant % 3 === 0 ? 0x8b4f50 : 0x70464a, .72);
  head.add(box(.052, .052, .018, eye, -.1, .025, .218), box(.052, .052, .018, eye, .1, .025, .218));
  head.add(box(.082, .025, .016, mouth, 0, -.105, .219));
  head.add(box(.045, .12, .16, skin, -.227, -.005, 0), box(.045, .12, .16, skin, .227, -.005, 0));
  if (variant % 4 === 1) {
    const glasses = material(0x263743, .3, .62);
    head.add(box(.18, .035, .025, glasses, -.1, .025, .226), box(.18, .035, .025, glasses, .1, .025, .226), box(.055, .025, .025, glasses, 0, .025, .226));
  }
  if (variant % 7 === 3) {
    const headset = material(0x263743, .32, .66);
    head.add(box(.035, .32, .035, headset, -.245, .05, 0), box(.035, .32, .035, headset, .245, .05, 0));
    head.add(box(.18, .035, .035, headset, .16, -.11, .21));
  }
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
  const badgeGlow = emissiveMaterial(0x172c3d, color, .35);

  const hips = joint('hips', 0, .94, 0);
  hips.add(roundedBox(.49, .26, .32, pants, 0, 0, 0));
  root.add(hips);

  const torso = joint('torso', 0, .18, 0);
  hips.add(torso);
  const abdomen = roundedBox(.53, .42, .34, shirtDark, 0, .18, 0);
  torso.add(abdomen);

  const chest = joint('chest', 0, .39, 0);
  torso.add(chest);
  chest.add(roundedBox(.64, .42, .38, shirt, 0, .18, 0));
  chest.add(box(.38, .045, .012, shirtLight, 0, .28, .196));
  chest.add(box(.16, .22, .018, material(0xe7edf0, .72), -.13, .1, .204));
  chest.add(box(.11, .16, .02, badgeGlow, .14, .08, .208));

  const neck = joint('neck', 0, .42, 0);
  chest.add(neck);
  neck.add(roundedBox(.16, .16, .16, skin, 0, .06, 0));

  const head = joint('head', 0, .17, 0);
  neck.add(head);
  head.add(roundedBox(.44, .44, .42, skin, 0, .04, 0));
  addHair(head, hair, variant);
  addFace(head, skin, variant);

  const leftArm = joint('left-arm', -.37, .29, 0);
  const rightArm = joint('right-arm', .37, .29, 0);
  chest.add(leftArm, rightArm);
  leftArm.add(limb(.19, .42, .22, shirt, -.2));
  rightArm.add(limb(.19, .42, .22, shirt, -.2));

  const leftElbow = joint('left-elbow', 0, -.42, 0);
  const rightElbow = joint('right-elbow', 0, -.42, 0);
  leftArm.add(leftElbow);
  rightArm.add(rightElbow);
  leftElbow.add(limb(.17, .38, .19, skin, -.17));
  rightElbow.add(limb(.17, .38, .19, skin, -.17));

  const leftHand = joint('left-hand', 0, -.39, .015);
  const rightHand = joint('right-hand', 0, -.39, .015);
  leftElbow.add(leftHand);
  rightElbow.add(rightHand);
  leftHand.add(roundedBox(.18, .16, .2, skin, 0, -.04, 0));
  rightHand.add(roundedBox(.18, .16, .2, skin, 0, -.04, 0));

  const leftLeg = joint('left-leg', -.16, -.1, 0);
  const rightLeg = joint('right-leg', .16, -.1, 0);
  hips.add(leftLeg, rightLeg);
  leftLeg.add(limb(.23, .5, .28, pants, -.23));
  rightLeg.add(limb(.23, .5, .28, pants, -.23));

  const leftKnee = joint('left-knee', 0, -.5, 0);
  const rightKnee = joint('right-knee', 0, -.5, 0);
  leftLeg.add(leftKnee);
  rightLeg.add(rightKnee);
  leftKnee.add(limb(.21, .46, .25, pants, -.21));
  rightKnee.add(limb(.21, .46, .25, pants, -.21));

  const leftFoot = joint('left-foot', 0, -.44, .06);
  const rightFoot = joint('right-foot', 0, -.44, .06);
  leftKnee.add(leftFoot);
  rightKnee.add(rightFoot);
  leftFoot.add(roundedBox(.25, .15, .42, shoes, 0, -.04, .08));
  rightFoot.add(roundedBox(.25, .15, .42, shoes, 0, -.04, .08));

  if (variant % 5 === 2) chest.add(box(.035, .28, .035, material(0x455b69, .36, .68), -.31, .11, -.2));
  if (variant % 6 === 4) rightHand.add(box(.12, .08, .16, material(0x273a48, .4, .48), .02, -.08, .03));
  if (variant % 8 === 5) chest.add(box(.2, .12, .035, material(0x293d4e, .4, .42), .0, .02, -.21));

  root.traverse((child) => {
    if (child instanceof THREE.Mesh) shadowed(child, false, false);
  });

  root.position.set(x, 0, z);
  root.rotation.y = rotation;
  root.userData.phase = variant * .79 + .17;
  root.userData.baseX = x;
  root.userData.baseZ = z;
  root.userData.variant = variant;
  root.userData.height = 1.9;
  return root;
}
