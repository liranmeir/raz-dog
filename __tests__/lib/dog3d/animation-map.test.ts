import { describe, expect, it } from 'vitest';
import { pickClip, pickHeadBoneName } from '@/lib/dog3d/animation-map';

describe('pickClip', () => {
  const tripo = ['Armature|Idle', 'Armature|Walk', 'Armature|Jump', 'Armature|Sit'];

  it('matches by keyword regardless of prefix and case', () => {
    expect(pickClip('idle', tripo)).toBe('Armature|Idle');
    expect(pickClip('happy', tripo)).toBe('Armature|Jump');
    expect(pickClip('hmm', tripo)).toBe('Armature|Sit');
  });

  it('falls back down the keyword list, then to the first clip', () => {
    expect(pickClip('eat', tripo)).toBe('Armature|Idle');
    expect(pickClip('sleep', ['run_fast', 'walk'])).toBe('run_fast');
  });

  it('returns null when the model has no clips', () => {
    expect(pickClip('idle', [])).toBeNull();
  });
});

describe('pickHeadBoneName', () => {
  it('prefers an exact head bone over head_end or neck', () => {
    expect(pickHeadBoneName(['Spine', 'Neck', 'Head_end', 'Head'])).toBe('Head');
    expect(pickHeadBoneName(['mixamorig:Neck', 'mixamorig:Head'])).toBe('mixamorig:Head');
  });

  it('falls back to neck, or null', () => {
    expect(pickHeadBoneName(['Spine', 'Neck01'])).toBe('Neck01');
    expect(pickHeadBoneName(['Spine', 'Tail'])).toBeNull();
  });
});
