import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreQuiz } from '../challenge.ts';

/**
 * Grading runs on the owner's device, so it is the only arbiter of a score.
 * If it drifts, an applicant is marked against answers nobody checked.
 */
test('all correct is 100', () => {
  assert.equal(scoreQuiz([0, 1, 2], [0, 1, 2]), 100);
});

test('none correct is 0', () => {
  assert.equal(scoreQuiz([1, 0, 0], [0, 1, 2]), 0);
});

test('partial credit rounds to the nearest percent', () => {
  assert.equal(scoreQuiz([0, 1, 9], [0, 1, 2]), 67);
  assert.equal(scoreQuiz([0, 9, 9], [0, 1, 2]), 33);
});

test('unanswered questions count as wrong, not skipped', () => {
  // A short answers array must not shrink the denominator, or leaving
  // questions blank would inflate the mark.
  assert.equal(scoreQuiz([0], [0, 1, 2]), 33);
  assert.equal(scoreQuiz([], [0, 1]), 0);
});

test('extra answers beyond the key are ignored', () => {
  assert.equal(scoreQuiz([0, 1, 2, 3], [0, 1]), 100);
});

test('an empty key scores zero rather than dividing by zero', () => {
  assert.equal(scoreQuiz([0, 1], []), 0);
});
