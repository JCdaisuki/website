import './style.scss';
import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import gsap from "gsap";
import confetti from "canvas-confetti";

import { textureMap } from './data.js';
import { setupScene } from './setup.js';
import { modals, initUI, showModal } from './ui.js';
import { glassMaterial, waterMaterial, waterNormalMap, createTextureMaterial } from './utils/materials.js';

const canvas = document.querySelector("#experience-canvas");
const { scene, camera, renderer, controls, sizes } = setupScene(canvas);

const clock = new THREE.Clock();
let mixer = null;

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const ambientLight = new THREE.AmbientLight(0xffffff, 2.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
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

const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
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

loader.load("/models/scene.glb", (glb) => {
  let glbCamera = null;

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

      const isGlass = child.material && (
        Array.isArray(child.material)
          ? child.material.some(m => m.name && m.name.toLowerCase().includes('glass'))
          : (child.material.name && child.material.name.toLowerCase().includes('glass'))
      ) || child.name.toLowerCase().includes('glass');

      const isWater = child.material && (
        Array.isArray(child.material)
          ? child.material.some(m => m.name && m.name.toLowerCase().includes('water'))
          : (child.material.name && child.material.name.toLowerCase().includes('water'))
      ) || child.name.toLowerCase().includes('water');

      const isSkyOrSphere = child.name.toLowerCase().includes('sky') || 
                            child.name.toLowerCase().includes('sphere') || 
                            child.name.toLowerCase().includes('dome') || 
                            child.name.toLowerCase().includes('background');

      if (isGlass) {
        child.material = glassMaterial;
      } else if (isWater) {
        child.material = waterMaterial;
      } else {
        let matchedTexture = false;
        Object.keys(textureMap).forEach((key) => {
          if (child.name.includes(key)) {
            child.material = createTextureMaterial(loadedTextures.day[key]);
            matchedTexture = true;
          }
        });

        if (!matchedTexture && child.material && child.material.map) {
          child.material = createTextureMaterial(child.material.map);
        }
      }

      if (isSkyOrSphere && child.material) {
        child.material.side = THREE.BackSide;
      }

      if (!isSkyOrSphere) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    }

    if (child.isCamera) {
      glbCamera = child;
    }
  });

  scene.add(glb.scene);

  if (glbCamera) {
    camera.position.copy(glbCamera.position);
    camera.rotation.copy(glbCamera.rotation);
    
    baseFov = glbCamera.fov || 45;
    
    updateCameraPosition();

    camera.scale.copy(glbCamera.scale);
    camera.updateProjectionMatrix();
  }
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