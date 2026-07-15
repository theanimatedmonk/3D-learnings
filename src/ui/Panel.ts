import * as THREE from 'three';
import type { Playground } from '../Playground';
import {
  MILESTONES,
  getMilestone,
  type LightPreset,
  type MaterialPreset,
  type PlaygroundState,
} from '../milestones/config';
import { inspectMaterials, inspectMeshes, printSceneGraph } from '../utils/sceneGraph';
import { SHADER_PRESETS } from '../shaders/presets';

type PanelHandlers = {
  onMilestoneChange: (id: number) => void;
};

function rangeControl(
  label: string,
  min: number,
  max: number,
  step: number,
  value: number,
  onChange: (v: number) => void,
): HTMLElement {
  const wrap = document.createElement('label');
  wrap.className = 'control';
  const valueEl = document.createElement('em');
  valueEl.textContent = String(value);
  const title = document.createElement('span');
  title.textContent = label;
  title.appendChild(valueEl);
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.addEventListener('input', () => {
    const v = Number(input.value);
    valueEl.textContent = String(v);
    onChange(v);
  });
  wrap.append(title, input);
  return wrap;
}

function button(label: string, onClick: () => void, className = 'action'): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = className;
  btn.type = 'button';
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  return btn;
}

function section(title: string, children: HTMLElement[]): HTMLElement {
  const el = document.createElement('section');
  el.className = 'section';
  const h2 = document.createElement('h2');
  h2.textContent = title;
  el.appendChild(h2);
  for (const child of children) el.appendChild(child);
  return el;
}

export class Panel {
  private readonly root: HTMLElement;
  private readonly playground: Playground;
  private readonly handlers: PanelHandlers;
  private state: PlaygroundState;
  private controlsEl: HTMLElement;
  private statusEl: HTMLElement;
  private learnEl: HTMLElement;

  constructor(
    root: HTMLElement,
    playground: Playground,
    handlers: PanelHandlers,
    initialState: PlaygroundState,
  ) {
    this.root = root;
    this.playground = playground;
    this.handlers = handlers;
    this.state = { ...initialState };

    this.root.innerHTML = `
      <div class="panel-header">
        <h1>Three.js Dinosaur Playground</h1>
        <p>Learn every important Three.js concept — one milestone at a time.</p>
      </div>
      <nav class="milestone-nav" id="milestone-nav"></nav>
      <div id="learn"></div>
      <div id="controls" class="control-group"></div>
      <div id="status" class="status"></div>
    `;

    this.learnEl = this.root.querySelector('#learn')!;
    this.controlsEl = this.root.querySelector('#controls')!;
    this.statusEl = this.root.querySelector('#status')!;
    this.buildNav();
    this.render();
  }

  updateState(partial: Partial<PlaygroundState>): void {
    this.state = { ...this.state, ...partial };
    this.renderStatus();
    if (partial.milestone !== undefined || partial.animations !== undefined) {
      this.render();
    }
  }

  setStatus(message: string): void {
    this.state = { ...this.state };
    this.statusEl.innerHTML = `<strong>Status:</strong> ${message}`;
  }

  private buildNav(): void {
    const nav = this.root.querySelector('#milestone-nav')!;
    for (const m of MILESTONES) {
      const btn = document.createElement('button');
      btn.className = 'milestone-btn';
      btn.textContent = String(m.id);
      btn.title = m.title;
      btn.addEventListener('click', () => this.handlers.onMilestoneChange(m.id));
      nav.appendChild(btn);
    }
  }

  private render(): void {
    const m = getMilestone(this.state.milestone);
    document.querySelectorAll('.milestone-btn').forEach((btn, i) => {
      btn.classList.toggle('active', MILESTONES[i].id === m.id);
    });

    this.learnEl.innerHTML = '';
    this.learnEl.appendChild(this.renderLearn(m));
    this.controlsEl.innerHTML = '';
    this.controlsEl.appendChild(this.renderControls(m.id));
    this.renderStatus();
  }

