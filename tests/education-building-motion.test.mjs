import test from 'node:test';
import assert from 'node:assert/strict';
import { EducationBuildingMotion } from '../src/components/educationBuildingMotion.js';

test('chapter enters with BIT, switches both ways with a blank interval, and erases on leave', () => {
  const motion = new EducationBuildingMotion();
  assert.equal(motion.snapshot.model, null);
  motion.setPresence(true); assert.equal(motion.snapshot.mode, 2);
  motion.advance(1); assert.equal(motion.assembled, true);
  for (const model of ['hive', 'bit']) {
    const old = motion.current;
    motion.select(model); assert.equal(motion.total, 2);
    assert.equal(motion.snapshot.model, old);
    motion.advance(.85); assert.equal(motion.snapshot.model, null);
    motion.advance(.15); assert.equal(motion.snapshot.model, model);
    assert.equal(motion.snapshot.progress, 0);
    motion.advance(1); assert.equal(motion.assembled, true);
    assert.equal(motion.current, model);
  }
  motion.setPresence(false); assert.equal(motion.snapshot.mode, 1);
  motion.advance(.85); assert.equal(motion.snapshot.model, null);
  assert.equal(motion.running, false);
});

test('rapid scroll reversals retain exact shader progress and return to a complete model', () => {
  const motion = new EducationBuildingMotion(); motion.setPresence(true); motion.advance(.43);
  const initial = motion.snapshot;
  motion.setPresence(false); assert.deepEqual(motion.snapshot, initial);
  motion.advance(.1); const reversing = motion.snapshot;
  motion.setPresence(true); assert.deepEqual(motion.snapshot, reversing);
  motion.advance(1); assert.equal(motion.assembled, true);
  motion.setPresence(false); motion.advance(.2); const erasing = motion.snapshot;
  motion.setPresence(true); assert.deepEqual(motion.snapshot, erasing);
  motion.advance(1); assert.equal(motion.assembled, true);
});

test('latest card choice is queued safely, and offscreen return redraws the selected building', () => {
  const motion = new EducationBuildingMotion(); motion.setPresence(true); motion.advance(1);
  motion.select('hive'); motion.advance(1.3); motion.select('bit');
  motion.advance(5); assert.equal(motion.current, 'bit'); assert.equal(motion.assembled, true);
  motion.setPresence(false); motion.advance(.1); motion.forceHidden(); motion.select('hive');
  motion.setPresence(true); assert.equal(motion.snapshot.model, 'hive');
  motion.advance(1); assert.equal(motion.current, 'hive'); assert.equal(motion.assembled, true);
});

test('reduced motion has no background animation and accepts selections during load/hidden state', () => {
  const motion = new EducationBuildingMotion(); motion.select('hive', true);
  assert.equal(motion.snapshot.model, null);
  motion.setPresence(true, true); assert.equal(motion.snapshot.model, 'hive');
  motion.select('bit', true); assert.equal(motion.snapshot.model, 'bit');
  motion.setPresence(false, true); assert.equal(motion.snapshot.model, null);
  assert.equal(motion.running, false);
});
