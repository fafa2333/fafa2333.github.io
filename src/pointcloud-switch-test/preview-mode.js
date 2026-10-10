import './preview-mode.css';
import { VISUAL } from './visual-config.js';

// URL-only development framing; no additional controls or production wiring.
const query = new URLSearchParams(location.search);
if (query.get('preview') === 'card') {
  const parsed = Number(query.get('width')) || VISUAL.CARD_WIDTH;
  document.documentElement.dataset.preview = 'card';
  document.documentElement.style.setProperty('--preview-card-width', `${Math.max(280, Math.min(600, parsed))}px`);
  document.documentElement.style.setProperty('--preview-card-aspect', VISUAL.CARD_ASPECT);
}