  private renderLearn(m: (typeof MILESTONES)[0]): HTMLElement {
    const wrap = document.createElement('div');

    wrap.appendChild(
      section('Learn', [
        (() => {
          const ul = document.createElement('ul');
          for (const item of m.learn) {
            const li = document.createElement('li');
            li.textContent = item;
            ul.appendChild(li);
          }
          return ul;
        })(),
      ]),
    );

    wrap.appendChild(
      section('Tasks', [
        (() => {
          const ul = document.createElement('ul');
          for (const item of m.tasks) {
            const li = document.createElement('li');
            li.textContent = item;
            ul.appendChild(li);
          }
          return ul;
        })(),
      ]),
    );

    if (m.experiment) {
      wrap.appendChild(
        section('Experiment', [
          (() => {
            const ul = document.createElement('ul');
            for (const item of m.experiment!) {
              const li = document.createElement('li');
              li.textContent = item;
              ul.appendChild(li);
            }
            return ul;
          })(),
        ]),
      );
    }

    const success = document.createElement('p');
    success.className = 'hint';
    success.textContent = `✓ Success: ${m.success}`;
    wrap.appendChild(success);

    return wrap;
  }

  private renderStatus(): void {
    const { fps, mouse, selectedMesh, animations, modelLoaded } = this.state;
    const parts = [
      `FPS: ${fps}`,
      `Mouse NDC: (${mouse.x.toFixed(2)}, ${mouse.y.toFixed(2)})`,
      modelLoaded ? 'Model: loaded' : 'Model: not loaded',
    ];
    if (selectedMesh) parts.push(`Selected: ${selectedMesh}`);
    if (animations.length) parts.push(`Clips: ${animations.join(', ')}`);
    this.statusEl.innerHTML = `<strong>Live:</strong> ${parts.join(' · ')}`;
  }

  private renderControls(id: number): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'control-group';

    switch (id) {
      case 1:
        wrap.append(
          button('Log Scene to Console', () => console.log(this.playground.scene)),
          button('Log Camera to Console', () => console.log(this.playground.camera)),
          button('Log Renderer Info', () =>
            console.log(this.playground.renderer.info),
          ),
        );
        break;

      case 2: {
        const transform = { pos: [0, 0, 0] as [number, number, number], rot: 0, scale: 1 };
        wrap.append(
          rangeControl('Position X', -3, 3, 0.1, 0, (v) => {
            transform.pos[0] = v;
            this.playground.setModelTransform(transform.pos, [0, transform.rot, 0], transform.scale);
          }),
          rangeControl('Rotation Y (deg)', 0, 360, 1, 0, (v) => {
            transform.rot = v;
            this.playground.setModelTransform(transform.pos, [0, v, 0], transform.scale);
          }),
          rangeControl('Scale', 0.5, 4, 0.1, 1, (v) => {
            transform.scale = v;
            this.playground.setModelTransform(transform.pos, [0, transform.rot, 0], v);
          }),
          button('Print Scene Graph', () => {
            const root = this.playground.getModelRoot();
            if (root) printSceneGraph(root);
            else this.setStatus('Load a model first.');
          }),
          button('Inspect Meshes', () => {
            const root = this.playground.getModelRoot();
            if (root) inspectMeshes(root);
          }),
          button('Inspect Materials', () => {
            const root = this.playground.getModelRoot();
            if (root) inspectMaterials(root);
          }),
          (() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.glb,.gltf';
            input.addEventListener('change', async () => {
              const file = input.files?.[0];
              if (file) await this.playground.loadModelFromFile(file);
            });
            const lbl = document.createElement('label');
            lbl.className = 'control';
            lbl.textContent = 'Load custom GLB';
            lbl.appendChild(input);
            return lbl;
          })(),
        );
        break;
      }

      case 3: {
        wrap.append(
          rangeControl('FOV', 20, 120, 1, 50, (v) => this.playground.setCameraFov(v)),
          rangeControl('Camera X', -10, 10, 0.1, 0, (v) =>
            this.playground.setCameraPosition(v, this.playground.camera.position.y, this.playground.camera.position.z),
          ),
          rangeControl('Camera Y', 0, 8, 0.1, 1.5, (v) =>
            this.playground.setCameraPosition(this.playground.camera.position.x, v, this.playground.camera.position.z),
          ),
          rangeControl('Camera Z', 1, 15, 0.1, 5, (v) =>
            this.playground.setCameraPosition(this.playground.camera.position.x, this.playground.camera.position.y, v),
          ),
          button('Focus on Dinosaur', () => this.playground.focusCamera()),
          button('Animate Camera Orbit', () =>
            this.playground.animateCameraTo(new THREE.Vector3(4, 2, 4)),
          ),
        );
        break;
      }

