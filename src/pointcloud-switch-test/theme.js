import siteCSS from '../styles.css?raw';
import { educationThemeCSS } from './theme-source.js';

const style = document.createElement('style');
style.dataset.pointcloudTheme = 'education'; style.textContent = educationThemeCSS(siteCSS);
document.head.append(style);
