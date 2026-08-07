import * as THREE from 'three';
import { box, cylinder, emissiveMaterial, material, roundedBox, sphere } from './office-primitives';

export interface OfficeLifeDetailState {
  officeLevel: number;
  presentStaff: number;
  totalStaff: number;
  night: number;
  projectProgress: number;
  productGlow: number;
  researchActive: boolean;
  cashHealth: number;
}

export interface OfficeLifeDetails {
  update: (time: number, state: OfficeLifeDetailState) => void;
}

function snackBar(): THREE.Group {
  const group = new THREE.Group();
  const body = material(0x1d2b34, .48, .38);
  const steel = material(0x566b76, .28, .66);
  group.add(roundedBox(1.6, .92, .7, body, 7.7, .5, 5.55));
  group.add(roundedBox(.5, .72, .48, steel, 7.4, 1.18, 5.52));
  group.add(box(.32, .16, .03, emissiveMaterial(0x17242c, 0xffb460, .72), 7.4, 1.28, 5.27));
  group.add(cylinder(.11, .24, material(0xe6e9e8, .68, .04), 8.0, 1.05, 5.5, 16));
  group.add(box(.78, .06, .38, material(0x75553d, .62, .08), 8.0, .98, 5.55));
  return group;
}

function projectBoard(): THREE.Group {
  const group = new THREE.Group();
  group.add(roundedBox(3.2, 1.8, .09, material(0x1a2831, .42, .52), -1.0, 3.7, 6.64));
  group.add(box(3.0, 1.58, .025, material(0xdde7e9, .8, .02), -1.0, 3.7, 6.57));
  const notes = [0x69caff, 0xffbe67, 0x72dea9, 0xc68fff];
  for (let index = 0; index < 18; index += 1) {
    const x = -2.15 + (index % 6) * .46;
    const y = 3.14 + Math.floor(index / 6) * .48;
    const note = roundedBox(.31, .22, .014, material(notes[index % notes.length] ?? 0xffffff, .82, .02), x, y, 6.54);
    note.rotation.z = ((index % 3) - 1) * .025;
    group.add(note);
  }
  return group;
}

function achievementWall(): { group: THREE.Group; lights: THREE.Mesh[] } {
  const group = new THREE.Group();
  group.add(roundedBox(3.2, 1.85, .12, material(0x16242c, .42, .56), 4.9, 3.65, 6.62));
  const lights: THREE.Mesh[] = [];
  for (let index = 0; index < 6; index += 1) {
    const x = 3.72 + (index % 3) * 1.18;
    const y = 3.18 + Math.floor(index / 3) * .78;
    group.add(roundedBox(.8, .5, .035, material(0x293b45, .34, .48), x, y, 6.53));
    group.add(cylinder(.11, .2, material(0xc79c4b, .3, .52), x, y, 6.48, 12));
    const light = sphere(.05, emissiveMaterial(0x241e15, 0xffc35a, .25), x, y + .18, 6.44);
    lights.push(light); group.add(light);
  }
  return { group, lights };
}

function progressRail(): { group: THREE.Group; nodes: THREE.Mesh[] } {
  const group = new THREE.Group();
  const nodes: THREE.Mesh[] = [];
  const base = material(0x24343d, .38, .56);
  group.add(roundedBox(5.8, .08, .18, base, -3.65, .18, .55));
  for (let index = 0; index < 5; index += 1) {
    const x = -6.15 + index * 1.25;
    const node = cylinder(.12, .08, emissiveMaterial(0x18262d, 0x61cfff, .16), x, .22, .55, 16);
    nodes.push(node); group.add(node);
  }
  return { group, nodes };
}

function researchOrbit(): { group: THREE.Group; satellites: THREE.Mesh[]; core: THREE.Mesh } {
  const group = new THREE.Group(); group.position.set(-5.1, 2.7, 3.9);
  const core = sphere(.11, emissiveMaterial(0x10242e, 0x61e5ff, .6)); group.add(core);
  const satellites: THREE.Mesh[] = [];
  for (let index = 0; index < 4; index += 1) {
    const satellite = sphere(.045, emissiveMaterial(0x17242d, index % 2 ? 0x9b83ff : 0x61e5ff, .42));
    satellites.push(satellite); group.add(satellite);
  }
  return { group, satellites, core };
}

function launchRings(): { group: THREE.Group; rings: THREE.Mesh[] } {
  const group = new THREE.Group(); group.position.set(5, .42, 3.8);
  const rings: THREE.Mesh[] = [];
  for (let index = 0; index < 3; index += 1) {
    const geometry = new THREE.TorusGeometry(.75 + index * .23, .018, 8, 40);
    const ring = new THREE.Mesh(geometry, emissiveMaterial(0x17242d, index % 2 ? 0xffb15f : 0x61cfff, .22));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = index * .13;
    rings.push(ring); group.add(ring);
  }
  return { group, rings };
}

function ideaParticles(): { group: THREE.Group; particles: THREE.Mesh[] } {
  const group = new THREE.Group();
  const particles: THREE.Mesh[] = [];
  for (let index = 0; index < 12; index += 1) {
    const mesh = sphere(.035 + (index % 3) * .008, emissiveMaterial(0x17252d, index % 3 === 0 ? 0xffc26a : 0x63d6ff, .32));
    mesh.position.set(-6.2 + index % 6 * 1.1, 1.3 + Math.floor(index / 6) * .35, -4.8 + index % 4 * 1.25);
    mesh.userData.baseY = mesh.position.y;
    mesh.userData.phase = index * .73;
    particles.push(mesh); group.add(mesh);
  }
  return { group, particles };
}

