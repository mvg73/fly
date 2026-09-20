import * as THREE from 'three';
import { FOG_COLOR, FOG_NEAR, FOG_FAR, SUN_DIRECTION } from './sceneSetup.js';

export const SEA_LEVEL_Y = 0;

// Half-extent must exceed FOG_FAR so the ocean is fully fog-blended (and
// therefore invisible as a distinct edge) well before it runs out.
const SIZE = 8000;
const SEGMENTS = 150;

const DEFAULTS = {
  waveAmplitude: 3.2,
  waveFrequency: 0.02,
  // Deep desaturated navy-teal rather than a neon cyan — real open ocean
  // reads as dark and slightly muted except right where the sun catches it.
  deepColor: new THREE.Color(0x0a2436),
  crestColor: new THREE.Color(0x1f5266),
};

const VERTEX_SHADER = `
  uniform float uTime;
  uniform float uWaveAmp;
  uniform float uWaveFreq;
  varying float vHeight;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  void main() {
    vec3 pos = position;
    float f = uWaveFreq;
    float t = uTime;

    // Sum a few sine waves at different frequencies/directions/speeds so
    // the surface doesn't look like an obviously repeating single wave.
    float wave =
        sin(pos.x * f        + t * 1.3) * uWaveAmp +
        sin(pos.y * f * 0.6  + t * 0.7) * uWaveAmp * 0.6 +
        sin((pos.x + pos.y) * f * 1.7 + t * 2.1) * uWaveAmp * 0.3;
    pos.z += wave;
    vHeight = wave;

    // Analytic surface normal from the wave height field's partial
    // derivatives — smooth (interpolated per-pixel via the varying) instead
    // of the old flat per-triangle look, without ever touching geometry on
    // the CPU: n = normalize(-dH/dx, -dH/dy, 1) for a height field z=H(x,y).
    float dHdx = cos(pos.x * f + t * 1.3) * uWaveAmp * f
               + cos((pos.x + pos.y) * f * 1.7 + t * 2.1) * uWaveAmp * 0.3 * f * 1.7;
    float dHdy = cos(pos.y * f * 0.6 + t * 0.7) * uWaveAmp * 0.6 * f * 0.6
               + cos((pos.x + pos.y) * f * 1.7 + t * 2.1) * uWaveAmp * 0.3 * f * 1.7;
    vec3 localNormal = normalize(vec3(-dHdx, -dHdy, 1.0));

    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * localNormal);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  uniform vec3 uDeepColor;
  uniform vec3 uCrestColor;
  uniform float uWaveAmp;
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform vec3 uSunDirection;
  varying float vHeight;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  void main() {
    vec3 normal = normalize(vWorldNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);

    float t = clamp(vHeight / max(uWaveAmp, 0.0001) * 0.5 + 0.5, 0.0, 1.0);
    vec3 base = mix(uDeepColor, uCrestColor, t * 0.6);

    // Fresnel: water lightens toward the sky color at grazing viewing
    // angles, the single biggest cue that reads as "real water" vs. a flat
    // colored plane.
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.0);
    vec3 color = mix(base, uFogColor, fresnel * 0.65);

    // Sun glint: a tight specular highlight wherever the wave normal
    // reflects the sun toward the camera.
    vec3 reflectDir = reflect(-viewDir, normal);
    float sunSpec = pow(max(dot(reflectDir, uSunDirection), 0.0), 140.0);
    color += vec3(1.0, 0.95, 0.82) * sunSpec * 1.8;

    // Manual fog matching the scene's fog, so the plane's edge blends
    // seamlessly into the horizon instead of showing a hard boundary.
    float dist = length(vWorldPosition - cameraPosition);
    float fogFactor = smoothstep(uFogNear, uFogFar, dist);
    color = mix(color, uFogColor, fogFactor);

    gl_FragColor = vec4(color, 1.0);
  }
`;

export function createOcean(options = {}) {
  const opts = { ...DEFAULTS, ...options };

  const geometry = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uWaveAmp: { value: opts.waveAmplitude },
      uWaveFreq: { value: opts.waveFrequency },
      uDeepColor: { value: opts.deepColor },
      uCrestColor: { value: opts.crestColor },
      uFogColor: { value: FOG_COLOR },
      uFogNear: { value: FOG_NEAR },
      uFogFar: { value: FOG_FAR },
      uSunDirection: { value: SUN_DIRECTION },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    fog: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = SEA_LEVEL_Y;

  return {
    mesh,
    update(dt) {
      material.uniforms.uTime.value += dt;
    },
  };
}