      case 4: {
        const presets: LightPreset[] = ['daylight', 'sunset', 'museum', 'horror'];
        const presetRow = document.createElement('div');
        presetRow.className = 'preset-row';
        for (const p of presets) {
          presetRow.appendChild(
            button(p, () => this.playground.applyLightPreset(p), 'action primary'),
          );
        }
        wrap.append(presetRow);

        const types = ['ambient', 'directional', 'point', 'hemisphere'] as const;
        for (const type of types) {
          wrap.append(
            rangeControl(`${type} intensity`, 0, 3, 0.05, type === 'directional' ? 1.2 : 0.35, (v) =>
              this.playground.setLightIntensity(type, v),
            ),
          );
        }

        if (this.playground.lights.directional) {
          wrap.append(
            rangeControl('Sun X', -8, 8, 0.1, 4, (v) =>
              this.playground.moveLight('directional', v, this.playground.lights.directional.position.y, this.playground.lights.directional.position.z),
            ),
            rangeControl('Sun Y', 0, 12, 0.1, 8, (v) =>
              this.playground.moveLight('directional', this.playground.lights.directional.position.x, v, this.playground.lights.directional.position.z),
            ),
          );
        }
        break;
      }

      case 5: {
        const mat = { metalness: 0.3, roughness: 0.5, color: '#88aa66', wireframe: false };
        const presets: MaterialPreset[] = ['original', 'metallic', 'plastic', 'glass', 'clay', 'wireframe'];
        const row = document.createElement('div');
        row.className = 'preset-row';
        for (const p of presets) {
          row.appendChild(
            button(p, () => this.playground.applyMaterialPreset(p), 'action primary'),
          );
        }
        wrap.append(row);
        wrap.append(
          rangeControl('Metalness', 0, 1, 0.01, mat.metalness, (v) => {
            mat.metalness = v;
            this.playground.setMaterialParams(mat.metalness, mat.roughness, mat.color, mat.wireframe);
          }),
          rangeControl('Roughness', 0, 1, 0.01, mat.roughness, (v) => {
            mat.roughness = v;
            this.playground.setMaterialParams(mat.metalness, mat.roughness, mat.color, mat.wireframe);
          }),
        );
        break;
      }

      case 6: {
        const animState = {
          rotate: false,
          float: false,
          scale: false,
          bob: false,
          breathe: false,
        };

        const flags = [
          ['Rotate', 'rotate'],
          ['Float', 'float'],
          ['Scale pulse', 'scale'],
          ['Bob', 'bob'],
          ['Breathe', 'breathe'],
        ] as const;

        for (const [label, key] of flags) {
          wrap.appendChild(
            button(`Toggle ${label}`, () => {
              animState[key] = !animState[key];
              this.playground.setAnimationFlags({ [key]: animState[key] });
              this.setStatus(`${label}: ${animState[key] ? 'on' : 'off'}`);
            }),
          );
        }
        wrap.append(
          button('Breathing Preset', () => {
            this.playground.setAnimationFlags({
              rotate: false,
              float: false,
              scale: false,
              bob: false,
              breathe: true,
            });
            this.setStatus('Breathing animation active.');
          }),
          rangeControl('Animation speed', 0.2, 3, 0.1, 1, (v) =>
            this.playground.setAnimationSpeed(v),
          ),
        );
        break;
      }

      case 7:
        wrap.append(
          button('Reset Materials', () => this.playground.applyMaterialPreset('original')),
        );
        wrap.appendChild((() => {
          const p = document.createElement('p');
          p.className = 'hint';
          p.textContent = 'Drag to orbit · scroll to zoom · click the dinosaur to highlight and recolor.';
          return p;
        })());
        break;

      case 8: {
        if (this.state.animations.length === 0) {
          const warn = document.createElement('p');
          warn.className = 'status warn';
          warn.textContent =
            'This model has no embedded animations. Upload an animated GLB (e.g. Quaternius Animated Dinosaur Bundle) below.';
          wrap.appendChild(warn);
        } else {
          const select = document.createElement('select');
          for (const name of this.state.animations) {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            select.appendChild(opt);
          }
          wrap.appendChild(select);
          wrap.append(
            button('Play', () => this.playground.playAnimation(select.value, true)),
            button('Pause', () => this.playground.pauseAnimation()),
            button('Resume', () => this.playground.resumeAnimation()),
            rangeControl('Playback speed', 0.1, 3, 0.1, 1, (v) =>
              this.playground.setAnimationTimeScale(v),
            ),
            button('Play Once (no loop)', () =>
              this.playground.playAnimation(select.value, false),
            ),
          );
        }

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.glb,.gltf';
        input.addEventListener('change', async () => {
          const file = input.files?.[0];
          if (file) await this.playground.loadModelFromFile(file);
        });
        const lbl = document.createElement('label');
        lbl.className = 'control';
        lbl.textContent = 'Load animated GLB';
        lbl.appendChild(input);
        wrap.appendChild(lbl);
        break;
      }

