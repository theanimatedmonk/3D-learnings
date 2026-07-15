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
uniform vec2 uResolution;

varying vec2 vUv;
varying vec2 vScreenUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vec2 uv = vScreenUv;

  // Screen-space direction from center — fringe grows toward edges
  vec2 screenDir = uv - 0.5;
  float screenDist = length(screenDir);

  // Glass-pane edge factor — stronger aberration near pane borders
  vec2 paneDir = vUv - 0.5;
  float paneEdge = length(paneDir) * 1.6;

  vec2 offset = screenDir * uAberration * (0.0015 + screenDist * 0.014);
  offset *= 1.0 + paneEdge * 0.8;

  vec3 color;
  color.r = texture2D(tBackground, uv + offset).r;
  color.g = texture2D(tBackground, uv).g;
  color.b = texture2D(tBackground, uv - offset).b;

  // Subtle glass tint + fresnel highlights at grazing angles
  vec3 viewDir = normalize(vViewPosition);
  float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 2.8);
  color *= vec3(0.95, 0.98, 1.0);
  color = mix(color, vec3(0.88, 0.95, 1.0), fresnel * 0.45);

  gl_FragColor = vec4(color, 1.0);
}
`;

export interface ChromaticGlassUniforms {
  uAberration: number;
}

export function createChromaticGlassMaterial(
  backgroundTexture: THREE.Texture,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      tBackground: { value: backgroundTexture },
      uAberration: { value: 1.2 },
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
): void {
  glass.visible = false;
  const prevTarget = renderer.getRenderTarget();
  renderer.setRenderTarget(target);
  renderer.render(scene, camera);
  renderer.setRenderTarget(prevTarget);
  glass.visible = true;

  const mat = getGlassMaterial(glass);
  mat.uniforms.tBackground.value = target.texture;
}
