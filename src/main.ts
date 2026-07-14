import { Playground } from './Playground';
import { DEFAULT_STATE } from './milestones/config';
import { Panel } from './ui/Panel';

const canvas = document.querySelector<HTMLCanvasElement>('#canvas');
const panelRoot = document.querySelector<HTMLElement>('#panel');

if (!canvas || !panelRoot) {
  throw new Error('Missing #canvas or #panel element.');
}

let panel!: Panel;

const playground = new Playground(canvas, {
  onModelLoaded: (animations) => {
    panel.updateState({ modelLoaded: true, animations });
    panel.setStatus(
      animations.length
        ? `Model loaded with ${animations.length} animation clip(s).`
        : 'Model loaded. Open Milestone 8 to load an animated GLB.',
    );
  },
  onSelect: (name) => panel.updateState({ selectedMesh: name }),
  onStatus: (message) => panel.setStatus(message),
});

panel = new Panel(panelRoot, playground, {
  onMilestoneChange: (id) => {
    playground.setMilestone(id);
    panel.updateState({ milestone: id });
  },
}, { ...DEFAULT_STATE, milestone: 1 });

playground.setMilestone(1);

canvas.addEventListener('pointermove', (e) => {
  const rect = canvas.getBoundingClientRect();
  panel.updateState({
    mouse: {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
    },
  });
});

function animate(): void {
  playground.tick();
  panel.updateState({ fps: playground.fps });
  requestAnimationFrame(animate);
}

animate();
