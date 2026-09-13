import './style.scss';
import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import gsap from "gsap";
import confetti from "canvas-confetti";

import { textureMap } from './data.js';
import { setupScene } from './setup.js';
import { modals, initUI, showModal } from './ui.js';
import { glassMaterial, waterMaterial, metalMaterial, waterNormalMap, createTextureMaterial } from './utils/materials.js';

const canvas = document.querySelector("#experience-canvas");
const { scene, camera, renderer, controls, sizes } = setupScene(canvas);

camera.far = 1000;
camera.position.set(48.48, 16.58, 2.25);

controls.target.set(-1.00, 2.80, 1.82);
controls.maxDistance = 51.37;

const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
if ('environmentIntensity' in scene) {
  scene.environmentIntensity = 0.15;
}

const clock = new THREE.Clock();
let mixer = null;

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const ambientLight = new THREE.AmbientLight(0xffffff, 1.25);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(5, 12, 8);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 50;
dirLight.shadow.camera.left = -15;
dirLight.shadow.camera.right = 15;
dirLight.shadow.camera.top = 15;
dirLight.shadow.camera.bottom = -15;
scene.add(dirLight);

const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5);
scene.add(hemisphereLight);

let baseFov = camera.fov || 45;

function updateCameraPosition() {
  const aspect = window.innerWidth / window.innerHeight;
  camera.aspect = aspect;

  if (aspect < 1) {
    const rad = (baseFov * Math.PI) / 180;
    const portraitFov = (2 * Math.atan(Math.tan(rad / 2) / aspect) * 180) / Math.PI;
    camera.fov = portraitFov;
  } else {
    camera.fov = baseFov;
  }

  camera.updateProjectionMatrix();
}

updateCameraPosition();

window.addEventListener('resize', () => {
  updateCameraPosition();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let isModalOpen = false;

const onModalOpen = () => {
  isModalOpen = true;
  controls.enabled = false;

  if (currentHoveredObject) {
    playHoverAnimation(currentHoveredObject, false);
    currentHoveredObject = null;
  }

  document.body.style.cursor = "default";
  currentIntersects = [];
};

const onModalClose = () => {
  isModalOpen = false;
  controls.enabled = true;
  
  const modalStudies = document.getElementById("modal-studies");
  const modalCert = document.getElementById("modal-certificates");
  const modalExp = document.getElementById("modal-experience");
  
  if (modalStudies) modalStudies.style.display = "none";
  if (modalCert) modalCert.style.display = "none";
  if (modalExp) modalExp.style.display = "none";
};

document.addEventListener('wheel', function(e) {
  if (e.ctrlKey) { e.preventDefault(); }
}, { passive: false });

document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) {
    e.preventDefault();
  }
});

initUI(onModalClose);

const textureLoader = new THREE.TextureLoader();
const loadedTextures = { day: {} };

Object.entries(textureMap).forEach(([key, paths]) => {
  const dayTexture = textureLoader.load(paths.day);
  dayTexture.flipY = false;
  dayTexture.colorSpace = THREE.SRGBColorSpace;
  loadedTextures.day[key] = dayTexture;
});

const raycasterObjects = [];

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('../node_modules/three/examples/jsm/libs/draco/');

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

const metalRegex = /\b(metal|robot)\b/i;

loader.load("/models/scene.glb", (glb) => {
  if (glb.animations && glb.animations.length > 0) {
    mixer = new THREE.AnimationMixer(glb.scene);
    glb.animations.forEach((clip) => {
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat);
      action.play();
    });
  }

  glb.scene.traverse(child => {
    if (child.isMesh) { 
      if (child.name.includes("Raycaster")) {
        raycasterObjects.push(child);
        child.userData.initialPosition = new THREE.Vector3().copy(child.position);
        child.userData.initialScale = new THREE.Vector3().copy(child.scale);
        child.userData.initialRotation = new THREE.Euler().copy(child.rotation);
        child.userData.isAnimating = false;
      }

      const meshName = child.name ? child.name.toLowerCase() : '';
      const matNames = Array.isArray(child.material)
        ? child.material.map(m => m.name ? m.name.toLowerCase() : '').join(' ')
        : (child.material && child.material.name ? child.material.name.toLowerCase() : '');
      
      const fullName = `${meshName} ${matNames}`;

      const isCharacterOrRobot = fullName.includes('gir') || fullName.includes('robot');

      const isGlass = !isCharacterOrRobot && (fullName.includes('glass'));
      const isWater = fullName.includes('water');
      const isMetal = isCharacterOrRobot || metalRegex.test(fullName);
      const isSkyOrSphere = fullName.includes('background');

      if (isGlass) {
        const mat = glassMaterial.clone();
        mat.transparent = true;
        mat.opacity = 0.35;
        mat.depthWrite = false;
        mat.depthTest = true;
        mat.side = THREE.DoubleSide;
        mat.needsUpdate = true;
        
        child.material = mat;
        child.renderOrder = 2;
      } else if (isWater) {
        const mat = waterMaterial.clone();
        mat.transparent = true;
        mat.opacity = 0.85;
        mat.depthWrite = false;
        mat.depthTest = true;
        mat.side = THREE.DoubleSide;
        mat.needsUpdate = true;
        
        child.material = mat;
        child.renderOrder = 2;
      } else if (child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];

        materials.forEach(mat => {
          mat.transparent = false;
          mat.opacity = 1.0;
          mat.depthWrite = true;
          mat.depthTest = true;
          mat.side = isSkyOrSphere ? THREE.BackSide : THREE.DoubleSide;

          if (isMetal) {
            mat.metalness = 0.75;
            mat.roughness = 0.35;
            mat.envMapIntensity = 0.5;
          }
          mat.needsUpdate = true;
        });
      }

      if (!isSkyOrSphere) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    }
  });

  scene.add(glb.scene);

  camera.position.set(48.48, 16.58, 2.25);
  controls.target.set(-1.00, 2.80, 1.82);
  controls.maxDistance = 51.37;

  updateCameraPosition();
  controls.update();
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let currentIntersects = [];
let currentHoveredObject = null;

