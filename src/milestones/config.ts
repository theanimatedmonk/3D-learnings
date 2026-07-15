export interface MilestoneConfig {
  id: number;
  title: string;
  subtitle: string;
  learn: string[];
  tasks: string[];
  experiment?: string[];
  success: string;
}

export const MILESTONES: MilestoneConfig[] = [
  {
    id: 1,
    title: 'Create a Scene',
    subtitle: 'Scene, renderer, camera, animation loop, resize',
    learn: [
      'A Scene is a container — like an empty stage where every 3D object lives.',
      'A Renderer draws the scene through a camera onto a <canvas> using WebGL (your GPU).',
      'A Camera defines the viewpoint. PerspectiveCamera mimics human vision with depth.',
      'The animation loop runs every frame (~60fps) and calls renderer.render(scene, camera).',
      'Canvas resize keeps the image sharp when the browser window changes size.',
    ],
    tasks: [
      'Watch the blank scene render continuously',
      'Resize the browser window and notice the canvas adapts',
      'Open DevTools → Elements and find the <canvas>',
    ],
    success: 'You understand how a basic Three.js application is structured.',
  },
  {
    id: 2,
    title: 'Load the Dinosaur',
    subtitle: 'GLTFLoader, scene graph, model hierarchy',
    learn: [
      'GLTFLoader reads .glb/.gltf files and builds Three.js objects from them.',
      'A loaded model is a tree (scene graph): Group → Mesh → Geometry + Material.',
      'Every node has a name, position, rotation, and scale in parent space.',
      'Centering uses a bounding box so the model sits at the origin.',
    ],
    tasks: [
      'Load the dinosaur GLB',
      'Adjust position, rotation, and scale',
      'Click "Print Scene Graph" and inspect the console',
      'Click "Inspect Meshes" and "Inspect Materials"',
    ],
    experiment: [
      'What object names appear in the hierarchy?',
      'How many meshes does the dinosaur have?',
    ],
    success: 'You understand how a GLB model is represented inside Three.js.',
  },
  {
    id: 3,
    title: 'Camera',
    subtitle: 'FOV, near/far planes, position, lookAt',
    learn: [
      'Field of View (FOV) controls how wide the camera sees — like a zoom lens.',
      'Near and far planes clip geometry too close or too far from the camera.',
      'camera.position sets where the camera sits in 3D space.',
      'camera.lookAt(target) rotates the camera to face a point.',
      'OrbitControls let you orbit, pan, and zoom with the mouse.',
    ],
    tasks: [
      'Drag to orbit around the dinosaur',
      'Scroll to zoom in/out',
      'Change FOV and watch perspective distortion',
      'Use presets to focus or animate the camera',
    ],
    experiment: ['What happens if FOV is 20? What about 120?'],
    success: 'You understand how cameras affect the scene.',
  },
  {
    id: 4,
    title: 'Lights',
    subtitle: 'Ambient, directional, point, hemisphere',
    learn: [
      'Meshes need light to be visible (except emissive/wireframe materials).',
      'AmbientLight adds uniform light everywhere — no shadows, flat look.',
      'DirectionalLight simulates the sun — parallel rays from one direction.',
      'PointLight radiates from a single point like a light bulb.',
      'HemisphereLight blends sky color (top) and ground color (bottom).',
    ],
    tasks: [
      'Toggle each light type on/off',
      'Move lights and change intensity & color',
      'Try mood presets: daylight, sunset, museum, horror',
    ],
    experiment: [
      'Daylight — bright, neutral, directional sun',
      'Sunset — warm orange, low angle',
      'Museum — soft ambient + focused spotlight',
      'Horror — dim, greenish, harsh shadows',
    ],
    success: 'You understand how lighting changes the mood of a scene.',
  },
  {
    id: 5,
    title: 'Materials',
    subtitle: 'Standard, physical, metalness, roughness, wireframe',
    learn: [
      'MeshStandardMaterial reacts to lights using metalness & roughness.',
      'MeshPhysicalMaterial adds clearcoat and transmission (glass-like).',
      'Metalness: 0 = dielectric (plastic/clay), 1 = metal.',
      'Roughness: 0 = mirror-smooth, 1 = fully diffuse/matte.',
      'Wireframe shows the triangle mesh structure.',
    ],
    tasks: [
      'Switch material type',
      'Try presets: metallic, plastic, glass, clay, wireframe',
      'Adjust metalness, roughness, and color',
    ],
    experiment: [
      'Metallic — high metalness, low roughness',
      'Plastic — low metalness, medium roughness',
      'Glass — physical material with transmission',
      'Matte clay — high roughness, earthy color',
    ],
    success: 'You understand how materials define appearance.',
  },
  {
    id: 6,
    title: 'Runtime Manipulation',
    subtitle: 'position, rotation, scale every frame',
    learn: [
      'Every Object3D has .position, .rotation, and .scale.',
      'Animation = change these values over time inside the render loop.',
      'Use a Clock to get delta time for smooth, frame-rate-independent motion.',
      'Combine sine waves for organic motion like floating or breathing.',
    ],
    tasks: [
      'Enable rotation, floating, scaling, bobbing',
      'Try the "breathing" preset — subtle scale pulse',
      'Adjust animation speed',
    ],
    experiment: ['Create a breathing dinosaur with scale oscillation on the Y axis.'],
    success: 'You understand how to animate objects every frame.',
  },
  {
    id: 7,
    title: 'User Interaction',
    subtitle: 'OrbitControls, mouse position, raycasting',
    learn: [
      'OrbitControls map mouse drag to camera orbit, pan, and zoom.',
      'Raycasting shoots an invisible ray from the camera through the mouse pixel.',
      'If the ray hits a mesh, you get the intersection point and object.',
      'Use this for click-to-select, highlighting, and material changes.',
    ],
    tasks: [
      'Orbit, zoom, and pan the scene',
      'Click the dinosaur to select it',
      'Watch it highlight and change material on click',
      'See mouse coordinates in the status bar',
    ],
    success: 'You can make 3D scenes interactive.',
  },
  {
    id: 8,
    title: 'Imported Animations',
    subtitle: 'AnimationMixer, AnimationAction, play/pause/loop',
    learn: [
      'GLB files can embed animation clips (walk, run, idle…).',
      'AnimationMixer plays clips on a model root object.',
      'AnimationAction controls play, pause, loop, and time scale.',
      'mixer.update(delta) must run every frame to advance animations.',
    ],
    tasks: [
      'List available animation clips',
      'Play and pause animations',
      'Adjust playback speed',
      'Toggle loop mode',
      'Load an animated GLB via file picker if your model has no clips',
    ],
    success: 'You understand how animation clips work.',
  },
  {
    id: 9,
    title: 'WebGL Concepts',
    subtitle: 'Conceptual — no coding required',
    learn: [
      'CPU runs your JavaScript; GPU renders millions of triangles in parallel.',
      'A vertex is a point in 3D space. Triangles connect 3 vertices.',
      'A mesh is geometry (vertices + triangles) + a material.',
      'Textures are images wrapped onto mesh surfaces.',
      'The render pipeline: vertices → rasterize triangles → shade pixels → frame buffer → screen.',
      'A draw call is one GPU command to render a mesh.',
      'Three.js wraps raw WebGL so you work with Scene, Mesh, Light instead of shaders.',
    ],
    tasks: [
      'Read the pipeline below',
      'Explain in your own words: GLB file → GPU → Screen',
    ],
    experiment: [
      'GLB file — binary package of meshes, materials, textures, animations',
      'Three.js parses it into JavaScript objects',
      'Each frame, the renderer sends draw calls to the GPU',
      'GPU transforms vertices, shades fragments, writes to the frame buffer',
      'The browser displays the canvas pixels on your screen',
    ],
    success: 'You can explain the journey from GLB file to screen in simple words.',
  },
  {
    id: 10,
    title: 'Shaders',
    subtitle: 'Vertex & fragment shaders, uniforms, varyings, GPU visuals',
    learn: [
      'Vertex Shader — runs per vertex; positions geometry and passes data to the fragment stage.',
      'Fragment Shader — runs per pixel; decides the final color of each pixel on screen.',
      'Uniforms — values sent from JavaScript to the GPU (time, mouse, colors). Same for all pixels.',
      'Varyings — data passed from vertex → fragment shader, interpolated across each triangle.',
      'uTime — updated every frame for animation entirely on the GPU.',
      'uMouse — screen position drives interactive effects like glow spots.',
      'Noise — math that creates organic patterns without texture images.',
      'UV Coordinates — 2D mapping wrapped onto 3D mesh surfaces (vUv).',
      'Color Mixing — blend two colors with mix() driven by UV, time, or uniforms.',
    ],
    tasks: [
      'Try each shader preset and watch the dinosaur change',
      'Move the mouse — see the glow follow in Mouse Glow / Master presets',
      'Adjust uMix, noise scale, and wave amount sliders',
      'Change color A and color B',
      'Click "Log Shader Code" and read the GLSL in the console',
      'Try Vertex Wave — see vertices displaced in real time',
    ],
    experiment: [
      'UV Map — red/green show U and V coordinates',
      'Color Mix — slide uMix to blend teal and blue',
      'Time Pulse — animated sine waves without moving the mesh',
      'Mouse Glow — cursor creates a highlight on the surface',
      'Noise — procedural spots using only math',
      'Vertex Wave — ripple effect powered by the vertex shader',
      'All Combined — every concept at once',
      'Chromatic Aberration — RGB channels split at edges',
      'Fresnel Rim — glowing edges facing away from camera',
      'Hologram — scanlines + edge glow',
      'Toon / Cel — stepped cartoon shading',
      'Glitch — digital tears and RGB corruption',
    ],
    success: 'You understand GPU-powered visuals and how shaders control what you see.',
  },
];

export type LightPreset = 'daylight' | 'sunset' | 'museum' | 'horror' | 'custom';
export type MaterialPreset = 'original' | 'metallic' | 'plastic' | 'glass' | 'clay' | 'wireframe';

export interface PlaygroundState {
  milestone: number;
  modelLoaded: boolean;
  modelPath: string;
  animations: string[];
  selectedMesh: string | null;
  mouse: { x: number; y: number };
  fps: number;
  glassPosition: { x: number; y: number; z: number };
}

export const DEFAULT_STATE: PlaygroundState = {
  milestone: 1,
  modelLoaded: false,
  modelPath: '/models/dinosaur.glb',
  animations: [],
  selectedMesh: null,
  mouse: { x: 0, y: 0 },
  fps: 0,
  glassPosition: { x: 0, y: 1.05, z: 2.4 },
};

export function getMilestone(id: number): MilestoneConfig {
  return MILESTONES.find((m) => m.id === id) ?? MILESTONES[0];
}
