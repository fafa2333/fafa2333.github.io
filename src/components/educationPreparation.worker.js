import { loadArchitecture } from '../wireframe-dual-preview/data.js';
import { prepareEducationLines, prepareEducationLayout } from './educationPreparation.js';

const sources = new Map();
self.onmessage = async ({ data: { id, type, aspect } }) => {
  try {
    if (type === 'load') {
      const started = performance.now();
      const [manifest, data] = await Promise.all([
        fetch('/models/architectural-lines/manifest.json').then(response => {
          if (!response.ok) throw new Error('Architectural manifest unavailable');
          return response.json();
        }),
        Promise.all(['bit', 'hive'].map(async key => ({ key, ...await loadArchitecture(key) }))),
      ]);
      const models = data.map(({ key, surface, lines }) => {
        const { samples, ...layout } = prepareEducationLayout(key, surface, aspect);
        sources.set(key, { surface, samples });
        // Keep source surfaces for responsive fitting in this worker. Everything
        // sent to the renderer is transferred, not cloned on the UI thread.
        return { key, surface: surface.slice(), ...layout, ...prepareEducationLines(key, lines, manifest[key].objects) };
      });
      const transfers = models.flatMap(model => Object.values(model)
        .filter(value => ArrayBuffer.isView(value)).map(value => value.buffer));
      self.postMessage({ id, result: { models, aspect, workerMs: performance.now() - started } }, transfers);
    } else if (type === 'layout') {
      const layouts = Object.fromEntries([...sources].map(([key, { surface, samples }]) => {
        const { samples: unused, ...layout } = prepareEducationLayout(key, surface, aspect, samples);
        return [key, layout];
      }));
      self.postMessage({ id, result: layouts });
    }
  } catch (error) {
    self.postMessage({ id, error: error.message });
  }
};
