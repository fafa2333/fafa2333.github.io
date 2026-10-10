export const TRANSITION = Object.freeze({
  DISASSEMBLE_DURATION: .85,
  PAUSE_DURATION: .15,
  REBUILD_DURATION: 1,
  SCAN_DIRECTION: 'left_to_right',
  LINE_MIN_DURATION: .19,
  LINE_MAX_DURATION: .50,
  DIRECTION_WEIGHT: .28, // Weak screen-left → right bias, not a scan mask.
  HEIGHT_WEIGHT: .12,
  NEIGHBOR_WEIGHT: .28,
  RANDOM_WEIGHT: .32,
  OUTLINE_LEAD: .06, // Scheduling bias; all classes overlap within one stage.
  PRIMARY_LEAD: .025,
  PATH_SEED: 20261010,
  PATH_STRAIGHT_COSINE: .90, // Pair the straightest continuation at junctions.
});
