import { VISUAL } from './visual-config.js';

export function educationThemeCSS(source) {
  const root = source.match(/:root\s*\{([\s\S]*?)\}/)?.[1];
  const tokens = root?.match(/--[\w-]+\s*:[^;]+;/g)?.join('\n');
  const card = source.match(/\.education-image\s+\.image-panel\s*\{([^}]+)\}/)?.[1];
  const background = card?.match(/\bbackground\s*:\s*([^;]+);/)?.[1];
  if (!tokens || !background) throw new Error('无法读取 Education 的背景和 CSS 变量');
  return `:root { ${tokens}\n${VISUAL.BACKGROUND_VARIABLE}: ${background}; }`;
}
