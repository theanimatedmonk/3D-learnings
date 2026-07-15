// Shared GLSL chunks used across shader presets

export const VERTEX_PREAMBLE = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vViewPosition;

uniform float uTime;
uniform float uWaveAmount;
`;

export const VERTEX_MAIN_BASE = /* glsl */ `
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec3 transformed = position;
`;

export const VERTEX_DISPLACE = /* glsl */ `
  float wave = sin(position.y * 4.0 + uTime * 2.0) * uWaveAmount;
  transformed += normal * wave;
`;

export const FRAGMENT_PREAMBLE = /* glsl */ `
precision highp float;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vViewPosition;

uniform float uTime;
uniform vec2 uMouse;
uniform float uMix;
uniform float uNoiseScale;
uniform float uEffectStrength;
uniform vec3 uColorA;
uniform vec3 uColorB;
`;

export const NOISE_GLSL = /* glsl */ `
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
`;

export const VERTEX_SHADER_WRAPPER = (_body: string, displace = false) => /* glsl */ `
${VERTEX_PREAMBLE}

void main() {
  ${VERTEX_MAIN_BASE}
  ${displace ? VERTEX_DISPLACE : ''}
  vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
  vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const FRAGMENT_SHADER_WRAPPER = (body: string) => /* glsl */ `
${FRAGMENT_PREAMBLE}
${NOISE_GLSL}

void main() {
  ${body}
}
`;