window.addEventListener('mousemove', (event) => {
  pointer.x = (event.clientX / sizes.width) * 2 - 1;
  pointer.y = -(event.clientY / sizes.height) * 2 + 1;
});

window.addEventListener("touchstart", (event) => {
  if (isModalOpen) return;
  if (event.touches && event.touches.length > 0) {
    pointer.x = (event.touches[0].clientX / sizes.width) * 2 - 1;
    pointer.y = -(event.touches[0].clientY / sizes.height) * 2 + 1;
  }
}, { passive: true });

window.addEventListener("touchend", (event) => {
  if (isModalOpen) return;
  
  if (event.changedTouches && event.changedTouches.length > 0) {
    pointer.x = (event.changedTouches[0].clientX / sizes.width) * 2 - 1;
    pointer.y = -(event.changedTouches[0].clientY / sizes.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    currentIntersects = raycaster.intersectObjects(raycasterObjects);

    handleRaycasterInteraction();
  }
}, { passive: true });

window.addEventListener("click", () => {
  if (isModalOpen) return;
  handleRaycasterInteraction();
});

function handleRaycasterInteraction() {
  if (currentIntersects.length > 0) {
    const object = currentIntersects[0].object;

    if (object.name.includes('About')) {
      showModal(modals.about, onModalOpen);
    } else if (object.name.includes('projects')) {
      showModal(modals.projects, onModalOpen);
    } else if (object.name.includes('Contact')) {
      showModal(modals.contact, onModalOpen);
    } else if (object.name.includes('Credits')) {
      showModal(modals.credits, onModalOpen);
    } else if (object.name.includes('JCdaisuki')) {
      confetti({ particleCount: 300, spread: 90, origin: { x: 1, y: 0.9 } });
      confetti({ particleCount: 300, spread: 90, origin: { x: 0, y: 0.9 } });
    }
  }
}

function playHoverAnimation(object, isHovering) {
  gsap.killTweensOf(object.scale);

  if (isHovering) {
    gsap.to(object.scale, {
      x: object.userData.initialScale.x * 1.2,
      y: object.userData.initialScale.y * 1.2,
      z: object.userData.initialScale.z * 1.2,
      duration: 0.5,
      ease: "bounce.out(1.8)"
    });
  } else {
    gsap.to(object.scale, {
      x: object.userData.initialScale.x,
      y: object.userData.initialScale.y,
      z: object.userData.initialScale.z,
      duration: 0.3,
      ease: "bounce.out(1.8)"
    });
  }
}

window.addEventListener("click", (e) => {
  if (e.target.closest("#button-studies")) {
    e.preventDefault();
    e.stopPropagation(); 
    const modal = document.getElementById("modal-studies");
    if (modal) {
        modal.style.display = "block";
        modal.style.zIndex = "9999";
    }
    return;
  }
  
  if (e.target.closest("#button-certificates")) {
    e.preventDefault();
    e.stopPropagation();
    const modal = document.getElementById("modal-certificates");
    if (modal) {
        modal.style.display = "block";
        modal.style.zIndex = "9999";
    }
    return;
  }
  
  if (e.target.closest("#button-experience")) {
    e.preventDefault();
    e.stopPropagation();
    const modal = document.getElementById("modal-experience");
    if (modal) {
        modal.style.display = "block";
        modal.style.zIndex = "9999";
    }
    return;
  }

  const exitButton = e.target.closest(".sub-exit");
  if (exitButton) {
    e.preventDefault();
    e.stopPropagation();
    const parentModal = exitButton.closest("#modal-studies, #modal-certificates, #modal-experience");
    if (parentModal) {
        parentModal.style.display = "none";
    }
    return;
  }
}, true);

const render = () => {
  controls.update();

  const delta = clock.getDelta();
  if (mixer) {
    mixer.update(delta);
  }

  if (waterNormalMap) {
    waterNormalMap.offset.x += 0.0005;
    waterNormalMap.offset.y += 0.0003;
  }

  if (!isModalOpen) {
    raycaster.setFromCamera(pointer, camera);
    currentIntersects = raycaster.intersectObjects(raycasterObjects);

    if (currentIntersects.length > 0) {
      const currentIntersectObject = currentIntersects[0].object;

      if (currentIntersectObject !== currentHoveredObject) {
        if (currentHoveredObject) {
          playHoverAnimation(currentHoveredObject, false);
        }

        playHoverAnimation(currentIntersectObject, true);
        currentHoveredObject = currentIntersectObject;
      }

      document.body.style.cursor = "pointer";
    } else {
      if (currentHoveredObject) {
        playHoverAnimation(currentHoveredObject, false);
        currentHoveredObject = null;
      }

      document.body.style.cursor = "default";
    }
  }

  renderer.render(scene, camera);
  window.requestAnimationFrame(render);
};

render();