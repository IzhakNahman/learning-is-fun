import { randomBetween } from '../../core/random';
import type { Particle, SkyState } from './types';

const GRAVITY_PIXELS_PER_SECOND = 700;

export function updateParticles(state: SkyState, seconds: number): void {
  for (const particle of state.particles) {
    particle.lifeSeconds -= seconds;
    particle.x += particle.velocityX * seconds;
    particle.y += particle.velocityY * seconds;
    if (particle.kind === 'spark') particle.velocityY += GRAVITY_PIXELS_PER_SECOND * seconds;
  }
  state.particles = state.particles.filter((particle) => particle.lifeSeconds > 0);
}

export function emitHitSparks(state: SkyState, x: number, y: number, hue: number): void {
  for (let index = 0; index < 8; index++) {
    state.particles.push({
      kind: 'spark',
      x,
      y: y + 40,
      velocityX: randomBetween(-160, 160),
      velocityY: randomBetween(-200, 0),
      lifeSeconds: 0.6,
      color: `hsl(${hue},90%,65%)`,
      size: randomBetween(5, 10),
    });
  }
}

export function emitBreakBurst(state: SkyState, x: number, y: number, hue: number): void {
  for (let index = 0; index < 34; index++) {
    state.particles.push({
      kind: 'spark',
      x,
      y,
      velocityX: randomBetween(-380, 380),
      velocityY: randomBetween(-420, 120),
      lifeSeconds: randomBetween(0.6, 1.2),
      color: `hsl(${hue + randomBetween(-20, 20)},90%,${randomBetween(50, 75)}%)`,
      size: randomBetween(6, 14),
    });
  }
}

export function emitConfetti(state: SkyState, x: number, y: number): void {
  for (let index = 0; index < 70; index++) {
    state.particles.push({
      kind: 'spark',
      x,
      y,
      velocityX: randomBetween(-500, 500),
      velocityY: randomBetween(-600, 200),
      lifeSeconds: randomBetween(1, 2),
      color: `hsl(${randomBetween(0, 360)},90%,60%)`,
      size: randomBetween(6, 12),
    });
  }
}

export function emitFloatingText(
  state: SkyState,
  x: number,
  y: number,
  mainText: string,
  subText: string,
): void {
  const particle: Particle = {
    kind: 'text',
    x,
    y,
    velocityX: 0,
    velocityY: -60,
    lifeSeconds: 1,
    mainText,
    subText,
  };
  state.particles.push(particle);
}
