import * as THREE from 'three';
import {
  buildFragmentShader,
  buildVertexShader,
  formatShaderForDisplay,
  getShaderPreset,
  type ShaderPresetId,
} from './presets';

export interface ShaderUniforms {
  uTime: number;
  uMouse: { x: number; y: number };
  uMix: number;
  uNoiseScale: number;
  uWaveAmount: number;
  uColorA: string;
  uColorB: string;
}

const DEFAULT_UNIFORMS: ShaderUniforms = {
  uTime: 0,
  uMouse: { x: 0, y: 0 },
  uMix: 0.5,
  uNoiseScale: 4,
  uWaveAmount: 0.08,
  uColorA: '#6ee7b7',
  uColorB: '#3b82f6',
};

export class ShaderController {
  private active = false;
  private presetId: ShaderPresetId = 'uv';
  private uniforms: ShaderUniforms = { ...DEFAULT_UNIFORMS };
  private appliedMeshes = new Map<THREE.Mesh, THREE.ShaderMaterial>();

  isActive(): boolean {
    return this.active;
  }

  getPresetId(): ShaderPresetId {
    return this.presetId;
  }

  getUniforms(): Readonly<ShaderUniforms> {
    return this.uniforms;
  }

  enable(root: THREE.Object3D, preset: ShaderPresetId = 'uv'): void {
    this.active = true;
    this.presetId = preset;
    this.applyToModel(root);
  }

  disable(root: THREE.Object3D, originals: Map<THREE.Mesh, THREE.Material | THREE.Material[]>): void {
    this.active = false;
    this.disposeMaterials();
    root.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const original = originals.get(child);
        if (original) child.material = original;
      }
    });
  }

  setPreset(preset: ShaderPresetId, root: THREE.Object3D | null): void {
    this.presetId = preset;
    if (this.active && root) {
      this.applyToModel(root);
    }
  }

  setUniform<K extends keyof ShaderUniforms>(key: K, value: ShaderUniforms[K]): void {
    this.uniforms[key] = value;
    this.syncUniformsToMaterials();
  }

  update(time: number, mouse: { x: number; y: number }): void {
    if (!this.active) return;
    this.uniforms.uTime = time;
    this.uniforms.uMouse = mouse;
    for (const mat of this.appliedMeshes.values()) {
      mat.uniforms.uTime.value = time;
      mat.uniforms.uMouse.value.set(mouse.x, mouse.y);
    }
  }

  getShaderSource(): string {
    const preset = getShaderPreset(this.presetId);
    return formatShaderForDisplay(
      buildVertexShader(preset),
      buildFragmentShader(preset),
    );
  }

  logShaderSource(): void {
    const preset = getShaderPreset(this.presetId);
    console.group(`🎨 Shader: ${preset.label} — ${preset.topic}`);
    console.log('%cVertex Shader', 'color:#6ee7b7;font-weight:bold');
    console.log(buildVertexShader(preset));
    console.log('%cFragment Shader', 'color:#3b82f6;font-weight:bold');
    console.log(buildFragmentShader(preset));
    console.log('%cUniforms (JS → GPU)', 'color:#fbbf24;font-weight:bold');
    console.table(this.uniforms);
    console.groupEnd();
  }

  private applyToModel(root: THREE.Object3D): void {
    this.disposeMaterials();
    const preset = getShaderPreset(this.presetId);
    const vertexShader = buildVertexShader(preset);
    const fragmentShader = buildFragmentShader(preset);

    root.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      const material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: this.uniforms.uTime },
          uMouse: { value: new THREE.Vector2(this.uniforms.uMouse.x, this.uniforms.uMouse.y) },
          uMix: { value: this.uniforms.uMix },
          uNoiseScale: { value: this.uniforms.uNoiseScale },
          uWaveAmount: { value: this.uniforms.uWaveAmount },
          uColorA: { value: new THREE.Color(this.uniforms.uColorA) },
          uColorB: { value: new THREE.Color(this.uniforms.uColorB) },
        },
        vertexShader,
        fragmentShader,
      });

      child.material = material;
      this.appliedMeshes.set(child, material);
    });
  }

  private syncUniformsToMaterials(): void {
    for (const mat of this.appliedMeshes.values()) {
      mat.uniforms.uMix.value = this.uniforms.uMix;
      mat.uniforms.uNoiseScale.value = this.uniforms.uNoiseScale;
      mat.uniforms.uWaveAmount.value = this.uniforms.uWaveAmount;
      mat.uniforms.uColorA.value.set(this.uniforms.uColorA);
      mat.uniforms.uColorB.value.set(this.uniforms.uColorB);
    }
  }

  private disposeMaterials(): void {
    for (const mat of this.appliedMeshes.values()) {
      mat.dispose();
    }
    this.appliedMeshes.clear();
  }
}
