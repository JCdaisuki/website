import './style.scss'
import * as THREE from 'three';
import { OrbitControls } from './utils/OrbitControls.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js'
import { GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import gsap from "gsap"
import confetti from "canvas-confetti";

const canvas = document.querySelector("#experience-canvas");
const sizes = 
{
  width: window.innerWidth,
  height: window.innerHeight
}

const modals = 
{
  about: document.querySelector(".modal.about"),
  projects: document.querySelector(".modal.projects"),
  contact: document.querySelector(".modal.contact"),
  credits: document.querySelector(".modal.credits")
}

document.querySelectorAll(".modal-exit-button").forEach(button => 
{
  button.addEventListener("click", (e) => 
  {
    const modal = e.target.closest(".modal");
    hideModal(modal);
  })
})

const showModal = (modal) =>
{
  modal.style.display = "block";
  isModalOpen = true;
  controls.enabled = false;

  if(currentHoveredObject)
  {
    playHoverAnimation(currentHoveredObject, false);
    currentHoveredObject = null;
  }

  document.body.style.cursor = "default";
  currentIntersects = [];

  gsap.set(modal, {opacity: 0});
  gsap.to(modal, {opacity: 1, duration: 0.5});
}

const hideModal = (modal) =>
{
  isModalOpen = false;
  controls.enabled = true;
  gsap.to(modal, {opacity: 0, duration: 0.5, onComplete: () => {modal.style.display = "none";}});
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 50, sizes.width / sizes.height, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true});
renderer.setSize( sizes.width, sizes.height );
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const controls = new OrbitControls(camera, renderer.domElement);
controls.minDistance = 15;
controls.maxDistance = 35;
controls.minPolarAngle = 0;
controls.maxPolarAngle = Math.PI / 2;

controls.enableDamping = true;
controls.dampingFactor = 0.05;

controls.update();

document.body.appendChild( renderer.domElement );

camera.position.z = 5;

const textureLoader = new THREE.TextureLoader;

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('../node_modules/three/examples/jsm/libs/draco/');

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

const textureMap = 
{
  First: {
    day: "/textures/6541206.webp"
  },
  Second: {
    day: "/textures/angry_face.webp"
  },
  Third: {
    day: "/textures/bored_face.webp"
  },
  Fourth: {
    day: "/textures/happy_face_02.webp"
  },
  Fifth: {
    day: "/textures/happy_face.webp"
  },
  Sixth: {
    day: "/textures/painting.webp"
  },
  Seventh: {
    day: "/textures/sleep_face.webp"
  },
  Eighth: {
    day: "/textures/talk_face.webp"
  }  
}

const loadedTextures = 
{
  day: {}
}

Object.entries(textureMap).forEach(([key, paths])=>
{
  const dayTexture = textureLoader.load(paths.day);
  dayTexture.flipY = false;
  dayTexture.colorSpace = THREE.SRGBColorSpace;
  loadedTextures.day[key] = dayTexture;
})

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

window.addEventListener('mousemove', (event) => 
{
  pointer.x = (event.clientX / sizes.width) * 2 - 1;
  pointer.y = -(event.clientY / sizes.height) * 2 + 1;
});

window.addEventListener("touchstart", (event) => 
{
  if(isModalOpen)
  {
    return;
  }

  event.preventDefault();
  handleRaycasterInteraction();
}, {passive: false});

function handleRaycasterInteraction()
{
  if(currentIntersects.length > 0)
  {
    const object = currentIntersects[0].object;

    if(object.name.includes('About'))
    {
      showModal(modals.about);
    }
    else if(object.name.includes('projects'))
    {
      showModal(modals.projects);
    }
    else if(object.name.includes('Contact'))
    {
      showModal(modals.contact);
    }
    else if(object.name.includes('Credits'))
    {
      showModal(modals.credits);
    }
    else if(object.name.includes('JCdaisuki'))
    {
      confetti({
        particleCount: 300,
        spread: 90,
        origin: { x: 1, y: 0.9 },
      });

      confetti({
        particleCount: 300,
        spread: 90,
        origin: { x: 0, y: 0.9 },
      });
    }
  }
}

window.addEventListener("touchend", (event) => 
{
  if(isModalOpen)
  {
    return;
  }

  event.preventDefault();
  pointer.x = (event.touches[0].clientX / sizes.width) * 2 - 1;
  pointer.y = -(event.touches[0].clientY / sizes.height) * 2 + 1;
}, {passive: false});

let isModalOpen = false;

const raycasterObjects = [];
let currentIntersects = [];
let currentHoveredObject = null;

window.addEventListener("click", (event) => 
{
  handleRaycasterInteraction();
})

loader.load("/models/scene.glb", (glb) =>
{
  let glbCamera = null;

  glb.scene.traverse(child =>
  {
    if(child.isMesh)
    {
      if(child.name.includes("Raycaster"))
      {
        raycasterObjects.push(child);

        child.userData.initialPosition = new THREE.Vector3().copy(child.position);
        child.userData.initialScale = new THREE.Vector3().copy(child.scale);
        child.userData.initialRotation = new THREE.Euler().copy(child.rotation);
        child.userData.isAnimating = false;
      }
      
      Object.keys(textureMap).forEach((key) =>
      {
        if(child.name.includes(key))
        {
          const material = new THREE.MeshBasicMaterial
          ({
            map: loadedTextures.day[key],
          })

          child.material = material;
        }
      })
    }

    if(child.isCamera)
    {
      glbCamera = child;
    }

    scene.add(glb.scene);

    if(glbCamera)
    {
      camera.position.copy(glbCamera.position);
      camera.scale.copy(glbCamera.scale);
      camera.updateProjectionMatrix();
    }
  });
});

window.addEventListener("resize", () =>
{
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

function playHoverAnimation(object, isHovering)
{
  gsap.killTweensOf(object.scale);

  if(isHovering)
  {
    gsap.to(object.scale, {
      x: object.userData.initialScale.x * 1.2,
      y: object.userData.initialScale.y * 1.2,
      z: object.userData.initialScale.z * 1.2,
      duration: 0.5,
      ease: "bounce.out(1.8)"
    })
  }
  else
  {
    gsap.to(object.scale, {
      x: object.userData.initialScale.x,
      y: object.userData.initialScale.y,
      z: object.userData.initialScale.z,
      duration: 0.3,
      ease: "bounce.out(1.8)"
    })
  }
}

const render = () =>
{
  controls.update();
  
  if(!isModalOpen)
  {
    raycaster.setFromCamera(pointer, camera);

    currentIntersects = raycaster.intersectObjects(raycasterObjects);
    
    if(currentIntersects.length > 0)
    {
      const currentIntersectObject = currentIntersects[0].object;

      if(currentIntersectObject !== currentHoveredObject)
      {
        if(currentHoveredObject)
        {
          playHoverAnimation(currentHoveredObject, false);
        }

        playHoverAnimation(currentIntersectObject, true);
        currentHoveredObject = currentIntersectObject;
      }

      document.body.style.cursor = "pointer";
    }
    else
    {
      if(currentHoveredObject)
      {
        playHoverAnimation(currentHoveredObject, false);
        currentHoveredObject = null;
      }

      document.body.style.cursor = "default";
    }  
  }

  renderer.render( scene, camera );

  window.requestAnimationFrame(render);
}

render()