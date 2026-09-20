import * as THREE from 'three';

// Slightly desaturated/naturalized from the original postcard-blue —
// pure saturated colors read as "toy," real sky has more atmospheric haze.
export const SKY_TOP_COLOR = new THREE.Color(0x3f74a8);
export const SKY_BOTTOM_COLOR = new THREE.Color(0xd8ebf2);
export const FOG_COLOR = SKY_BOTTOM_COLOR;
export const FOG_NEAR = 900;
export const FOG_FAR = 3600;

const SUN_POSITION = new THREE.Vector3(-800, 1200, 600);
export const SUN_DIRECTION = SUN_POSITION.clone().normalize();
export const SUN_COLOR = new THREE.Color(0xfff0d2);

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  return renderer;
}

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(
    65,
    window.innerWidth / window.innerHeight,
    0.5,
    15000
  );
  return camera;
}

export function createScene() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(FOG_COLOR, FOG_NEAR, FOG_FAR);
  scene.background = FOG_BACKGROUND_COLOR();
  return scene;
}

function FOG_BACKGROUND_COLOR() {
  // Plain background matching the fog/horizon color; createSky() adds the
  // gradient dome on top of this. Kept as its own function so a future
  // three/addons/objects/Sky.js swap only touches createSky().
  return SKY_BOTTOM_COLOR.clone();
}

// Cheap vertical-gradient sky dome (inverted sphere) plus a soft glowing sun
// disc (a camera-facing sprite, so it always billboards correctly with zero
// extra code) positioned along SUN_DIRECTION. Swappable later for
// three/addons/objects/Sky.js without touching any other module.
export function createSky(scene) {
  const geometry = new THREE.SphereGeometry(8000, 16, 16);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: SKY_TOP_COLOR },
      bottomColor: { value: SKY_BOTTOM_COLOR },
      offset: { value: 200 },
      exponent: { value: 0.6 },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `,
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
  });
  const sky = new THREE.Mesh(geometry, material);
  scene.add(sky);

  scene.add(createSunSprite());

  return sky;
}

function createSunSprite() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,250,235,1)');
  gradient.addColorStop(0.25, 'rgba(255,244,214,0.9)');
  gradient.addColorStop(0.6, 'rgba(255,230,180,0.25)');
  gradient.addColorStop(1, 'rgba(255,230,180,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    fog: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.setScalar(1400);
  sprite.position.copy(SUN_DIRECTION).multiplyScalar(7500);
  sprite.renderOrder = -1;
  return sprite;
}

export function createLighting(scene) {
  const sun = new THREE.DirectionalLight(SUN_COLOR, 2.4);
  sun.position.copy(SUN_DIRECTION).multiplyScalar(1000);
  scene.add(sun);

  const hemi = new THREE.HemisphereLight(SKY_TOP_COLOR, 0x1e4a5c, 0.75);
  scene.add(hemi);

  return { sun, hemi };
}

export function setupResize(camera, renderer) {
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}
