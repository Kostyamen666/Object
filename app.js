// Import three.js and controls via CDN (ES modules)
import * as THREE from 'https://unpkg.com/three@0.166.1/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.166.1/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'https://unpkg.com/three@0.166.1/examples/jsm/controls/TransformControls.js';

// DOM elements
const canvas = document.getElementById('viewport');
const btnCube = document.getElementById('btn-cube');
const btnSphere = document.getElementById('btn-sphere');
const btnCylinder = document.getElementById('btn-cylinder');
const btnTranslate = document.getElementById('btn-translate');
const btnRotate = document.getElementById('btn-rotate');
const btnScale = document.getElementById('btn-scale');
const modeButtons = [btnTranslate, btnRotate, btnScale];

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f1115);

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(6, 5, 8);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
dirLight.position.set(5, 10, 7.5);
dirLight.castShadow = false;
scene.add(dirLight);

// Optional ground grid to aid orientation
const grid = new THREE.GridHelper(50, 50, 0x334155, 0x1f2937);
grid.material.opacity = 0.25;
grid.material.transparent = true;
scene.add(grid);

// Orbit controls (Cinema 4D style navigation)
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.dampingFactor = 0.08;
orbit.target.set(0, 0, 0);
orbit.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.PAN,
};

// Transform controls
const transform = new TransformControls(camera, renderer.domElement);
transform.setMode('translate');
transform.setSize(1.0);
scene.add(transform);

// Prevent orbiting while using gizmo
transform.addEventListener('dragging-changed', (event) => {
  orbit.enabled = !event.value;
});

// Store created objects for raycasting
const editableObjects = [];

// Selection handling
let selectedObject = null;
let selectionHelper = null; // BoxHelper

const raycaster = new THREE.Raycaster();
const ndcPointer = new THREE.Vector2();

function setActiveModeButton(mode) {
  modeButtons.forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
}

function setTransformMode(mode) {
  transform.setMode(mode);
  setActiveModeButton(mode);
}

function attachSelection(object) {
  // Detach existing
  if (selectionHelper) {
    scene.remove(selectionHelper);
    selectionHelper = null;
  }
  if (!object) {
    transform.detach();
    selectedObject = null;
    return;
  }
  selectedObject = object;
  transform.attach(object);
  selectionHelper = new THREE.BoxHelper(object, 0x3b82f6);
  scene.add(selectionHelper);
}

function selectByPointerEvent(event) {
  // Compute mouse NDC relative to canvas
  const rect = renderer.domElement.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  ndcPointer.set(x * 2 - 1, -(y * 2 - 1));

  raycaster.setFromCamera(ndcPointer, camera);
  const intersects = raycaster.intersectObjects(editableObjects, true);
  if (intersects.length > 0) {
    let root = intersects[0].object;
    while (root.parent && root.parent !== scene) {
      root = root.parent;
    }
    attachSelection(root);
  } else {
    attachSelection(null);
  }
}

// Click vs drag detection to avoid selecting when orbiting
let downPoint = null;
renderer.domElement.addEventListener('pointerdown', (e) => {
  downPoint = { x: e.clientX, y: e.clientY };
});

renderer.domElement.addEventListener('pointerup', (e) => {
  const dx = e.clientX - (downPoint?.x ?? e.clientX);
  const dy = e.clientY - (downPoint?.y ?? e.clientY);
  const moved = Math.hypot(dx, dy) > 3;
  // Do not select if using gizmo or if mouse moved significantly
  if (!moved && !transform.dragging) {
    selectByPointerEvent(e);
  }
  downPoint = null;
});

// Object creation
function randomColor() {
  const palette = [0x60a5fa, 0xf472b6, 0x4ade80, 0xfbbf24, 0x38bdf8, 0xa78bfa];
  return palette[Math.floor(Math.random() * palette.length)];
}

function addMeshToScene(mesh) {
  mesh.position.set(0, 0.5, 0);
  scene.add(mesh);
  editableObjects.push(mesh);
  attachSelection(mesh);
}

function createCube() {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({ color: randomColor(), roughness: 0.6, metalness: 0.05 });
  const mesh = new THREE.Mesh(geometry, material);
  addMeshToScene(mesh);
}

function createSphere() {
  const geometry = new THREE.SphereGeometry(0.6, 32, 16);
  const material = new THREE.MeshStandardMaterial({ color: randomColor(), roughness: 0.6, metalness: 0.05 });
  const mesh = new THREE.Mesh(geometry, material);
  addMeshToScene(mesh);
}

function createCylinder() {
  const geometry = new THREE.CylinderGeometry(0.5, 0.5, 1.2, 24, 1);
  const material = new THREE.MeshStandardMaterial({ color: randomColor(), roughness: 0.6, metalness: 0.05 });
  const mesh = new THREE.Mesh(geometry, material);
  addMeshToScene(mesh);
}

// Wire up UI
btnCube.addEventListener('click', createCube);
btnSphere.addEventListener('click', createSphere);
btnCylinder.addEventListener('click', createCylinder);

btnTranslate.addEventListener('click', () => setTransformMode('translate'));
btnRotate.addEventListener('click', () => setTransformMode('rotate'));
btnScale.addEventListener('click', () => setTransformMode('scale'));

// Keyboard shortcuts (W/E/R) like DCC apps
window.addEventListener('keydown', (e) => {
  if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
  if (e.key === 'w' || e.key === 'W') setTransformMode('translate');
  if (e.key === 'e' || e.key === 'E') setTransformMode('rotate');
  if (e.key === 'r' || e.key === 'R') setTransformMode('scale');
});

// Resize handling
function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}
window.addEventListener('resize', onWindowResize);

// Initial mode button state
setActiveModeButton('translate');

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  orbit.update();
  if (selectionHelper && selectedObject) {
    selectionHelper.update();
  }
  renderer.render(scene, camera);
}
animate();

