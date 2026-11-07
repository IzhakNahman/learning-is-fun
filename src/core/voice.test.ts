import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SpokenPart } from '../content';

const spoken: string[] = [];
vi.mock('./speech', () => ({
  cancelSpeech: vi.fn(),
  speakText: vi.fn((text: string) => {
    spoken.push(text);
    return Promise.resolve();
  }),
}));
vi.mock('./clipPlayer', () => ({
  hasClip: vi.fn((_language: string, clipId: string) => clipId === 'recorded'),
  playClip: vi.fn((_language: string, clipId: string) => {
    spoken.push(`clip:${clipId}`);
    return Promise.resolve();
  }),
}));

const { speakPart, speakPartsInOrder } = await import('./voice');
const { beginPlayback } = await import('./playback');

const part = (clipId: string, speech: string): SpokenPart => ({ clipId, speech });

describe('voice', () => {
  beforeEach(() => {
    spoken.length = 0;
  });

  it('plays the recording when there is one, otherwise the device voice', async () => {
    await speakPart(part('recorded', 'ignored'));
    await speakPart(part('missing', 'hello'));
    expect(spoken).toEqual(['clip:recorded', 'hello']);
  });

  it('speaks the parts in order', async () => {
    await speakPartsInOrder([part('a', 'one'), part('b', 'two')], beginPlayback());
    expect(spoken).toEqual(['one', 'two']);
  });

  it('stops the rest of a sequence when a newer playback starts', async () => {
    const playbackId = beginPlayback();
    const sequence = speakPartsInOrder([part('a', 'one'), part('b', 'two')], playbackId);
    beginPlayback();
    await sequence;
    expect(spoken).toEqual(['one']);
  });
});
