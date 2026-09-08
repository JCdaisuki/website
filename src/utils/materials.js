import * as THREE from 'three';

function createWaterNormalMap() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(512, 512);

  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      const u = (x / 512) * Math.PI * 2;
      const v = (y / 512) * Math.PI * 2;

      const dx = Math.cos(u * 10) * 0.4 + Math.cos(u * 23 + v * 7) * 0.3 + Math.sin((u + v) * 15) * 0.3;
      const dy = Math.sin(v * 10) * 0.4 + Math.sin(v * 23 + u * 7) * 0.3 + Math.cos((u - v) * 15) * 0.3;

      const nx = (-dx * 0.3) * 0.5 + 0.5;
      const ny = (-dy * 0.3) * 0.5 + 0.5;
      const nz = 0.8;

      const idx = (y * 512 + x) * 4;
      imgData.data[idx] = Math.floor(nx * 255);
      imgData.data[idx + 1] = Math.floor(ny * 255);
      imgData.data[idx + 2] = Math.floor(nz * 255);
      imgData.data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  return texture;
}

export const waterNormalMap = createWaterNormalMap();

export const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  roughness: 0.05,
  metalness: 0.1,
  transmission: 0.6,
  thickness: 0.02,
  ior: 1.1,
  transparent: true,
  opacity: 0.35,
  clearcoat: 1.0,
  clearcoatRoughness: 0.05,
  reflectivity: 0.9
});

export const waterMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x0066cc,
  roughness: 0.05,
  metalness: 0.1,
  transmission: 0.75,
  thickness: 1.2,
  ior: 1.333,
  transparent: true,
  opacity: 0.85,
  clearcoat: 1.0,
  clearcoatRoughness: 0.1,
  reflectivity: 0.9,
  normalMap: waterNormalMap,
  normalScale: new THREE.Vector2(0.35, 0.35)
});

export function createTextureMaterial(texture, options = {}) {
  return new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.9, 
    metalness: 0.0,
    ...options
  });
}