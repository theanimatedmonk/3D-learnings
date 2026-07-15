import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { MaterialPreset, LightPreset } from './milestones/config';
import { centerAndScaleModel } from './utils/sceneGraph';
import { ShaderController } from './shaders/ShaderController';
import type { ShaderPresetId } from './shaders/presets';
import { createGlassSlab, fitGlassToModel, createBackgroundRenderTarget, resizeBackgroundRenderTarget, renderBackgroundPass, updateGlassResolution, setGlassAberration, setGlassCracks } from './scene/glassSlab';

export interface PlaygroundCallbacks {
  onModelLoaded: (animations: string[]) => void;
  onSelect: (name: string | null) => void;
  onStatus: (message: string) => void;
  onGlassPositionChange?: (position: { x: number; y: number; z: number }) => void;
}

export class Playground {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly clock = new THREE.Clock();
  readonly controls: OrbitControls;
  readonly modelGroup = new THREE.Group();
  glassSlab!: THREE.Mesh;
  readonly lights = {
    ambient: new THREE.AmbientLight(0xffffff, 0),
    directional: new THREE.DirectionalLight(0xffffff, 0),
    point: new THREE.PointLight(0xffffff, 0, 20),
    hemisphere: new THREE.HemisphereLight(0xffffff, 0x444444, 0),
  };

  private readonly canvas: HTMLCanvasElement;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly loader = new GLTFLoader();
  private readonly callbacks: PlaygroundCallbacks;

