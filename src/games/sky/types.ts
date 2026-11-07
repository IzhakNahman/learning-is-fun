import type { SlotSpec, WordEntry } from '../../content';

export type Phase = 'playing' | 'breaking' | 'letterPause' | 'wordPause' | 'counting' | 'finished';
export type BoxPhase = 'approaching' | 'hovering' | 'leaving';
export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Box {
  x: number;
  y: number;
  z: number;
  letterKey: string;
  punchesTaken: number;
  phase: BoxPhase;
  hoverSeconds: number;
  shakeSeconds: number;
  yaw: number;
  hue: number;
  bobPhase: number;
}

export interface Cloud {
  x: number;
  y: number;
  z: number;
  size: number;
}

export interface SparkParticle {
  kind: 'spark';
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  lifeSeconds: number;
  color: string;
  size: number;
}

export interface FloatingTextParticle {
  kind: 'text';
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  lifeSeconds: number;
  mainText: string;
  subText: string;
}

export type Particle = SparkParticle | FloatingTextParticle;

export interface Slot {
  spec: SlotSpec;
  filled: boolean;
}

export interface Player {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
}

export interface SkyInput {
  heldDirections: Set<Direction>;
  /** Joystick position, each axis from -1 to 1 (up and right are positive). */
  stick: { x: number; y: number };
}

export interface SkyState {
  phase: Phase;
  secondsLeft: number;
  elapsedSeconds: number;
  player: Player;
  camera: { x: number; y: number };
  boxes: Box[];
  clouds: Cloud[];
  particles: Particle[];
  wordQueue: WordEntry[];
  nextWordIndex: number;
  currentWord: WordEntry | null;
  slots: Slot[];
  completedWords: WordEntry[];
  spawnTimer: number;
  punchCooldown: number;
  punchAnimation: number;
}