function floorPulse(): THREE.Mesh[] {
  const strips: THREE.Mesh[] = [];
  const xs = [-6.4, -3.2, 0, 3.2, 6.4];
  xs.forEach((x) => strips.push(box(1.8, .012, .04, emissiveMaterial(0x17242d, 0x5ed1ff, .12), x, .12, -.05)));
  return strips;
}

export function buildOfficeLifeDetails(office: THREE.Group): OfficeLifeDetails {
  const everyday = new THREE.Group(); everyday.name = 'premium-office-feedback';
  everyday.add(snackBar(), projectBoard());
  const achievement = achievementWall(); everyday.add(achievement.group);
  const progress = progressRail(); everyday.add(progress.group);
  const research = researchOrbit(); everyday.add(research.group);
  const launch = launchRings(); everyday.add(launch.group);
  const ideas = ideaParticles(); everyday.add(ideas.group);
  const pulseStrips = floorPulse(); pulseStrips.forEach((mesh) => everyday.add(mesh));

  const prestige = new THREE.Group(); prestige.name = 'office-prestige';
  prestige.add(cylinder(.7, .18, material(0x1c2930, .4, .5), 0, .18, 5.6, 20));
  prestige.add(sphere(.42, material(0x7f96a2, .22, .72), 0, .78, 5.6));
  prestige.add(box(.08, 1.0, .08, material(0xa8bcc5, .24, .66), 0, .7, 5.6));
  everyday.add(prestige);

  const nightLights: THREE.Mesh[] = [];
  for (const x of [-7.4, -4.8, -2.2, .4, 3.0, 5.6, 8.0]) {
    const lamp = roundedBox(.8, .04, .16, emissiveMaterial(0x1a252c, 0x86d3ff, .22), x, 4.85, 5.95);
    nightLights.push(lamp); everyday.add(lamp);
  }

  office.add(everyday);
  let previousProductGlow = 0;
  let celebrationUntil = 0;

  return {
    update(time, state) {
      const occupied = state.totalStaff ? state.presentStaff / state.totalStaff : 0;
      prestige.visible = state.officeLevel >= 4;
      achievement.group.visible = state.officeLevel >= 2 || state.productGlow > .32;

      progress.nodes.forEach((node, index) => {
        if (!(node.material instanceof THREE.MeshStandardMaterial)) return;
        const unlocked = state.projectProgress >= index * 25;
        node.material.emissiveIntensity = unlocked ? .65 + Math.sin(time * 2.4 + index) * .12 : .08;
        node.scale.setScalar(unlocked ? 1 + Math.sin(time * 2 + index) * .04 : .82);
      });

      research.group.visible = state.researchActive;
      research.core.scale.setScalar(1 + Math.sin(time * 3.2) * .12);
      if (research.core.material instanceof THREE.MeshStandardMaterial) research.core.material.emissiveIntensity = state.researchActive ? 1.1 + Math.sin(time * 4) * .3 : .1;
      research.satellites.forEach((satellite, index) => {
        const angle = time * (1.2 + index * .13) + index * Math.PI * .5;
        const radius = .34 + index * .055;
        satellite.position.set(Math.cos(angle) * radius, Math.sin(time * 1.7 + index) * .08, Math.sin(angle) * radius);
      });

      if (state.productGlow > previousProductGlow + .08 && state.productGlow > .55) celebrationUntil = time + 6;
      previousProductGlow = state.productGlow;
      const celebrating = time < celebrationUntil;
      launch.group.visible = state.productGlow > .22 || celebrating;
      launch.rings.forEach((ring, index) => {
        ring.rotation.z += .004 + state.productGlow * .01 + index * .001;
        ring.scale.setScalar(1 + Math.sin(time * 2.2 + index) * (.025 + state.productGlow * .03));
        if (ring.material instanceof THREE.MeshStandardMaterial) ring.material.emissiveIntensity = .2 + state.productGlow * 1.2 + (celebrating ? .8 : 0);
      });

      ideas.particles.forEach((particle, index) => {
        const phase = Number(particle.userData.phase ?? index);
        particle.position.y = Number(particle.userData.baseY ?? 1.4) + Math.sin(time * (1.1 + index % 3 * .2) + phase) * .18;
        particle.visible = state.presentStaff > index % Math.max(1, state.totalStaff) && (state.projectProgress > 0 || state.researchActive);
        if (particle.material instanceof THREE.MeshStandardMaterial) particle.material.emissiveIntensity = .2 + state.projectProgress / 100 * .45 + (state.researchActive ? .35 : 0);
      });

      achievement.lights.forEach((light, index) => {
        if (!(light.material instanceof THREE.MeshStandardMaterial)) return;
        const earned = state.officeLevel + Math.round(state.productGlow * 3) > index;
        light.material.emissiveIntensity = earned ? .55 + state.productGlow * .9 + Math.sin(time * 2.3 + index) * .1 : .04;
      });

      pulseStrips.forEach((strip, index) => {
        if (!(strip.material instanceof THREE.MeshStandardMaterial)) return;
        strip.material.emissiveIntensity = .08 + occupied * .2 + Math.max(0, Math.sin(time * 1.8 - index * .7)) * (.12 + state.projectProgress / 100 * .2);
      });

      nightLights.forEach((mesh, index) => {
        if (mesh.material instanceof THREE.MeshStandardMaterial) mesh.material.emissiveIntensity = .12 + state.night * (.55 + occupied * .6) + Math.sin(time * 1.1 + index) * .025;
      });

      everyday.rotation.y = celebrating ? Math.sin(time * 18) * .0006 : 0;
    },
  };
}
