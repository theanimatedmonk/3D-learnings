import * as THREE from 'three';
import type { Object3D } from 'three';

export interface SceneGraphNode {
  name: string;
  type: string;
  children: SceneGraphNode[];
  position?: [number, number, number];
  meshInfo?: {
    vertices: number;
    materialType: string;
    materialName: string;
  };
}

export function printSceneGraph(root: Object3D): void {
  const tree = buildSceneGraph(root);
  console.group('🦕 Scene Graph');
  console.log(JSON.stringify(tree, null, 2));
  console.groupEnd();
  console.info('Tip: expand objects in the console for live Three.js references.');
}

export function buildSceneGraph(object: Object3D): SceneGraphNode {
  const node: SceneGraphNode = {
    name: object.name || '(unnamed)',
    type: object.type,
    children: [],
    position: [
      round(object.position.x),
      round(object.position.y),
      round(object.position.z),
    ],
  };

  if (object instanceof THREE.Mesh) {
    const mat = object.material;
    const material = Array.isArray(mat) ? mat[0] : mat;
    node.meshInfo = {
      vertices: object.geometry.attributes.position?.count ?? 0,
      materialType: material?.type ?? 'unknown',
      materialName: material?.name || '(unnamed)',
    };
  }

  for (const child of object.children) {
    node.children.push(buildSceneGraph(child));
  }

  return node;
}

export function inspectMeshes(root: Object3D): void {
  const meshes: Array<{
    name: string;
    vertices: number;
    triangles: number;
    material: string;
  }> = [];

  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const mat = child.material;
      const material = Array.isArray(mat) ? mat[0] : mat;
      const verts = child.geometry.attributes.position?.count ?? 0;
      meshes.push({
        name: child.name || '(unnamed)',
        vertices: verts,
        triangles: Math.floor(verts / 3),
        material: material?.type ?? 'unknown',
      });
    }
  });

  console.table(meshes);
  console.info(`Found ${meshes.length} mesh(es).`);
}

export function inspectMaterials(root: Object3D): void {
  const materials = new Map<string, Record<string, unknown>>();

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    for (const mat of mats) {
      if (!mat || materials.has(mat.uuid)) continue;
      const entry: Record<string, unknown> = {
        name: mat.name || '(unnamed)',
        type: mat.type,
      };
      if ('color' in mat && mat.color instanceof THREE.Color) {
        entry.color = `#${mat.color.getHexString()}`;
      }
      if ('metalness' in mat) entry.metalness = (mat as THREE.MeshStandardMaterial).metalness;
      if ('roughness' in mat) entry.roughness = (mat as THREE.MeshStandardMaterial).roughness;
      if ('wireframe' in mat) entry.wireframe = (mat as THREE.MeshStandardMaterial).wireframe;
      materials.set(mat.uuid, entry);
    }
  });

  console.group('🎨 Materials');
  for (const [, info] of materials) {
    console.log(info);
  }
  console.groupEnd();
  console.info(`Found ${materials.size} unique material(s).`);
}

export function centerAndScaleModel(
  model: Object3D,
  targetSize = 2,
): { size: THREE.Vector3; center: THREE.Vector3 } {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  model.position.sub(center);

  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0) {
    const scale = targetSize / maxDim;
    model.scale.setScalar(scale);
  }

  return { size, center };
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
