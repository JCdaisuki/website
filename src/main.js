import './style.scss';
import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import gsap from "gsap";
import confetti from "canvas-confetti";

import { textureMap } from './data.js';
import { setupScene } from './setup.js';
import { modals, initUI, showModal } from './ui.js';

const canvas = document.querySelector("#experience-canvas");
const { scene, camera, renderer, controls, sizes } = setupScene(canvas);

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
};

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

  glb.scene.traverse(child => {
    if (child.isMesh) {
      if (child.name.includes("Raycaster")) {
        raycasterObjects.push(child);
        child.userData.initialPosition = new THREE.Vector3().copy(child.position);
        child.userData.initialScale = new THREE.Vector3().copy(child.scale);
        child.userData.initialRotation = new THREE.Euler().copy(child.rotation);
        child.userData.isAnimating = false;
      }

      Object.keys(textureMap).forEach((key) => {
        if (child.name.includes(key)) {
          child.material = new THREE.MeshBasicMaterial({
            map: loadedTextures.day[key],
          });
        }
      });
    }

    if (child.isCamera) {
      glbCamera = child;
    }
  });

  scene.add(glb.scene);

  if (glbCamera) {
    camera.position.copy(glbCamera.position);
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
  event.preventDefault();
  handleRaycasterInteraction();
}, { passive: false });

window.addEventListener("touchend", (event) => {
  if (isModalOpen) return;
  event.preventDefault();
  pointer.x = (event.touches[0].clientX / sizes.width) * 2 - 1;
  pointer.y = -(event.touches[0].clientY / sizes.height) * 2 + 1;
}, { passive: false });

window.addEventListener("click", () => {
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

const render = () => {
  controls.update();

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