import * as THREE from 'three';
import { box, emissiveMaterial, joint, material } from './office-primitives';

export function staffPerson(color: number, x: number, z: number, rotation = 0, variant = 0): THREE.Group {
  const root = new THREE.Group();
  const skinPalette = [0xecc09d, 0xd6a27d, 0xf1c7a5, 0xb57d61, 0x8d604c];
  const hairPalette = [0x2e241e, 0x131820, 0x68442e, 0x3e2d39, 0x9b6b36];
  const skin = material(skinPalette[variant % skinPalette.length] ?? 0xecc09d, .82);
  const shirt = material(color, .62);
  const shirtDark = material(new THREE.Color(color).multiplyScalar(.56).getHex(), .6);
  const pants = material(variant % 3 === 0 ? 0x263b4d : 0x202d3a, .76);
  const hair = material(hairPalette[variant % hairPalette.length] ?? 0x2e241e, .78);
  const shoes = material(0x111820, .55, .28);
  const eye = material(0x16202a, .58);
  const accent = emissiveMaterial(0x1b3142, color, .26);

  const torso = joint('torso', 0, 1.26, 0);
  torso.add(box(.55, .62, .34, shirt), box(.56, .08, .35, shirtDark, 0, -.27), box(.17, .32, .025, material(0xf0f2ed, .7), 0, .03, .183));
  torso.add(box(.12, .18, .025, accent, .14, .03, .186));
  root.add(torso);

  const head = joint('head', 0, 1.77, 0);
  head.add(box(.42, .43, .4, skin));
  head.add(box(.44, .13, .42, hair, 0, .24, 0), box(.44, .22, .1, hair, 0, .11, -.2));
  head.add(box(.052, .052, .02, eye, -.1, .035, .211), box(.052, .052, .02, eye, .1, .035, .211));
  head.add(box(.08, .025, .018, material(0x8e4d49, .7), 0, -.1, .212));
  head.add(box(.045, .12, .18, skin, -.225, 0, 0), box(.045, .12, .18, skin, .225, 0, 0));
  root.add(head);

  const leftArm = joint('left-arm', -.36, 1.46, 0);
  const rightArm = joint('right-arm', .36, 1.46, 0);
  leftArm.add(box(.17, .5, .2, shirt, 0, -.23), box(.16, .18, .18, skin, 0, -.55));
  rightArm.add(box(.17, .5, .2, shirt, 0, -.23), box(.16, .18, .18, skin, 0, -.55));
  root.add(leftArm, rightArm);

  const leftLeg = joint('left-leg', -.15, .92, 0);
  const rightLeg = joint('right-leg', .15, .92, 0);
  leftLeg.add(box(.21, .58, .25, pants, 0, -.28), box(.23, .13, .36, shoes, 0, -.61, .055));
  rightLeg.add(box(.21, .58, .25, pants, 0, -.28), box(.23, .13, .36, shoes, 0, -.61, .055));
  root.add(leftLeg, rightLeg);

  if (variant % 4 === 1) {
    head.add(box(.46, .035, .035, material(0x26333d, .3, .62), 0, .04, .225));
    head.add(box(.035, .055, .035, material(0x26333d, .3, .62), 0, .04, .225));
  }
  if (variant % 5 === 2) {
    head.add(box(.48, .16, .44, hair, 0, .19, 0), box(.12, .4, .16, hair, -.19, -.03, -.1), box(.12, .4, .16, hair, .19, -.03, -.1));
  }
  if (variant % 6 === 3) head.add(box(.48, .11, .42, material(0x31536d, .65), 0, .25, -.01));
  if (variant % 7 === 4) root.add(box(.22, .3, .05, material(0x273d50, .42, .45), -.31, 1.18, -.2));

  leftArm.rotation.x = -.25;
  rightArm.rotation.x = -.25;
  root.position.set(x, 0, z);
  root.rotation.y = rotation;
  root.userData.phase = variant * .73 + Math.random() * .4;
  root.userData.baseX = x;
  root.userData.baseZ = z;
  return root;
}

