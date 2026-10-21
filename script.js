
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

const container = document.getElementById("scene");

// --------------------------------------------------
// SCENE 3D
// --------------------------------------------------

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45,
  1,
  0.1,
  100
);

camera.position.set(0, 0, 8);

// Rendu
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true
});

renderer.setPixelRatio(
  Math.min(window.devicePixelRatio, 2)
);

container.appendChild(renderer.domElement);

// Groupe contenant notre surface
const surface = new THREE.Group();
scene.add(surface);

// --------------------------------------------------
// CREATION DE LA SURFACE DE REVOLUTION
// --------------------------------------------------

const segments = 80;
const rings = 50;

const points = [];

// Profil de la surface :
// u varie de -1 à 1
// r(u) définit le rayon du vase
function rayon(u) {
  return 1.1 + 0.45 * Math.cos(u * Math.PI);
}

// Génération des lignes du wireframe
for (let i = 0; i <= rings; i++) {

  const u = -1 + 2 * i / rings;

  const r = rayon(u);
  const z = u * 2.2;

  for (let j = 0; j <= segments; j++) {

    const v = 2 * Math.PI * j / segments;

    const x = r * Math.cos(v);
    const y = r * Math.sin(v);

    // Ligne circulaire
    if (j < segments) {

      const v2 = 2 * Math.PI * (j + 1) / segments;

      points.push(
        x, y, z,
        r * Math.cos(v2),
        r * Math.sin(v2),
        z
      );
    }

    // Ligne verticale du maillage
    if (i < rings) {

      const u2 = -1 + 2 * (i + 1) / rings;

      const r2 = rayon(u2);
      const z2 = u2 * 2.2;

      points.push(
        x, y, z,
        r2 * Math.cos(v),
        r2 * Math.sin(v),
        z2
      );
    }
  }
}

// Géométrie des lignes
const geometry = new THREE.BufferGeometry();

geometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(points, 3)
);

// Matériau lumineux
const material = new THREE.LineBasicMaterial({
  color: 0x35eaff,
  transparent: true,
  opacity: 0.8
});

// Wireframe
const wireframe = new THREE.LineSegments(
  geometry,
  material
);

surface.add(wireframe);

// --------------------------------------------------
// INTERACTION SOURIS ET TELEPHONE
// --------------------------------------------------

let isDragging = false;

let previousX = 0;
let previousY = 0;

container.addEventListener("pointerdown", (event) => {

  isDragging = true;

  previousX = event.clientX;
  previousY = event.clientY;

  container.setPointerCapture(event.pointerId);
});

container.addEventListener("pointermove", (event) => {

  if (!isDragging) return;

  const deltaX = event.clientX - previousX;
  const deltaY = event.clientY - previousY;

  surface.rotation.y += deltaX * 0.01;
  surface.rotation.x += deltaY * 0.01;

  previousX = event.clientX;
  previousY = event.clientY;
});

container.addEventListener("pointerup", () => {
  isDragging = false;
});

container.addEventListener("pointercancel", () => {
  isDragging = false;
});

// --------------------------------------------------
// BOUTON RESET
// --------------------------------------------------

document.getElementById("reset").addEventListener(
  "click",
  () => {

    surface.rotation.set(0, 0, 0);
  surface.scale.set(1, 1, 1);

  camera.position.set(0, 0, 8);
  camera.lookAt(0, 0, 0);
  }
);

// --------------------------------------------------
// ADAPTATION A LA TAILLE DE L'ECRAN
// --------------------------------------------------

function resize() {

  const width = container.clientWidth;
  const height = container.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

const observer = new ResizeObserver(resize);
observer.observe(container);

resize();

// --------------------------------------------------
// ANIMATION
// --------------------------------------------------

function animate() {

  requestAnimationFrame(animate);

  // Rotation automatique
  if (!isDragging) {
    surface.rotation.y += 0.003;
  }

  renderer.render(scene, camera);
}

animate();
