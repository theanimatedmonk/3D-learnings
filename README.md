# Three.js Dinosaur Playground

A hands-on learning playground for every important Three.js concept — built around a GLB dinosaur model.

## Quick start

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`). Use the numbered buttons in the right panel to step through milestones 1–9.

## What's included

| Milestone | Topic |
|-----------|-------|
| 1 | Scene, renderer, camera, animation loop, resize |
| 2 | GLTFLoader, scene graph, model transform |
| 3 | Camera FOV, orbit, focus, animated movement |
| 4 | Ambient, directional, point, hemisphere lights + mood presets |
| 5 | Materials — metallic, plastic, glass, clay, wireframe |
| 6 | Runtime animation — rotate, float, bob, breathe |
| 7 | OrbitControls, raycasting, click to highlight |
| 8 | AnimationMixer — play/pause/speed (for animated GLBs) |
| 9 | WebGL concepts — GLB → GPU → screen (conceptual) |

## Dinosaur model

A T-Rex GLB (CC0, from [vr-dinosaur-museum](https://github.com/code4fukui/vr-dinosaur-museum)) is bundled at `public/models/dinosaur.glb`.

To use your own model:

1. Replace `public/models/dinosaur.glb`, or
2. Use the **Load custom GLB** file picker in Milestone 2 or 8.

For **Milestone 8 (animations)**, try the [Quaternius Animated Dinosaur Bundle](https://poly.pizza/bundle/Animated-Dinosaur-Bundle-SmoLdBLO2K) (CC0) — download a GLB and load it via the file picker.

## Project structure

```
src/
  main.ts           — entry point, animation loop
  Playground.ts     — scene, camera, renderer, all 3D logic
  milestones/
    config.ts       — learn/tasks text for each milestone
  ui/
    Panel.ts        — sidebar controls
  utils/
    sceneGraph.ts   — print scene graph, inspect meshes/materials
public/
  models/
    dinosaur.glb
```

## How a Three.js app is structured

```
┌─────────────┐     ┌──────────┐     ┌────────────┐
│   Scene     │────▶│ Renderer │────▶│  <canvas>  │
│ (objects)   │     │ (WebGL)  │     │  (screen)  │
└─────────────┘     └──────────┘     └────────────┘
       ▲
       │ viewed through
┌─────────────┐
│   Camera    │
└─────────────┘
```

Every frame: update objects → `renderer.render(scene, camera)` → repeat.

## GLB → GPU → Screen (Milestone 9)

1. **GLB file** — meshes, materials, textures, animations in one binary package
2. **GLTFLoader** — parses into Three.js `Group`, `Mesh`, `Material` objects
3. **Scene graph** — tree of objects with position/rotation/scale
4. **Render loop** — walks the scene each frame
5. **Draw calls** — GPU commands per mesh
6. **Shaders** — GPU programs that place vertices and color pixels
7. **Frame buffer** — final image in GPU memory → displayed on canvas

## Intentionally out of scope (for now)

Blender, GLSL, React Three Fiber, physics, post-processing, particles, custom shaders, performance optimization.