  private modelRoot: THREE.Object3D | null = null;
  private baseScale = 1;
  private mixer: THREE.AnimationMixer | null = null;
  private animationClips: THREE.AnimationClip[] = [];
  private activeAction: THREE.AnimationAction | null = null;
  private originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  private highlightMaterial = new THREE.MeshStandardMaterial({
    color: 0x6ee7b7,
    emissive: 0x1a4d3a,
    metalness: 0.2,
    roughness: 0.4,
  });
  private clickMaterial = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0x4a3200,
    metalness: 0.5,
    roughness: 0.3,
  });

  private animationEnabled = {
    rotate: false,
    float: false,
    scale: false,
    bob: false,
    breathe: false,
  };
  private animationSpeed = 1;
  private cameraAnimating = false;
  private cameraAnimStart = 0;
  private cameraFrom = new THREE.Vector3();
  private cameraTo = new THREE.Vector3();
  private orbitEnabled = true;
  private interactionEnabled = false;
  private frameCount = 0;
  private lastFpsTime = 0;
  private currentMilestone = 1;
  private backgroundTarget!: THREE.WebGLRenderTarget;
  private glassTransform!: TransformControls;
  private glassGizmo!: THREE.Object3D;
  private glassDragEnabled = true;
  readonly shaderController = new ShaderController();
  fps = 0;

  constructor(canvas: HTMLCanvasElement, callbacks: PlaygroundCallbacks) {
    this.canvas = canvas;
    this.callbacks = callbacks;

    this.scene.background = new THREE.Color(0x0f1117);
    this.scene.fog = new THREE.Fog(0x0f1117, 8, 30);

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    this.camera.position.set(0, 1.5, 5);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0.8, 0);

    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    this.backgroundTarget = createBackgroundRenderTarget(w, h, this.renderer.getPixelRatio());

    this.glassSlab = createGlassSlab(this.backgroundTarget.texture);

    this.glassTransform = new TransformControls(this.camera, canvas);
    this.glassTransform.setMode('translate');
    this.glassTransform.setSize(0.75);
    this.glassTransform.attach(this.glassSlab);
    this.glassGizmo = this.glassTransform.getHelper();
    this.glassGizmo.visible = false;
    this.glassTransform.enabled = false;
    this.glassTransform.addEventListener('dragging-changed', (event) => {
      this.controls.enabled = this.orbitEnabled && !(event.value as boolean);
    });
    this.glassTransform.addEventListener('change', () => {
      this.emitGlassPosition();
    });
    this.scene.add(this.glassGizmo);

    this.lights.directional.position.set(3, 6, 4);
    this.lights.directional.castShadow = true;
    this.lights.point.position.set(-2, 3, 2);

    this.scene.add(this.modelGroup);
    this.scene.add(this.glassSlab);
    this.glassSlab.visible = false;
    this.scene.add(this.lights.ambient);
    this.scene.add(this.lights.directional);
    this.scene.add(this.lights.point);
    this.scene.add(this.lights.hemisphere);

    const grid = new THREE.GridHelper(10, 10, 0x2a2f3a, 0x1a1e28);
    grid.position.y = -0.01;
    this.scene.add(grid);

    this.setupEvents();
    this.handleResize();
    this.loadModel('/models/dinosaur.glb');
  }

  private setupEvents(): void {
    window.addEventListener('resize', () => this.handleResize());
    this.canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.canvas.addEventListener('click', (e) => this.onClick(e));
  }

  handleResize(): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    resizeBackgroundRenderTarget(
      this.backgroundTarget,
      width,
      height,
      this.renderer.getPixelRatio(),
    );
    updateGlassResolution(this.glassSlab, width, height);
  }

  async loadModel(url: string): Promise<void> {
    this.callbacks.onStatus('Loading model…');
    this.clearModel();

    try {
      const gltf = await this.loader.loadAsync(url);
      this.modelRoot = gltf.scene;
      this.modelGroup.add(this.modelRoot);

      centerAndScaleModel(this.modelRoot, 2.5);
      this.baseScale = this.modelRoot.scale.x;
      fitGlassToModel(this.glassSlab, this.modelRoot);
      this.emitGlassPosition();

      this.modelRoot.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          this.originalMaterials.set(child, child.material);
        }
      });

      this.animationClips = gltf.animations;
      this.mixer =
        gltf.animations.length > 0 ? new THREE.AnimationMixer(this.modelRoot) : null;
      const clipNames = gltf.animations.map((clip) => clip.name || 'Unnamed');
      this.callbacks.onModelLoaded(clipNames);
      this.callbacks.onStatus(
        clipNames.length > 0
          ? `Loaded model with ${clipNames.length} animation(s).`
          : 'Model loaded. No embedded animations — try an animated GLB in Milestone 8.',
      );

      if (this.currentMilestone === 10) {
        this.shaderController.enable(this.modelRoot, this.shaderController.getPresetId());
      }
    } catch (error) {
      console.error(error);
      this.callbacks.onStatus('Failed to load model. Check the path or upload a GLB.');
    }
  }

  async loadModelFromFile(file: File): Promise<void> {
    const url = URL.createObjectURL(file);
    await this.loadModel(url);
    URL.revokeObjectURL(url);
  }

  private clearModel(): void {
    if (this.activeAction) {
      this.activeAction.stop();
      this.activeAction = null;
    }
    this.mixer = null;
    this.animationClips = [];
    this.originalMaterials.clear();
    this.modelGroup.clear();
    this.modelRoot = null;
    this.callbacks.onSelect(null);
  }

  setMilestone(milestone: number): void {
    const wasShaders = this.currentMilestone === 10;
    this.currentMilestone = milestone;

    this.interactionEnabled = milestone >= 7 && milestone !== 10;
    this.orbitEnabled = milestone >= 3;
    this.controls.enabled = this.orbitEnabled;

    if (wasShaders && milestone !== 10 && this.modelRoot) {
      this.shaderController.disable(this.modelRoot, this.originalMaterials);
    }

    if (milestone === 1) {
      this.modelGroup.visible = false;
      this.glassSlab.visible = false;
      this.updateGlassGizmoVisibility();
      this.setAllLightsIntensity(0);
    } else {
      this.modelGroup.visible = true;
      this.glassSlab.visible = true;
      this.updateGlassGizmoVisibility();

      if (milestone === 10) {
        this.setAllLightsIntensity(0);
        this.scene.background = new THREE.Color(0x080a10);
        this.scene.fog = new THREE.Fog(0x080a10, 10, 35);
        if (this.modelRoot) {
          this.shaderController.enable(this.modelRoot, 'uv');
        }
      } else if (milestone >= 4) {
        if (this.shaderController.isActive() && this.modelRoot) {
          this.shaderController.disable(this.modelRoot, this.originalMaterials);
        }
        this.applyLightPreset('daylight');
      } else {
        if (this.shaderController.isActive() && this.modelRoot) {
          this.shaderController.disable(this.modelRoot, this.originalMaterials);
        }
        this.lights.ambient.intensity = 0.6;
        this.lights.ambient.visible = true;
        this.lights.directional.intensity = 0.8;
        this.lights.directional.visible = true;
        this.lights.directional.position.set(3, 6, 4);
        this.lights.point.intensity = 0;
        this.lights.hemisphere.intensity = 0;
        this.scene.background = new THREE.Color(0x0f1117);
        this.scene.fog = new THREE.Fog(0x0f1117, 8, 30);
      }
    }
  }

  setCameraFov(fov: number): void {
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
  }

  setCameraPosition(x: number, y: number, z: number): void {
    this.camera.position.set(x, y, z);
    this.controls.update();
  }

  focusCamera(): void {
    this.controls.target.set(0, 0.8, 0);
    this.animateCameraTo(new THREE.Vector3(0, 1.5, 4));
  }

  animateCameraTo(targetPosition: THREE.Vector3, duration = 1.2): void {
    this.cameraFrom.copy(this.camera.position);
    this.cameraTo.copy(targetPosition);
    this.cameraAnimStart = performance.now();
    this.cameraAnimating = true;
    this._cameraAnimDuration = duration;
  }

  private _cameraAnimDuration = 1.2;

  setOrbitEnabled(enabled: boolean): void {
    this.orbitEnabled = enabled;
    this.controls.enabled = enabled;
  }

  setLightEnabled(
    type: 'ambient' | 'directional' | 'point' | 'hemisphere',
    enabled: boolean,
  ): void {
    const light = this.lights[type];
    light.visible = enabled;
    if (!enabled) {
      if (type === 'ambient' || type === 'hemisphere') light.intensity = 0;
      else light.intensity = 0;
    }
  }

  setLightIntensity(
    type: 'ambient' | 'directional' | 'point' | 'hemisphere',
    intensity: number,
  ): void {
    this.lights[type].intensity = intensity;
    this.lights[type].visible = intensity > 0;
  }

  setLightColor(
    type: 'directional' | 'point' | 'hemisphere',
    color: string,
    groundColor?: string,
  ): void {
    if (type === 'hemisphere') {
      this.lights.hemisphere.color.set(color);
      if (groundColor) this.lights.hemisphere.groundColor.set(groundColor);
    } else {
      this.lights[type].color.set(color);
    }
  }

  moveLight(
    type: 'directional' | 'point',
    x: number,
    y: number,
    z: number,
  ): void {
    this.lights[type].position.set(x, y, z);
  }

  applyLightPreset(preset: LightPreset): void {
    switch (preset) {
      case 'daylight':
        this.lights.ambient.intensity = 0.35;
        this.lights.ambient.color.set(0xffffff);
        this.lights.directional.intensity = 1.2;
        this.lights.directional.color.set(0xfff4e6);
        this.lights.directional.position.set(4, 8, 3);
        this.lights.point.intensity = 0;
        this.lights.hemisphere.intensity = 0.25;
        this.lights.hemisphere.color.set(0x87ceeb);
        this.lights.hemisphere.groundColor.set(0x3a3a2a);
        this.scene.background = new THREE.Color(0x87a8c8);
        this.scene.fog = new THREE.Fog(0x87a8c8, 10, 40);
        break;
      case 'sunset':
        this.lights.ambient.intensity = 0.2;
        this.lights.ambient.color.set(0xffaa66);
        this.lights.directional.intensity = 1.5;
        this.lights.directional.color.set(0xff6622);
        this.lights.directional.position.set(-6, 2, 4);
        this.lights.point.intensity = 0.3;
        this.lights.point.color.set(0xff4400);
        this.lights.point.position.set(2, 1, -2);
        this.lights.hemisphere.intensity = 0.15;
        this.lights.hemisphere.color.set(0xff8844);
        this.lights.hemisphere.groundColor.set(0x331100);
        this.scene.background = new THREE.Color(0x2a1520);
        this.scene.fog = new THREE.Fog(0x2a1520, 8, 30);
        break;
      case 'museum':
        this.lights.ambient.intensity = 0.5;
        this.lights.ambient.color.set(0xf5f0e8);
        this.lights.directional.intensity = 0.4;
        this.lights.directional.color.set(0xffffff);
        this.lights.directional.position.set(2, 5, 1);
        this.lights.point.intensity = 1.8;
        this.lights.point.color.set(0xfff8e7);
        this.lights.point.position.set(0, 4, 2);
        this.lights.hemisphere.intensity = 0;
        this.scene.background = new THREE.Color(0x1a1814);
        this.scene.fog = new THREE.Fog(0x1a1814, 12, 35);
        break;
      case 'horror':
        this.lights.ambient.intensity = 0.05;
        this.lights.ambient.color.set(0x113322);
        this.lights.directional.intensity = 0.15;
        this.lights.directional.color.set(0x44ff88);
        this.lights.directional.position.set(-1, 3, -4);
        this.lights.point.intensity = 0.8;
        this.lights.point.color.set(0x22ff66);
        this.lights.point.position.set(0, 0.5, 3);
        this.lights.hemisphere.intensity = 0.05;
        this.lights.hemisphere.color.set(0x001100);
        this.lights.hemisphere.groundColor.set(0x000000);
        this.scene.background = new THREE.Color(0x050a08);
        this.scene.fog = new THREE.Fog(0x050a08, 4, 18);
        break;
      case 'custom':
        break;
    }

    for (const light of Object.values(this.lights)) {
      light.visible = light.intensity > 0;
    }
  }

  private setAllLightsIntensity(value: number): void {
    for (const light of Object.values(this.lights)) {
      light.intensity = value;
      light.visible = value > 0;
    }
  }

  setModelTransform(
    position: [number, number, number],
    rotation: [number, number, number],
    scale: number,
  ): void {
    if (!this.modelRoot) return;
    this.modelRoot.position.set(...position);
    this.modelRoot.rotation.set(
      THREE.MathUtils.degToRad(rotation[0]),
      THREE.MathUtils.degToRad(rotation[1]),
      THREE.MathUtils.degToRad(rotation[2]),
    );
    this.modelRoot.scale.setScalar(this.baseScale * scale);
  }

  applyMaterialPreset(preset: MaterialPreset): void {
    if (!this.modelRoot) return;

    if (preset === 'original') {
      this.modelRoot.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const original = this.originalMaterials.get(child);
          if (original) child.material = original;
        }
      });
      return;
    }

    this.modelRoot.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const old = child.material;
      const oldMat = Array.isArray(old) ? old[0] : old;
      const color =
        oldMat && 'color' in oldMat && oldMat.color instanceof THREE.Color
          ? oldMat.color.clone()
          : new THREE.Color(0x88aa66);

      let newMat: THREE.Material;

      switch (preset) {
        case 'metallic':
          newMat = new THREE.MeshStandardMaterial({
            color: 0xc0c0c0,
            metalness: 0.95,
            roughness: 0.15,
          });
          break;
        case 'plastic':
          newMat = new THREE.MeshStandardMaterial({
            color: 0x44aaee,
            metalness: 0.0,
            roughness: 0.45,
          });
          break;
        case 'glass':
          newMat = new THREE.MeshPhysicalMaterial({
            color: 0xaaddff,
            metalness: 0.0,
            roughness: 0.05,
            transmission: 0.85,
            thickness: 0.5,
            transparent: true,
          });
          break;
        case 'clay':
          newMat = new THREE.MeshStandardMaterial({
            color: 0xb8956a,
            metalness: 0.0,
            roughness: 0.95,
          });
          break;
        case 'wireframe':
          newMat = new THREE.MeshStandardMaterial({
            color: color,
            wireframe: true,
            metalness: 0.1,
            roughness: 0.8,
          });
          break;
        default:
          return;
      }

      child.material = newMat;
    });
  }

  setMaterialParams(metalness: number, roughness: number, color: string, wireframe: boolean): void {
    if (!this.modelRoot) return;
    this.modelRoot.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        metalness,
        roughness,
        wireframe,
      });
      child.material = mat;
    });
  }

  setAnimationFlags(flags: Partial<Record<keyof typeof this.animationEnabled, boolean>>): void {
    for (const [key, value] of Object.entries(flags)) {
      if (value !== undefined) {
        this.animationEnabled[key as keyof typeof this.animationEnabled] = value;
      }
    }
  }

  setAnimationSpeed(speed: number): void {
    this.animationSpeed = speed;
  }

  playAnimation(name: string, loop = true): void {
    if (!this.mixer || !this.modelRoot) {
      this.callbacks.onStatus('No animations available on this model.');
      return;
    }

    const clip = this.animationClips.find((c) => c.name === name);
    if (!clip) {
      this.callbacks.onStatus(`Animation "${name}" not found.`);
      return;
    }

    if (this.activeAction) this.activeAction.stop();
    this.activeAction = this.mixer.clipAction(clip, this.modelRoot);
    this.activeAction.reset();
    this.activeAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    this.activeAction.clampWhenFinished = !loop;
    this.activeAction.play();
    this.callbacks.onStatus(`Playing: ${name}`);
  }

  pauseAnimation(): void {
    if (this.activeAction) {
      this.activeAction.paused = true;
      this.callbacks.onStatus('Animation paused.');
    }
  }

  resumeAnimation(): void {
    if (this.activeAction) {
      this.activeAction.paused = false;
      this.callbacks.onStatus('Animation resumed.');
    }
  }

  setAnimationTimeScale(scale: number): void {
    if (this.activeAction) {
      this.activeAction.setEffectiveTimeScale(scale);
    }
    if (this.mixer) {
      this.mixer.timeScale = scale;
    }
  }

  private onPointerMove(event: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onClick(event: PointerEvent): void {
    if (!this.interactionEnabled || !this.modelRoot) return;

    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObject(this.modelRoot, true);

    if (hits.length > 0) {
      const mesh = hits[0].object;
      const name = mesh.name || mesh.type;
      this.callbacks.onSelect(name);
      this.highlightMesh(mesh);
      if (mesh instanceof THREE.Mesh) {
        mesh.material = this.clickMaterial.clone();
      }
      this.callbacks.onStatus(`Clicked: ${name}`);
    } else {
      this.callbacks.onSelect(null);
      this.restoreMaterials();
      this.callbacks.onStatus('Clicked empty space.');
    }
  }

  private highlightMesh(object: THREE.Object3D): void {
    this.restoreMaterials();
    if (object instanceof THREE.Mesh) {
      object.material = this.highlightMaterial.clone();
    }
  }

  private restoreMaterials(): void {
    if (!this.modelRoot) return;
    this.modelRoot.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const original = this.originalMaterials.get(child);
        if (original) child.material = original;
      }
    });
  }

  getGlassPosition(): { x: number; y: number; z: number } {
    return {
      x: this.glassSlab.position.x,
      y: this.glassSlab.position.y,
      z: this.glassSlab.position.z,
    };
  }

  setGlassPosition(x: number, y: number, z: number): void {
    this.glassSlab.position.set(x, y, z);
    this.emitGlassPosition();
  }

  resetGlassPosition(): void {
    if (!this.modelRoot) return;
    fitGlassToModel(this.glassSlab, this.modelRoot);
    this.emitGlassPosition();
    this.callbacks.onStatus('Glass pane reset to default position.');
  }

  setGlassAberrationStrength(strength: number): void {
    setGlassAberration(this.glassSlab, strength);
  }

  setGlassCrackIntensity(intensity: number): void {
    setGlassCracks(this.glassSlab, intensity);
  }

  setGlassDragEnabled(enabled: boolean): void {
    this.glassDragEnabled = enabled;
    this.updateGlassGizmoVisibility();
    this.callbacks.onStatus(enabled ? 'Glass drag gizmo enabled.' : 'Glass drag gizmo hidden.');
  }

  isGlassDragEnabled(): boolean {
    return this.glassDragEnabled;
  }

  private emitGlassPosition(): void {
    this.callbacks.onGlassPositionChange?.(this.getGlassPosition());
  }

  private updateGlassGizmoVisibility(): void {
    const show = this.glassDragEnabled && this.glassSlab.visible;
    this.glassGizmo.visible = show;
    this.glassTransform.enabled = show;
  }

  getModelRoot(): THREE.Object3D | null {
    return this.modelRoot;
  }

  setShaderPreset(preset: ShaderPresetId): void {
    this.shaderController.setPreset(preset, this.modelRoot);
    this.callbacks.onStatus(`Shader preset: ${preset}`);
  }

  setShaderUniform(
    key: 'uMix' | 'uNoiseScale' | 'uWaveAmount' | 'uEffectStrength' | 'uColorA' | 'uColorB',
    value: number | string,
  ): void {
    this.shaderController.setUniform(key, value as never);
  }

  logShaderSource(): void {
    this.shaderController.logShaderSource();
    this.callbacks.onStatus('Shader GLSL logged to console.');
  }

  getShaderSource(): string {
    return this.shaderController.getShaderSource();
  }

  tick(): void {
    const delta = this.clock.getDelta();
    const elapsed = this.clock.elapsedTime * this.animationSpeed;

    this.controls.enabled = this.orbitEnabled;
    if (this.orbitEnabled) this.controls.update();

    if (this.cameraAnimating) {
      const t = Math.min(
        (performance.now() - this.cameraAnimStart) / (this._cameraAnimDuration * 1000),
        1,
      );
      const eased = 1 - Math.pow(1 - t, 3);
      this.camera.position.lerpVectors(this.cameraFrom, this.cameraTo, eased);
      if (t >= 1) this.cameraAnimating = false;
    }

    if (this.modelRoot) {
      const baseY = this.modelRoot.position.y;
      if (this.animationEnabled.rotate) {
        this.modelRoot.rotation.y += delta * 0.8 * this.animationSpeed;
      }
      if (this.animationEnabled.float) {
        this.modelRoot.position.y = baseY + Math.sin(elapsed) * 0.15;
      }
      if (this.animationEnabled.bob) {
        this.modelRoot.position.y = baseY + Math.abs(Math.sin(elapsed * 2)) * 0.2;
      }
      if (this.animationEnabled.scale) {
        const s = 1 + Math.sin(elapsed * 1.5) * 0.1;
        this.modelRoot.scale.setScalar(this.baseScale * s);
      }
      if (this.animationEnabled.breathe) {
        const breath = 1 + Math.sin(elapsed * 2) * 0.04;
        this.modelRoot.scale.set(
          this.baseScale * breath,
          this.baseScale * breath * 1.05,
          this.baseScale * breath,
        );
      }
    }

    this.mixer?.update(delta);

    if (this.shaderController.isActive()) {
      this.shaderController.update(this.clock.elapsedTime, {
        x: this.pointer.x,
        y: this.pointer.y,
      });
    }

    if (this.glassSlab.visible) {
      renderBackgroundPass(
        this.renderer,
        this.scene,
        this.camera,
        this.backgroundTarget,
        this.glassSlab,
        this.glassGizmo,
      );
    }

    this.renderer.render(this.scene, this.camera);
    this.updateFps();
  }

  private updateFps(): void {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsTime = now;
    }
  }
}
