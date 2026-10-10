import siteCSS from '../styles.css?raw';
import './style.css';
import { ArchitecturalViewer } from './viewer.js';

// Read the production tokens without importing production page layout rules.
const root = siteCSS.match(/:root\s*\{([\s\S]*?)\}/)?.[1];
const theme = document.createElement('style');
theme.textContent = `:root { ${root?.match(/--[\w-]+\s*:[^;]+;/g)?.join('\n') || ''} }`;
document.head.append(theme);
const viewers = [...document.querySelectorAll('.model-study')].map(figure => new ArchitecturalViewer(figure));
// Read-only diagnostics for preview verification; no rendered debugging UI.
Object.defineProperty(window, '__architecturalPreview', { configurable: true,
  get: () => viewers.map(viewer => viewer.diagnostics) });
addEventListener('pagehide', event => { if (!event.persisted) viewers.forEach(viewer => viewer.dispose()); });
if (import.meta.hot) import.meta.hot.dispose(() => { viewers.forEach(viewer => viewer.dispose()); theme.remove(); });
