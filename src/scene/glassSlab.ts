import * as THREE from 'three';

const GLASS_DEPTH = 0.07;

const VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;
varying vec2 vScreenUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vec4 clipPosition = projectionMatrix * mvPosition;
  gl_Position = clipPosition;
  vScreenUv = clipPosition.xy / clipPosition.w * 0.5 + 0.5;
  vNormal = normalize(normalMatrix * normal);
  vViewPosition = -mvPosition.xyz;
}
`;

const FRAGMENT_SHADER = /* glsl */ `
precision highp float;

uniform sampler2D tBackground;
uniform float uAberration;
uniform float uCrackIntensity;
uniform vec2 uResolution;

varying vec2 vUv;
varying vec2 vScreenUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

// ── Noise / hash ──────────────────────────────────────────────
float hash1(float n) {
  return fract(sin(n) * 43758.5453);
}

vec2 hash22(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

// Voronoi cell edges → thin crack lines
float voronoiCracks(vec2 uv, float scale) {
  vec2 st = uv * scale;
  vec2 i = floor(st);
  vec2 f = fract(st);
  float md = 8.0;
  float smd = 8.0;

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 lat = vec2(float(x), float(y));
      vec2 cp = lat + hash22(i + lat);
      vec2 diff = cp - f;
      float d = dot(diff, diff);
      if (d < md) {
        smd = md;
        md = d;
      } else if (d < smd) {
        smd = d;
      }
    }
  }
  return smd - md;
}

// Impact-point radial shatter spokes
float radialCracks(vec2 uv) {
  vec2 impact = vec2(0.44, 0.56);
  vec2 d = uv - impact;
  float rad = length(d);
  float angle = atan(d.y, d.x);

  float spokes = 0.0;
  for (int i = 0; i < 9; i++) {
    float fi = float(i);
    float a = hash1(fi * 17.3) * 6.283 + angle * (5.0 + hash1(fi * 3.1) * 4.0);
    spokes += smoothstep(0.97, 1.0, abs(sin(a * 3.0))) * smoothstep(0.5, 0.04, rad);
  }

  float ring = smoothstep(0.035, 0.0, abs(rad - 0.12 - hash1(angle * 40.0) * 0.06));
  return clamp(spokes * 0.35 + ring * 0.6, 0.0, 1.0);
}

// Hairline fractures
float hairlineCracks(vec2 uv) {
  float n1 = voronoiCracks(uv + 3.7, 14.0);
  float n2 = voronoiCracks(uv * 1.3 + 1.2, 22.0);
  float line = 1.0 - smoothstep(0.0, 0.018, n1);
  line += 1.0 - smoothstep(0.0, 0.012, n2);
  return clamp(line * 0.5, 0.0, 1.0);
}

float crackPattern(vec2 uv) {
  float primary = 1.0 - smoothstep(0.0, 0.045, voronoiCracks(uv, 5.5));
  float secondary = 1.0 - smoothstep(0.0, 0.028, voronoiCracks(uv + 9.1, 11.0));
  float radial = radialCracks(uv);
  float hair = hairlineCracks(uv);
  return clamp(primary * 0.85 + secondary * 0.45 + radial * 0.9 + hair * 0.35, 0.0, 1.0);
}

