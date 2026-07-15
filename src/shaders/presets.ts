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
  | 'master'
  | 'chromatic-aberration'
  | 'fresnel-rim'
  | 'hologram'
  | 'toon'
  | 'glitch';

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
      vec3 viewDir = normalize(vViewPosition);
      float fresnel = pow(1.0 - abs(dot(normalize(vNormal), viewDir)), 2.0);
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
  {
    id: 'chromatic-aberration',
    label: 'Chromatic Aberration',
    topic: 'RGB Channel Split',
    description: 'Simulates lens color fringing — R/G/B sampled at slightly offset UVs toward edges.',
    vertexDisplace: false,
    learnFocus: ['Fragment Shader', 'UV Coordinates', 'Color Mixing'],
    fragmentBody: `
      vec2 centered = vUv - 0.5;
      float dist = length(centered);
      vec2 offset = centered * uEffectStrength * 0.06 * (0.5 + dist);
      float nR = noise((vUv + offset) * uNoiseScale + uTime * 0.1);
      float nG = noise(vUv * uNoiseScale + uTime * 0.1);
      float nB = noise((vUv - offset) * uNoiseScale + uTime * 0.1);
      vec3 color = vec3(
        mix(uColorA.r, uColorB.r, nR),
        mix(uColorA.g, uColorB.g, nG),
        mix(uColorA.b, uColorB.b, nB)
      );
      gl_FragColor = vec4(color, 1.0);
    `,
  },
  {
    id: 'fresnel-rim',
    label: 'Fresnel Rim',
    topic: 'View-Dependent Edges',
    description: 'Surfaces facing the camera are dark; grazing angles glow — classic rim light.',
    vertexDisplace: false,
    learnFocus: ['Varyings', 'Fragment Shader', 'Vertex Shader'],
    fragmentBody: `
      vec3 viewDir = normalize(vViewPosition);
      float fresnel = pow(1.0 - abs(dot(normalize(vNormal), viewDir)), 1.5 + uEffectStrength * 4.0);
      vec3 core = mix(uColorA * 0.2, uColorA, fresnel * 0.5);
      vec3 rim = uColorB * fresnel;
      vec3 color = core + rim;
      gl_FragColor = vec4(color, 1.0);
    `,
  },
  {
    id: 'hologram',
    label: 'Hologram',
    topic: 'Scanlines + Fresnel',
    description: 'Sci-fi hologram — animated scanlines multiplied with edge glow.',
    vertexDisplace: false,
    learnFocus: ['Time', 'Noise', 'Varyings'],
    fragmentBody: `
      vec3 viewDir = normalize(vViewPosition);
      float fresnel = pow(1.0 - abs(dot(normalize(vNormal), viewDir)), 2.5);
      float scan = sin(vUv.y * uNoiseScale * 50.0 - uTime * 4.0) * 0.5 + 0.5;
      scan = mix(0.4, 1.0, scan);
      float flicker = noise(vec2(uTime * 2.0, vUv.y * 5.0)) * 0.15 + 0.85;
      vec3 color = mix(uColorA, uColorB, fresnel) * scan * flicker;
      color += uColorB * fresnel * uEffectStrength * 0.5;
      gl_FragColor = vec4(color, 1.0);
    `,
  },
  {
    id: 'toon',
    label: 'Toon / Cel',
    topic: 'Stepped Lighting',
    description: 'Quantized diffuse bands — cartoon shading with discrete light steps.',
    vertexDisplace: false,
    learnFocus: ['Vertex Shader', 'Fragment Shader', 'Varyings'],
    fragmentBody: `
      vec3 lightDir = normalize(vec3(0.4, 1.0, 0.6));
      float diff = max(dot(normalize(vNormal), lightDir), 0.0);
      float steps = 2.0 + floor(uEffectStrength * 5.0);
      diff = floor(diff * steps) / steps;
      vec3 shadow = uColorA * 0.35;
      vec3 lit = mix(uColorA, uColorB, diff);
      vec3 color = mix(shadow, lit, diff + 0.1);
      gl_FragColor = vec4(color, 1.0);
    `,
  },
  {
    id: 'glitch',
    label: 'Glitch',
    topic: 'Procedural Distortion',
    description: 'Random horizontal tears shift UVs and split RGB — digital corruption look.',
    vertexDisplace: false,
    learnFocus: ['Time', 'Noise', 'UV Coordinates', 'Color Mixing'],
    fragmentBody: `
      vec2 uv = vUv;
      float row = floor(vUv.y * 20.0);
      float tear = step(1.0 - uEffectStrength * 0.35, noise(vec2(row, floor(uTime * 12.0))));
      uv.x += (noise(vec2(uTime * 3.0, row)) - 0.5) * tear * 0.15;

      vec2 centered = uv - 0.5;
      vec2 ab = centered * uEffectStrength * 0.04;
      float base = noise(uv * uNoiseScale + uTime * 0.5);
      vec3 color;
      color.r = mix(uColorA, uColorB, base + ab.x).r;
      color.g = mix(uColorA, uColorB, base).g;
      color.b = mix(uColorA, uColorB, base - ab.x).b;
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
