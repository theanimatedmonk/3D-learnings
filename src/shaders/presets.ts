import {
  FRAGMENT_SHADER_WRAPPER,
  VERTEX_SHADER_WRAPPER,
} from './chunks';

export type ShaderPresetId =
  | 'solid'
  | 'uv'
  | 'color-mix'
  | 'time'
  | 'mouse'
  | 'noise'
  | 'vertex-wave'
  | 'master';

export interface ShaderPreset {
  id: ShaderPresetId;
  label: string;
  topic: string;
  description: string;
  vertexDisplace: boolean;
  fragmentBody: string;
  learnFocus: string[];
}

export const SHADER_PRESETS: ShaderPreset[] = [
  {
    id: 'solid',
    label: 'Solid Color',
    topic: 'Vertex + Fragment basics',
    description: 'Minimal shader — vertex positions the mesh, fragment paints every pixel.',
    vertexDisplace: false,
    learnFocus: ['Vertex Shader', 'Fragment Shader'],
    fragmentBody: `
      vec3 color = uColorA;
      gl_FragColor = vec4(color, 1.0);
    `,
  },
  {
    id: 'uv',
    label: 'UV Map',
    topic: 'UV Coordinates',
    description: 'UVs map 2D texture space onto 3D geometry. Here R = U, G = V.',
    vertexDisplace: false,
    learnFocus: ['UV Coordinates', 'Varyings'],
    fragmentBody: `
      // vUv is a varying — computed per-vertex, interpolated per-pixel
      vec3 color = vec3(vUv.x, vUv.y, 0.2);
      gl_FragColor = vec4(color, 1.0);
    `,
  },
  {
    id: 'color-mix',
    label: 'Color Mix',
    topic: 'Color Mixing',
    description: 'mix() blends two colors. uMix uniform controls the blend from JS.',
    vertexDisplace: false,
    learnFocus: ['Color Mixing', 'Uniforms', 'UV Coordinates'],
    fragmentBody: `
      float t = mix(vUv.x, uMix, 0.5);
      vec3 color = mix(uColorA, uColorB, t);
      gl_FragColor = vec4(color, 1.0);
    `,
  },
  {
    id: 'time',
    label: 'Time Pulse',
    topic: 'Time uniform',
    description: 'uTime updates every frame — drives animated color waves on the GPU.',
    vertexDisplace: false,
    learnFocus: ['Time', 'Uniforms', 'Fragment Shader'],
    fragmentBody: `
      float pulse = sin(uTime * 2.0 + vUv.y * 6.0) * 0.5 + 0.5;
      vec3 color = mix(uColorA, uColorB, pulse);
      gl_FragColor = vec4(color, 1.0);
    `,
  },
  {
    id: 'mouse',
    label: 'Mouse Glow',
    topic: 'Mouse Position',
    description: 'uMouse uniform tracks the cursor. Distance in UV space creates a glow.',
    vertexDisplace: false,
    learnFocus: ['Mouse Position', 'Uniforms', 'Varyings'],
    fragmentBody: `
      float dist = distance(vUv, uMouse * 0.5 + 0.5);
      float glow = smoothstep(0.35, 0.0, dist);
      vec3 base = mix(uColorA, uColorB, vUv.y);
      vec3 color = base + vec3(0.2, 0.9, 0.6) * glow;
      gl_FragColor = vec4(color, 1.0);
    `,
  },
  {
    id: 'noise',
    label: 'Noise',
    topic: 'Procedural Noise',
    description: 'Noise function generates organic patterns — no texture image needed.',
    vertexDisplace: false,
    learnFocus: ['Noise', 'UV Coordinates', 'Fragment Shader'],
    fragmentBody: `
      float n = noise(vUv * uNoiseScale + uTime * 0.15);
      vec3 color = mix(uColorA, uColorB, n);
      gl_FragColor = vec4(color, 1.0);
    `,
  },
  {
    id: 'vertex-wave',
    label: 'Vertex Wave',
    topic: 'Vertex Shader',
    description: 'The vertex shader displaces vertices along normals — mesh ripples.',
    vertexDisplace: true,
    learnFocus: ['Vertex Shader', 'Time', 'Uniforms'],
    fragmentBody: `
      float fresnel = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 2.0);
      vec3 color = mix(uColorA, uColorB, fresnel);
      gl_FragColor = vec4(color, 1.0);
    `,
  },
  {
    id: 'master',
    label: 'All Combined',
    topic: 'GPU-powered visuals',
    description: 'Vertex displacement + noise + mouse glow + color mix — full GPU pipeline.',
    vertexDisplace: true,
    learnFocus: [
      'Vertex Shader',
      'Fragment Shader',
      'Uniforms',
      'Varyings',
      'Time',
      'Mouse Position',
      'Noise',
      'UV Coordinates',
      'Color Mixing',
    ],
    fragmentBody: `
      float n = noise(vUv * uNoiseScale + uTime * 0.2);
      float dist = distance(vUv, uMouse * 0.5 + 0.5);
      float glow = smoothstep(0.4, 0.0, dist);
      float pulse = sin(uTime + vUv.x * 8.0) * 0.5 + 0.5;
      vec3 base = mix(uColorA, uColorB, mix(n, pulse, uMix));
      vec3 color = base + vec3(0.15, 0.85, 0.55) * glow;
      gl_FragColor = vec4(color, 1.0);
    `,
  },
];

export function getShaderPreset(id: ShaderPresetId): ShaderPreset {
  return SHADER_PRESETS.find((p) => p.id === id) ?? SHADER_PRESETS[0];
}

export function buildVertexShader(preset: ShaderPreset): string {
  return VERTEX_SHADER_WRAPPER('', preset.vertexDisplace);
}

export function buildFragmentShader(preset: ShaderPreset): string {
  return FRAGMENT_SHADER_WRAPPER(preset.fragmentBody);
}

export function formatShaderForDisplay(vertex: string, fragment: string): string {
  return `// ─── VERTEX SHADER ───\n${vertex}\n\n// ─── FRAGMENT SHADER ───\n${fragment}`;
}
