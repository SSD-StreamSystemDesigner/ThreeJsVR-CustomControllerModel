<template>
  <canvas ref="canvasRef"></canvas>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import {BoxLineGeometry} from "three/examples/jsm/geometries/BoxLineGeometry"
import {VRButton} from "three/examples/jsm/webxr/VRButton"
import {XRControllerModelFactory} from "three/examples/jsm/webxr/XRControllerModelFactory"
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader"
import {SpotLightVolumetricMaterial} from "../libs/SpotLightVolumetricMaterial"
import * as THREE from "three"

let scene = new THREE.Scene()
scene.background = new THREE.Color(0xaaaaaa)
let renderer
let controls

let canvasRef = ref();

let controller
const raycaster = new THREE.Raycaster()
const workingMatrix = new THREE.Matrix4()
const workingVector = new THREE.Vector3()

//Room and Highlighted objects
let room, highlighted, torch

const random = (min, max) => {
  return Math.random() * (max - min) + min;
}

let camera = new THREE.PerspectiveCamera(
  50, //vertical field of view
  window.innerWidth / window.innerHeight, //aspect ratio
  0.1, //near plane
  100 //far plane
);
camera.position.set(0, 1.6, 3)
scene.add(camera);


const ambientLight = new THREE.HemisphereLight( 0x606060, 0x404040);
scene.add(ambientLight)

const dirLight = new THREE.DirectionalLight(0xffffff)
dirLight.position.set(1, 1, 1).normalize()
scene.add(dirLight)

let loop = () => {
  controls.update();

  if(controller){
    handleController(controller)
  }

  renderer.render(scene, camera);
};

let resizeCallback = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.updateProjectionMatrix();
};

//XR Controller Builder function
const buildController = (data, controller) =>{
  let geometry, material, loader

  switch ( data.targetRayMode){
    case "tracked-pointer":
      loader = new GLTFLoader()
      loader.load("/assets/flash-light.glb", (gltf)=>{
        const flashLight = gltf.scene.children[2]
        const scale = 0.6
        flashLight.scale.set(scale, scale, scale)
        controller.add(flashLight)
        torch = new THREE.Group()
        const spotlight = new THREE.SpotLight(0xffffff, 2, 12, Math.PI/15, 0.3)
        let geometry = new THREE.CylinderBufferGeometry(0.03, 1, 5, 32, 5, true)
        geometry.rotateX(Math.PI/2)
        material = new SpotLightVolumetricMaterial()
        const cone = new THREE.Mesh(geometry, material)
        cone.translateZ(-2.6)

        spotlight.position.set(0,0,0)
        spotlight.target.position.set(0, 0, -1)
        torch.add(spotlight.target)
        torch.add(spotlight)
        torch.add(cone)

        controller.add(torch)
        torch.visible = false;

      },
      null, 
      (error)=>{
        console.error("An error occured")
      }
    )

      break;
      
    case 'gaze':
      geometry = new THREE.RingBufferGeometry( 0.02, 0.04, 32 ).translate( 0, 0, - 1 );
      material = new THREE.MeshBasicMaterial( { opacity: 0.5, transparent: true } );
      controller.add( new THREE.Mesh( geometry, material ) )
  }
}

//XR Controller HandleController function
const handleController = (controller)=>{
  if(controller.userData.selectPressed){

    workingMatrix.identity().extractRotation(controller.matrixWorld)

    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld)

    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(workingMatrix)

    const intersects = raycaster.intersectObjects(room.children)

    if(intersects.length>0){
      intersects[0].object.add(highlighted)
      highlighted.visible = true
    }
    else{
      highlighted.visible = false
    }
  }
}

onMounted(() => {
  renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    antialias: true,
    alpha: true,
  });

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.render(scene, camera);

  renderer.xr.enabled = true

  renderer.setAnimationLoop(loop);

  document.body.appendChild(VRButton.createButton(renderer))

  controls = new OrbitControls(camera, canvasRef.value);
  controls.enableDamping = true;

  //XR Controllers
  controller = renderer.xr.getController(0)

  //XR Controller Events handling
 
  controller.addEventListener("selectstart", ()=>{
    controller.userData.selectPressed = true
    if(torch){
      torch.visible = true
    }
  })
  controller.addEventListener("selectend", ()=>{
    highlighted.visible = false
    controller.userData.selectPressed = false
    if(torch){
      torch.visible = false
    }
  })
  controller.addEventListener("connected", (event)=>{
    buildController.call(event.data, controller)
  })
  controller.addEventListener("disconnected", ()=>{
    while(controller.children.length >0) {
      controller.remove(controller.children[0])  
    }
    controller = null
  })
  scene.add(controller)

  

  //Room 
  const radius = 0.08;
  room = new THREE.LineSegments(
    new BoxLineGeometry(6,6,6,10,10,10),
    new THREE.LineBasicMaterial({color: 0x808080})
  )

  room.geometry.translate(0,3,0)
  scene.add(room)

  const geometry = new THREE.IcosahedronBufferGeometry( radius, 2)

  //Spheres
  for(let i=0; i<200; i++){
    const object = new THREE.Mesh( geometry, new THREE.MeshLambertMaterial({color: Math.random() * 0xFFFFFF}))
    object.position.x = random(-2,2)
    object.position.y = random(-2,2)
    object.position.z = random(-2,2)

    room.add(object)
  }

  //highlight object
  highlighted = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide})
  )

  highlighted.scale.set(1.2, 1.2, 1.2)
  scene.add(highlighted)

  window.addEventListener("resize", resizeCallback);
});

onUnmounted(() => {
  renderer.setAnimationLoop(null);
});
</script>

<style>
  canvas {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>