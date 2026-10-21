
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
// CREATION DE LA ROSE PARAMETRIQUE
// --------------------------------------------------
// Paramètres :
//   r     ∈ [0, 1]      : position radiale sur un pétale (centre -> bord)
//   theta ∈ [-2π, 15π]  : enroulement spiral des pétales

const nTheta = 260;          // résolution autour de la fleur
const nR = 24;               // résolution radiale
const thetaMin = -2 * Math.PI;
const thetaMax = 15 * Math.PI;
const echelle = 2.2;         // taille globale
const decalageZ = -0.5;      // centre la rose verticalement

// Point de la surface (x, y, z) pour un couple (r, theta)
function pointRose(r, theta) {
  const phi = (Math.PI / 2) * Math.exp(-theta / (8 * Math.PI));

  // Profil de l'enroulement des pétales
  const m = (3.6 * theta) % (2 * Math.PI);
  const X = 1 - 0.5 * Math.pow(1.25 * Math.pow(1 - m / Math.PI, 2) - 0.25, 2);

  // Courbure du pétale
  const yy = 1.95653 * r * r * Math.pow(1.27689 * r - 1, 2) * Math.sin(phi);

  const R = X * (r * Math.sin(phi) + yy * Math.cos(phi));

  return {
    x: R * Math.sin(theta) * echelle,
    y: R * Math.cos(theta) * echelle,
    z: (X * (r * Math.cos(phi) - yy * Math.sin(phi)) + decalageZ) * echelle,
    r,
    theta
  };
}

// Couleur : rouges variés (carmin, rouge vif, grenat, touche de corail)
const couleurTmp = new THREE.Color();
function couleurRose(p) {
  // Variation de teinte autour du rouge (légèrement pourpre -> orangé)
  const mix = 0.5 + 0.5 * Math.sin(p.theta * 0.9 + p.r * 3.0);
  const hue = (0.98 + 0.05 * mix) % 1;

  // Saturation élevée, un peu moins vers le bord des pétales
  const sat = 0.95 - 0.25 * Math.pow(p.r, 3);

  // Cœur sombre (grenat), bords plus clairs
  const light = 0.22 + 0.38 * Math.pow(p.r, 1.3) + 0.06 * Math.sin(p.theta * 2.0);

  couleurTmp.setHSL(hue, sat, light);
  return [couleurTmp.r, couleurTmp.g, couleurTmp.b];
}

// Grille de points
const grille = [];
for (let i = 0; i <= nTheta; i++) {
  const theta = thetaMin + (thetaMax - thetaMin) * i / nTheta;
  const ligne = [];
  for (let j = 0; j <= nR; j++) {
    ligne.push(pointRose(j / nR, theta));
  }
  grille.push(ligne);
}

// Génération des segments du wireframe
const points = [];
const colors = [];

function ajouterSegment(a, b) {
  points.push(a.x, a.y, a.z, b.x, b.y, b.z);
  colors.push(...couleurRose(a), ...couleurRose(b));
}

for (let i = 0; i <= nTheta; i++) {
  for (let j = 0; j <= nR; j++) {
    const p = grille[i][j];

    // Ligne radiale (centre -> bord du pétale)
    if (j < nR) ajouterSegment(p, grille[i][j + 1]);

    // Ligne spirale (autour de la fleur)
    if (i < nTheta) ajouterSegment(p, grille[i + 1][j]);
  }
}

// Géométrie des lignes
const geometry = new THREE.BufferGeometry();

geometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(points, 3)
);
geometry.setAttribute(
  "color",
  new THREE.Float32BufferAttribute(colors, 3)
);

// Matériau lumineux, couleurs par sommet
const material = new THREE.LineBasicMaterial({
  vertexColors: true,
  transparent: true,
  opacity: 0.85,
  blending: THREE.AdditiveBlending,
  depthWrite: false
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
