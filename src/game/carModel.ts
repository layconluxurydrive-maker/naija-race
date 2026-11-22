import * as THREE from 'three';

export interface RaceCarMeshHandle {
  group: THREE.Group;
  bodyMaterial: THREE.MeshPhysicalMaterial;
  accentMaterial: THREE.MeshStandardMaterial;
  brakeLightMaterial: THREE.MeshStandardMaterial;
  frontWheelPivots: THREE.Group[];
  wheelSpinMeshes: THREE.Group[];
  boostFlames: THREE.Mesh[];
  setLivery: (primaryColor: number, accentColor: number) => void;
  updateVisuals: (
    speed: number,
    steerAngle: number,
    isBraking: boolean,
    isBoosting: boolean,
    rollAngle: number,
    pitchAngle: number,
    dt: number
  ) => void;
  dispose: () => void;
}

export function createRaceCarModel(
  primaryColor: number,
  accentColor: number,
  contactShadowTexture: THREE.Texture,
  castShadow: boolean
): RaceCarMeshHandle {
  const root = new THREE.Group();
  const chassisTiltGroup = new THREE.Group();
  root.add(chassisTiltGroup);

  const disposables: Array<{ dispose: () => void }> = [];

  // Materials (varied PBR roughness & metalness)
  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: primaryColor,
    metalness: 0.72,
    roughness: 0.22,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
  });

  const accentMaterial = new THREE.MeshStandardMaterial({
    color: accentColor,
    metalness: 0.45,
    roughness: 0.3,
  });

  const carbonMaterial = new THREE.MeshStandardMaterial({
    color: 0x161922,
    metalness: 0.18,
    roughness: 0.62,
  });

  const canopyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x0b1220,
    metalness: 0.15,
    roughness: 0.06,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  });

  const tireMaterial = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    metalness: 0.04,
    roughness: 0.88,
  });

  const rimMaterial = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8,
    metalness: 0.92,
    roughness: 0.18,
  });

  const headlightMaterial = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xe2e8f0,
    emissiveIntensity: 1.8,
    roughness: 0.15,
  });

  const brakeLightMaterial = new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    emissive: 0xef4444,
    emissiveIntensity: 0.85,
    roughness: 0.25,
  });

  const flameMaterial = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  disposables.push(
    bodyMaterial,
    accentMaterial,
    carbonMaterial,
    canopyMaterial,
    tireMaterial,
    rimMaterial,
    headlightMaterial,
    brakeLightMaterial,
    flameMaterial
  );

  // 1. Primary Silhouette: Extruded sculpted GT monocoque side profile
  // Profile drawn in XY (X = Z length, Y = height), then rotated so -Z is front
  const bodyShape = new THREE.Shape();
  bodyShape.moveTo(-2.15, 0.22); // nose tip
  bodyShape.lineTo(-1.85, 0.46); // front hood edge
  bodyShape.lineTo(-0.9, 0.64);  // hood crest
  bodyShape.lineTo(-0.3, 1.04);  // windshield top
  bodyShape.lineTo(0.65, 1.04);  // roof line
  bodyShape.lineTo(1.55, 0.72);  // fastback deck
  bodyShape.lineTo(2.12, 0.68);  // tail deck
  bodyShape.lineTo(2.15, 0.24);  // rear diffuser edge
  bodyShape.lineTo(-2.15, 0.22);

  const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, {
    depth: 1.66,
    bevelEnabled: true,
    bevelThickness: 0.12,
    bevelSize: 0.08,
    bevelSegments: 2,
  });
  bodyGeo.center();
  // Rotate so profile X maps to +Z (with nose at -Z)
  bodyGeo.rotateY(-Math.PI / 2);

  const mainBody = new THREE.Mesh(bodyGeo, bodyMaterial);
  mainBody.position.set(0, 0.62, 0);
  mainBody.castShadow = castShadow;
  mainBody.receiveShadow = castShadow;
  chassisTiltGroup.add(mainBody);
  disposables.push(bodyGeo);

  // 2. Sculpted Fender Sidepods (wider stance over axles)
  const podGeo = new THREE.BoxGeometry(2.04, 0.34, 3.85);
  const podMesh = new THREE.Mesh(podGeo, bodyMaterial);
  podMesh.position.set(0, 0.42, 0.02);
  podMesh.castShadow = castShadow;
  chassisTiltGroup.add(podMesh);
  disposables.push(podGeo);

  // 3. Carbon Fiber Front Splitter & Undertray Skirt
  const undertrayGeo = new THREE.BoxGeometry(2.08, 0.1, 4.46);
  const undertray = new THREE.Mesh(undertrayGeo, carbonMaterial);
  undertray.position.set(0, 0.2, 0.02);
  undertray.castShadow = castShadow;
  chassisTiltGroup.add(undertray);
  disposables.push(undertrayGeo);

  // 4. Tinted Wrap-Around Cockpit Canopy
  const canopyGeo = new THREE.BoxGeometry(1.38, 0.36, 1.82);
  const canopy = new THREE.Mesh(canopyGeo, canopyMaterial);
  canopy.position.set(0, 0.94, 0.1);
  chassisTiltGroup.add(canopy);
  disposables.push(canopyGeo);

  // 5. Center Racing Stripe + Roof Intake Scoop (accent material)
  const stripeGeo = new THREE.BoxGeometry(0.32, 0.03, 3.6);
  const stripe = new THREE.Mesh(stripeGeo, accentMaterial);
  stripe.position.set(0, 0.68, -0.2);
  chassisTiltGroup.add(stripe);
  disposables.push(stripeGeo);

  // 6. Dual-Element Carbon Rear GT Wing + Endplates
  const wingBladeGeo = new THREE.BoxGeometry(2.14, 0.06, 0.44);
  const wingBlade = new THREE.Mesh(wingBladeGeo, carbonMaterial);
  wingBlade.position.set(0, 1.24, 1.96);
  wingBlade.rotation.x = 0.14;
  wingBlade.castShadow = castShadow;
  chassisTiltGroup.add(wingBlade);

  const pylonGeo = new THREE.BoxGeometry(0.08, 0.52, 0.24);
  const pylonL = new THREE.Mesh(pylonGeo, carbonMaterial);
  pylonL.position.set(-0.54, 0.98, 1.94);
  const pylonR = new THREE.Mesh(pylonGeo, carbonMaterial);
  pylonR.position.set(0.54, 0.98, 1.94);

  const endplateGeo = new THREE.BoxGeometry(0.05, 0.34, 0.54);
  const endplateL = new THREE.Mesh(endplateGeo, accentMaterial);
  endplateL.position.set(-1.08, 1.22, 1.96);
  const endplateR = new THREE.Mesh(endplateGeo, accentMaterial);
  endplateR.position.set(1.08, 1.22, 1.96);

  chassisTiltGroup.add(pylonL, pylonR, endplateL, endplateR);
  disposables.push(wingBladeGeo, pylonGeo, endplateGeo);

  // 7. LED Headlights & Rear Taillight Bar
  const headGeo = new THREE.BoxGeometry(0.36, 0.08, 0.12);
  const headL = new THREE.Mesh(headGeo, headlightMaterial);
  headL.position.set(-0.68, 0.48, -2.14);
  const headR = new THREE.Mesh(headGeo, headlightMaterial);
  headR.position.set(0.68, 0.48, -2.14);
  chassisTiltGroup.add(headL, headR);

  const tailGeo = new THREE.BoxGeometry(1.66, 0.09, 0.08);
  const tailBar = new THREE.Mesh(tailGeo, brakeLightMaterial);
  tailBar.position.set(0, 0.56, 2.16);
  chassisTiltGroup.add(tailBar);
  disposables.push(headGeo, tailGeo);

  // 8. Twin Exhaust Tips + Nitro Boost Flame Cones
  const exhaustGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.22, 12);
  exhaustGeo.rotateX(Math.PI / 2);
  const flameGeo = new THREE.ConeGeometry(0.11, 0.72, 10);
  flameGeo.rotateX(Math.PI / 2);

  const boostFlames: THREE.Mesh[] = [];
  [-0.36, 0.36].forEach((exX) => {
    const tip = new THREE.Mesh(exhaustGeo, rimMaterial);
    tip.position.set(exX, 0.28, 2.22);
    chassisTiltGroup.add(tip);

    const flame = new THREE.Mesh(flameGeo, flameMaterial);
    flame.position.set(exX, 0.28, 2.62);
    flame.visible = false;
    chassisTiltGroup.add(flame);
    boostFlames.push(flame);
  });
  disposables.push(exhaustGeo, flameGeo);

  // 9. Four Articulated Wheel Assemblies (Tire + Metallic Rim + Spoke Hub)
  const tireGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 20);
  tireGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.31, 14);
  rimGeo.rotateZ(Math.PI / 2);
  const spokeGeo = new THREE.BoxGeometry(0.32, 0.06, 0.42);

  const frontWheelPivots: THREE.Group[] = [];
  const wheelSpinMeshes: THREE.Group[] = [];

  const wheelCoords = [
    { x: -1.0, y: 0.38, z: -1.38, isFront: true },
    { x: 1.0, y: 0.38, z: -1.38, isFront: true },
    { x: -1.02, y: 0.38, z: 1.36, isFront: false },
    { x: 1.02, y: 0.38, z: 1.36, isFront: false },
  ];

  wheelCoords.forEach((wc) => {
    const pivot = new THREE.Group();
    pivot.position.set(wc.x, wc.y, wc.z);

    const spinGroup = new THREE.Group();
    const tire = new THREE.Mesh(tireGeo, tireMaterial);
    tire.castShadow = castShadow;
    const rim = new THREE.Mesh(rimGeo, rimMaterial);
    const spokeA = new THREE.Mesh(spokeGeo, carbonMaterial);
    const spokeB = new THREE.Mesh(spokeGeo, carbonMaterial);
    spokeB.rotation.x = Math.PI / 2;

    spinGroup.add(tire, rim, spokeA, spokeB);
    pivot.add(spinGroup);
    root.add(pivot);

    if (wc.isFront) {
      frontWheelPivots.push(pivot);
    }
    wheelSpinMeshes.push(spinGroup);
  });
  disposables.push(tireGeo, rimGeo, spokeGeo);

  // 10. Grounded Radial Contact Shadow Plane (prevents floating look)
  const contactGeo = new THREE.PlaneGeometry(3.1, 5.4);
  const contactMat = new THREE.MeshBasicMaterial({
    map: contactShadowTexture,
    transparent: true,
    depthWrite: false,
    opacity: 0.56,
  });
  const contactShadow = new THREE.Mesh(contactGeo, contactMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.set(0, 0.025, 0);
  root.add(contactShadow);
  disposables.push(contactGeo, contactMat);

  return {
    group: root,
    bodyMaterial,
    accentMaterial,
    brakeLightMaterial,
    frontWheelPivots,
    wheelSpinMeshes,
    boostFlames,
    setLivery: (newPrimary: number, newAccent: number) => {
      bodyMaterial.color.setHex(newPrimary);
      accentMaterial.color.setHex(newAccent);
    },
    updateVisuals: (speed, steerAngle, isBraking, isBoosting, rollAngle, pitchAngle, dt) => {
      // Spin all 4 wheels proportionally to forward velocity
      const angularVel = speed / 0.38;
      for (const w of wheelSpinMeshes) {
        w.rotation.x -= angularVel * dt;
      }
      // Front wheel steering angle
      for (const fp of frontWheelPivots) {
        fp.rotation.y = steerAngle * 0.45;
      }
      // Suspension body roll & squat/dive
      chassisTiltGroup.rotation.z = rollAngle;
      chassisTiltGroup.rotation.x = pitchAngle;

      // Brake light glow
      brakeLightMaterial.emissiveIntensity = isBraking ? 3.2 : 0.85;

      // Boost exhaust flames
      const flamePulse = 0.85 + Math.random() * 0.45;
      for (const flame of boostFlames) {
        flame.visible = isBoosting;
        if (isBoosting) {
          flame.scale.set(1, flamePulse, 1);
        }
      }
    },
    dispose: () => {
      for (const d of disposables) {
        d.dispose();
      }
    },
  };
}
