import { CONFIG } from '../pointcloud-test/config.js';

export const SWITCH = Object.freeze({
  DISSOLVE_DURATION: .90,
  BLANK_DURATION: .35,
  ASSEMBLE_DURATION: 1.00,
  SCATTER_DISTANCE: 1.8, // normalized 3D display units, close to each surface
  RANDOM_STRENGTH: .65,
  SCAN_WINDOW: .22,
  MODELS: Object.freeze({
    bit: Object.freeze({ path: CONFIG.DATA_PATH, label: '中心教学楼' }),
    hive: Object.freeze({ path: '/models/ntu-hive-pointcloud-v4/', label: 'The Hive' }),
  }),
});
