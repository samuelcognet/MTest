
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

// --------------------------------------------------
// PARAMETRES DE L'INTRO
// --------------------------------------------------
const INTRO_TEXTE = "Une rose pour toi";   // texte affiché
const INTRO_DUREE = 3000;                  // durée d'affichage (ms)
const INTRO_FONDU = 1500;                  // durée du fondu (ms)

const intro = document.getElementById("intro");
document.getElementById("intro-texte").textContent = INTRO_TEXTE;
intro.style.transitionDuration = INTRO_FONDU + "ms";

// La rose est cachée pendant l'affichage du texte
surface.visible = false;

setTimeout(() => {
  surface.visible = true;           // la rose existe dès le début du fondu
  intro.classList.add("masque");    // lance le fondu CSS

  // Une fois le fondu terminé, on retire complètement le conteneur
  setTimeout(() => intro.remove(), INTRO_FONDU);
}, INTRO_DUREE);

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
// r     ∈ [0, 1]      : position radiale sur un pétale (centre -> bord)
// theta ∈ [-2π, 15π]  : enroulement spiral des pétales
// L'axe de la rose est l'axe Y (vertical à l'écran).

const nTheta = 200;          // résolution autour de la fleur
const nR = 35;               // résolution radiale
const thetaMin = -20 * Math.PI / 9;
const thetaMax = 15 * Math.PI;
const echelle = 2.2;         // taille globale
const decalageY = -0.5;      // centre la rose verticalement

// Modulo toujours positif (comme Mod en maths)
const modPositif = (a, n) => ((a % n) + n) % n;

// Point de la surface pour un couple (r, theta)
function pointRose(r, theta) {
  const phi = (Math.PI / 2) * Math.exp(-theta / (8 * Math.PI));

  // m ∈ [0, 2π[ pour toute valeur de theta, y compris négative
  const m = modPositif(3.6 * theta, 2 * Math.PI);
  const X = 1 - 0.5 * Math.pow(1.25 * Math.pow(1 - m / Math.PI, 2) - 0.25, 2);

  const yy = 1.95653 * r * r * Math.pow(1.27689 * r - 1, 2) * Math.sin(phi);

  const R = X * (r * Math.sin(phi) + yy * Math.cos(phi));
  const hauteur = X * (r * Math.cos(phi) - yy * Math.sin(phi));

  return {
    x: R * Math.sin(theta) * echelle,
    y: (hauteur + decalageY) * echelle,
    z: R * Math.cos(theta) * echelle,
    r,
    theta
  };
}

// Couleur en nuances de rouge (carmin, rouge vif, grenat, touche de corail)
// 'eclaircir' permet d'obtenir une version plus claire pour les lignes du maillage
const couleurTmp = new THREE.Color();
function couleurRose(p, eclaircir = 0) {
  const mix = 0.5 + 0.5 * Math.sin(p.theta * 0.9 + p.r * 3.0);
  const hue = (0.98 + 0.05 * mix) % 1;
  const sat = 0.95 - 0.25 * Math.pow(p.r, 3);
  const light = 0.22 + 0.38 * Math.pow(p.r, 1.3)
              + 0.06 * Math.sin(p.theta * 2.0) + eclaircir;

  couleurTmp.setHSL(hue, sat, Math.min(light, 0.9));
  return [couleurTmp.r, couleurTmp.g, couleurTmp.b];
}

// --------------------------------------------------
// GRILLE DE POINTS
// --------------------------------------------------
const grille = [];
for (let i = 0; i <= nTheta; i++) {
  const theta = thetaMin + (thetaMax - thetaMin) * i / nTheta;
  const ligne = [];
  for (let j = 0; j <= nR; j++) {
    ligne.push(pointRose(j / nR, theta));
  }
  grille.push(ligne);
}

const index = (i, j) => i * (nR + 1) + j;

// --------------------------------------------------
// SURFACE COLOREE (mesh triangulé)
// --------------------------------------------------
const positionsSurf = [];
const couleursSurf = [];
const indices = [];

for (let i = 0; i <= nTheta; i++) {
  for (let j = 0; j <= nR; j++) {
    const p = grille[i][j];
    positionsSurf.push(p.x, p.y, p.z);
    couleursSurf.push(...couleurRose(p));
  }
}

for (let i = 0; i < nTheta; i++) {
  for (let j = 0; j < nR; j++) {
    const a = index(i, j);
    const b = index(i + 1, j);
    const c = index(i + 1, j + 1);
    const d = index(i, j + 1);
    indices.push(a, b, d, b, c, d);
  }
}

const geometrieSurface = new THREE.BufferGeometry();
geometrieSurface.setAttribute("position", new THREE.Float32BufferAttribute(positionsSurf, 3));
geometrieSurface.setAttribute("color", new THREE.Float32BufferAttribute(couleursSurf, 3));
geometrieSurface.setIndex(indices);
geometrieSurface.computeVertexNormals();

const materiauSurface = new THREE.MeshLambertMaterial({
  vertexColors: true,
  side: THREE.DoubleSide,        // les pétales sont visibles des deux côtés
  polygonOffset: true,           // repousse légèrement la surface pour que
  polygonOffsetFactor: 1,        // les lignes ne "clignotent" pas dessus
  polygonOffsetUnits: 1
});

const mesh = new THREE.Mesh(geometrieSurface, materiauSurface);
surface.add(mesh);

// Lumières (nécessaires au rendu ombré de la surface)
// Supprime ces lignes si ta scène en contient déjà.
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const lumiere = new THREE.DirectionalLight(0xffffff, 0.9);
lumiere.position.set(3, 5, 4);
scene.add(lumiere);

// --------------------------------------------------
// LIGNES DU MAILLAGE (wireframe)
// --------------------------------------------------
const points = [];
const colors = [];

function ajouterSegment(a, b) {
  points.push(a.x, a.y, a.z, b.x, b.y, b.z);
  colors.push(...couleurRose(a, 0.18), ...couleurRose(b, 0.18));
}

for (let i = 0; i <= nTheta; i++) {
  for (let j = 0; j <= nR; j++) {
    const p = grille[i][j];
    if (j < nR) ajouterSegment(p, grille[i][j + 1]);   // ligne radiale
    if (i < nTheta) ajouterSegment(p, grille[i + 1][j]); // ligne spirale
  }
}

const geometrieLignes = new THREE.BufferGeometry();
geometrieLignes.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
geometrieLignes.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

const materiauLignes = new THREE.LineBasicMaterial({
  vertexColors: true,
  transparent: true,
  opacity: 0.6
});

const wireframe = new THREE.LineSegments(geometrieLignes, materiauLignes);
surface.add(wireframe);

// --------------------------------------------------
// ANIMATION : à placer dans ta boucle d'animation
// --------------------------------------------------
// surface.rotation.y += 0.005;   // rotation de la rose sur elle-même

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
