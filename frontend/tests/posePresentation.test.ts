import assert from 'node:assert/strict';
import test from 'node:test';
import { coachFrameStatus, coachRegionEvidence, coachRegionStatus } from '../src/presentation/posePresentation.ts';
import type { PoseAssessment } from '../src/types/index.ts';

function region(overrides: Partial<PoseAssessment['regions'][number]> = {}): PoseAssessment['regions'][number] {
  return {
    name: 'arms', visible_frames: 6, sampled_frames: 6, frame_coverage_percent: 100,
    status: 'reliable', explanation: '', validated_visible_frames: 0,
    validated_frame_coverage_percent: 0, validation_status: 'unavailable',
    validation_warnings: [], sufficient_evidence_frames: 0, failed_frames: 0,
    insufficient_evidence_frames: 6, validation_reason_counts: {}, ...overrides,
  };
}

test('detection-only evidence is not described as region validation', () => {
  const data = region({ visible_frames: 6, sufficient_evidence_frames: 0, validated_visible_frames: 0 });
  const status = coachRegionStatus(data, 1);
  assert.equal(status.label, 'Validation unavailable');
  assert.notEqual(status.tone, 'green');
  assert.deepEqual(coachRegionEvidence(data), {
    detected: { count: 6, total: 6 },
    sufficient: { count: 0, total: 6 },
    validated: { count: 0, total: 6 },
  });
});

test('valid region status follows backend validation and evidence counts', () => {
  const status = coachRegionStatus(region({
    validation_status: 'valid', sufficient_evidence_frames: 6,
    validated_visible_frames: 6, insufficient_evidence_frames: 0,
  }), 2);
  assert.equal(status.label, 'Checks passed where evidence was available');
  assert.equal(status.tone, 'green');
});

test('limited region status explains insufficient moments without calling them failed', () => {
  const status = coachRegionStatus(region({
    validation_status: 'limited', sufficient_evidence_frames: 4,
    validated_visible_frames: 4, insufficient_evidence_frames: 2,
  }), 2);
  assert.equal(status.label, 'Limited evidence');
  assert.equal(status.tone, 'amber');
  assert.match(status.explanation, /not have enough clear landmarks/);
});

test('failed region status is surfaced for review', () => {
  const status = coachRegionStatus(region({
    validation_status: 'invalid', sufficient_evidence_frames: 6,
    failed_frames: 1, insufficient_evidence_frames: 0,
  }), 2);
  assert.equal(status.label, 'Some checks flagged landmarks');
  assert.equal(status.tone, 'red');
  assert.doesNotMatch(status.explanation, /implausible|temporal|anatomical_valid/i);
});

test('sampled-frame outcomes remain distinct and coach friendly', () => {
  assert.match(coachFrameStatus('validated', true), /applicable checks passed/);
  assert.match(coachFrameStatus('partially_validated', true), /some checks were limited/);
  assert.match(coachFrameStatus('validation_failed', true), /flagged for review/);
  assert.match(coachFrameStatus('insufficient_evidence', true), /not enough evidence/);
  assert.match(coachFrameStatus('insufficient_evidence', false), /not clear enough/);
});
