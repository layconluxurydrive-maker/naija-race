import * as THREE from 'three';

export interface ProceduralTextureSet {
  asphaltMap: THREE.CanvasTexture;
  curbMap: THREE.CanvasTexture;
  grassMap: THREE.CanvasTexture;
  checkeredMap: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
  dispose: () => void;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  const anisotropy = Math.max(1, Math.min(8, maxAnisotropy));

  // 1. Asphalt texture with subtle racing groove & dashed centerline
  const asphaltCanvas = document.createElement('canvas');
  asphaltCanvas.width = 512;
  asphaltCanvas.height = 512;
  const actx = asphaltCanvas.getContext('2d')!;
  actx.fillStyle = '#252932';
  actx.fillRect(0, 0, 512, 512);

  // Subtle darker rubbered-in racing groove in the center-left/right lanes
  const groove = actx.createLinearGradient(0, 0, 512, 0);
  groove.addColorStop(0, 'rgba(18, 20, 26, 0.35)');
  groove.addColorStop(0.18, 'rgba(34, 38, 46, 0.0)');
  groove.addColorStop(0.5, 'rgba(18, 20, 26, 0.22)');
  groove.addColorStop(0.82, 'rgba(34, 38, 46, 0.0)');
  groove.addColorStop(1, 'rgba(18, 20, 26, 0.35)');
  actx.fillStyle = groove;
  actx.fillRect(0, 0, 512, 512);

  // Fine mineral aggregate speckle
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const shade = 28 + Math.floor(Math.random() * 34);
    actx.fillStyle = `rgb(${shade},${shade + 2},${shade + 5})`;
    actx.fillRect(x, y, 2, 2);
  }

  // Crisp outer white track boundary lines
  actx.fillStyle = '#E2E8F0';
  actx.fillRect(14, 0, 10, 512);
  actx.fillRect(488, 0, 10, 512);

  // Subtle dashed center lane marker
  actx.fillStyle = 'rgba(226, 232, 240, 0.42)';
  for (let y = 16; y < 512; y += 64) {
    actx.fillRect(253, y, 6, 32);
  }

  const asphaltMap = new THREE.CanvasTexture(asphaltCanvas);
  asphaltMap.colorSpace = THREE.SRGBColorSpace;
  asphaltMap.wrapS = THREE.ClampToEdgeWrapping;
  asphaltMap.wrapT = THREE.RepeatWrapping;
  asphaltMap.anisotropy = anisotropy;

  // 2. FIA Red/White apex curb texture
  const curbCanvas = document.createElement('canvas');
  curbCanvas.width = 128;
  curbCanvas.height = 512;
  const cctx = curbCanvas.getContext('2d')!;
  const stripeH = 64;
  for (let y = 0; y < 512; y += stripeH) {
    cctx.fillStyle = (y / stripeH) % 2 === 0 ? '#DC2626' : '#F8FAFC';
    cctx.fillRect(0, y, 128, stripeH);
    cctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
    cctx.fillRect(0, y + stripeH - 4, 128, 4);
  }
  const curbMap = new THREE.CanvasTexture(curbCanvas);
  curbMap.colorSpace = THREE.SRGBColorSpace;
  curbMap.wrapS = THREE.ClampToEdgeWrapping;
  curbMap.wrapT = THREE.RepeatWrapping;
  curbMap.anisotropy = anisotropy;

  // 3. Neutral textured terrain map (tinted per circuit: turf, coastal sand, canyon rock, night)
  const grassCanvas = document.createElement('canvas');
  grassCanvas.width = 512;
  grassCanvas.height = 512;
  const gctx = grassCanvas.getContext('2d')!;
  gctx.fillStyle = '#b4b8b2';
  gctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 6500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const v = 148 + Math.floor(Math.random() * 52);
    gctx.fillStyle = `rgb(${v}, ${v + 2}, ${v - 2})`;
    gctx.fillRect(x, y, 3, 3);
  }
  // Subtle surface bands
  gctx.fillStyle = 'rgba(255, 255, 255, 0.045)';
  for (let y = 0; y < 512; y += 64) {
    gctx.fillRect(0, y, 512, 32);
  }
  const grassMap = new THREE.CanvasTexture(grassCanvas);
  grassMap.colorSpace = THREE.SRGBColorSpace;
  grassMap.wrapS = THREE.RepeatWrapping;
  grassMap.wrapT = THREE.RepeatWrapping;
  grassMap.repeat.set(64, 64);
  grassMap.anisotropy = anisotropy;

  // 4. Start/Finish checkered line texture
  const chkCanvas = document.createElement('canvas');
  chkCanvas.width = 512;
  chkCanvas.height = 128;
  const kctx = chkCanvas.getContext('2d')!;
  const cell = 32;
  for (let y = 0; y < 128; y += cell) {
    for (let x = 0; x < 512; x += cell) {
      kctx.fillStyle = ((x / cell + y / cell) % 2 === 0) ? '#F8FAFC' : '#0F172A';
      kctx.fillRect(x, y, cell, cell);
    }
  }
  const checkeredMap = new THREE.CanvasTexture(chkCanvas);
  checkeredMap.colorSpace = THREE.SRGBColorSpace;
  checkeredMap.anisotropy = anisotropy;

  // 5. Radial soft contact shadow under each car
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 256;
  shadowCanvas.height = 256;
  const sctx = shadowCanvas.getContext('2d')!;
  const grad = sctx.createRadialGradient(128, 128, 18, 128, 128, 120);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.45)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 256, 256);
  const contactShadowMap = new THREE.CanvasTexture(shadowCanvas);

  return {
    asphaltMap,
    curbMap,
    grassMap,
    checkeredMap,
    contactShadowMap,
    dispose: () => {
      asphaltMap.dispose();
      curbMap.dispose();
      grassMap.dispose();
      checkeredMap.dispose();
      contactShadowMap.dispose();
    },
  };
}
