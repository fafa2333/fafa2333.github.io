import siteCSS from '../styles.css?raw';
import './style.css';
import { TransitionViewer } from './viewer.js';

const root = siteCSS.match(/:root\s*\{([\s\S]*?)\}/)?.[1];
const theme = document.createElement('style');
theme.textContent = `:root { ${root?.match(/--[\w-]+\s*:[^;]+;/g)?.join('\n') || ''} }`;
document.head.append(theme);
const viewer = new TransitionViewer(document.querySelector('.transition-test'));
addEventListener('pagehide', event => { if (!event.persisted) viewer.dispose(); });
if (import.meta.hot) import.meta.hot.dispose(() => { viewer.dispose(); theme.remove(); });