      case 9: {
        const pipeline = document.createElement('div');
        pipeline.className = 'status';
        pipeline.innerHTML = `
          <strong>GLB → GPU → Screen</strong><br><br>
          1. <strong>GLB file</strong> — binary package of meshes, materials, textures, bones, animations<br>
          2. <strong>GLTFLoader</strong> — JavaScript parses the file into Three.js objects<br>
          3. <strong>Scene graph</strong> — objects organized in a tree (Group → Mesh → Geometry + Material)<br>
          4. <strong>Render loop</strong> — each frame, the renderer walks the scene<br>
          5. <strong>Draw calls</strong> — GPU commands: "draw this mesh with this material"<br>
          6. <strong>Vertex shader</strong> — places each vertex on screen<br>
          7. <strong>Rasterization</strong> — triangles become pixels<br>
          8. <strong>Fragment shader</strong> — colors each pixel using lights & materials<br>
          9. <strong>Frame buffer</strong> — final image in GPU memory<br>
          10. <strong>Canvas</strong> — browser copies pixels to your screen
        `;
        wrap.appendChild(pipeline);
        wrap.append(
          button('Log Renderer Stats', () => console.log(this.playground.renderer.info.render)),
        );
        break;
      }

      case 10: {
        const uniforms = { ...this.playground.shaderController.getUniforms() };

        const presetRow = document.createElement('div');
        presetRow.className = 'preset-row';
        for (const preset of SHADER_PRESETS) {
          const btn = button(preset.label, () => {
            this.playground.setShaderPreset(preset.id);
            codePreview.value = this.playground.getShaderSource();
            topicLabel.textContent = `${preset.topic} — ${preset.description}`;
            this.setStatus(`Active: ${preset.label}`);
          }, 'action primary');
          presetRow.appendChild(btn);
        }
        wrap.appendChild(presetRow);

        const topicLabel = document.createElement('p');
        topicLabel.className = 'hint';
        const active = SHADER_PRESETS.find((p) => p.id === this.playground.shaderController.getPresetId());
        topicLabel.textContent = active
          ? `${active.topic} — ${active.description}`
          : 'Select a shader preset above.';
        wrap.appendChild(topicLabel);

        wrap.append(
          rangeControl('uMix (color blend)', 0, 1, 0.01, uniforms.uMix, (v) => {
            this.playground.setShaderUniform('uMix', v);
          }),
          rangeControl('Noise scale', 1, 12, 0.5, uniforms.uNoiseScale, (v) => {
            this.playground.setShaderUniform('uNoiseScale', v);
          }),
          rangeControl('Wave amount (vertex)', 0, 0.25, 0.01, uniforms.uWaveAmount, (v) => {
            this.playground.setShaderUniform('uWaveAmount', v);
          }),
        );

        for (const [label, key] of [['Color A', 'uColorA'], ['Color B', 'uColorB']] as const) {
          const lbl = document.createElement('label');
          lbl.className = 'control';
          lbl.textContent = label;
          const input = document.createElement('input');
          input.type = 'color';
          input.value = uniforms[key];
          input.addEventListener('input', () => {
            this.playground.setShaderUniform(key, input.value);
          });
          lbl.appendChild(input);
          wrap.appendChild(lbl);
        }

        wrap.append(
          button('Log Shader Code (Console)', () => this.playground.logShaderSource()),
        );

        const codePreview = document.createElement('textarea');
        codePreview.className = 'shader-code';
        codePreview.readOnly = true;
        codePreview.spellcheck = false;
        codePreview.value = this.playground.getShaderSource();
        wrap.appendChild(codePreview);

        wrap.appendChild((() => {
          const p = document.createElement('p');
          p.className = 'hint';
          p.textContent =
            'Move the mouse over the canvas. Try UV Map first, then Time, Mouse, Noise, and Vertex Wave.';
          return p;
        })());
        break;
      }
    }

    return wrap;
  }
}
