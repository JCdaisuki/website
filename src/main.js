import './style.scss'
import * as THREE from 'three';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js'
import { GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import gsap from "gsap"

const canvas = document.querySelector("#experience-canvas");
const sizes = 
{
  width: window.innerWidth,
  height: window.innerHeight
}

const modals = 
{
  about: document.querySelector(".modal.about"),
  about: document.querySelector(".modal.projects")
}

const showModal = (modal) =>
{
  modal.style.display = "block";

  gsap.set(modal, {opacity: 0});
  gsap.to(modal, {opacity: 1, duration: 0.5});
}

const hideModal = (modal) =>
{
  gsap.to(modal, {opacity: 0, duration: 0.5, onComplete: () => {modal.style.display = "none";}});
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, sizes.width / sizes.height, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true});
renderer.setSize( sizes.width, sizes.height );
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

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
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

const raycasterObjects = [];
let currentIntersects = [];

window.addEventListener("click", (event) => 
{
  if(currentIntersects.length > 0)
  {
    const object = currentIntersects[0].object;


  }
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

    if (glbCamera)
    {
      camera.position.copy(glbCamera.position);
      camera.rotation.copy(glbCamera.rotation);
      camera.scale.copy(glbCamera.scale);
      camera.fov = glbCamera.fov;
      camera.near = glbCamera.near;
      camera.far = glbCamera.far;
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

const render = () =>
{
  raycaster.setFromCamera(pointer, camera);

  currentIntersects = raycaster.intersectObjects(raycasterObjects);

  if(currentIntersects.length > 0)
  {
    document.body.style.cursor = "pointer";
  }
  else
  {
    document.body.style.cursor = "default";
  }

  

  renderer.render( scene, camera );

  window.requestAnimationFrame(render);
}

render()