void main() {
  vec2 uv = vScreenUv;

  // Cracks are anchored to the glass pane UV (move with the sheet)
  float cracks = crackPattern(vUv) * uCrackIntensity;

  vec2 screenDir = uv - 0.5;
  float screenDist = length(screenDir);
  vec2 paneDir = vUv - 0.5;
  float paneEdge = length(paneDir) * 1.6;

  vec2 offset = screenDir * uAberration * (0.0015 + screenDist * 0.014);
  offset *= 1.0 + paneEdge * 0.8 + cracks * 4.0;

  // Refractive wobble along crack lines
  float crackDx = crackPattern(vUv + vec2(0.004, 0.0)) - crackPattern(vUv - vec2(0.004, 0.0));
  float crackDy = crackPattern(vUv + vec2(0.0, 0.004)) - crackPattern(vUv - vec2(0.0, 0.004));
  vec2 crackShift = vec2(crackDx, crackDy) * 0.04 * uCrackIntensity;

  vec3 color;
  color.r = texture2D(tBackground, uv + offset + crackShift).r;
  color.g = texture2D(tBackground, uv + crackShift * 0.5).g;
  color.b = texture2D(tBackground, uv - offset + crackShift).b;

  vec3 viewDir = normalize(vViewPosition);
  float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 2.8);
  color *= vec3(0.95, 0.98, 1.0);
  color = mix(color, vec3(0.88, 0.95, 1.0), fresnel * 0.45);

  // Dark crack lines + subtle white stress highlights
  color = mix(color, color * 0.25, cracks * 0.75);
  color += vec3(0.18, 0.22, 0.28) * pow(cracks, 2.0) * 0.45;

  gl_FragColor = vec4(color, 1.0);
}
`;

export interface ChromaticGlassUniforms {
  uAberration: number;
  uCrackIntensity: number;
}

export function createChromaticGlassMaterial(
  backgroundTexture: THREE.Texture,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      tBackground: { value: backgroundTexture },
      uAberration: { value: 1.2 },
      uCrackIntensity: { value: 1.0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: false,
    depthWrite: true,
  });
}

export function createGlassSlab(backgroundTexture: THREE.Texture): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(3.8, 2.9, GLASS_DEPTH);
  const material = createChromaticGlassMaterial(backgroundTexture);

  const slab = new THREE.Mesh(geometry, material);
  slab.name = 'GlassSlab';
  slab.position.set(0, 1.05, 2.4);
  slab.renderOrder = 10;

  return slab;
}

export function fitGlassToModel(slab: THREE.Mesh, model: THREE.Object3D): void {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const width = Math.max(size.x, size.z) * 1.35;
  const height = size.y * 1.2;

  slab.geometry.dispose();
  slab.geometry = new THREE.BoxGeometry(width, height, GLASS_DEPTH);
  slab.position.set(center.x, center.y, center.z + size.z * 0.55 + GLASS_DEPTH);
}

export function getGlassMaterial(slab: THREE.Mesh): THREE.ShaderMaterial {
  return slab.material as THREE.ShaderMaterial;
}

export function setGlassAberration(slab: THREE.Mesh, strength: number): void {
  const mat = getGlassMaterial(slab);
  mat.uniforms.uAberration.value = strength;
}

export function setGlassCracks(slab: THREE.Mesh, intensity: number): void {
  const mat = getGlassMaterial(slab);
  mat.uniforms.uCrackIntensity.value = intensity;
}

export function updateGlassResolution(
  slab: THREE.Mesh,
  width: number,
  height: number,
): void {
  const mat = getGlassMaterial(slab);
  mat.uniforms.uResolution.value.set(width, height);
}

export function createBackgroundRenderTarget(
  width: number,
  height: number,
  pixelRatio: number,
): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(
    Math.floor(width * pixelRatio),
    Math.floor(height * pixelRatio),
    {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      colorSpace: THREE.SRGBColorSpace,
    },
  );
}

export function resizeBackgroundRenderTarget(
  target: THREE.WebGLRenderTarget,
  width: number,
  height: number,
  pixelRatio: number,
): void {
  target.setSize(
    Math.floor(width * pixelRatio),
    Math.floor(height * pixelRatio),
  );
}

/** Render scene without the glass into the background target for pane sampling. */
export function renderBackgroundPass(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  target: THREE.WebGLRenderTarget,
  glass: THREE.Mesh,
  gizmo?: THREE.Object3D,
): void {
  const gizmoWasVisible = gizmo?.visible ?? false;
  glass.visible = false;
  if (gizmo) gizmo.visible = false;
  const prevTarget = renderer.getRenderTarget();
  renderer.setRenderTarget(target);
  renderer.render(scene, camera);
  renderer.setRenderTarget(prevTarget);
  glass.visible = true;
  if (gizmo) gizmo.visible = gizmoWasVisible;

  const mat = getGlassMaterial(glass);
  mat.uniforms.tBackground.value = target.texture;
}
